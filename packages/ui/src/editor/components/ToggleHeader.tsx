/**
 * ToggleHeader - React node view for toggle headers
 * 
 * Flat sibling structure (like ListBlock):
 * - [Chevron 24px] [Content flex:1]
 * - Children are siblings in the document, not nested in DOM
 * - Children hide themselves when this toggle is collapsed
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { spacing, sizing, typography } from '../tokens';
import type { ToggleHeaderAttrs } from '../extensions/nodes/ToggleHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePlaceholder } from '../hooks/usePlaceholder';
import { useBlockSelection } from '../hooks/useBlockSelection';
// import { Placeholder } from './Placeholder'; // No longer used - CSS handles placeholders
import { MarkerContainer } from './BlockWrapper';
import { BlockHandle } from './BlockHandle';
import { BlockSelectionHalo } from './BlockSelectionHalo';

type ToggleHeaderProps = NodeViewProps;

/**
 * Count children blocks that reference this toggle
 */
function getChildrenCount(
  editor: NodeViewProps['editor'],
  getPos: () => number | undefined,
  toggleId: string
): number {
  const pos = getPos();
  if (pos === undefined) return 0;

  const doc = editor.state.doc;
  let count = 0;
  let foundSelf = false;
  let stopped = false;

  doc.descendants((node, nodePos) => {
    if (stopped) return false;

    // Find our position first
    if (nodePos === pos) {
      foundSelf = true;
      return true;
    }

    // After finding self, count children
    if (foundSelf) {
      // Check if this block references our toggle
      const parentToggleId = node.attrs.parentToggleId;
      
      if (parentToggleId === toggleId) {
        count++;
      } else if (parentToggleId !== toggleId && node.type.name !== 'toggleHeader') {
        // If we hit a block that doesn't belong to us and isn't a nested toggle, stop
        // (This handles the case where next toggle's children start)
        stopped = true;
        return false;
      }
      
      // If we hit another toggle header at same or lower level, stop
      if (node.type.name === 'toggleHeader') {
        const otherAttrs = node.attrs as ToggleHeaderAttrs;
        const ourAttrs = doc.nodeAt(pos)?.attrs as ToggleHeaderAttrs;
        if (otherAttrs.level <= ourAttrs.level) {
          stopped = true;
          return false;
        }
      }
    }
    return true;
  });

  return count;
}

/**
 * Get preview text from first child block
 */
function getPreviewText(
  editor: NodeViewProps['editor'],
  getPos: () => number | undefined,
  toggleId: string
): string {
  const pos = getPos();
  if (pos === undefined) return '';

  const doc = editor.state.doc;
  let previewText = '';
  let foundSelf = false;
  let foundFirstChild = false;

  doc.descendants((node, nodePos) => {
    if (foundFirstChild) return false;

    if (nodePos === pos) {
      foundSelf = true;
      return true;
    }

    if (foundSelf) {
      const parentToggleId = node.attrs.parentToggleId;
      
      if (parentToggleId === toggleId) {
        // Found first child - get its text content
        const text = node.textContent || '';
        if (text) {
          previewText = text.length > 50 ? text.slice(0, 50) + '...' : text + '...';
        }
        foundFirstChild = true;
        return false;
      }
      
      // Stop if we hit another toggle or non-child block
      if (node.type.name === 'toggleHeader' || !parentToggleId) {
        return false;
      }
    }
    return true;
  });

  return previewText;
}

export function ToggleHeader({
  node,
  editor,
  getPos,
  updateAttributes,
}: ToggleHeaderProps) {
  const { colors } = useTheme();
  const attrs = node.attrs as ToggleHeaderAttrs;
  const { collapsed, level, toggleId, parentToggleId } = attrs;
  
  // Check if this block is selected
  const isSelected = useBlockSelection({ editor, getPos, nodeSize: node.nodeSize });
  
  // Force re-render when document updates (for reactive children info)
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    const handleUpdate = () => {
      forceUpdate(prev => prev + 1);
    };
    
    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate); // Re-render on selection change for placeholder focus detection
    editor.on('focus', handleUpdate);
    editor.on('blur', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
      editor.off('focus', handleUpdate);
      editor.off('blur', handleUpdate);
    };
  }, [editor]);

  // Count children blocks
  const childrenCount = useMemo(() => {
    return getChildrenCount(editor, getPos, toggleId);
  }, [editor, getPos, toggleId, editor.state.doc]);

  // Get preview text when collapsed
  const previewText = useMemo(() => {
    if (!collapsed || childrenCount === 0) return '';
    return getPreviewText(editor, getPos, toggleId);
  }, [collapsed, childrenCount, editor, getPos, toggleId, editor.state.doc]);

  // Get placeholder text (CSS handles visibility) - use custom text for toggles
  const placeholderText = usePlaceholder({ 
    node, 
    editor, 
    getPos,
    customText: 'Toggle'
  });

  // Handle collapse toggle
  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateAttributes({ collapsed: !collapsed });
  }, [collapsed, updateAttributes]);

  // Calculate indent (hierarchy + toggle grouping)
  const hierarchyIndent = level * spacing.indent;
  const toggleIndent = parentToggleId ? spacing.toggleIndent : 0;
  const indent = hierarchyIndent + toggleIndent;

  return (
    <NodeViewWrapper
      data-type="toggleHeader"
      data-collapsed={collapsed}
      data-level={level}
      data-toggle-id={toggleId}
      className="block-handle-wrapper"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        paddingLeft: indent,
        fontFamily: typography.fontFamily,
        fontSize: typography.body,
        lineHeight: typography.lineHeightRatio,
      }}
    >
      {/* Invisible hover bridge - covers gap between handle and content */}
      <div
        style={{
          position: 'absolute',
          left: indent - 32,
          top: 0,
          width: 32,
          height: '100%',
          pointerEvents: 'auto',
        }}
      />
      
      {/* Block handle (⋮⋮) - shows on hover */}
      <BlockHandle editor={editor} getPos={getPos} indent={indent} />

      {/* Main row: chevron (24px) + gap (4px) + content */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.inline }}>
        {/* Chevron marker */}
        <div style={{ color: colors.marker }}>
          <MarkerContainer>
            <div
              onClick={handleToggleCollapse}
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: sizing.marker,
                height: sizing.marker,
                borderRadius: 4,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.background.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg
                width={sizing.marker}
                height={sizing.marker}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  color: collapsed ? colors.marker : colors.text.default,
                  transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease, color 0.15s ease',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </MarkerContainer>
        </div>
        
        {/* Content with placeholder */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <NodeViewContent 
            as="div"
            data-placeholder={placeholderText || undefined}
            style={{ position: 'relative' }} 
          />
          {/* Placeholder now handled by CSS via data-placeholder attribute */}
        </div>
      </div>

      {/* Preview text when collapsed */}
      {collapsed && childrenCount > 0 && previewText && (
        <div
          contentEditable={false}
          style={{
            marginLeft: sizing.markerContainer + spacing.inline,
            marginTop: 4,
            fontSize: 12,
            color: colors.text.tertiary,
            userSelect: 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {previewText}
        </div>
      )}

      {/* Block selection halo */}
      <BlockSelectionHalo isSelected={isSelected} indent={indent} />

      {/* CSS to show handle on hover or when menu is open (but not while typing or in multi-selection) */}
      <style>{`
        .block-handle-wrapper:hover .block-handle:not([data-is-typing="true"]):not([data-in-multi-selection="true"]),
        .block-handle[data-menu-open="true"] {
          opacity: 1 !important;
        }
      `}</style>
    </NodeViewWrapper>
  );
}


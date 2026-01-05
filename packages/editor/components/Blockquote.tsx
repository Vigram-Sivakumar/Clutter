/**
 * Blockquote - React node view for blockquotes
 * 
 * PHASE 3 REFACTOR: Uses shared hooks and components.
 * Uses uniform block structure with marker area (border line).
 * No margin - parent handles spacing via gap.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { spacing, sizing, typography } from '../tokens';
import { useTheme } from '@clutter/ui';
import { usePlaceholder } from '../hooks/usePlaceholder';
import { useBlockSelection } from '../hooks/useBlockSelection';
// import { Placeholder } from './Placeholder'; // No longer used - CSS handles placeholders
import { BlockHandle } from './BlockHandle';
import { BlockSelectionHalo } from './BlockSelectionHalo';
import { isHiddenByCollapsedToggle } from '../utils/collapseHelpers';

export function Blockquote({ node, editor, getPos }: NodeViewProps) {
  const { colors } = useTheme();
  const parentToggleId = node.attrs.parentToggleId || null;
  const level = node.attrs.level || 0;
  
  // Check if this block is selected
  const isSelected = useBlockSelection({ editor, getPos, nodeSize: node.nodeSize });
  
  // Get placeholder text (CSS handles visibility)
  const placeholderText = usePlaceholder({ node, editor, getPos });

  // Force re-render when document updates (to react to parent toggle collapse)
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

  // Check if this blockquote should be hidden by a collapsed toggle
  const isHidden = useMemo(() => {
    const pos = getPos();
    if (pos === undefined || !parentToggleId) return false;
    return isHiddenByCollapsedToggle(editor.state.doc, pos, parentToggleId);
  }, [editor, editor.state.doc, getPos, parentToggleId]);

  // Check if next sibling is also a blockquote (for connector rendering)
  const hasNextBlockquote = useMemo(() => {
    const pos = getPos();
    if (pos === undefined) return false;
    
    try {
      const nextPos = pos + node.nodeSize;
      const nextNode = editor.state.doc.nodeAt(nextPos);
      return nextNode?.type.name === 'blockquote';
    } catch {
      return false;
    }
  }, [editor.state.doc, getPos, node.nodeSize]);

  // Calculate indent based on level (hierarchy + toggle grouping)
  const hierarchyIndent = level * spacing.indent;
  const toggleIndent = parentToggleId ? spacing.toggleIndent : 0;
  const indent = hierarchyIndent + toggleIndent;
  
  return (
    <NodeViewWrapper
      as="div"
      data-type="blockquote"
      data-parent-toggle-id={parentToggleId}
      data-level={level}
      data-hidden={isHidden}
      className="block-handle-wrapper"
      style={{
        display: isHidden ? 'none' : 'flex',
        alignItems: 'stretch',
        gap: spacing.inline,
        fontFamily: typography.fontFamily,
        fontSize: typography.body,
        lineHeight: typography.lineHeightRatio,
        position: 'relative',
        paddingLeft: indent,
        // No margin - parent uses gap for spacing
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

      {/* Marker area - 3px border line in 24px container */}
      <div
        style={{
          width: sizing.markerContainer,
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          className="blockquote-line"
          style={{
            width: 4,
            backgroundColor: colors.semantic.orange,
            borderRadius: 2,
          }}
        />
      </div>
      {/* Content area with placeholder */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <NodeViewContent
          as="div"
          data-placeholder={placeholderText || undefined}
          style={{
            color: colors.text.secondary,
            position: 'relative', // For CSS ::before placeholder
          }}
        />
        {/* Placeholder now handled by CSS via data-placeholder attribute */}
      </div>

      {/* Craft-style connector: bridge gap to next blockquote */}
      {hasNextBlockquote && (
        <div
          style={{
            position: 'absolute',
            left: indent + (sizing.markerContainer / 2) - 2, // Center of marker area (4px / 2)
            bottom: -spacing.gap - 2, // Extend 2px up to overlap
            width: 4,
            height: spacing.gap + 4, // Extend 2px up and 2px down
            backgroundColor: colors.semantic.orange,
          }}
        />
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


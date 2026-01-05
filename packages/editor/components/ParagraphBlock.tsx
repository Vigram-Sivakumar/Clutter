/**
 * ParagraphBlock - Top-level paragraph with block handle
 * 
 * This component is for TOP-LEVEL paragraphs (standalone blocks).
 * It duplicates the Paragraph logic but adds the block handle (⋮⋮).
 * 
 * For NESTED paragraphs (inside lists, toggles, etc.), see Paragraph.tsx
 * which has the same logic without the handle.
 * 
 * Note: We can't wrap Paragraph in a div because NodeViewWrapper must be
 * the outermost element for TipTap keyboard events to work properly.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { typography, spacing } from '../tokens';
import { usePlaceholder } from '../hooks/usePlaceholder';
import { useBlockSelection } from '../hooks/useBlockSelection';
// import { Placeholder } from './Placeholder'; // No longer used - CSS handles placeholders
import { BlockTagEditor } from './BlockTagEditor';
import { BlockHandle } from './BlockHandle';
import { BlockSelectionHalo } from './BlockSelectionHalo';
import { isHiddenByCollapsedToggle } from '../utils/collapseHelpers';

export function ParagraphBlock({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const tags = node.attrs.tags || [];
  const hasTags = tags.length > 0;
  const parentToggleId = node.attrs.parentToggleId || null;
  const level = node.attrs.level || 0;
  
  // Get placeholder text (CSS handles visibility)
  const placeholderText = usePlaceholder({ 
    node, 
    editor, 
    getPos,
    customText: hasTags ? 'Start typing...' : undefined
  });

  // Check if this block is selected
  const isSelected = useBlockSelection({ editor, getPos, nodeSize: node.nodeSize });

  // Force re-render when document updates (to react to parent toggle collapse and selection changes)
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    const handleUpdate = () => {
      forceUpdate(prev => prev + 1);
    };
    
    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate); // Re-render on selection change for placeholder focus detection
    editor.on('focus', handleUpdate); // Re-render when editor gains focus
    editor.on('blur', handleUpdate); // Re-render when editor loses focus
    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
      editor.off('focus', handleUpdate);
      editor.off('blur', handleUpdate);
    };
  }, [editor]);

  // Check if this paragraph should be hidden by a collapsed toggle
  const isHidden = useMemo(() => {
    const pos = getPos();
    if (pos === undefined || !parentToggleId) return false;
    return isHiddenByCollapsedToggle(editor.state.doc, pos, parentToggleId);
  }, [editor, editor.state.doc, getPos, parentToggleId]);

  const handleUpdateTags = useCallback((newTags: string[]) => {
    updateAttributes({ tags: newTags });
  }, [updateAttributes]);

  // Calculate indent based on level (hierarchy + toggle grouping)
  const hierarchyIndent = level * spacing.indent;
  const toggleIndent = parentToggleId ? spacing.toggleIndent : 0;
  const indent = hierarchyIndent + toggleIndent;

  return (
    <NodeViewWrapper
      as="div"
      data-type="paragraph"
      data-parent-toggle-id={parentToggleId}
      data-level={level}
      data-hidden={isHidden}
      className="block-handle-wrapper"
      style={{
        display: isHidden ? 'none' : 'block',
        fontFamily: typography.fontFamily,
        fontSize: typography.body,
        lineHeight: typography.lineHeightRatio,
        position: 'relative',
        paddingLeft: indent,
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

      <NodeViewContent
        as="div"
        data-placeholder={placeholderText || undefined}
        style={{
          display: 'inline',
          minWidth: '1ch',
          position: 'relative', // For CSS ::before placeholder
        }}
      />
      <BlockTagEditor 
        tags={tags} 
        onUpdate={handleUpdateTags}
        onTagClick={(editor as any).onTagClick}
      />
      {/* Placeholder now handled by CSS via data-placeholder attribute */}

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


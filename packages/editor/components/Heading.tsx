/**
 * Heading - React node view for headings
 * 
 * PHASE 3 REFACTOR: Uses shared hooks and components.
 * No marker area - just content with heading-specific typography.
 * Includes inline placeholder support for empty headings.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { typography, spacing } from '../tokens';
import { usePlaceholder } from '../hooks/usePlaceholder';
import { useBlockSelection } from '../hooks/useBlockSelection';
// import { Placeholder } from './Placeholder'; // No longer used - CSS handles placeholders
import { BlockHandle } from './BlockHandle';
import { BlockSelectionHalo } from './BlockSelectionHalo';
import { isHiddenByCollapsedToggle } from '../utils/collapseHelpers';

const headingStyles = {
  1: {
    fontSize: typography.h1,
    fontWeight: typography.weight.bold,
    lineHeight: 1.2,
    marginTop: '24px',
  },
  2: {
    fontSize: typography.h2,
    fontWeight: typography.weight.semibold,
    lineHeight: 1.3,
    marginTop: '20px',
  },
  3: {
    fontSize: typography.h3,
    fontWeight: typography.weight.semibold,
    lineHeight: 1.4,
    marginTop: '16px',
  },
} as const;

export function Heading({ node, editor, getPos }: NodeViewProps) {
  const headingLevel = (node.attrs.headingLevel || 1) as 1 | 2 | 3;
  const styles = headingStyles[headingLevel];
  const parentToggleId = node.attrs.parentToggleId || null;
  const indentLevel = node.attrs.level || 0;
  
  // Get placeholder text (CSS handles visibility)
  const placeholderText = usePlaceholder({ node, editor, getPos });

  // Check if this block is selected
  const isSelected = useBlockSelection({ editor, getPos, nodeSize: node.nodeSize });

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

  // Check if this heading should be hidden by a collapsed toggle
  const isHidden = useMemo(() => {
    const pos = getPos();
    if (pos === undefined || !parentToggleId) return false;
    return isHiddenByCollapsedToggle(editor.state.doc, pos, parentToggleId);
  }, [editor, editor.state.doc, getPos, parentToggleId]);

  // Calculate indent based on indentLevel (hierarchy + toggle grouping)
  const hierarchyIndent = indentLevel * spacing.indent;
  const toggleIndent = parentToggleId ? spacing.toggleIndent : 0;
  const indent = hierarchyIndent + toggleIndent;

  return (
    <NodeViewWrapper
      as="div"
      data-type="heading"
      data-heading-level={headingLevel}
      data-level={indentLevel}
      data-parent-toggle-id={parentToggleId}
      data-hidden={isHidden}
      className="block-handle-wrapper"
      style={{
        display: isHidden ? 'none' : 'flex',
        alignItems: 'flex-start',
        fontFamily: typography.fontFamily,
        position: 'relative',
        marginTop: styles.marginTop,
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
        as={`h${headingLevel}` as any}
        data-placeholder={placeholderText || undefined}
        style={{
          flex: 1,
          minWidth: 0,
          position: 'relative', // For CSS ::before placeholder
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          margin: 0,
        }}
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


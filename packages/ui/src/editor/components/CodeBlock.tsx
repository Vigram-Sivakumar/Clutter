/**
 * CodeBlock - React node view for code blocks
 * 
 * PHASE 4 REFACTOR: Uses shared hooks and components.
 * Full-width block with custom styling.
 * No margin - parent handles spacing via gap.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useTheme } from '../../hooks/useTheme';
import { placeholders, spacing } from '../tokens';
import { Code as CodeIcon } from '../../icons/Code';
import { usePlaceholder } from '../hooks/usePlaceholder';
import { useBlockSelection } from '../hooks/useBlockSelection';
// import { Placeholder } from './Placeholder'; // No longer used - CSS handles placeholders
import { BlockHandle } from './BlockHandle';
import { BlockSelectionHalo } from './BlockSelectionHalo';
import { isHiddenByCollapsedToggle } from '../utils/collapseHelpers';

interface CodeBlockProps extends NodeViewProps {
  node: {
    attrs: {
      language: string | null;
      parentToggleId?: string | null;
      level?: number;
    };
    textContent: string;
    childCount: number;
    nodeSize: number;
  };
}

export function CodeBlock({ node, editor, getPos, updateAttributes }: CodeBlockProps) {
  const { colors } = useTheme();
  const { language, parentToggleId, level } = node.attrs;
  
  // Check if this block is selected
  const isSelected = useBlockSelection({ editor, getPos, nodeSize: node.nodeSize });
  
  // Get placeholder text (CSS handles visibility) - use custom text for code blocks
  const placeholderText = usePlaceholder({ 
    node, 
    editor, 
    getPos,
    customText: placeholders.codeBlock
  });

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

  // Check if this code block should be hidden by a collapsed toggle
  const isHidden = useMemo(() => {
    const pos = getPos();
    if (pos === undefined || !parentToggleId) return false;
    return isHiddenByCollapsedToggle(editor.state.doc, pos, parentToggleId);
  }, [editor, editor.state.doc, getPos, parentToggleId]);

  // Calculate indent based on level (hierarchy + toggle grouping)
  const hierarchyIndent = (level || 0) * spacing.indent;
  const toggleIndent = parentToggleId ? spacing.toggleIndent : 0;
  const indent = hierarchyIndent + toggleIndent;

  return (
    <NodeViewWrapper
      as="pre"
      data-type="codeBlock"
      data-language={language}
      data-parent-toggle-id={parentToggleId}
      data-level={level}
      data-hidden={isHidden}
      className="block-handle-wrapper"
      style={{
        // No margin - parent uses gap for spacing
        display: isHidden ? 'none' : 'flex',
        padding: 16,
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border.default}`,
        borderRadius: 4,
        overflow: 'auto',
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
        position: 'relative',
        marginLeft: indent,
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

      {/* Code icon */}
      <div
        contentEditable={false}
        style={{
          position: 'relative',
          padding: spacing['4'],
          borderRadius: 3,
          // backgroundColor: colors.background.tertiary || colors.background.default,
          color: colors.marker,
          opacity: 0.4,
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <CodeIcon size={16} />
      </div>
      {/* Code content with placeholder */}
      <div style={{ position: 'relative', flex: 1 }}>
        <NodeViewContent
          as="code"
          data-placeholder={placeholderText || undefined}
          style={{
            display: 'block',
            position: 'relative', // For CSS ::before placeholder
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            fontSize: 14,
            lineHeight: 1.5,
            color: colors.text.secondary,
            whiteSpace: 'pre',
          }}
        />
        {/* Placeholder now handled by CSS via data-placeholder attribute */}
      </div>

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


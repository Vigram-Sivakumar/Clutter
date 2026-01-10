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

import { useCallback, useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { typography, spacing } from '../tokens';
import { usePlaceholder } from '../hooks/usePlaceholder';
import { useBlockSelection } from '../hooks/useBlockSelection';
// import { Placeholder } from './Placeholder'; // No longer used - CSS handles placeholders
import { BlockTagEditor } from './BlockTagEditor';
import { BlockHandle } from './BlockHandle';
import { BlockSelectionHalo } from './BlockSelectionHalo';

export function ParagraphBlock({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const tags = node.attrs.tags || [];
  const hasTags = tags.length > 0;
  const parentToggleId = node.attrs.parentToggleId || null;
  const level = node.attrs.level || 0;

  // Canonical emptiness check (ProseMirror source of truth)
  const isEmpty = node.content.size === 0;

  // Placeholder text (includes focus detection via usePlaceholder)
  const placeholderText = usePlaceholder({
    node,
    editor,
    getPos,
    customText: hasTags ? 'Start typing...' : undefined,
  });

  // Check if this block is selected
  const isSelected = useBlockSelection({
    editor,
    getPos,
    nodeSize: node.nodeSize,
  });

  // Force re-render when document updates (to react to parent toggle collapse and selection changes)
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      forceUpdate((prev) => prev + 1);
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

  const handleUpdateTags = useCallback(
    (newTags: string[]) => {
      updateAttributes({ tags: newTags });
    },
    [updateAttributes]
  );

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
      data-empty={isEmpty ? 'true' : undefined}
      data-placeholder={placeholderText || undefined}
      className="block-handle-wrapper"
      style={{
        display: 'block',
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
        style={{
          display: 'inline',
          minWidth: '1ch',
        }}
      />
      <BlockTagEditor
        tags={tags}
        onUpdate={handleUpdateTags}
        onTagClick={(editor as any).onTagClick}
      />

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

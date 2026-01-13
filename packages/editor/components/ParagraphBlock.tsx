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
import { useBlockHidden } from '../hooks/useBlockHidden';

export function ParagraphBlock({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const tags = node.attrs.tags || [];
  const hasTags = tags.length > 0;
  // 🔥 FLAT MODEL: indent is the ONLY structural attribute
  const blockIndent = node.attrs.indent ?? 0;

  // Canonical emptiness check (ProseMirror source of truth)
  const isEmpty = node.content.size === 0;

  // ❌ DISABLED: All hooks that call getPos() during transactions
  // These cause "Position X outside of fragment" on ENTER
  
  // const placeholderText = usePlaceholder({
  //   node,
  //   editor,
  //   getPos,
  //   customText: hasTags ? 'Start typing...' : undefined,
  // });
  const placeholderText = null; // Hardcoded for minimal schema test

  // const isSelected = useBlockSelection({
  //   editor,
  //   getPos,
  //   nodeSize: node.nodeSize,
  // });
  const isSelected = false; // Hardcoded for minimal schema test

  // const isHidden = useBlockHidden(editor, getPos);
  const isHidden = false; // Hardcoded for minimal schema test

  // ❌ DISABLED: Force re-render on update - fires during ENTER
  // const [, forceUpdate] = useState(0);
  //
  // useEffect(() => {
  //   const handleUpdate = () => {
  //     forceUpdate((prev) => prev + 1);
  //   };
  //
  //   editor.on('update', handleUpdate);
  //   editor.on('selectionUpdate', handleUpdate);
  //   editor.on('focus', handleUpdate);
  //   editor.on('blur', handleUpdate);
  //   return () => {
  //     editor.off('update', handleUpdate);
  //     editor.off('selectionUpdate', handleUpdate);
  //     editor.off('focus', handleUpdate);
  //     editor.off('blur', handleUpdate);
  //   };
  // }, [editor]);

  const handleUpdateTags = useCallback(
    (newTags: string[]) => {
      updateAttributes({ tags: newTags });
    },
    [updateAttributes]
  );

  // Calculate indent based on blockIndent (hierarchy)
  const indent = blockIndent * spacing.indent;

  return (
    <NodeViewWrapper
      as="div"
      data-type="paragraph"
      data-indent={blockIndent}
      data-empty={isEmpty ? 'true' : undefined}
      data-placeholder={placeholderText || undefined}
      data-hidden={isHidden ? 'true' : undefined}
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
        contentEditable={false}
        style={{
          position: 'absolute',
          left: indent - 32,
          top: 0,
          width: 32,
          height: '100%',
          pointerEvents: 'auto',
          userSelect: 'none',
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

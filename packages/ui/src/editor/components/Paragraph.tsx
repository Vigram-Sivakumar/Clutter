/**
 * Paragraph - React node view for paragraphs (nested use only)
 * 
 * This component is used for paragraphs INSIDE other blocks:
 * - ListBlock content
 * - ToggleBlock content
 * - Blockquote content
 * 
 * For TOP-LEVEL paragraphs, see ParagraphBlock.tsx which adds the block handle.
 * 
 * Note: We can't wrap this in ParagraphBlock because NodeViewWrapper must be
 * the outermost element. So ParagraphBlock duplicates this logic with the handle.
 */

import { useCallback, useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { typography } from '../tokens';
import { usePlaceholder } from '../hooks/usePlaceholder';
// import { Placeholder } from './Placeholder'; // No longer used - CSS handles placeholders
import { BlockTagEditor } from './BlockTagEditor';

export function Paragraph({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const tags = node.attrs.tags || [];
  const hasTags = tags.length > 0;
  
  // Get placeholder text (CSS handles visibility)
  const placeholderText = usePlaceholder({ 
    node, 
    editor, 
    getPos,
    customText: hasTags ? 'Start typing...' : undefined
  });

  // Force re-render on selection changes for placeholder focus detection
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    const handleUpdate = () => {
      forceUpdate(prev => prev + 1);
    };
    
    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);
    editor.on('focus', handleUpdate);
    editor.on('blur', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
      editor.off('focus', handleUpdate);
      editor.off('blur', handleUpdate);
    };
  }, [editor]);

  const handleUpdateTags = useCallback((newTags: string[]) => {
    updateAttributes({ tags: newTags });
  }, [updateAttributes]);

  return (
    <NodeViewWrapper
      as="div"
      data-type="paragraph"
      style={{
        fontFamily: typography.fontFamily,
        fontSize: typography.body,
        lineHeight: '24px',
        position: 'relative',
        // No margin - parent uses gap for spacing
      }}
    >
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
    </NodeViewWrapper>
  );
}


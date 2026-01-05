/**
 * TipTap Wrapper Component
 * 
 * Wrapper around EditorCore that provides the string-based API
 * for backward compatibility with existing code.
 * 
 * Saves content as JSON strings for better performance and easier task counting.
 * Supports loading legacy HTML content with automatic fallback.
 */

import { useMemo, useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { generateJSON } from '@tiptap/core';

// Editor imports from @clutter/editor package
import { 
  EditorCore, 
  EditorCoreHandle,
  EditorProvider,
  EditorContextValue,
  Document,
  Text,
  Paragraph,
  Heading,
  ListBlock,
  Blockquote,
  CodeBlock,
  HorizontalRule,
  ToggleHeader,
  Bold,
  Italic,
  Underline,
  Strike,
  Code as CodeMark,
  WavyUnderline,
  Link,
} from '@clutter/editor';
import { placeholders } from '@clutter/editor';
import { CustomHighlight } from '@clutter/editor';
import { TextColor } from '@clutter/editor';
import { Callout } from '@clutter/editor';

// HardBreak for line breaks (Shift+Enter)
import HardBreak from '@tiptap/extension-hard-break';

interface TipTapWrapperProps {
  value?: string;
  onChange?: (value: string) => void;
  onTagsChange?: (tags: string[]) => void; // NEW: Callback when tags in content change
  onTagClick?: (tag: string) => void; // Callback when a tag is clicked for navigation
  onNavigate?: (linkType: 'note' | 'folder', targetId: string) => void; // Callback when a note/folder link is clicked
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  isHydrating?: boolean; // Pass hydration state to prevent onChange during initial load
  onContentApplied?: () => void; // Callback when content has been loaded and applied
  editorContext: EditorContextValue; // REQUIRED: Editor context provided by app
  isFrozen?: boolean; // 🔒 Physically freeze editor DOM during note switches
}

export interface TipTapWrapperHandle {
  focus: () => void;
  scrollToBlock: (blockId: string, highlight?: boolean) => void;
}

// Extensions needed for HTML parsing/generation (must match EditorCore)
const htmlExtensions = [
  Document,
  Text,
  Paragraph,
  Heading,
  ListBlock,
  Blockquote,
  CodeBlock,
  HorizontalRule,
  HardBreak,
  Link,
  Callout,
  ToggleHeader,
  Bold,
  Italic,
  Underline,
  Strike,
  CodeMark,
  WavyUnderline,
  CustomHighlight,
  TextColor,
];

/**
 * 🛡️ Check if document has meaningful text content
 */
function hasMeaningfulText(doc: any): boolean {
  if (!doc) return false;
  
  // Convert document to plain text and check if there's actual content
  const getText = (node: any): string => {
    if (!node) return '';
    
    // If it's a text node
    if (node.text) return node.text;
    
    // Recurse into children
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(getText).join('');
    }
    
    return '';
  };
  
  const text = getText(doc).trim();
  return text.length > 0;
}

/**
 * 🛡️ Detect if this is a destructive clear operation
 * (user deleted all/most content, not a tag-specific edit)
 * 
 * Rule: Don't diff tags when user does select-all + delete
 */
function isDestructiveClear(prevContent: any, nextContent: any): boolean {
  const prevHasText = hasMeaningfulText(prevContent);
  const nextHasText = hasMeaningfulText(nextContent);
  
  // If we went from having text to having no text, this is a destructive clear
  return prevHasText && !nextHasText;
}

// Helper function to extract all tags from document content
function extractTagsFromContent(content: any): string[] {
  const tags: string[] = [];
  
  if (!content || !content.content) return tags;
  
  // Recursively walk through all nodes
  const walkNodes = (node: any) => {
    // If this node has tags attribute, collect them
    if (node.attrs && Array.isArray(node.attrs.tags)) {
      tags.push(...node.attrs.tags);
    }
    
    // Recursively walk children
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(walkNodes);
    }
  };
  
  walkNodes(content);
  
  // Return unique tags (case-insensitive)
  const uniqueTags = Array.from(
    new Map(tags.map(tag => [tag.toLowerCase(), tag])).values()
  );
  
  return uniqueTags;
}

// 🎯 CANONICAL EMPTY DOCUMENT
// TipTap must NEVER receive null - always a valid ProseMirror document
const EMPTY_DOC = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      attrs: { id: 'empty-paragraph' },
      content: [],
    },
  ],
};

export const TipTapWrapper = forwardRef<TipTapWrapperHandle, TipTapWrapperProps>(({
  value,
  onChange,
  onTagsChange,
  onTagClick,
  onNavigate,
  onFocus,
  onBlur,
  autoFocus = false,
  isHydrating = false,
  onContentApplied,
  editorContext,
  isFrozen = false,
}, ref) => {
  const previousTags = useRef<string[]>([]);
  const previousContent = useRef<object | null>(null);
  const editorCoreRef = useRef<EditorCoreHandle>(null);
  const isUpdatingFromEditor = useRef(false);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      editorCoreRef.current?.focus();
    },
    scrollToBlock: (blockId: string, highlight?: boolean) => {
      editorCoreRef.current?.scrollToBlock(blockId, highlight);
    },
  }));

  // Parse value into content object (simple, deterministic)
  // Editor mounts once - documents flow through it
  const content = useMemo(() => {
    // 🎯 FIX: NEVER return null - TipTap must always receive valid document
    if (!value) {
      if (import.meta.env.DEV) {
        console.log('[EDITOR] Using EMPTY_DOC (no value provided)');
      }
      return EMPTY_DOC;
    }
    
    // Don't re-parse if this came from our own onChange
    if (isUpdatingFromEditor.current) {
      isUpdatingFromEditor.current = false;
      return null; // Keep current editor content (don't re-initialize)
    }
    
    try {
      // Try to parse as JSON first (new format)
      return JSON.parse(value);
    } catch (jsonError) {
      try {
        // Fallback to HTML parsing (legacy format)
        return generateJSON(value, htmlExtensions);
      } catch (htmlError) {
        console.error('❌ TipTapWrapper: Failed to parse document, using EMPTY_DOC', htmlError);
        return EMPTY_DOC;
      }
    }
  }, [value]);

  // Initialize previousContent when content changes from parent (for destructive clear detection)
  useEffect(() => {
    if (content && !isUpdatingFromEditor.current) {
      previousContent.current = content;
    }
  }, [content]);

  // Handle content changes - save as JSON string (not HTML)
  const handleChange = useCallback((newContent: object) => {
    // 🛡️ Block onChange during parent hydration
    if (isHydrating) {
      return;
    }
    
    // 🛡️ GUARD: Skip tag diffing for destructive clear operations
    // (Select-all + Delete should not wipe tags - that's a structural edit, not tag edit)
    const isDestructive = isDestructiveClear(previousContent.current, newContent);
    
    if (isDestructive && import.meta.env.DEV) {
      console.log('[TAGS] Skipping tag diff — destructive clear detected');
    }
    
    // Extract tags from content (unless this is a destructive clear)
    if (!isDestructive) {
      const extractedTags = extractTagsFromContent(newContent);
      
      // Check if tags have changed
      const tagsChanged = 
        extractedTags.length !== previousTags.current.length ||
        extractedTags.some((tag, i) => tag.toLowerCase() !== previousTags.current[i]?.toLowerCase());
      
      if (tagsChanged && onTagsChange) {
        previousTags.current = extractedTags;
        onTagsChange(extractedTags);
      }
    }
    
    // Update previous content for next comparison
    previousContent.current = newContent;
    
    if (onChange) {
      try {
        // Save as JSON string for task counting and better performance
        const jsonString = JSON.stringify(newContent);
        
        // Set flag before calling onChange to prevent circular update in useMemo
        isUpdatingFromEditor.current = true;
        onChange(jsonString);
      } catch (error) {
        // Silently fail
      }
    }
  }, [onChange, onTagsChange, isHydrating]);

  return (
    <EditorProvider value={editorContext}>
      <EditorCore
        ref={editorCoreRef}
        content={content}
        onChange={handleChange}
        onTagClick={onTagClick}
        onNavigate={onNavigate}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholders.default}
        editable={!isFrozen}
      />
    </EditorProvider>
  );
});


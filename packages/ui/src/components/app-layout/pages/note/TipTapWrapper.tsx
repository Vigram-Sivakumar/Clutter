/**
 * TipTap Wrapper Component
 * 
 * Wrapper around EditorCore that provides the string-based API
 * for backward compatibility with existing code.
 * 
 * Saves content as JSON strings for better performance and easier task counting.
 * Supports loading legacy HTML content with automatic fallback.
 */

import { useMemo, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
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

/**
 * 🔧 DOM Selection Normalizer
 * 
 * PROBLEM:
 * When ProseMirror transitions from NodeSelection (block mode) to TextSelection (text mode),
 * the browser's DOM selection doesn't automatically follow. This leaves stale block-level
 * selections active, causing the "sticky blue halo" bug.
 * 
 * SOLUTION:
 * Explicitly collapse DOM selection to ensure it's in a valid state for text editing.
 * This must be called at all recovery points where content changes programmatically.
 * 
 * WHEN TO CALL:
 * - When EMPTY_DOC is injected
 * - When content === null (editor-origin updates)
 * - On first user keystroke after block selection
 */
function normalizeDomSelection(): void {
  try {
    const selection = window.getSelection();
    if (!selection) return;
    
    // If selection is anchored to an element (not text), collapse it
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (range.startContainer.nodeType !== Node.TEXT_NODE) {
        // Collapse selection to remove any block-level highlighting
        selection.removeAllRanges();
      }
    }
  } catch (err) {
    // Silently fail - selection normalization is best-effort
  }
}

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
      // 🔧 Normalize DOM selection when injecting empty doc
      normalizeDomSelection();
      return EMPTY_DOC;
    }
    
    // Don't re-parse if this came from our own onChange
    if (isUpdatingFromEditor.current) {
      isUpdatingFromEditor.current = false;
      // 🔧 Normalize DOM selection even when keeping current content
      // This prevents stale block selections from persisting
      normalizeDomSelection();
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
        // 🔧 Normalize DOM selection when falling back to empty doc
        normalizeDomSelection();
        return EMPTY_DOC;
      }
    }
  }, [value]);

  // Handle content changes - save as JSON string (not HTML)
  const handleChange = useCallback((newContent: object) => {
    // 🛡️ Block onChange during parent hydration
    if (isHydrating) {
      return;
    }
    
    // 🔧 Normalize DOM selection on first user edit
    // This ensures typing after block selection works correctly
    normalizeDomSelection();
    
    // Extract tags from content
    const extractedTags = extractTagsFromContent(newContent);
    
    // Check if tags have changed
    const tagsChanged = 
      extractedTags.length !== previousTags.current.length ||
      extractedTags.some((tag, i) => tag.toLowerCase() !== previousTags.current[i]?.toLowerCase());
    
    if (tagsChanged && onTagsChange) {
      previousTags.current = extractedTags;
      onTagsChange(extractedTags);
    }
    
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


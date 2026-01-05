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
 * Force DOM selection to collapse to a valid text position
 * This prevents "sticky halo" bugs where browser selection stays anchored to DIV
 * even after ProseMirror transitions from NodeSelection → TextSelection
 */
function normalizeDomSelection(): void {
  try {
    const selection = window.getSelection();
    if (!selection) return;
    
    // If selection is already collapsed to a text node, no action needed
    if (selection.isCollapsed && selection.anchorNode?.nodeType === Node.TEXT_NODE) {
      return;
    }
    
    // Collapse to start (removes any block-level selection)
    selection.removeAllRanges();
    
    // Browser will place cursor at the start of the first editable position
    // ProseMirror will then take over and manage it properly
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
  const hasUserEditedSinceNormalization = useRef(false);

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
      // 🔧 Normalize selection when injecting empty doc (prevents sticky halo)
      normalizeDomSelection();
      hasUserEditedSinceNormalization.current = false; // Reset flag for next user edit
      return EMPTY_DOC;
    }
    
    // Don't re-parse if this came from our own onChange
    if (isUpdatingFromEditor.current) {
      isUpdatingFromEditor.current = false;
      // 🔧 Normalize selection even when keeping current content (fixes cross-update bleed)
      normalizeDomSelection();
      return null; // Keep current editor content (don't re-initialize)
    }
    
    // 🔄 External content update (note switch, hydration) - reset normalization flag
    hasUserEditedSinceNormalization.current = false;
    
    try {
      // Try to parse as JSON first (new format)
      return JSON.parse(value);
    } catch (jsonError) {
      try {
        // Fallback to HTML parsing (legacy format)
        return generateJSON(value, htmlExtensions);
      } catch (htmlError) {
        console.error('❌ TipTapWrapper: Failed to parse document, using EMPTY_DOC', htmlError);
        // 🔧 Normalize selection on parse failure
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
    
    // 🔧 On first user edit after programmatic update, normalize selection
    // This catches any stale block-level selections that survived the update
    if (!hasUserEditedSinceNormalization.current) {
      normalizeDomSelection();
      hasUserEditedSinceNormalization.current = true;
    }
    
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


/**
 * TipTap Wrapper Component
 * 
 * Wrapper around EditorCore that provides the string-based API
 * for backward compatibility with existing code.
 * 
 * Saves content as JSON strings for better performance and easier task counting.
 * Supports loading legacy HTML content with automatic fallback.
 */

import { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
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
  onBlur?: () => void;
  autoFocus?: boolean;
  isHydrating?: boolean; // Pass hydration state to prevent onChange during initial load
  onContentApplied?: () => void; // Callback when content has been loaded and applied
  editorContext: EditorContextValue; // REQUIRED: Editor context provided by app
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

export const TipTapWrapper = forwardRef<TipTapWrapperHandle, TipTapWrapperProps>(({
  value,
  onChange,
  onTagsChange,
  onTagClick,
  onNavigate,
  autoFocus = false,
  isHydrating = false,
  onContentApplied,
  editorContext,
}, ref) => {
  const [content, setContent] = useState<object | null>(null);
  const previousValue = useRef<string | undefined>(undefined);
  const previousTags = useRef<string[]>([]);
  const editorCoreRef = useRef<EditorCoreHandle>(null);
  const isUpdatingFromEditor = useRef(false);
  const isInitializing = useRef(true); // Explicit initialization phase (hard gate)
  const hasInitialized = useRef(false); // Single-shot initialization flag

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      editorCoreRef.current?.focus();
    },
    scrollToBlock: (blockId: string, highlight?: boolean) => {
      editorCoreRef.current?.scrollToBlock(blockId, highlight);
    },
  }));

  // Parse JSON string to content object when value changes (single-shot initialization)
  useEffect(() => {
    console.log('🔄 TipTapWrapper useEffect triggered:', {
      hasValue: !!value,
      valueLength: value?.length || 0,
      previousLength: previousValue.current?.length || 0,
      isUpdatingFromEditor: isUpdatingFromEditor.current,
      valuesEqual: value === previousValue.current,
      hasInitialized: hasInitialized.current
    });
    
    // 🔄 Detect document change (e.g., note switch) - reset initialization
    if (hasInitialized.current && value !== previousValue.current) {
      console.log('🔄 Document changed, resetting initialization for new note');
      hasInitialized.current = false;
      previousValue.current = undefined; // Clear previous to force re-init
    }
    
    // 🛡️ CRITICAL: Editor only mounts once per document
    // After initial mount, editor owns its state
    if (hasInitialized.current) {
      console.log('⏭️ Skipping: Editor already initialized (single-shot)');
      return;
    }
    
    // 🛡️ CRITICAL: Do nothing until real content arrives
    // Parent must provide valid document (never undefined, never "")
    if (!value) {
      console.log('⏭️ Skipping: No document provided');
      return;
    }
    
    // Don't update if this value change came from our own onChange (prevents circular updates that strip trailing spaces)
    if (isUpdatingFromEditor.current) {
      isUpdatingFromEditor.current = false; // Clear flag for next external update
      console.log('⏭️ Skipping: isUpdatingFromEditor=true');
      return;
    }
    
    // Initialize with the new document
    previousValue.current = value;
    
    try {
        // Try to parse as JSON first (new format)
        console.log('🔧 TipTapWrapper: Initializing editor atomically');
        
        // 🔒 Enter initialization phase (hard gate)
        isInitializing.current = true;
        
        const json = JSON.parse(value);
        setContent(json);
        hasInitialized.current = true;
        console.log('✅ TipTapWrapper: Editor initialized (atomic)');
        
        // 🔓 Exit initialization phase after React + ProseMirror settle
        requestAnimationFrame(() => {
          isInitializing.current = false;
          console.log('🔓 TipTapWrapper: Initialization complete, editor unlocked');
          if (onContentApplied) {
            onContentApplied();
          }
        });
      } catch (error) {
        // Fallback: try to parse as HTML (legacy format)
        try {
          isInitializing.current = true;
          const json = generateJSON(value, htmlExtensions);
          setContent(json);
          hasInitialized.current = true;
          console.log('✅ TipTapWrapper: Editor initialized (HTML fallback)');
          requestAnimationFrame(() => {
            isInitializing.current = false;
            if (onContentApplied) {
              onContentApplied();
            }
          });
        } catch (htmlError) {
          console.error('❌ TipTapWrapper: Failed to parse document', htmlError);
          // If we can't parse, we can't initialize - parent must provide valid document
        }
      }
  }, [value, onContentApplied]);

  // Handle content changes - save as JSON string (not HTML)
  const handleChange = useCallback((newContent: object) => {
    setContent(newContent);
    
    // 🛡️ ATOMIC GATE: Hard-block onChange during initialization phase
    // This prevents ProseMirror normalization transactions from escaping
    if (isInitializing.current) {
      return; // Hard stop - no logging, no processing, no side effects
    }
    
    // 🛡️ Block onChange during parent hydration
    if (isHydrating) {
      return;
    }
    
    console.log('✍️ TipTapWrapper: User edit detected, calling onChange');
    
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
        previousValue.current = jsonString; // Update previous value to prevent sync loop
        
        // Set flag before calling onChange to prevent circular update in useEffect
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
        placeholder={placeholders.default}
        editable={true}
      />
    </EditorProvider>
  );
});


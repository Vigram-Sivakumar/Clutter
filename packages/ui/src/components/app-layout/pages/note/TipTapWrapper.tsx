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
import { generateHTML, generateJSON } from '@tiptap/core';

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
  const isProgrammaticUpdate = useRef(true); // Start locked to block editor boot output
  const ignoreNextUpdate = useRef(true); // Ignore first synthetic transaction after mount
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
    
    // Only update if the value has actually changed
    if (value !== previousValue.current) {
      // Semantic comparison - parse both and compare
      let valueJson, previousJson;
      try {
        valueJson = value ? JSON.parse(value) : null;
        previousJson = previousValue.current ? JSON.parse(previousValue.current) : null;
        
        // If content is semantically the same, don't update (prevents history clearing)
        // ✅ FIX: Don't skip on initial mount (previousValue.current === undefined)
        // This ensures we always unlock isProgrammaticUpdate on first load
        if (previousValue.current !== undefined && JSON.stringify(valueJson) === JSON.stringify(previousJson)) {
          console.log('⏭️ Skipping: Content semantically equal');
          previousValue.current = value; // Update ref to prevent repeated checks
          return;
        }
      } catch {
        // If parsing fails, fall through to string comparison
      }
      
      console.log('📖 TipTapWrapper: Loading new content:', {
        hasValue: !!value,
        valueLength: value?.length || 0,
        valuePreview: value?.substring(0, 100),
        previousLength: previousValue.current?.length || 0
      });
      
      console.log('✅ Passed all checks, will load content into editor');
      previousValue.current = value;
      
      try {
        // Try to parse as JSON first (new format)
        isProgrammaticUpdate.current = true;
        ignoreNextUpdate.current = true;
        const json = JSON.parse(value);
        setContent(json);
        hasInitialized.current = true; // ✅ Mark as initialized (single-shot)
        console.log('✅ TipTapWrapper: Content parsed as JSON, editor initialized');
        requestAnimationFrame(() => {
          isProgrammaticUpdate.current = false;
          if (onContentApplied) {
            onContentApplied();
          }
        });
      } catch (error) {
        // Fallback: try to parse as HTML (legacy format)
        try {
          isProgrammaticUpdate.current = true;
          ignoreNextUpdate.current = true;
          const json = generateJSON(value, htmlExtensions);
          setContent(json);
          hasInitialized.current = true; // ✅ Mark as initialized (single-shot)
          console.log('✅ TipTapWrapper: Content parsed as HTML, editor initialized');
          requestAnimationFrame(() => {
            isProgrammaticUpdate.current = false;
            if (onContentApplied) {
              onContentApplied();
            }
          });
        } catch (htmlError) {
          console.error('❌ TipTapWrapper: Failed to parse document', htmlError);
          // If we can't parse, we can't initialize - parent must provide valid document
        }
      }
    } else {
      console.log('⏭️ Skipping: value === previousValue.current');
    }
  }, [value]);

  // Handle content changes - save as JSON string (not HTML)
  const handleChange = useCallback((newContent: object) => {
    setContent(newContent);
    
    // 🛡️ CRITICAL: Ignore editor boot / programmatic updates
    if (isProgrammaticUpdate.current) {
      console.log('🚫 TipTapWrapper: Ignoring change (isProgrammaticUpdate=true)');
      return;
    }
    
    // 🛡️ Ignore first synthetic transaction after mount/content load
    // BUT: Don't ignore if content has significantly changed (user deletion)
    if (ignoreNextUpdate.current) {
      const newContentStr = JSON.stringify(newContent);
      const prevContentStr = previousValue.current || '';
      const lengthDiff = Math.abs(newContentStr.length - prevContentStr.length);
      
      // If content changed by more than 50 chars, it's a real user edit (deletion)
      if (lengthDiff > 50) {
        ignoreNextUpdate.current = false;
        // Continue processing
      } else {
        ignoreNextUpdate.current = false;
        console.log('🚫 TipTapWrapper: Ignoring first synthetic update (ProseMirror normalization)');
        return;
      }
    }
    
    // 🛡️ CRITICAL: Block onChange during hydration (prevents empty boot state from overwriting real content)
    console.log('🔍 isHydrating check:', isHydrating);
    if (isHydrating) {
      console.log('🚫 TipTapWrapper: Ignoring change (isHydrating=true)');
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


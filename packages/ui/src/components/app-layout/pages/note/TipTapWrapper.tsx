/**
 * TipTap Wrapper Component
 *
 * Wrapper around EditorCore that provides the string-based API
 * for backward compatibility with existing code.
 *
 * Saves content as JSON strings for better performance and easier task counting.
 * Supports loading legacy HTML content with automatic fallback.
 */

import {
  useMemo,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
} from 'react';

// Editor imports from @clutter/editor package
import {
  EditorCore,
  EditorCoreHandle,
  EditorProvider,
  EditorContextValue,
} from '@clutter/editor';
import { placeholders } from '@clutter/editor';
import type { Editor } from '@tiptap/core';

// 🎯 Phase 3 - Step 2: Slash menu UI
import { SlashMenu } from '../../editor/slash/SlashMenu';

interface TipTapWrapperProps {
  value?: string;
  noteId?: string | null; // 🔒 Track note ID to detect note changes (not content changes)
  onChange?: (_value: string) => void;
  onTagsChange?: (_tags: string[]) => void; // NEW: Callback when tags in content change
  onTagClick?: (_tag: string) => void; // Callback when a tag is clicked for navigation
  onNavigate?: (_linkType: 'note' | 'folder', _targetId: string) => void; // Callback when a note/folder link is clicked
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
  scrollToBlock: (_blockId: string, _highlight?: boolean) => void;
}

// 🎯 PHASE 3: Slash command state (isolated & minimal)
type SlashState = {
  open: boolean;
  query: string;
  from: number;
};

// 🚫 REMOVED: htmlExtensions + generateJSON()
// These were creating a duplicate schema that crashed before EditorCore mounted.
// ProseMirror JSON is already the canonical format - no parsing needed.

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
    new Map(tags.map((tag) => [tag.toLowerCase(), tag])).values()
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
function _normalizeDomSelection(): void {
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

export const TipTapWrapper = forwardRef<
  TipTapWrapperHandle,
  TipTapWrapperProps
>(
  (
    {
      value,
      noteId,
      onChange,
      onTagsChange,
      onTagClick,
      onNavigate,
      onFocus,
      onBlur,
      autoFocus: _autoFocus = false,
      isHydrating = false,
      onContentApplied: _onContentApplied,
      editorContext,
      isFrozen = false,
    },
    ref
  ) => {
    // 1️⃣ Refs that DON'T depend on derived values
    const previousTags = useRef<string[]>([]);
    const editorCoreRef = useRef<EditorCoreHandle>(null);
    const isUpdatingFromEditor = useRef(false);

    // 🎯 PHASE 3 - STEP 1: Slash command state (detection only, no UI)
    const [slash, setSlash] = useState<SlashState>({
      open: false,
      query: '',
      from: -1,
    });

    // 🎯 PHASE 3 - STEP 2: Slash menu coordinates (for positioning UI)
    const [slashCoords, setSlashCoords] = useState<{
      top: number;
      left: number;
    } | null>(null);

    // 2️⃣ Derive content FIRST (before any usage)
    // 🔒 CRITICAL: Parse content ONLY when NOTE changes, not on every keystroke
    // Dependency on noteId (NOT value) ensures content only updates when loading a different note
    const content = useMemo(() => {
      // Skip if this is our own onChange firing back
      if (isUpdatingFromEditor.current) {
        isUpdatingFromEditor.current = false;
        return undefined; // undefined = "keep current content"
      }

      console.log('[TipTapWrapper] Loading content for noteId:', noteId);

      // Use the incoming value directly (already ProseMirror JSON)
      if (!value) {
        return EMPTY_DOC;
      }

      try {
        // Parse JSON string to object
        return JSON.parse(value);
      } catch (error) {
        console.error(
          '❌ TipTapWrapper: Invalid JSON content, using EMPTY_DOC',
          error
        );
        return EMPTY_DOC;
      }
    }, [noteId]); // 🔒 Changes ONLY when noteId changes, NOT on every keystroke

    // 3️⃣ Refs that depend on derived values
    // 🔒 Keep stable reference to content for imperative setting
    const contentRef = useRef(content);

    // 4️⃣ Expose methods to parent
    useImperativeHandle(ref, () => ({
      focus: () => {
        editorCoreRef.current?.focus();
      },
      scrollToBlock: (blockId: string, highlight?: boolean) => {
        editorCoreRef.current?.scrollToBlock(blockId, highlight);
      },
    }));

    // 5️⃣ Effects that use derived values
    // 🔒 Update content ref whenever it changes
    useEffect(() => {
      contentRef.current = content;
    }, [content]);

    // 6️⃣ Imperative sync on note change
    // 🔒 CRITICAL: Set content imperatively when NOTE changes (not on every keystroke)
    // This prevents EditorCore from unmounting/remounting
    useEffect(() => {
      if (!editorCoreRef.current || !content) return;

      console.log(
        '[TipTapWrapper] Setting content imperatively for noteId:',
        noteId
      );
      editorCoreRef.current.setContent(content);
    }, [noteId]); // ✅ Only when noteId changes, not content

    // Handle content changes - save as JSON string (not HTML)
    const handleChange = useCallback(
      (newContent: object) => {
        // 🛡️ Block onChange during parent hydration
        if (isHydrating) {
          return;
        }

        // ❌ REMOVED: normalizeDomSelection() was removing the caret from empty paragraphs!
        // This was being called on EVERY keystroke and removing selection from element nodes
        // which prevented clicking on empty paragraphs and made the caret disappear after Enter

        // Extract tags from content
        const extractedTags = extractTagsFromContent(newContent);

        // Check if tags have changed
        const tagsChanged =
          extractedTags.length !== previousTags.current.length ||
          extractedTags.some(
            (tag, i) =>
              tag.toLowerCase() !== previousTags.current[i]?.toLowerCase()
          );

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
      },
      [onChange, onTagsChange, isHydrating]
    );

    // 🎯 PHASE 3 - STEP 2: Slash detection + coordinate computation
    const handleEditorUpdate = useCallback(
      (editor: Editor) => {
        const { state, view } = editor;
        const { selection } = state;

        // Guard: only collapsed cursor (no text selection)
        if (!selection.empty) {
          if (slash.open) {
            setSlash({ open: false, query: '', from: -1 });
            setSlashCoords(null);
          }
          return;
        }

        const { from } = selection;
        const $pos = state.doc.resolve(from);
        const parent = $pos.parent;

        // Guard: only in text blocks
        if (!parent.isTextblock) {
          if (slash.open) {
            setSlash({ open: false, query: '', from: -1 });
            setSlashCoords(null);
          }
          return;
        }

        const textBefore = parent.textBetween(0, $pos.parentOffset, '\n', '\n');
        const match = textBefore.match(/\/([a-zA-Z]*)$/);

        if (!match) {
          if (slash.open) {
            setSlash({ open: false, query: '', from: -1 });
            setSlashCoords(null);
          }
          return;
        }

        // Compute cursor coordinates for menu positioning
        const coords = view.coordsAtPos(from);

        setSlash({
          open: true,
          query: match[1],
          from,
        });

        setSlashCoords({
          top: coords.bottom,
          left: coords.left,
        });

        // 🧪 DEBUG: Temporary log to verify detection (remove after testing)
        if (process.env.NODE_ENV === 'development') {
          console.log('[Slash]', { open: true, query: match[1], from });
        }
      },
      [slash.open]
    );

    return (
      <>
        <EditorProvider value={editorContext}>
          {/* ❌ REMOVED: content prop causes unmount/remount on note switch */}
          {/* ✅ Content is now set imperatively via ref.current.setContent() */}
          <EditorCore
            ref={editorCoreRef}
            onChange={handleChange}
            onEditorUpdate={handleEditorUpdate}
            onTagClick={onTagClick}
            onNavigate={onNavigate}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholders.default}
            editable={!isFrozen}
          />
        </EditorProvider>

        {/* 🎯 PHASE 3 - STEP 2: Slash menu UI (sibling, NOT inside editor) */}
        <SlashMenu open={slash.open} query={slash.query} coords={slashCoords} />
      </>
    );
  }
);

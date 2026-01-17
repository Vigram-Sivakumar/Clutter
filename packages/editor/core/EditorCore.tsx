/**
 * EditorCore - Main Tiptap editor component
 *
 * Core editor with all extensions, plugins, and behavior.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔒 SELECTION INVARIANT (ARCHITECTURAL LAW)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ProseMirror:
 *   - TextSelection ONLY
 *   - NEVER NodeSelection
 *
 * Block selection:
 *   - Represented by blockId(s) in the Engine
 *   - Reflected visually via UI (halo)
 *   - PM selection does NOT change when halo is clicked
 *
 * Keyboard / Delete / Backspace:
 *   - Operate on Engine block selection (blockId-based)
 *   - Never rely on PM NodeSelection
 *   - PM selection remains TextSelection at all times
 *
 * WHY THIS MATTERS:
 *   Model owns truth. View reflects it. Never the reverse.
 *   NodeSelection leaks view authority into the model, causing:
 *   - Delete breaking backspace
 *   - Backspace breaking delete
 *   - Enter breaking lists
 *   - Cascading selection bugs
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, {
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

export interface EditorCoreHandle {
  focus: () => void;
  scrollToBlock: (_blockId: string, _highlight?: boolean) => void;
}

// Extensions - all block types enabled
import { Document } from '../extensions/nodes/Document';
import { Text } from '../extensions/nodes/Text';
import { Paragraph } from '../extensions/nodes/Paragraph';
import { Heading } from '../extensions/nodes/Heading';
import { Blockquote } from '../extensions/nodes/Blockquote';
import { ListBlock } from '../extensions/nodes/ListBlock';
import { CodeBlock } from '../extensions/nodes/CodeBlock';
import { HorizontalRule } from '../extensions/nodes/HorizontalRule';
import { Link } from '../extensions/marks/Link';
import { Callout } from '../extensions/nodes/Callout';
import { Bold } from '../extensions/marks/Bold';
import { Italic } from '../extensions/marks/Italic';
import { Underline } from '../extensions/marks/Underline';
import { Strike } from '../extensions/marks/Strike';
import { Code } from '../extensions/marks/Code';
import { WavyUnderline } from '../extensions/marks/WavyUnderline';
import { CustomHighlight } from '../extensions/marks/Highlight';
import { TextColor } from '../extensions/marks/TextColor';
import { DateMention as DateMentionNode } from '../extensions/nodes/DateMention';
import { NoteLink } from '../extensions/nodes/NoteLink';
import Gapcursor from '@tiptap/extension-gapcursor';
import History from '@tiptap/extension-history';
import { MarkdownShortcuts } from '../plugins/MarkdownShortcuts';

// Keyboard plugins (enabled for Apple Notes architecture)
import { BackspaceHandler } from '../plugins/BackspaceHandler';
import { TabHandler } from '../plugins/TabHandler';
import { KeyboardShortcuts } from '../plugins/KeyboardShortcuts';
import { BlockIdGenerator } from '../extensions/BlockIdGenerator';

// All plugins enabled (except UndoRedo - using TipTap History instead)
import { SlashCommands } from '../plugins/SlashCommands';
import { TaskPriority } from '../plugins/TaskPriority';
import { EscapeMarks } from '../plugins/EscapeMarks';
import { DoubleSpaceEscape } from '../plugins/DoubleSpaceEscape';
import { HashtagDetection } from '../plugins/HashtagDetection';
import { HashtagAutocomplete } from '../plugins/HashtagAutocomplete';
import { AtMention } from '../plugins/AtMention';
import { SelectAll } from '../plugins/SelectAll';
import { BlockDeletion } from '../plugins/BlockDeletion';
// import { UndoRedo } from '../plugins/UndoRedo'; // ❌ Disabled - using TipTap History

import { CollapseExtension } from '../extensions/CollapseExtension';

// UI Components
import { SlashCommandMenu } from '../components/SlashCommandMenu';
import { AtMentionMenu } from '../components/AtMentionMenu';
import { FloatingToolbar } from '@clutter/ui';

// Tokens
import { spacing, typography, placeholders } from '../tokens';
import { useTheme } from '@clutter/ui';

// Editor Context
import { useEditorContext } from '../context/EditorContext';

// HardBreak extension for line breaks (Shift+Enter)
import HardBreak from '@tiptap/extension-hard-break';

interface EditorCoreProps {
  content?: object | null;
  onChange?: (_content: object) => void;
  onTagClick?: (_tag: string) => void; // Callback when a tag is clicked for navigation
  onNavigate?: (_linkType: 'note' | 'folder', _targetId: string) => void; // Callback when a note/folder link is clicked
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const EditorCore = forwardRef<EditorCoreHandle, EditorCoreProps>(
  (
    {
      content,
      onChange,
      onTagClick,
      onNavigate,
      onFocus,
      onBlur,
      // placeholder prop kept for API compatibility but not used
      // (placeholders are handled by individual React components)
      placeholder: _placeholder = placeholders.default,
      editable = true,
      className,
      style,
    },
    ref
  ) => {
    const { colors } = useTheme();
    const { availableTags } = useEditorContext();

    // Track if we're updating from the editor (to prevent clearing history)
    const isInternalUpdate = useRef(false);

    // Track if editor has been hydrated (Apple Notes rule: hydrate once, ignore after)
    const hasHydratedRef = useRef(false);

    // Create editor instance
    const editor = useEditor({
      extensions: [
        // Core nodes
        Document,
        Text,
        Paragraph,
        Heading,
        ListBlock,
        Blockquote,
        CodeBlock,
        HorizontalRule,
        Callout,
        DateMentionNode,
        NoteLink.configure({
          onNavigate,
        }),

        // Built-in TipTap extensions
        HardBreak.configure({
          keepMarks: true,
        }),
        Gapcursor,
        History,

        // Marks
        Bold,
        Italic,
        Underline,
        Strike,
        Code,
        Link,
        WavyUnderline,
        TextColor,
        CustomHighlight,

        // Input rules
        MarkdownShortcuts,

        // Keyboard plugins
        BlockIdGenerator, // Auto-generate blockId for all blocks
        KeyboardShortcuts, // Centralized Tab/Shift+Tab → indent/outdent intents
        TabHandler, // Fallback Tab handler - prevents focus navigation
        BackspaceHandler, // Handle backspace behavior

        // All other plugins
        SlashCommands,
        TaskPriority, // Highlight priority indicators (!, !!, !!!) in tasks
        EscapeMarks,
        DoubleSpaceEscape,
        SelectAll, // Progressive Cmd+A: block text → block node → all blocks
        BlockDeletion, // Handle DELETE/Backspace for node-selected blocks
        HashtagDetection, // Simple #tag detection (moves to metadata)
        HashtagAutocomplete.configure({
          getColors: () => colors,
          getTags: () => availableTags,
        }),
        AtMention.configure({
          getColors: () => colors,
        }),

        // Collapse plugin (wrapped as TipTap extension)
        CollapseExtension,
      ] as any[],
      content: content || {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
      editable,
      editorProps: {
        attributes: {
          class: 'editor-content',
        },
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 🔑 Tab handling is done by TipTap extensions (KeyboardShortcuts)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //
        // We do NOT preventDefault here at the ProseMirror level.
        // Instead, TipTap extensions decide:
        //   - KeyboardShortcuts (priority 1000): handles indent/outdent intents
        //     → returns result.handled (true = consume, false = fallback)
        //   - TabHandler (priority 100): fallback to prevent focus navigation
        //     → only runs if KeyboardShortcuts returns false
        //
        // This allows proper fallback when indent is blocked:
        //   Intent blocked → result.handled = false → browser handles Tab
        //
        // CRITICAL: ProseMirror handleKeyDown runs BEFORE TipTap extensions.
        // If we preventDefault here, TipTap never gets to decide fallback.
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        handleKeyDown(_view, _event) {
          return false; // Let TipTap extensions handle all keys
        },
        handleDOMEvents: {
          // ❌ REMOVED mousedown preventDefault - it prevented clicking into empty blocks
          // ProseMirror handles its own selection and mousedown behavior
          // We don't need to prevent default browser behavior
          focus: () => {
            onFocus?.();
            return false; // Allow default focus behavior
          },
          blur: () => {
            onBlur?.();
            return false; // Allow default blur behavior
          },
        },
      },
      onUpdate: ({ editor, transaction }) => {
        // Only fire onChange if document actually changed (not just selection)
        if (onChange && transaction.docChanged) {
          // Mark that this update is coming from the editor (internal)
          isInternalUpdate.current = true;
          onChange(editor.getJSON());
          // Reset flag after a short delay to allow parent to update prop
          setTimeout(() => {
            isInternalUpdate.current = false;
          }, 0);
        }
      },
      onSelectionUpdate: ({ editor: _editor, transaction: _transaction }) => {
        // Selection update callback (can be used for future selection tracking)
      },
    });

    // Apple Notes Architecture: No engine/resolver needed
    // Keyboard shortcuts use direct ProseMirror transactions

    // Store onTagClick callback in editor instance so node views can access it
    useEffect(() => {
      if (editor) {
        (editor as any).onTagClick = onTagClick;
      }
    }, [editor, onTagClick]);

    // Expose methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          if (editor) {
            const { doc } = editor.state;
            const lastNode = doc.lastChild;
            const isLastBlockEmpty =
              lastNode && lastNode.textContent.trim() === '';

            if (isLastBlockEmpty) {
              // Just focus the existing empty block
              editor.commands.focus('end');
            } else {
              // Create a new paragraph and focus it
              editor.commands.focus('end');
              editor.commands.insertContentAt(doc.content.size, {
                type: 'paragraph',
              });
              editor.commands.focus('end');
            }
          }
        },
        scrollToBlock: (blockId: string, highlight: boolean = true) => {
          if (!editor) return;

          // Find the block position in the document by blockId
          const { doc } = editor.state;
          let blockPos: number | null = null;

          doc.descendants((node, pos) => {
            if (node.attrs?.blockId === blockId) {
              blockPos = pos;
              return false; // Stop searching
            }
            return true;
          });

          if (blockPos === null) return;

          // Find the DOM element with data-block-id attribute for scrolling
          const blockElement = document.querySelector(
            `[data-block-id="${blockId}"]`
          );

          if (blockElement) {
            // Scroll into view if not visible
            const rect = blockElement.getBoundingClientRect();
            const isInViewport =
              rect.top >= 0 && rect.bottom <= window.innerHeight;

            if (!isInViewport) {
              blockElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            }
          }

          // Highlight the block by selecting it (shows the blue halo)
          if (highlight) {
            // Use NodeSelection to select the entire block (triggers halo effect)
            const tr = editor.state.tr.setSelection(
              NodeSelection.create(doc, blockPos)
            );
            editor.view.dispatch(tr);
            editor.view.focus();

            // Selection persists until user manually clicks elsewhere
          }
        },
      }),
      [editor]
    );

    // Hydrate editor once (Apple Notes rule: ignore silently after first hydration)
    useEffect(() => {
      if (!editor || !content) return;

      if (hasHydratedRef.current) {
        return; // Apple Notes rule: ignore silently
      }

      hasHydratedRef.current = true;
      editor.commands.setContent(content, false);
    }, [editor]);

    // Update editable state
    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
    }, [editable, editor]);

    // 🔬 FORENSIC: Log selection on focus events

    // Handle click on empty space to focus editor
    const handleWrapperClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!editor) return;

        // Check if click is on the wrapper itself (not on content)
        const target = e.target as HTMLElement;
        const editorContent = target.closest('.ProseMirror');

        if (!editorContent) {
          // Click was outside editor content
          const { doc } = editor.state;
          const lastNode = doc.lastChild;
          const isLastBlockEmpty =
            lastNode && lastNode.textContent.trim() === '';

          if (isLastBlockEmpty) {
            // Just focus the existing empty block
            editor.commands.focus('end');
          } else {
            // Create a new paragraph and focus it
            editor.commands.focus('end');
            editor.commands.insertContentAt(doc.content.size, {
              type: 'paragraph',
            });
            editor.commands.focus('end');
          }
        }
      },
      [editor]
    );

    if (!editor) {
      return null;
    }

    return (
      <div
        className={className}
        style={{
          minHeight: '100%',
          cursor: 'text',
          flex: 1,
          // paddingBottom: '15vh',  // Inner clickable space (outer 30vh is on container)
          ...style,
        }}
        onClick={handleWrapperClick}
      >
        {/* Editor styles */}
        <style>{`
        .ProseMirror {
          outline: none;
          font-family: ${typography.fontFamily};
          font-size: ${typography.body}px;
          line-height: ${typography.lineHeightRatio};
          color: ${colors.text.default};
        }

        /* Use flexbox gap for consistent block spacing */
        .ProseMirror {
          display: flex;
          flex-direction: column;
          gap: ${spacing.gap}px;
        }

        /* Reset margins on all block elements - gap handles spacing */
        .ProseMirror p,
        .ProseMirror h1,
        .ProseMirror h2,
        .ProseMirror h3,
        .ProseMirror pre,
        .ProseMirror blockquote,
        .ProseMirror hr {
          margin: 0;
        }

        /* ============================================
         * PLACEHOLDER STYLES - CSS-based
         * ============================================ */
        
        /* ============================================
         * PLACEHOLDER STYLES - CSS-based (simplified)
         * JavaScript hook handles all logic for when to show
         * ============================================ */
        
        /* ============================================
         * CANONICAL PLACEHOLDER (Apple / Notion / Craft Pattern)
         * ============================================
         * 
         * PLACEHOLDER LAW:
         * - Placeholder NEVER creates DOM structure
         * - Rendered via CSS ::before on content element
         * - data-empty on wrapper (node.content.size === 0)
         * - data-placeholder on wrapper (text, controlled by focus logic)
         * - ::before painted on [data-node-view-content] where caret lives
         * 
         * Result: Placeholder appears inline in text area, like native <input placeholder>
         */
        .ProseMirror [data-empty="true"][data-placeholder] [contenteditable="true"]::before {
          content: attr(data-placeholder);
          color: ${colors.text.placeholder};
          pointer-events: none;
          user-select: none;
          white-space: nowrap;
        }

        /* Focus styles */
        .ProseMirror:focus {
          outline: none;
        }

        /* Code block */
        .ProseMirror pre {
          position: relative;
        }

        /* ============================================
         * SELECTION STYLES
         * ============================================ */
        
        /* Text selection (when dragging cursor through text) */
        .ProseMirror ::selection {
          background-color: rgba(35, 131, 226, 0.3);
        }

        /* Hide text selection when block is selected (has halo) */
        .ProseMirror :has([data-block-selected="true"]) ::selection {
          background-color: transparent;
        }

        /* ❌ REMOVED: This was making ALL text selection invisible!
         * Previous rule: .ProseMirror [data-node-view-wrapper]::selection
         * Made selection transparent inside ALL blocks (every block uses NodeViewWrapper)
         * 
         * SELECTION OWNERSHIP LAW:
         * - Browser owns text selection rendering
         * - Editor owns structural selection rendering (halos)
         * - Never suppress browser text selection with CSS
         */
        
        /* Prevent selection on br placeholders only */
        .ProseMirror br.ProseMirror-trailingBreak::selection {
          background-color: transparent !important;
        }

        /* Horizontal Rule selection */
        .ProseMirror hr.ProseMirror-selectednode,
        .ProseMirror [data-type="horizontalRule"].ProseMirror-selectednode {
          background-color: ${colors.border.focus}20;
          outline: none;
          border-radius: 4px;
          box-shadow: 0 0 0 4px ${colors.border.focus}20;
        }

        /* Connector and collapse rendering moved to React component for unlimited nesting */
        
        /* CRITICAL FIX: Hide collapsed subtasks completely from flex layout
         * Hidden listBlocks have data-hidden="true" on their inner div
         * We need to hide the outer .react-renderer wrapper (direct child of .ProseMirror)
         * Using attribute selector on child + direct descendant
         */
        .ProseMirror > div[class*="react-renderer"]:has([data-hidden="true"]) {
          display: none !important;
        }
        
        /* Fallback for browsers without :has() support */
        @supports not (selector(:has(*))) {
          .ProseMirror [data-type="listBlock"][data-hidden="true"] {
            position: absolute !important;
            visibility: hidden !important;
            pointer-events: none !important;
            height: 0 !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
        }

        /* PHASE 5: Slash command styling - unique and polished */
        /* The "/" symbol - accent color with background pill */
        .ProseMirror .slash-command-symbol {
          color: ${colors.semantic.orange};
          font-weight: 600;
          background-color: ${colors.semantic.orange}10;
          border-radius: 3px;
          padding: 1px 4px;
          margin: 0;
          caret-color: ${colors.text.default}; /* Keep cursor default color so "/" stands out */
        }

        /* The query text after "/" - plain styling, lighter color */
        .ProseMirror .slash-command-query {
          color: ${colors.text.tertiary};
          background: none;
          border-radius: 0;
          padding: 0;
          margin: 0;
          font-weight: 500;
          caret-color: ${colors.text.default}; /* Keep cursor default color */
        }


        /* Focus Fade - Smooth gradient opacity (10 chars before cursor) */
        /* Only in standalone paragraphs (4+ chars, skips markdown/slash commands) */
        /* Appears while typing, disappears after 3s inactivity */
        /* Gradient from 100% visible (far from cursor) to 30% faded (near cursor) */
        .ProseMirror .focus-fade-gradient {
          color: ${colors.text.default};
          -webkit-mask-image: linear-gradient(
            to right,
            rgba(0, 0, 0, 1) 0%,      /* 100% opacity at start (far from cursor - visible) */
            rgba(0, 0, 0, 0.3) 100%   /* 30% opacity at end (closest to cursor - faded) */
          );
          mask-image: linear-gradient(
            to right,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.3) 100%
          );
          caret-color: ${colors.text.default}; /* Keep cursor visible */
        }

        /* Date Mention - Notion-style relative dates (@Today, @Yesterday, etc.) */
        /* Styles are handled inline in MentionPill.tsx */
      `}</style>

        {/* Editor content */}
        <EditorContent editor={editor} />

        {/* UI Components */}
        <SlashCommandMenu editor={editor as any} />
        <AtMentionMenu editor={editor as any} />
        <FloatingToolbar editor={editor} />
      </div>
    );
  }
);

// Export editor type for external use
export type { Editor };

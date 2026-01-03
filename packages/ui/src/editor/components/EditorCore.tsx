/**
 * EditorCore - Main Tiptap editor component
 * 
 * Core editor with all extensions, plugins, and behavior.
 */

import React, { useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

export interface EditorCoreHandle {
  focus: () => void;
  scrollToBlock: (blockId: string, highlight?: boolean) => void;
}

// Extensions
import { Document } from '../extensions/nodes/Document';
import { Text } from '../extensions/nodes/Text';
import { Paragraph } from '../extensions/nodes/Paragraph';
import { Heading } from '../extensions/nodes/Heading';
import { ListBlock } from '../extensions/nodes/ListBlock';
import { Blockquote } from '../extensions/nodes/Blockquote';
import { CodeBlock } from '../extensions/nodes/CodeBlock';
import { HorizontalRule } from '../extensions/nodes/HorizontalRule';
import { Link } from '../extensions/marks/Link';
import { Callout } from '../extensions/nodes/Callout';
import { ToggleHeader } from '../extensions/nodes/ToggleHeader';

// Marks
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

// TipTap built-in extensions
import Gapcursor from '@tiptap/extension-gapcursor';

// Plugins
import { MarkdownShortcuts } from '../plugins/MarkdownShortcuts';
import { SlashCommands } from '../plugins/SlashCommands';
import { TaskPriority } from '../plugins/TaskPriority';
import { BackspaceHandler } from '../plugins/BackspaceHandler';
import { EnterHandler } from '../plugins/EnterHandler';
import { TabHandler } from '../plugins/TabHandler';
import { EscapeMarks } from '../plugins/EscapeMarks';
import { DoubleSpaceEscape } from '../plugins/DoubleSpaceEscape';
import { HashtagDetection } from '../plugins/HashtagDetection';
import { HashtagAutocomplete } from '../plugins/HashtagAutocomplete';
import { AtMention } from '../plugins/AtMention';
import { BlockIdGenerator } from '../extensions/BlockIdGenerator';
import { SelectAll } from '../plugins/SelectAll';
import { UndoBoundaries } from '../plugins/UndoBoundaries';
// import { FocusFade } from '../plugins/FocusFade'; // Disabled for now

// Components
import { SlashCommandMenu } from './SlashCommandMenu';
import { AtMentionMenu } from './AtMentionMenu';

// Shared Components for inline styling
import { FloatingToolbar } from '../../components/ui-primitives';

// Tokens
import { spacing, typography, placeholders } from '../tokens';
import { useTheme } from '../../hooks/useTheme';

// History extension for undo/redo
import History from '@tiptap/extension-history';

// HardBreak extension for line breaks (Shift+Enter)
import HardBreak from '@tiptap/extension-hard-break';

interface EditorCoreProps {
  content?: object | null;
  onChange?: (content: object) => void;
  onTagClick?: (tag: string) => void; // Callback when a tag is clicked for navigation
  onNavigate?: (linkType: 'note' | 'folder', targetId: string) => void; // Callback when a note/folder link is clicked
  placeholder?: string;
  editable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const EditorCore = forwardRef<EditorCoreHandle, EditorCoreProps>(({
  content,
  onChange,
  onTagClick,
  onNavigate,
  // placeholder prop kept for API compatibility but not used
  // (placeholders are handled by individual React components)
  placeholder: _placeholder = placeholders.default,
  editable = true,
  className,
  style,
}, ref) => {
  const { colors } = useTheme();
  
  // Track if we're updating from the editor (to prevent clearing history)
  const isInternalUpdate = useRef(false);

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
      HardBreak.configure({
        // Don't bind Shift+Enter - we handle it in individual node extensions
        keepMarks: true,
      }),
      Link, // Standard link mark (browser default behavior)
      Callout, // Info/warning/error/success callout boxes
      ToggleHeader, // Standalone toggle header (flat structure like ListBlock)
      DateMentionNode, // Date mentions (@Today, @Yesterday, etc.) - atomic inline node
      NoteLink.configure({
        onNavigate, // Pass navigation callback to NoteLink extension
      }), // Note/folder links (no @) - atomic inline node
      Gapcursor, // Shows cursor when navigating around atomic nodes

      // Marks
      Bold,
      Italic,
      Underline,
      Strike,
      Code,
      WavyUnderline,
      TextColor, // Text foreground color
      CustomHighlight, // Highlight with bg color

      // Plugins
      BlockIdGenerator, // Auto-generate blockId for all blocks
      MarkdownShortcuts,
      SlashCommands,
      TaskPriority, // Highlight priority indicators (!, !!, !!!) in tasks
      BackspaceHandler,
      EnterHandler, // Global Enter handler for empty indented blocks
      TabHandler, // Global Tab handler - prevents focus navigation
      EscapeMarks,
      DoubleSpaceEscape,
      SelectAll, // Progressive Cmd+A: block text → block node → all blocks
      HashtagDetection, // Simple #tag detection (moves to metadata)
      HashtagAutocomplete.configure({
        getColors: () => colors,
      }),
      AtMention.configure({
        getColors: () => colors,
      }),
      // FocusFade, // Fade text before cursor for better focus - Disabled for now

      // Built-in extensions
      History.configure({
        depth: 100,
        // Extremely short delay for granular undo (like Notion) - creates new group after 1ms pause
        // This ensures each rapid action can potentially be its own undo step
        newGroupDelay: 1,
      }),
      UndoBoundaries, // Create undo boundaries on spaces and line breaks (Notion-like behavior)

      // DISABLED: TipTap Placeholder uses CSS ::before which shows placeholder BEFORE markers
      // We use React-based placeholders in each component instead
      // Placeholder.configure({...}),
    ] as any[],
    content: content || {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    },
    editable,
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
  });

  // Store onTagClick callback in editor instance so node views can access it
  useEffect(() => {
    if (editor) {
      (editor as any).onTagClick = onTagClick;
    }
  }, [editor, onTagClick]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (editor) {
        const { doc } = editor.state;
        const lastNode = doc.lastChild;
        const isLastBlockEmpty = lastNode && lastNode.textContent.trim() === '';

        if (isLastBlockEmpty) {
          // Just focus the existing empty block
          editor.commands.focus('end');
        } else {
          // Create a new paragraph and focus it
          editor.commands.focus('end');
          editor.commands.insertContentAt(doc.content.size, { type: 'paragraph' });
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
      const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
      
      if (blockElement) {
        // Scroll into view if not visible
        const rect = blockElement.getBoundingClientRect();
        const isInViewport = (
          rect.top >= 0 &&
          rect.bottom <= window.innerHeight
        );

        if (!isInViewport) {
          blockElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
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
  }), [editor]);

  // Update content when prop changes
  useEffect(() => {
    // Skip if this update is from the editor itself (internal)
    // This prevents clearing history on every keystroke
    if (isInternalUpdate.current) {
      // Clear the flag after a short delay to allow for any pending renders
      const timeoutId = setTimeout(() => {
        isInternalUpdate.current = false;
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    if (editor && content) {
      // Only update if content is different (semantic comparison)
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(content);

      if (currentContent !== newContent) {
        // Note: setContent clears history, so only call when content truly changed externally
        // (e.g., loading a different note or external sync)
        editor.commands.setContent(content, false);
      }
    }
  }, [content, editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

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
        const isLastBlockEmpty = lastNode && lastNode.textContent.trim() === '';

        if (isLastBlockEmpty) {
          // Just focus the existing empty block
          editor.commands.focus('end');
        } else {
          // Create a new paragraph and focus it
          editor.commands.focus('end');
          editor.commands.insertContentAt(doc.content.size, { type: 'paragraph' });
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
        
        /* Show placeholder via CSS ::before 
         * Hook only adds data-placeholder when block should show it
         */
        .ProseMirror [data-placeholder]::before {
          content: attr(data-placeholder);
          color: ${colors.text.placeholder};
          pointer-events: none;
          user-select: none;
          position: absolute;
          left: 0;
          top: 0;
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

      {/* Slash command menu */}
      <SlashCommandMenu editor={editor as any} />

      {/* @ mention menu (dates + links) */}
      <AtMentionMenu editor={editor as any} />

      {/* Floating toolbar for text formatting (shows on selection) */}
      <FloatingToolbar editor={editor} />
    </div>
  );
});

// Export editor type for external use
export type { Editor };


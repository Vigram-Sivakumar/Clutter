/**
 * EditorCore - Main Tiptap editor component
 *
 * Core editor with all extensions, plugins, and behavior.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔒 SELECTION INVARIANT (ARCHITECTURAL LAW)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ProseMirror Selection Model:
 *   - TextSelection is the primary selection model
 *   - NodeSelection used transitionally in 2 places (Phase 4 → Phase 5 migration):
 *     1. scrollToBlock() - programmatic block highlighting (this file, line ~370)
 *     2. SelectAll.ts - Ctrl+A escalation policy (Phase 5 feature, deferred)
 *   - Engine owns block selection truth, NOT NodeSelection
 *
 * Block Selection Authority:
 *   - Represented by blockId(s) in Engine.selection
 *   - Reflected visually via halo (data-block-selected attribute)
 *   - PM selection does NOT change when halo is clicked (engine-only state)
 *
 * Keyboard / Delete / Backspace:
 *   - Operate on Engine block selection (blockId-based)
 *   - Never rely on PM NodeSelection as source of truth
 *   - PM selection remains TextSelection for text editing
 *
 * WHY THIS MATTERS:
 *   Model owns truth. View reflects it. Never the reverse.
 *   Using NodeSelection as the model (not just a visual trigger) causes:
 *   - Delete breaking backspace
 *   - Backspace breaking delete
 *   - Enter breaking lists
 *   - Cascading selection bugs
 *
 * PHASE 5 TARGET:
 *   - Remove NodeSelection creation entirely
 *   - Replace with pure engine-driven block selection
 *   - Halos driven by data-block-selected attribute only (CSS + Engine state)
 *   - PM selection remains TextSelection at all times, no exceptions
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, {
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Editor, Node as TiptapNode } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

export interface EditorCoreHandle {
  focus: () => void;
  scrollToBlock: (_blockId: string, _highlight?: boolean) => void;
}

// Extensions - DIRECT imports to avoid module identity issues
// Importing through barrel exports can cause TipTap to see different Document instances
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
import History from '@tiptap/extension-history';

// Plugins
import { MarkdownShortcuts } from '../plugins/MarkdownShortcuts';
import { SlashCommands } from '../plugins/SlashCommands';
import { TaskPriority } from '../plugins/TaskPriority';
import { BackspaceHandler } from '../plugins/BackspaceHandler';
import { TabHandler } from '../plugins/TabHandler';
import { KeyboardShortcuts } from '../plugins/KeyboardShortcuts';
import { EscapeMarks } from '../plugins/EscapeMarks';
import { CollapsePlugin } from '../plugins/CollapsePlugin';
import { DoubleSpaceEscape } from '../plugins/DoubleSpaceEscape';
import { HashtagDetection } from '../plugins/HashtagDetection';
import { HashtagAutocomplete } from '../plugins/HashtagAutocomplete';
import { AtMention } from '../plugins/AtMention';
import { BlockIdGenerator } from '../extensions/BlockIdGenerator';
import { SelectAll } from '../plugins/SelectAll';
import { BlockDeletion } from '../plugins/BlockDeletion';
import { UndoRedo } from '../plugins/UndoRedo';
// import { FocusFade } from '../plugins/FocusFade'; // Disabled for now

// Components
import { SlashCommandMenu } from '../components/SlashCommandMenu';
import { AtMentionMenu } from '../components/AtMentionMenu';

// Shared Components for inline styling
import { FloatingToolbar } from '@clutter/ui';

// Tokens
import { spacing, typography, placeholders } from '../tokens';
import { useTheme } from '@clutter/ui';

// Editor Context
import { useEditorContext } from '../context/EditorContext';

// Editor Engine
import { useEditorEngine, getEngine } from './engine';

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
    // 🔍 BUILD FINGERPRINT: Proves fresh code is running (not stale cache)
    // If this timestamp doesn't change after rebuild → Vite cache issue
    useEffect(() => {
      console.log(
        '[EditorCore] BUILD',
        new Date().toISOString(),
        'v2.0.0-strictmode-safe'
      );
    }, []);

    // 🔍 DIAGNOSTIC: Verify Document identity before useEditor
    console.log('[EditorCore] DOC IDENTITY', {
      Document,
      name: Document?.name,
      topNode: Document?.config?.topNode,
    });

    // 🔍 CRITICAL: TipTap Singleton Check - MUST be true or schema will fail
    const isSingletonTiptap = Document instanceof TiptapNode;
    console.log('[TIPTAP SINGLETON CHECK]', isSingletonTiptap);
    if (!isSingletonTiptap) {
      console.error(
        '❌ DUPLICATE TIPTAP DETECTED: Document was created with a different @tiptap/core instance!'
      );
    }

    const { colors } = useTheme();
    const { availableTags } = useEditorContext();

    // 🔍 DIAGNOSTIC: Log all extension groups to verify schema composition
    console.log('[EditorCore] PRE-MEMO extensions snapshot:');
    console.log('Document:', Document?.name, 'group:', Document?.config?.group);
    console.log(
      'Paragraph:',
      Paragraph?.name,
      'group:',
      Paragraph?.config?.group
    );
    console.log('Text:', Text?.name, 'group:', Text?.config?.group);

    // 🔒 CRITICAL: Store editor instance for StrictMode reuse
    // React StrictMode mounts twice in dev - we reuse the same editor instance
    const editorInstanceRef = useRef<Editor | null>(null);

    // Track if we're updating from the editor (to prevent clearing history)
    const isInternalUpdate = useRef(false);

    // 🔒 Stabilize callbacks with refs (prevents editor recreation)
    const onChangeRef = useRef(onChange);
    const onFocusRef = useRef(onFocus);
    const onBlurRef = useRef(onBlur);
    const onNavigateRef = useRef(onNavigate);
    const onTagClickRef = useRef(onTagClick);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
      onFocusRef.current = onFocus;
    }, [onFocus]);

    useEffect(() => {
      onBlurRef.current = onBlur;
    }, [onBlur]);

    useEffect(() => {
      onNavigateRef.current = onNavigate;
    }, [onNavigate]);

    useEffect(() => {
      onTagClickRef.current = onTagClick;
    }, [onTagClick]);

    // 🔒 CRITICAL: Freeze extensions array to prevent editor recreation
    // Extensions must be stable for the lifetime of the editor
    const extensions = useMemo(() => {
      console.log('[EditorCore] useMemo EXECUTING - building extensions array');
      return [
        // 🔒 CRITICAL: Extension order matters for schema compilation
        // 1. Top node (doc)
        // 2. Block nodes (paragraph, heading, etc.)
        // 3. Inline nodes (text) - MUST come after blocks
        // 4. Marks and plugins

        // 1️⃣ Top node
        Document,

        // 2️⃣ Block nodes (structural content)
        Paragraph,
        Heading,
        ListBlock,
        Blockquote,
        CodeBlock,
        HorizontalRule,
        Callout, // Info/warning/error/success callout boxes

        // 3️⃣ Inline nodes (MUST come after block nodes)
        Text,

        HardBreak.configure({
          // Don't bind Shift+Enter - we handle it in individual node extensions
          keepMarks: true,
        }),
        DateMentionNode, // Date mentions (@Today, @Yesterday, etc.) - atomic inline node
        NoteLink.configure({
          onNavigate: (_linkType, _targetId) => {
            onNavigateRef.current?.(_linkType, _targetId);
          },
        }), // Note/folder links (no @) - atomic inline node
        Gapcursor, // Shows cursor when navigating around atomic nodes
        History, // Undo/redo support - REQUIRED for tr.setMeta('addToHistory') to work

        // 4️⃣ Marks
        Link, // Standard link mark (browser default behavior)
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
        KeyboardShortcuts, // Centralized Tab/Shift+Tab → indent/outdent intents
        TabHandler, // Fallback Tab handler - prevents focus navigation
        EscapeMarks,
        DoubleSpaceEscape,
        SelectAll, // Progressive Cmd+A: block text → block node → all blocks
        BlockDeletion, // Handle DELETE/Backspace for node-selected blocks
        UndoRedo, // Cmd+Z / Cmd+Shift+Z → EditorEngine.undoController
        HashtagDetection, // Simple #tag detection (moves to metadata)
        HashtagAutocomplete.configure({
          getColors: () => colors,
          getTags: () => availableTags,
        }),
        AtMention.configure({
          getColors: () => colors,
        }),
        // FocusFade, // Fade text before cursor for better focus - Disabled for now

        // DISABLED: TipTap History - We use UndoController for emotional undo
        // History and UndoBoundaries have been removed in favor of:
        // - EditorEngine.undoController (handles grouping per UNDO_GROUPING_LAW.md)
        // - Full state restoration (cursor + selection)
        // - Time-based and intent-based grouping

        // DISABLED: TipTap Placeholder uses CSS ::before which shows placeholder BEFORE markers
        // We use React-based placeholders in each component instead
        // Placeholder.configure({...}),
      ] as any[];
    }, []); // 🔒 EMPTY DEPS: Extensions frozen for editor lifetime

    // 🔍 DIAGNOSTIC: Log extensions after useMemo
    console.log(
      '[EditorCore] POST-MEMO extensions length:',
      extensions?.length
    );
    console.log(
      '[EditorCore] POST-MEMO first 3:',
      extensions?.slice(0, 3).map((e) => e?.name)
    );

    // 🔒 Stabilize editorProps to prevent recreation
    const editorProps = useMemo(
      () => ({
        attributes: {
          class: 'editor-content',
        },
        // ProseMirror plugins (not TipTap extensions)
        plugins: [CollapsePlugin],
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
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 🔒 PHASE 4.5: Block Deselection Policy (PURE SIGNAL ONLY)
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          //
          // 🔥 CRITICAL: This handler must be PURE (no engine/editor access)
          // ProseMirror caches these closures and they can survive EditorView recreation
          //
          // Block handle clicks are intercepted at capture phase (main.tsx)
          // This handler only sees non-handle clicks
          //
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          mousedown(_view, event) {
            const target = event.target as HTMLElement;

            // ⛔ Block handles are already intercepted at capture phase
            // These checks are defensive only
            if (target.closest('[data-block-handle]')) return false;
            if (target.closest('[data-block-menu]')) return false;

            // 🔔 Emit pure DOM signal (no editor/engine access)
            // React effect will handle actual engine mutation
            window.dispatchEvent(new CustomEvent('editor:deselect-blocks'));

            return false; // never block native behavior
          },
          focus: () => {
            onFocusRef.current?.();
            return false; // Allow default focus behavior
          },
          blur: () => {
            onBlurRef.current?.();
            return false; // Allow default blur behavior
          },
        },
      }),
      []
    ); // 🔒 EMPTY DEPS: editorProps frozen for editor lifetime

    // 🔒 CRITICAL: Create editor instance ONCE (StrictMode-safe)
    // Factory pattern with ref ensures same instance is reused across StrictMode double-mount
    // This prevents schema errors and maintains stable editor authority
    const editor = useEditor(
      () => {
        // Reuse existing instance on second mount (StrictMode)
        if (editorInstanceRef.current) {
          console.log('[EditorCore] Reusing editor instance (StrictMode)');
          return editorInstanceRef.current;
        }

        // 🔍 DIAGNOSTIC: Verify extensions array at runtime
        console.log(
          '[EditorCore] EXTENSIONS CHECK',
          extensions.map((e) => ({
            name: e?.name,
            topNode: e?.config?.topNode,
          }))
        );

        // Create new instance on first mount
        console.log('[EditorCore] Creating new editor instance');
        const instance = new Editor({
          extensions,
          content: {
            type: 'doc',
            content: [{ type: 'paragraph' }],
          },
          editable: true,
          editorProps,
          onUpdate: ({ editor, transaction }) => {
            // Only fire onChange if document actually changed (not just selection)
            if (transaction.docChanged && onChangeRef.current) {
              // Mark that this update is coming from the editor (internal)
              isInternalUpdate.current = true;
              onChangeRef.current(editor.getJSON());
              // Reset flag after a short delay to allow parent to update prop
              queueMicrotask(() => {
                isInternalUpdate.current = false;
              });
            }
          },
          onSelectionUpdate: () => {
            // Selection update callback (can be used for future selection tracking)
          },
        });

        // Store instance for reuse
        editorInstanceRef.current = instance;
        return instance;
      },
      [] // 🔒 EMPTY DEPS: Editor created once, never recreated
    );

    // 🔍 DIAGNOSTIC: Log editor creation (should appear ONCE per mount)
    useEffect(() => {
      if (editor) {
        console.log(
          '[Editor INIT]',
          Math.random(),
          'isInitialized:',
          editor.isInitialized
        );
      }
    }, [editor]);

    // Initialize EditorEngine bridge
    const { engine, resolver } = useEditorEngine(editor);

    // 🔒 Sync editable state when prop changes (without recreating editor)
    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
    }, [editor, editable]);

    // 🔒 CRITICAL: Set content imperatively when prop changes
    // Content prop should ONLY change when NOTE changes, not on every keystroke
    // This prevents editor recreation while still allowing note switching
    useEffect(() => {
      if (!editor) return;
      if (isInternalUpdate.current) return;

      if (content) {
        console.log('[EditorCore] Setting content imperatively');
        editor.commands.setContent(content, false);
      }
    }, [editor, content]);

    // Store onTagClick callback in editor instance so node views can access it
    useEffect(() => {
      if (editor) {
        (editor as any).onTagClick = onTagClickRef.current;
      }
    }, [editor]);

    // 🔒 Attach engine and resolver to editor instance ONCE
    // Used by structural commands, keyboard handlers, and block logic
    // 🧨 DIAGNOSTIC: Detect if EditorCore is being unmounted/remounted
    useEffect(() => {
      console.log('🧨 EditorCore MOUNTED');
      return () => {
        console.log('💀 EditorCore UNMOUNTED — THIS SHOULD NEVER HAPPEN');
      };
    }, []);

    // NEVER reattach unless unmounting
    useEffect(() => {
      if (!editor || !engine || !resolver) return;

      // 🔒 CRITICAL: Only attach if not already attached (prevents double attachment)
      if (getEngine(editor)) {
        console.warn('[EditorCore] Engine already attached, skipping');
        return;
      }

      (editor as any)._engine = engine;
      (editor as any)._resolver = resolver;

      // 🔍 DIAGNOSTIC: Set canonical editor reference
      console.log('🔥🔥🔥 EDITORCORE CANONICAL SETUP START 🔥🔥🔥');
      (window as any).__editor = editor;
      console.log('[EditorCore] Canonical editor id', editor);
      console.log('[EditorCore] Engine and resolver attached', {
        mode: engine.getMode(),
        blockCount: engine.getChildren(engine.tree.rootId).length,
      });
      console.log('🔥🔥🔥 EDITORCORE CANONICAL SETUP END 🔥🔥🔥');
    }, [editor, engine, resolver]);

    // 🔒 CRITICAL: Safe engine mutation in React space (not PM handlers)
    // Listens to pure DOM signals from PM handlers and safely mutates engine
    // This avoids ProseMirror closure caching issues that cause "editor2._engine" crashes
    useEffect(() => {
      const handleDeselectBlocks = () => {
        const canonicalEditor = (window as any).__editor;
        if (!canonicalEditor) return;

        const engine = getEngine(canonicalEditor);
        if (!engine) return;

        // Only clear if there's currently a block selection
        if (engine.selection?.kind !== 'block') return;

        console.log('[EditorCore] Clearing block selection (DOM signal)');
        engine.selection = { kind: 'none' };
        canonicalEditor.emit('selectionUpdate', { editor: canonicalEditor });
      };

      const handleSelectBlock = (e: Event) => {
        const canonicalEditor = (window as any).__editor;
        if (!canonicalEditor) return;

        const engine = getEngine(canonicalEditor);
        if (!engine) {
          console.warn(
            '[EditorCore] Engine not yet attached, skipping block selection'
          );
          return;
        }

        const { blockId } = (e as CustomEvent).detail;
        if (!blockId) return;

        // Safely mutate engine (guaranteed to exist in React context)
        engine.selection = {
          kind: 'block',
          blockIds: [blockId],
        };

        // Notify observers
        canonicalEditor.emit('selectionUpdate', { editor: canonicalEditor });

        console.log('[EditorCore] Block selection applied:', {
          blockId: blockId.slice(0, 8),
          engineSelection: engine.selection,
        });
      };

      window.addEventListener('editor:deselect-blocks', handleDeselectBlocks);
      window.addEventListener('editor:select-block', handleSelectBlock);

      return () => {
        window.removeEventListener(
          'editor:deselect-blocks',
          handleDeselectBlocks
        );
        window.removeEventListener('editor:select-block', handleSelectBlock);
      };
    }, []); // 🔒 EMPTY DEPS: listener never recreated

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ❌ REMOVED: Document-level mousedown handler (STALE CLOSURE CRASH)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // PROBLEM:
    // This handler accessed editor._engine in a closure, which becomes undefined
    // when the bridge is recreated. Even reading from window.__editor doesn't
    // prevent the crash - ANY access to _engine in a document listener is fatal.
    //
    // Stack trace:
    //   TypeError: undefined is not an object (evaluating 'editor2._engine')
    //   mousedown (index.mjs:13834)
    //
    // REPLACEMENT:
    // Deselection is fully handled by:
    // - Capture-phase gate in main.tsx (blocks PM on handle clicks)
    // - handleDOMEvents.mousedown below (emits signal for content clicks)
    // - useEffect listener below (safely mutates engine via window.__editor)
    //
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
            // ⏭️ PHASE 5 MIGRATION: Replace NodeSelection with engine-only selection
            // Current: NodeSelection triggers halo via PM's .ProseMirror-selectednode class
            // Target: Halo driven purely by engine.selection state + data-block-selected CSS
            // This is one of 2 places NodeSelection is created (see contract header above)
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

    // Update content when prop changes
    useEffect(() => {
      // Skip if this update is from the editor itself (internal)
      // This prevents clearing history on every keystroke
      if (isInternalUpdate.current) {
        console.log(
          '🛡️ [EditorCore] Skipping content update (internal update flag set)'
        );
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

        {/* Slash command menu */}
        <SlashCommandMenu editor={editor as any} />

        {/* @ mention menu (dates + links) */}
        <AtMentionMenu editor={editor as any} />

        {/* Floating toolbar for text formatting (shows on selection) */}
        <FloatingToolbar editor={editor} />
      </div>
    );
  }
);

// Export editor type for external use
export type { Editor };

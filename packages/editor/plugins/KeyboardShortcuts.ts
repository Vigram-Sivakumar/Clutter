/**
 * KeyboardShortcuts Plugin - Centralized structural keyboard shortcuts
 *
 * Binds keyboard shortcuts to rule-based handlers.
 *
 * After Phase E (De-smart Node Extensions), all structural keyboard logic
 * is centralized here instead of being scattered across node extensions.
 *
 * Architecture:
 * - Key press → this extension
 * - Extension → handleTab/handleBackspace/etc (keymaps)
 * - Keymaps → KeyboardEngine (rules)
 * - Rules → IntentResolver
 * - Resolver → EditorEngine commands
 */

import { Extension } from '@tiptap/core';
import {
  handleTab,
  handleBackspace,
  handleArrowLeft,
  handleArrowRight,
  handleArrowUp,
  handleArrowDown,
} from './keyboard/keymaps';
import {
  copyToClipboard,
  cutToClipboard,
  pasteFromClipboard,
  getClipboardState,
} from '../core/clipboard/clipboardManager';

export const KeyboardShortcuts = Extension.create({
  name: 'keyboardShortcuts',

  // HIGH PRIORITY - must run BEFORE TabHandler (which has priority 100)
  // Higher numbers = higher priority
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      // Tab / Shift+Tab: Indent / Outdent blocks
      // These emit indent-block / outdent-block intents
      //
      // OWNERSHIP CONTRACT:
      // - If result.handled === true → TipTap returns true (prevents default)
      // - If result.handled === false → TipTap returns false (let PM handle)
      Tab: ({ editor }) => {
        console.log(
          '🔑 [KeyboardShortcuts] Tab pressed - calling handleTab(false)'
        );
        const result = handleTab(editor, false); // isShift = false
        console.log('🔑 [KeyboardShortcuts] handleTab returned:', result);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 🔓 CORRECT TAB CONTRACT
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // Intent succeeded → return true (consume Tab)
        // Intent failed → return false (allow fallback)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const shouldConsume = result.handled === true;
        console.log(
          `🔑 [KeyboardShortcuts] Returning ${shouldConsume} - ${shouldConsume ? 'CONSUMING Tab' : 'ALLOWING FALLBACK'}`
        );
        return shouldConsume;
      },
      'Shift-Tab': ({ editor }) => {
        console.log(
          '🔑 [KeyboardShortcuts] Shift+Tab pressed - calling handleTab(true)'
        );
        const result = handleTab(editor, true); // isShift = true
        console.log('🔑 [KeyboardShortcuts] handleTab returned:', result);

        const shouldConsume = result.handled === true;
        console.log(
          `🔑 [KeyboardShortcuts] Returning ${shouldConsume} - ${shouldConsume ? 'CONSUMING Shift+Tab' : 'ALLOWING FALLBACK'}`
        );
        return shouldConsume;
      },

      // ✅ BACKSPACE: Empty list → paragraph → delete flow
      // Must run at high priority (before ListBlock node handler)
      Backspace: ({ editor }) => {
        const result = handleBackspace(editor);
        return result.handled === true;
      },

      // ✅ DELETE: Structural block deletion (when block is selected)
      // Must run at high priority (before ListBlock node handler)
      // For now, returns false to allow default PM behavior
      // TODO: Add proper Delete key rules if needed
      Delete: () => {
        // Let ProseMirror handle Delete key for now
        // In flat model, block selection delete is handled by PM default behavior
        return false;
      },

      // ✅ ARROW KEYS: Centralized cross-block navigation
      // Previously scattered across Paragraph, ListBlock, Heading
      // Now in ONE place to prevent TipTap handler collision
      //
      // CRITICAL: Multiple extensions registering same key = native cursor paralysis
      // Even if all return false, browser loses control
      //
      // Returns false when no rule matches → ProseMirror handles native cursor movement
      ArrowLeft: ({ editor }) => handleArrowLeft(editor),
      ArrowRight: ({ editor }) => handleArrowRight(editor),
      ArrowUp: ({ editor }) => handleArrowUp(editor),
      ArrowDown: ({ editor }) => handleArrowDown(editor),

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔒 CLIPBOARD (Step 3A.2) - Engine-aware, deterministic
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Overrides ProseMirror defaults to route through sealed clipboard manager.
      // Internal clipboard = structured blocks with re-based indent
      // External clipboard = plain text → paragraphs
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      // ✂️ COPY: Serialize selected blocks to internal clipboard
      'Mod-c': (props: any) => {
        const { editor, event } = props;
        
        // 🔒 PHYSICAL SEAL: Block native clipboard + PM clipboard at DOM level
        // Returning true is NOT enough - must explicitly prevent default
        event?.preventDefault();
        event?.stopPropagation();
        
        console.log('[Clipboard] Cmd/Ctrl+C pressed (event sealed)');
        
        const { state } = editor;
        
        // 🛡️ GUARD: Don't copy empty selection
        if (state.selection.empty) {
          console.log('[Clipboard] Empty selection, no-op');
          return true; // Consume event, don't delegate to PM
        }
        
        copyToClipboard(state);
        
        // 🔒 CRITICAL: clipboardManager.ts is now sole authority
        // Browser clipboard: ❌ blocked
        // ProseMirror clipboard: ❌ blocked
        // clipboardManager.ts: ✅ sole owner
        console.log('[Clipboard] Copy complete, event physically sealed');
        return true;
      },

      // ✂️ CUT: Copy + delete selected blocks
      'Mod-x': (props: any) => {
        const { editor, event } = props;
        
        // 🔒 PHYSICAL SEAL: Block native clipboard + PM clipboard at DOM level
        event?.preventDefault();
        event?.stopPropagation();
        
        console.log('[Clipboard] Cmd/Ctrl+X pressed (event sealed)');
        
        const { state, view } = editor;
        
        // 🛡️ GUARD: Don't cut empty selection
        if (state.selection.empty) {
          console.log('[Clipboard] Empty selection, no-op');
          return true; // Consume event, don't delegate to PM
        }
        
        cutToClipboard(state, view.dispatch.bind(view));
        
        // 🔒 CRITICAL: clipboardManager.ts is now sole authority
        // Browser clipboard: ❌ blocked
        // ProseMirror clipboard: ❌ blocked
        // clipboardManager.ts: ✅ sole owner
        console.log('[Clipboard] Cut complete, event physically sealed');
        return true;
      },

      // 📋 PASTE: Insert from internal or external clipboard
      'Mod-v': (props: any) => {
        const { editor, event } = props;
        
        // 🔒 PHYSICAL SEAL: Block native clipboard + PM clipboard at DOM level
        event?.preventDefault();
        event?.stopPropagation();
        
        console.log('[Clipboard] Cmd/Ctrl+V pressed (event sealed)');
        
        const { state, view } = editor;
        const clipboardState = getClipboardState();
        
        // 🔒 CRITICAL: NEVER fall back to PM default paste
        // PM default paste causes blockId duplication and structural corruption.
        // If internal clipboard is empty, do nothing (safe no-op).
        
        // Detect source: internal vs external
        if (clipboardState.payload && clipboardState.payload.blocks.length > 0) {
          // ✅ INTERNAL PASTE: Structured blocks with intent-based routing
          console.log('[Clipboard] Internal clipboard detected, pasting blocks');
          const success = pasteFromClipboard(state, view.dispatch.bind(view));
          
          if (success) {
            console.log('[Clipboard] Paste succeeded');
          } else {
            console.error('[Clipboard] Paste failed (handler error)');
          }
          
          return true; // Always consume paste event
        } else {
          // ⚠️ NO INTERNAL CLIPBOARD: Do nothing (safe no-op)
          // External clipboard support will be added in Step 3C
          console.warn('[Clipboard] No internal clipboard, ignoring paste (event sealed)');
          return true; // Consume event (do not delegate to PM)
        }
      },
    };
  },
});

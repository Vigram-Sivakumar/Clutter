/**
 * HorizontalRule Node - Divider line
 *
 * Block element that creates a horizontal divider.
 * - Markdown: --- (plain) or *** (wavy)
 * - Not editable (void node)
 * - Supports two styles: 'plain' and 'wavy'
 *
 * INTEGRATION STATUS: ✅ Uses engine.deleteBlock() primitive
 * - Routes deletions through EditorEngine (Editor Law #8)
 * - Children are promoted (never orphaned)
 *
 * Uses React NodeView with inline SVG for theme-aware colors.
 */

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { HorizontalRule as HorizontalRuleComponent } from '../../components/HorizontalRule';
import type { EditorEngine } from '../../core/engine/EditorEngine';
import { DeleteBlockCommand } from '../../core/engine/command';

/**
 * Get EditorEngine from TipTap editor instance
 */
function getEngine(editor: any): EditorEngine | null {
  return editor._engine || null;
}

declare module '@tiptap/core' {
  // eslint-disable-next-line no-unused-vars
  interface Commands<ReturnType> {
    horizontalRule: {
      /**
       * Insert a horizontal rule (plain style)
       */
      setHorizontalRule: () => ReturnType;
      /**
       * Insert a wavy break line
       */
      setBreakLine: () => ReturnType;
    };
  }
}

export const HorizontalRule = Node.create({
  name: 'horizontalRule',

  // Block-level content
  group: 'block',

  // Void node (no content)
  atom: true,

  // Allow selection by clicking
  selectable: true,

  // Allow dragging
  draggable: true,

  // Attributes
  addAttributes() {
    return {
      style: {
        default: 'plain',
        parseHTML: (element) => element.getAttribute('data-style') || 'plain',
        renderHTML: (attributes) => ({ 'data-style': attributes.style }),
      },
      fullWidth: {
        default: true,
        parseHTML: (element) =>
          element.getAttribute('data-full-width') === 'true',
        renderHTML: (attributes) => ({
          'data-full-width': attributes.fullWidth,
        }),
      },
      color: {
        default: 'default',
        parseHTML: (element) => element.getAttribute('data-color') || 'default',
        renderHTML: (attributes) => ({ 'data-color': attributes.color }),
      },
      blockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-block-id'),
        renderHTML: (attributes) =>
          attributes.blockId ? { 'data-block-id': attributes.blockId } : {},
      },
      parentBlockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-parent-block-id'),
        renderHTML: (attributes) =>
          attributes.parentBlockId
            ? { 'data-parent-block-id': attributes.parentBlockId }
            : {},
      },
      parentToggleId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-parent-toggle-id'),
        renderHTML: (attributes) =>
          attributes.parentToggleId
            ? { 'data-parent-toggle-id': attributes.parentToggleId }
            : {},
      },
      level: {
        default: 0,
        parseHTML: (element) => {
          const levelAttr = element.getAttribute('data-level');
          return levelAttr ? parseInt(levelAttr, 10) : 0;
        },
        renderHTML: (attributes) => ({
          'data-level': attributes.level,
        }),
      },
    };
  },

  // Parse from HTML
  parseHTML() {
    return [{ tag: 'hr' }];
  },

  // Render to HTML (for copy/paste, export)
  renderHTML({ node, HTMLAttributes }) {
    return ['hr', { ...HTMLAttributes, 'data-style': node.attrs.style }];
  },

  // Use React NodeView for rendering in editor
  addNodeView() {
    return ReactNodeViewRenderer(HorizontalRuleComponent);
  },

  // Commands
  addCommands() {
    return {
      setHorizontalRule:
        () =>
        ({ chain, state }) => {
          const { selection } = state;
          const { $from } = selection;
          const endPos = $from.end();

          // Get context from current block
          const currentNode = $from.node($from.depth);
          const currentAttrs = currentNode?.attrs || {};

          return chain()
            .insertContentAt(endPos, {
              type: this.name,
              attrs: {
                blockId: crypto.randomUUID(),
                style: 'plain',
                level: currentAttrs.level || 0,
                parentBlockId: currentAttrs.parentBlockId || null,
                parentToggleId: currentAttrs.parentToggleId || null,
              },
            })
            .run();
        },

      setBreakLine:
        () =>
        ({ chain, state }) => {
          const { selection } = state;
          const { $from } = selection;
          const endPos = $from.end();

          // Get context from current block
          const currentNode = $from.node($from.depth);
          const currentAttrs = currentNode?.attrs || {};

          return chain()
            .insertContentAt(endPos, {
              type: this.name,
              attrs: {
                blockId: crypto.randomUUID(),
                style: 'wavy',
                level: currentAttrs.level || 0,
                parentBlockId: currentAttrs.parentBlockId || null,
                parentToggleId: currentAttrs.parentToggleId || null,
              },
            })
            .run();
        },
    };
  },

  // Keyboard shortcuts for deletion
  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { selection } = this.editor.state;
        // Check if HR is selected (NodeSelection)
        if (selection.node?.type.name === this.name) {
          const blockId = selection.node.attrs?.blockId;
          const engine = getEngine(this.editor);

          if (!engine) {
            console.error('[HorizontalRule.Backspace] EditorEngine not found');
            return false;
          }

          if (!blockId) {
            console.warn('[HorizontalRule.Backspace] No blockId found');
            return false;
          }

          // ✅ USE ENGINE PRIMITIVE: Delete HR via DeleteBlockCommand
          // This ensures children are promoted (Editor Law #8)
          console.log(`[HorizontalRule.Backspace] Deleting HR: ${blockId}`);
          const cmd = new DeleteBlockCommand(blockId);
          engine.dispatch(cmd);
          return true;
        }
        return false;
      },
      Delete: () => {
        const { selection } = this.editor.state;
        if (selection.node?.type.name === this.name) {
          const blockId = selection.node.attrs?.blockId;
          const engine = getEngine(this.editor);

          if (!engine) {
            console.error('[HorizontalRule.Delete] EditorEngine not found');
            return false;
          }

          if (!blockId) {
            console.warn('[HorizontalRule.Delete] No blockId found');
            return false;
          }

          // ✅ USE ENGINE PRIMITIVE: Delete HR via DeleteBlockCommand
          // This ensures children are promoted (Editor Law #8)
          console.log(`[HorizontalRule.Delete] Deleting HR: ${blockId}`);
          const cmd = new DeleteBlockCommand(blockId);
          engine.dispatch(cmd);
          return true;
        }
        return false;
      },
    };
  },
});

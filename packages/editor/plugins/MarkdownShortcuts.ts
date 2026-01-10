/**
 * Markdown Shortcuts Plugin
 *
 * Uses ProseMirror's handleTextInput to detect markdown patterns.
 * Replaces the ENTIRE block (including wrappers like listBlock).
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { replaceBlock, createBlock } from '../utils/blockReplacement';

const SHORTCUTS_KEY = new PluginKey('markdownShortcuts');

export const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: SHORTCUTS_KEY,
        props: {
          handleTextInput(view, from, to, text) {
            const { state } = view;
            const $from = state.doc.resolve(from);
            const parent = $from.parent;

            // Work in paragraphs, headings, and inline-content blocks (listBlock, blockquote, callout)
            // NOTE: toggleHeader is excluded - it's a special block type for toggle headers
            const allowedTypes = [
              'paragraph',
              'heading',
              'listBlock',
              'blockquote',
              'callout',
            ];
            if (!allowedTypes.includes(parent.type.name)) {
              return false;
            }

            // Get text before cursor + the new character
            const textBefore = parent.textBetween(0, $from.parentOffset) + text;

            // Check if block ONLY contains the pattern (cursor at end)
            if (parent.textContent.length !== $from.parentOffset) {
              return false;
            }

            // Extract preserved attributes from current block
            // ✅ Preserve all structural context (parentBlockId, level, parentToggleId)
            const preservedAttrs = {
              blockId: parent.attrs.blockId,
              parentBlockId: parent.attrs.parentBlockId || null,
              level: parent.attrs.level || 0,
              parentToggleId: parent.attrs.parentToggleId || null,
            };

            // Determine what to create
            let replacement: any = null;

            // # + space → H1
            if (textBefore === '# ') {
              replacement = createBlock.heading(
                state.schema,
                1,
                undefined,
                preservedAttrs
              );
            }
            // ## + space → H2
            else if (textBefore === '## ') {
              replacement = createBlock.heading(
                state.schema,
                2,
                undefined,
                preservedAttrs
              );
            }
            // ### + space → H3
            else if (textBefore === '### ') {
              replacement = createBlock.heading(
                state.schema,
                3,
                undefined,
                preservedAttrs
              );
            }
            // >> + space → toggle block (PHASE 2: new container structure)
            else if (textBefore === '>> ') {
              // PHASE 2: Create toggleBlock inline (same pattern as other shortcuts)
              const toggleBlock = state.schema.nodes.toggleBlock;
              const toggleHeaderNew = state.schema.nodes.toggleHeaderNew;
              const toggleContent = state.schema.nodes.toggleContent;
              const p = state.schema.nodes.paragraph;

              if (toggleBlock && toggleHeaderNew && toggleContent && p) {
                // Create structure: toggleBlock > header + content(paragraph)
                // 🔑 CRITICAL: Don't create empty text nodes - let PM handle empty inline content
                const header = toggleHeaderNew.create();
                const content = toggleContent.create({}, [
                  p.create({ blockId: crypto.randomUUID() }),
                ]);

                replacement = toggleBlock.create(
                  {
                    blockId: crypto.randomUUID(),
                    collapsed: false,
                  },
                  [header, content]
                );

                console.log(
                  '✅ [MarkdownShortcuts] Creating NEW toggleBlock via >> shortcut'
                );
              }
            }
            // > + space → blockquote
            else if (textBefore === '> ') {
              replacement = createBlock.blockquote(
                state.schema,
                undefined,
                preservedAttrs
              );
            }
            // * or - + space → bullet
            else if (textBefore === '* ' || textBefore === '- ') {
              replacement = createBlock.listBlock(
                state.schema,
                'bullet',
                undefined,
                false,
                preservedAttrs
              );
            }
            // 1. + space → numbered
            else if (textBefore === '1. ') {
              replacement = createBlock.listBlock(
                state.schema,
                'numbered',
                undefined,
                false,
                preservedAttrs
              );
            }
            // [] + space → task unchecked
            else if (textBefore === '[] ') {
              replacement = createBlock.listBlock(
                state.schema,
                'task',
                undefined,
                false,
                preservedAttrs
              );
            }
            // [ ] + space → task unchecked
            else if (textBefore === '[ ] ') {
              replacement = createBlock.listBlock(
                state.schema,
                'task',
                undefined,
                false,
                preservedAttrs
              );
            }
            // [x] or [X] + space → task checked
            else if (textBefore === '[x] ' || textBefore === '[X] ') {
              replacement = createBlock.listBlock(
                state.schema,
                'task',
                undefined,
                true,
                preservedAttrs
              );
            }
            // --- → HR (plain) - triggers on third dash
            else if (textBefore === '---') {
              const hr = state.schema.nodes.horizontalRule;
              const p = state.schema.nodes.paragraph;
              if (hr && p)
                replacement = [
                  hr.create({
                    style: 'plain',
                    color: 'default',
                    fullWidth: true,
                  }),
                  p.create({
                    blockId: crypto.randomUUID(), // New block after HR gets new ID
                    ...preservedAttrs,
                  }),
                ];
            }
            // *** → HR (wavy)
            else if (textBefore === '***') {
              const hr = state.schema.nodes.horizontalRule;
              const p = state.schema.nodes.paragraph;
              if (hr && p)
                replacement = [
                  hr.create({
                    style: 'wavy',
                    color: 'default',
                    fullWidth: true,
                  }),
                  p.create({
                    blockId: crypto.randomUUID(), // New block after HR gets new ID
                    ...preservedAttrs,
                  }),
                ];
            }

            if (!replacement) return false;

            // Find the outermost block to replace
            // Walk up from current node to find any wrapper (listBlock, blockquote, callout)
            let blockStart = $from.before($from.depth); // Current block start
            let blockEnd = $from.after($from.depth); // Current block end

            // Check if we're inside a wrapper block
            // NOTE: toggleHeader is excluded - markdown shortcuts should work on children inside toggles
            for (let depth = $from.depth - 1; depth >= 1; depth--) {
              const node = $from.node(depth);
              const wrapperTypes = ['listBlock', 'blockquote', 'callout'];
              if (wrapperTypes.includes(node.type.name)) {
                // Check if this wrapper only contains our empty block
                if (node.content.size === parent.nodeSize) {
                  blockStart = $from.before(depth);
                  blockEnd = $from.after(depth);
                }
                break;
              }
            }

            // Replace the block using shared utility
            replaceBlock(view, blockStart, blockEnd, replacement);
            return true;
          },
        },
      }),
    ];
  },
});

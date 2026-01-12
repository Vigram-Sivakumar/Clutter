/**
 * BlockIdGenerator Extension
 *
 * Automatically generates blockId for all blocks that don't have one.
 * Runs as a ProseMirror plugin that intercepts every transaction.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// Maximum indent level (must match keyboardHelpers.ts)
const MAX_INDENT_LEVEL = 4;

// Blocks that should NOT be counted as structural parents for level computation
const NON_STRUCTURAL_PARENTS = new Set(['toggleHeader']);

export const BlockIdGenerator = Extension.create({
  name: 'blockIdGenerator',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockIdGenerator'),

        appendTransaction: (transactions, _oldState, newState) => {
          // Only process transactions that actually changed the document
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          // SAFETY: Skip if this is our own transaction (prevent infinite loop)
          if (transactions.some((tr) => tr.getMeta('blockIdGenerator'))) {
            return null;
          }

          const tr = newState.tr;
          tr.setMeta('blockIdGenerator', true); // Mark as our transaction
          let modified = false;

          // Track level updates within this transaction
          // This ensures children use parent's NEW level, not old level from document
          const levelUpdates = new Map<string, number>();

          // 🔒 CRITICAL: Track seen blockIds to detect duplicates (cloned nodes)
          // ProseMirror clones nodes WITH their attributes, causing duplicate blockIds
          // We must regenerate blockIds for clones to maintain uniqueness invariant
          const seenBlockIds = new Set<string>();

          // Helper: Compute level as parent's level + 1
          const computeLevel = (blockNode: any): number => {
            const parentBlockId = blockNode.attrs.parentBlockId;

            // No parent OR parent is root → level 0
            // Root is a virtual container, not a real block, so don't attempt lookup
            if (!parentBlockId || parentBlockId === 'root') return 0;

            // Check if parent's level was updated in THIS transaction
            if (levelUpdates.has(parentBlockId)) {
              const parentLevel = levelUpdates.get(parentBlockId)!;
              const computedLevel = parentLevel + 1;
              return Math.min(computedLevel, MAX_INDENT_LEVEL);
            }

            // Find the immediate parent in the document
            let parentNode: any = null;
            newState.doc.descendants((node: any) => {
              if (node.attrs?.blockId === parentBlockId) {
                parentNode = node;
                return false;
              }
              return true;
            });

            // Parent not found → treat as root
            if (!parentNode) {
              console.warn('⚠️ BlockIdGenerator: parent not found', {
                blockId: blockNode.attrs.blockId?.substring(0, 8),
                parentBlockId: parentBlockId?.substring(0, 8),
              });
              return 0;
            }

            // HARD RULE: toggleHeader is NEVER a structural parent
            if (NON_STRUCTURAL_PARENTS.has(parentNode.type.name)) {
              return 0;
            }

            // ✅ Compute as parent's level + 1, capped at MAX_INDENT_LEVEL
            const parentLevel = parentNode.attrs.level || 0;
            const computedLevel = parentLevel + 1;
            return Math.min(computedLevel, MAX_INDENT_LEVEL);
          };

          // 🔒 SANITIZATION: Strip blockIds from non-block nodes (one-time migration)
          // This cleans up legacy data where inline/text nodes incorrectly have blockIds
          newState.doc.descendants((node, pos) => {
            if (!node.isBlock && node.attrs?.blockId !== undefined) {
              console.warn(
                '[BlockIdGenerator] Stripping blockId from non-block node:',
                {
                  type: node.type.name,
                  blockId: node.attrs.blockId?.substring(0, 8),
                  pos,
                }
              );
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: undefined,
              });
              modified = true;
            }
          });

          // Traverse all nodes in the document
          newState.doc.descendants((node, pos) => {
            // Only process nodes that have blockId attribute defined in their schema
            if (!node.attrs || node.attrs.blockId === undefined) return;

            // 🔒 DEV INVARIANT: Empty non-paragraph blocks at root should not persist
            // AFTER keyboard normalization rules have run
            //
            // NOTE: This only checks AFTER keyboard events (Enter/Backspace),
            // not during document initialization, slash commands, etc.
            // Empty blocks are LEGAL during creation - they should only be
            // normalized when user interacts with them via keyboard.
            if (process.env.NODE_ENV !== 'production') {
              // Only check if this transaction is from a keyboard normalization rule
              const isFromKeyboardNormalization = transactions.some(
                (tr) => tr.getMeta('keyboardNormalization') === true
              );

              if (isFromKeyboardNormalization) {
                const isEmptyNonParagraph =
                  node.type.name !== 'paragraph' &&
                  node.type.name !== 'horizontalRule' && // HR is not a textblock
                  node.content.size === 0 &&
                  (node.attrs.indent === 0 || node.attrs.level === 0);

                if (isEmptyNonParagraph) {
                  console.error(
                    '[Invariant] Empty non-paragraph block at root persisted after keyboard normalization:',
                    {
                      type: node.type.name,
                      indent: node.attrs.indent ?? node.attrs.level,
                      blockId: node.attrs.blockId?.substring(0, 8),
                      pos,
                    }
                  );
                }
              }
            }

            // 🔒 BLOCK IDENTITY LAW: blockIds must be UNIQUE per node instance
            // ProseMirror clones nodes (e.g., during normalization, wrapping, lifting)
            // Cloned nodes retain their attributes, including blockId
            // We must detect duplicates and regenerate them
            const currentBlockId = node.attrs.blockId;

            // CASE 1: Node has no blockId → generate one
            // CASE 2: Node has blockId but it's a DUPLICATE (cloned) → regenerate
            const isDuplicate =
              currentBlockId && seenBlockIds.has(currentBlockId);
            const needsNewId =
              !currentBlockId || currentBlockId === '' || isDuplicate;

            if (needsNewId) {
              const newBlockId = crypto.randomUUID();

              if (isDuplicate) {
                console.warn(
                  '[BlockIdGenerator] Duplicate blockId detected (cloned node) - regenerating:',
                  {
                    type: node.type.name,
                    duplicateId: currentBlockId.substring(0, 8),
                    newBlockId: newBlockId.substring(0, 8),
                    pos,
                  }
                );
              } else {
                console.log('[BlockIdGenerator] Adding missing blockId:', {
                  type: node.type.name,
                  newBlockId: newBlockId.substring(0, 8),
                  pos,
                  editorInitialized: this.editor?.isInitialized ?? 'unknown',
                });
              }

              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: newBlockId,
              });

              // Track the NEW blockId
              seenBlockIds.add(newBlockId);
              modified = true;
              return; // Skip level sync for this node (do it next time)
            }

            // Track this blockId as seen
            seenBlockIds.add(currentBlockId);

            // HARD CLEANUP: illegal parentBlockId
            if (node.attrs.parentBlockId === node.attrs.blockId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                parentBlockId: null,
                level: 0,
              });
              modified = true;
              return;
            }

            // ✅ ALWAYS sync level based on parentBlockId
            // - If parentBlockId exists: level = parent's level + 1
            // - If parentBlockId is null: level = 0 (root)
            const correctLevel = computeLevel(node);
            const currentLevel = node.attrs.level || 0;

            // Only sync if different
            if (currentLevel !== correctLevel) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                level: correctLevel,
              });

              // Track this level update so children can use the new value
              levelUpdates.set(node.attrs.blockId, correctLevel);

              modified = true;
            } else {
              // Track current level so children can reference it
              levelUpdates.set(node.attrs.blockId, currentLevel);
            }
          });

          // 🔒 DEV-ONLY INVARIANT: No non-block node should ever have a blockId
          if (process.env.NODE_ENV !== 'production') {
            newState.doc.descendants((node) => {
              if (!node.isBlock && node.attrs?.blockId !== undefined) {
                console.error(
                  '[BlockIdGenerator] ❌ INVARIANT VIOLATION: Non-block node has blockId:',
                  {
                    type: node.type.name,
                    blockId: node.attrs.blockId?.substring(0, 8),
                    isBlock: node.isBlock,
                    isText: node.isText,
                    isLeaf: node.isLeaf,
                  }
                );
              }
            });
          }

          if (modified) {
            // 🔒 FORCE BRIDGE SYNC after BlockIdGenerator mutations
            // This ensures Engine sees all newly assigned blockIds immediately
            tr.setMeta('forceBridgeSync', true);
            return tr;
          }

          return null;
        },
      }),
    ];
  },

  onCreate() {
    // Run when editor is created - adds blockId AND computes correct levels
    console.log('[BlockIdGenerator] onCreate - will run after setTimeout(0)');
    setTimeout(() => {
      if (!this.editor) return;

      console.log('[BlockIdGenerator] onCreate - executing now');
      const { state } = this.editor;
      const tr = state.tr;
      let modified = false;

      // Track level updates within this transaction
      const levelUpdates = new Map<string, number>();

      // 🔒 CRITICAL: Track seen blockIds to detect duplicates during onCreate
      const seenBlockIds = new Set<string>();

      // Helper: Compute level as parent's level + 1, capped at MAX_INDENT_LEVEL
      const computeLevel = (blockNode: any): number => {
        const parentBlockId = blockNode.attrs.parentBlockId;

        // No parent OR parent is root → level 0
        // Root is a virtual container, not a real block, so don't attempt lookup
        if (!parentBlockId || parentBlockId === 'root') return 0;

        // Check if parent's level was updated in THIS transaction
        if (levelUpdates.has(parentBlockId)) {
          const parentLevel = levelUpdates.get(parentBlockId)!;
          const computedLevel = parentLevel + 1;
          return Math.min(computedLevel, MAX_INDENT_LEVEL);
        }

        // Find the immediate parent in the document
        let parentNode: any = null;
        state.doc.descendants((node: any) => {
          if (node.attrs?.blockId === parentBlockId) {
            parentNode = node;
            return false;
          }
          return true;
        });

        // Parent not found → treat as root
        if (!parentNode) {
          console.warn('⚠️ BlockIdGenerator: parent not found', {
            blockId: blockNode.attrs.blockId?.substring(0, 8),
            parentBlockId: parentBlockId?.substring(0, 8),
          });
          return 0;
        }

        // HARD RULE: toggleHeader is NEVER a structural parent
        if (NON_STRUCTURAL_PARENTS.has(parentNode.type.name)) {
          return 0;
        }

        // ✅ Compute as parent's level + 1, capped at MAX_INDENT_LEVEL
        const parentLevel = parentNode.attrs.level || 0;
        const computedLevel = parentLevel + 1;
        return Math.min(computedLevel, MAX_INDENT_LEVEL);
      };

      state.doc.descendants((node, pos) => {
        // Only process nodes that have blockId attribute defined in their schema
        if (!node.attrs || node.attrs.blockId === undefined) return;

        const currentBlockId = node.attrs.blockId;

        // 🔒 BLOCK IDENTITY LAW: blockIds must be UNIQUE per node instance
        // During onCreate, content may already have blockIds (e.g., from database)
        // But we must detect duplicates in case of data corruption
        const isDuplicate = currentBlockId && seenBlockIds.has(currentBlockId);
        const needsNewId =
          !currentBlockId || currentBlockId === '' || isDuplicate;

        if (!needsNewId) {
          // Node has valid, unique blockId - preserve it
          seenBlockIds.add(currentBlockId);
          if (process.env.NODE_ENV !== 'production') {
            console.log(
              '[BlockIdGenerator] onCreate - node has blockId, skipping:',
              {
                type: node.type.name,
                blockId: currentBlockId.substring(0, 8),
              }
            );
          }
          return; // ✅ Skip this node completely
        }

        // Add or regenerate blockId
        if (needsNewId) {
          const newBlockId = crypto.randomUUID();

          if (isDuplicate) {
            console.warn(
              '[BlockIdGenerator] onCreate - duplicate blockId detected (data corruption) - regenerating:',
              {
                type: node.type.name,
                duplicateId: currentBlockId.substring(0, 8),
                newBlockId: newBlockId.substring(0, 8),
                pos,
              }
            );
          } else {
            console.log(
              '[BlockIdGenerator] onCreate - adding missing blockId:',
              {
                type: node.type.name,
                newBlockId: newBlockId.substring(0, 8),
                pos,
              }
            );
          }

          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            blockId: newBlockId,
          });

          // Track the new blockId
          seenBlockIds.add(newBlockId);
          modified = true;
          return; // Skip level sync for newly created blocks
        }

        // ✅ ALWAYS sync level based on parentBlockId
        // - If parentBlockId exists: level = parent's level + 1
        // - If parentBlockId is null: level = 0 (root)
        if (node.attrs.level !== undefined) {
          const correctLevel = computeLevel(node);
          const currentLevel = node.attrs.level || 0;

          if (currentLevel !== correctLevel) {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              level: correctLevel,
            });

            // Track this level update so children can use the new value
            levelUpdates.set(node.attrs.blockId, correctLevel);

            modified = true;
          } else {
            // Track current level so children can reference it
            levelUpdates.set(node.attrs.blockId, currentLevel);
          }
        }
      });

      if (modified) {
        this.editor.view.dispatch(tr);
      }
    }, 0);
  },
});

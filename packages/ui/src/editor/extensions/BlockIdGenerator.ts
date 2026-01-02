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
const NON_STRUCTURAL_PARENTS = new Set([
  'toggleHeader',
]);

export const BlockIdGenerator = Extension.create({
  name: 'blockIdGenerator',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockIdGenerator'),
        
        appendTransaction: (transactions, _oldState, newState) => {
          // Only process transactions that actually changed the document
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged) return null;
          
          // SAFETY: Skip if this is our own transaction (prevent infinite loop)
          if (transactions.some(tr => tr.getMeta('blockIdGenerator'))) {
            return null;
          }

          const tr = newState.tr;
          tr.setMeta('blockIdGenerator', true);  // Mark as our transaction
          let modified = false;
          
          // Track level updates within this transaction
          // This ensures children use parent's NEW level, not old level from document
          const levelUpdates = new Map<string, number>();

          // Helper: Compute level as parent's level + 1
          const computeLevel = (blockNode: any): number => {
            const parentBlockId = blockNode.attrs.parentBlockId;
            
            // No parent → level 0 (root)
            if (!parentBlockId) return 0;
            
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

          // Traverse all nodes in the document
          newState.doc.descendants((node, pos) => {
            // Only process nodes that have blockId attribute defined in their schema
            if (!node.attrs || node.attrs.blockId === undefined) return;
            
            // Add blockId if missing
            const currentBlockId = node.attrs.blockId;
            if (!currentBlockId || currentBlockId === '') {
              const newBlockId = crypto.randomUUID();
              
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: newBlockId,
              });
              
              modified = true;
              return;  // Skip level sync for this node (do it next time)
            }
            
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

          return modified ? tr : null;
        },
      }),
    ];
  },

  onCreate() {
    // Run when editor is created - adds blockId AND computes correct levels
    setTimeout(() => {
      if (!this.editor) return;

      const { state } = this.editor;
      const tr = state.tr;
      let modified = false;
      
      // Track level updates within this transaction
      const levelUpdates = new Map<string, number>();

      // Helper: Compute level as parent's level + 1, capped at MAX_INDENT_LEVEL
      const computeLevel = (blockNode: any): number => {
        const parentBlockId = blockNode.attrs.parentBlockId;
        
        // No parent → level 0 (root)
        if (!parentBlockId) return 0;
        
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
        
        // Add blockId if missing
        if (!currentBlockId || currentBlockId === '') {
          const newBlockId = crypto.randomUUID();
          
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            blockId: newBlockId,
          });
          
          modified = true;
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

/**
 * Tab Keymap - Structural indentation control
 *
 * Tab changes structure, never content.
 *
 * Canonical Decision Tables:
 * - Tab → indent-block intent
 * - Shift+Tab → outdent-block intent
 *
 * All logic lives in rules and resolver.
 */

import type { Editor } from '@tiptap/core';
import { createKeyboardEngine } from '../engine/KeyboardEngine';
import type { IntentResolver } from '../../../core/engine';
import { indentBlock, outdentBlock } from '../rules/tab';

const tabRules = [indentBlock, outdentBlock];

const tabEngine = createKeyboardEngine(tabRules);

export function handleTab(editor: Editor): boolean {
  console.log('📋 [handleTab] Called');

  // Get resolver and engine from editor instance (attached by EditorCore)
  const resolver = (editor as any)._resolver as IntentResolver | undefined;
  const engine = (editor as any)._engine;

  console.log('📋 [handleTab] Resolver:', resolver ? 'found' : 'NOT FOUND');

  if (resolver) {
    tabEngine.setResolver(resolver);
  }

  // HACK: Force Engine rebuild from current PM state before processing intent
  // This ensures Engine always has up-to-date block inventory
  // TODO: Remove this once bridge lifecycle is fixed to sync on content load
  if (engine && editor.state.doc) {
    const pmBlockCount = countPMBlocks(editor.state.doc);
    const engineBlockCount = Object.keys(engine.tree.nodes).length - 1;

    console.log(
      '📋 [handleTab] PM blocks:',
      pmBlockCount,
      '| Engine blocks:',
      engineBlockCount
    );

    if (pmBlockCount !== engineBlockCount) {
      console.warn('📋 [handleTab] ⚠️  ENGINE DESYNC! Forcing rebuild...');
      rebuildEngineFromPMDoc(editor.state.doc, engine);
      console.log(
        '📋 [handleTab] ✓ Engine rebuilt, now has',
        Object.keys(engine.tree.nodes).length - 1,
        'blocks'
      );
    }
  }

  const handled = tabEngine.handle(editor, 'Tab');
  console.log('📋 [handleTab] Result:', handled);
  return handled;
}

// Temporary helper: Count blocks in PM doc
function countPMBlocks(pmDoc: any): number {
  let count = 0;
  pmDoc.descendants((node: any) => {
    if (node.attrs?.blockId) count++;
  });
  return count;
}

// Temporary helper: Rebuild Engine tree from PM doc
// This is a simplified version of proseMirrorDocToBlockTree from the bridge
function rebuildEngineFromPMDoc(pmDoc: any, engine: any): void {
  const nodes: Record<string, any> = {};
  const rootId = 'root';

  nodes[rootId] = {
    id: rootId,
    type: 'doc',
    parentId: null,
    children: [],
    content: null,
  };

  function walk(pmNode: any, parentId: string = rootId): void {
    if (pmNode.attrs?.blockId) {
      const blockId = pmNode.attrs.blockId;
      nodes[blockId] = {
        id: blockId,
        type: pmNode.type.name,
        parentId,
        children: [],
        content: pmNode.toJSON(),
      };
      nodes[parentId].children.push(blockId);

      if (pmNode.content && pmNode.content.size > 0) {
        pmNode.content.forEach((child: any) => walk(child, blockId));
      }
    } else {
      if (pmNode.content && pmNode.content.size > 0) {
        pmNode.content.forEach((child: any) => walk(child, parentId));
      }
    }
  }

  pmDoc.content.forEach((child: any) => walk(child));

  engine.tree = {
    rootId,
    nodes,
  };
}

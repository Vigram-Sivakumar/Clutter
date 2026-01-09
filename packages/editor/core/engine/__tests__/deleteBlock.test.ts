/**
 * Unit Tests: engine.deleteBlock() - Child Promotion Primitive
 *
 * Tests Editor Law #8: Child Promotion Invariant
 *
 * Requirements from ENGINE_CHILD_DELETION_CONTRACT.md:
 * 1. Delete leaf block (no children)
 * 2. Delete block with 1 child
 * 3. Delete block with N children
 * 4. Delete block with nested grandchildren
 * 5. Delete → Undo → Redo
 * 6. Delete last root block with children
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EditorEngine } from '../EditorEngine';
import { DeleteBlockCommand } from '../command';
import type { BlockTree, BlockNode } from '../types';

describe('EditorEngine.deleteBlock() - Child Promotion', () => {
  let engine: EditorEngine;

  /**
   * Helper: Create a test block tree
   */
  function createTestTree(): BlockTree {
    return {
      rootId: 'root',
      nodes: {
        root: {
          id: 'root',
          type: 'doc',
          parentId: null,
          children: [],
          content: null,
        },
      },
    };
  }

  /**
   * Helper: Add a block to the tree
   */
  function addBlock(
    tree: BlockTree,
    id: string,
    parentId: string,
    type = 'paragraph'
  ): BlockNode {
    const block: BlockNode = {
      id,
      type,
      parentId,
      children: [],
      content: null,
    };

    tree.nodes[id] = block;

    const parent = tree.nodes[parentId];
    if (parent) {
      parent.children.push(id);
    }

    return block;
  }

  beforeEach(() => {
    const tree = createTestTree();
    engine = new EditorEngine(tree);
  });

  // ===== TEST 1: Delete Leaf Block (No Children) =====

  it('should delete a leaf block with no children', () => {
    // Setup: root → A
    addBlock(engine.tree, 'A', 'root');

    // Delete A
    const result = engine.deleteBlock('A');

    // Verify deletion metadata
    expect(result).not.toBeNull();
    expect(result?.deletedBlock.id).toBe('A');
    expect(result?.promotedChildren).toEqual([]);
    expect(result?.originalParentId).toBe('root');
    expect(result?.originalIndex).toBe(0);

    // Verify tree state
    expect(engine.tree.nodes['A']).toBeUndefined();
    expect(engine.tree.nodes['root'].children).toEqual([]);
  });

  // ===== TEST 2: Delete Block with 1 Child =====

  it('should delete a block with 1 child and promote the child', () => {
    // Setup: root → A → Child1
    addBlock(engine.tree, 'A', 'root');
    addBlock(engine.tree, 'Child1', 'A');

    // Delete A
    const result = engine.deleteBlock('A');

    // Verify deletion metadata
    expect(result).not.toBeNull();
    expect(result?.promotedChildren).toEqual(['Child1']);

    // Verify Child1 was promoted
    expect(engine.tree.nodes['A']).toBeUndefined();
    expect(engine.tree.nodes['Child1'].parentId).toBe('root');
    expect(engine.tree.nodes['root'].children).toEqual(['Child1']);
  });

  // ===== TEST 3: Delete Block with N Children =====

  it('should delete a block with 3 children and promote all in order', () => {
    // Setup: root → A → [Child1, Child2, Child3]
    addBlock(engine.tree, 'A', 'root');
    addBlock(engine.tree, 'Child1', 'A');
    addBlock(engine.tree, 'Child2', 'A');
    addBlock(engine.tree, 'Child3', 'A');

    // Delete A
    const result = engine.deleteBlock('A');

    // Verify deletion metadata
    expect(result).not.toBeNull();
    expect(result?.promotedChildren).toEqual(['Child1', 'Child2', 'Child3']);

    // Verify all children promoted in order
    expect(engine.tree.nodes['A']).toBeUndefined();
    expect(engine.tree.nodes['Child1'].parentId).toBe('root');
    expect(engine.tree.nodes['Child2'].parentId).toBe('root');
    expect(engine.tree.nodes['Child3'].parentId).toBe('root');
    expect(engine.tree.nodes['root'].children).toEqual([
      'Child1',
      'Child2',
      'Child3',
    ]);
  });

  // ===== TEST 4: Delete Block with Nested Grandchildren =====

  it('should delete a block with nested grandchildren (children promoted, grandchildren stay)', () => {
    // Setup:
    // root
    // └─ A
    //    ├─ Child1
    //    │  └─ GrandChild1
    //    └─ Child2
    //       └─ GrandChild2

    addBlock(engine.tree, 'A', 'root');
    addBlock(engine.tree, 'Child1', 'A');
    addBlock(engine.tree, 'GrandChild1', 'Child1');
    addBlock(engine.tree, 'Child2', 'A');
    addBlock(engine.tree, 'GrandChild2', 'Child2');

    // Delete A
    const result = engine.deleteBlock('A');

    // Verify deletion metadata
    expect(result).not.toBeNull();
    expect(result?.promotedChildren).toEqual(['Child1', 'Child2']);

    // Verify structure after deletion:
    // root
    // ├─ Child1
    // │  └─ GrandChild1
    // └─ Child2
    //    └─ GrandChild2

    expect(engine.tree.nodes['A']).toBeUndefined();

    // Children promoted to root
    expect(engine.tree.nodes['Child1'].parentId).toBe('root');
    expect(engine.tree.nodes['Child2'].parentId).toBe('root');
    expect(engine.tree.nodes['root'].children).toEqual(['Child1', 'Child2']);

    // Grandchildren stay with their parents (NOT promoted)
    expect(engine.tree.nodes['GrandChild1'].parentId).toBe('Child1');
    expect(engine.tree.nodes['GrandChild2'].parentId).toBe('Child2');
    expect(engine.tree.nodes['Child1'].children).toEqual(['GrandChild1']);
    expect(engine.tree.nodes['Child2'].children).toEqual(['GrandChild2']);
  });

  // ===== TEST 5: Delete → Undo → Redo =====

  it('should support undo and redo with exact state restoration', () => {
    // Setup: root → A → [Child1, Child2]
    addBlock(engine.tree, 'A', 'root');
    addBlock(engine.tree, 'Child1', 'A');
    addBlock(engine.tree, 'Child2', 'A');

    // Capture initial state
    const initialTree = JSON.stringify(engine.tree);

    // Delete A via command (to test undo/redo)
    const cmd = new DeleteBlockCommand('A');
    engine.dispatch(cmd);

    // Verify deletion
    expect(engine.tree.nodes['A']).toBeUndefined();
    expect(engine.tree.nodes['Child1'].parentId).toBe('root');
    expect(engine.tree.nodes['Child2'].parentId).toBe('root');

    // Undo
    engine.undo();

    // Verify exact restoration
    expect(engine.tree.nodes['A']).toBeDefined();
    expect(engine.tree.nodes['A'].children).toEqual(['Child1', 'Child2']);
    expect(engine.tree.nodes['Child1'].parentId).toBe('A');
    expect(engine.tree.nodes['Child2'].parentId).toBe('A');
    expect(engine.tree.nodes['root'].children).toEqual(['A']);
    expect(JSON.stringify(engine.tree)).toBe(initialTree);

    // Redo
    engine.redo();

    // Verify deletion again (deterministic)
    expect(engine.tree.nodes['A']).toBeUndefined();
    expect(engine.tree.nodes['Child1'].parentId).toBe('root');
    expect(engine.tree.nodes['Child2'].parentId).toBe('root');
    expect(engine.tree.nodes['root'].children).toEqual(['Child1', 'Child2']);
  });

  // ===== TEST 6: Delete Last Root Block with Children =====

  it('should delete the last root block and promote children to root', () => {
    // Setup: root → A → [Child1, Child2, Child3]
    // (A is the ONLY root child)
    addBlock(engine.tree, 'A', 'root');
    addBlock(engine.tree, 'Child1', 'A');
    addBlock(engine.tree, 'Child2', 'A');
    addBlock(engine.tree, 'Child3', 'A');

    // Delete A (last root block)
    const result = engine.deleteBlock('A');

    // Verify deletion
    expect(result).not.toBeNull();
    expect(engine.tree.nodes['A']).toBeUndefined();

    // Verify children promoted to root
    expect(engine.tree.nodes['Child1'].parentId).toBe('root');
    expect(engine.tree.nodes['Child2'].parentId).toBe('root');
    expect(engine.tree.nodes['Child3'].parentId).toBe('root');
    expect(engine.tree.nodes['root'].children).toEqual([
      'Child1',
      'Child2',
      'Child3',
    ]);

    // Verify document invariant: ≥ 1 block exists (children count as blocks)
    const rootChildren = engine.tree.nodes['root'].children;
    expect(rootChildren.length).toBeGreaterThanOrEqual(1);
  });

  // ===== EDGE CASE: Children Inserted at Correct Index =====

  it("should insert promoted children at the deleted block's index", () => {
    // Setup:
    // root
    // ├─ Before
    // ├─ A → [Child1, Child2]
    // └─ After

    addBlock(engine.tree, 'Before', 'root');
    addBlock(engine.tree, 'A', 'root');
    addBlock(engine.tree, 'Child1', 'A');
    addBlock(engine.tree, 'Child2', 'A');
    addBlock(engine.tree, 'After', 'root');

    // Delete A
    engine.deleteBlock('A');

    // Verify order:
    // root
    // ├─ Before
    // ├─ Child1  (promoted, index 1)
    // ├─ Child2  (promoted, index 2)
    // └─ After   (index 3)

    expect(engine.tree.nodes['root'].children).toEqual([
      'Before',
      'Child1',
      'Child2',
      'After',
    ]);
  });

  // ===== EDGE CASE: Multiple Undo/Redo Cycles =====

  it('should survive multiple undo/redo cycles without corruption', () => {
    // Setup: root → A → [Child1, Child2]
    addBlock(engine.tree, 'A', 'root');
    addBlock(engine.tree, 'Child1', 'A');
    addBlock(engine.tree, 'Child2', 'A');

    const initialTree = JSON.stringify(engine.tree);

    // Delete
    const cmd = new DeleteBlockCommand('A');
    engine.dispatch(cmd);

    // Undo → Redo → Undo → Redo → Undo
    engine.undo();
    engine.redo();
    engine.undo();
    engine.redo();
    engine.undo();

    // After final undo, tree should match initial
    expect(JSON.stringify(engine.tree)).toBe(initialTree);
  });
});

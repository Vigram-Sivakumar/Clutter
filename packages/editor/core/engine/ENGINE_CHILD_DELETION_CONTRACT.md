# Engine Child Deletion Contract

**Status**: 🔒 Locked  
**Phase**: 2.2.4 — Engine Invariants Repair  
**Authority**: Constitutional (overrides all block-level logic)

---

## Purpose

This document defines the **single, canonical behavior** for what happens to children when a block is deleted in the EditorEngine.

Before this contract:

- ❌ Children were orphaned (invalid `parentBlockId`)
- ❌ Blocks handled deletion inconsistently
- ❌ Tree integrity could be corrupted
- ❌ Undo/redo was unpredictable

After this contract:

- ✅ Children are **always** promoted (never orphaned)
- ✅ Deletion is **always** safe
- ✅ Tree integrity is **always** maintained
- ✅ Undo/redo is **always** deterministic

---

## Editor Law #8: Child Promotion Invariant

> **When a block is deleted, its direct children are promoted to the deleted block's parent.**
>
> **No child is ever orphaned. No subtree is deleted implicitly.**

This is non-negotiable. No exceptions. No block types are exempt.

---

## The Six Canonical Questions (Answered)

### 1. When a block is deleted, what happens to its children?

**Answer**: Children are **promoted** to the deleted block's parent.

**Semantics**: "Remove this block, preserve its children"

**Example**:

```
BEFORE:
root
├─ Block A (parent)
│  ├─ Child 1
│  ├─ Child 2
│  └─ Child 3
└─ Block B

DELETE Block A

AFTER:
root
├─ Child 1  // promoted to root
├─ Child 2  // promoted to root
├─ Child 3  // promoted to root
└─ Block B
```

**Order**: Children are inserted at the **same index** where the deleted block was.

**Depth**: Only **direct children** are promoted. Grandchildren remain attached to their parent.

**Type Mismatch**: Allowed. Block type compatibility is resolved **after** promotion, not during deletion.

---

### 2. Is deletion allowed if children exist?

**Answer**: **YES — Always.**

Deletion is **never blocked** by the existence of children.

The engine **guarantees safety** by promoting children, not by preventing deletion.

**Rationale**:

- Users expect to delete any block
- Blocking deletion creates UX friction
- Promotion is safe by default

**Edge Case**: Deleting the last root block with children?

- Children are promoted to root (root always exists)
- Document invariant preserved: "≥ 1 block always exists"

---

### 3. What is the order of operations?

**Canonical Order** (atomic, non-negotiable):

```
1. Get block to delete
2. Get block's children (if any)
3. Get block's parent
4. Get block's index in parent.children
5. Remove block from parent.children
6. Insert children at same index in parent.children
7. Update each child's parentBlockId to new parent
8. Store original state for undo
9. Delete block from tree
```

**Atomicity**: This MUST be a single transaction. No intermediate states are valid.

**Failure**: If ANY step fails, the entire operation must be rolled back.

---

### 4. What must undo restore?

**Answer**: **Exact original state** (structure + relationships).

Undo MUST restore:

1. ✅ The deleted block (same `blockId`, same attrs, same content)
2. ✅ Block's original `parentBlockId`
3. ✅ Block's original position in `parent.children`
4. ✅ All children's original `parentBlockId` (pointing back to deleted block)
5. ✅ All children's original positions in `block.children`
6. ✅ Cursor position (if applicable)
7. ✅ Selection state (if applicable)

**Outcome**: After undo, the tree is **byte-for-byte identical** to before deletion.

**Verification**: `JSON.stringify(tree) === originalTreeSnapshot`

---

### 5. What must redo reapply?

**Answer**: **Exact same deletion** (deterministic replay).

Redo MUST:

1. ✅ Delete the same block
2. ✅ Promote children to same parent
3. ✅ Preserve same insertion order
4. ✅ Result in **byte-for-byte identical** state to first deletion

**Verification**: `JSON.stringify(tree) === firstDeleteTreeSnapshot`

**Requirement**: Undo → Redo → Undo → Redo (repeated N times) must produce identical states.

---

### 6. What is forbidden?

**Absolutely Forbidden** (will corrupt editor):

❌ **Block-level child handling**

- Blocks MUST NOT iterate over `block.children`
- Blocks MUST NOT reassign `parentBlockId`
- Blocks MUST NOT "handle promotion themselves"

❌ **Conditional promotion**

- No "promote only if X"
- No "promote unless Y"
- Promotion is **always** unconditional

❌ **ProseMirror default deletion**

- PM does NOT know about `parentBlockId`
- PM does NOT maintain `BlockTree`
- PM MUST NOT delete structural blocks

❌ **Recursive deletion**

- Deleting parent MUST NOT delete children
- Deleting parent MUST NOT delete grandchildren
- Only ONE block deleted per command

❌ **Orphaning**

- No child may have `parentBlockId` pointing to non-existent block
- No child may exist in tree without being in some `parent.children` array
- Tree MUST always be valid graph

❌ **Silent failures**

- Deletion MUST succeed or throw
- Partial deletion is invalid
- "Best effort" promotion is invalid

---

## Implementation Contract

### Engine Responsibility

The `EditorEngine` MUST provide:

```typescript
engine.deleteBlock(blockId: BlockId): void
```

**Behavior** (canonical):

1. Validates block exists
2. Promotes children (if any)
3. Updates parent.children
4. Deletes block
5. Stores undo metadata
6. Emits change event

**Guarantees**:

- Tree remains valid graph
- No orphans created
- Undo/redo deterministic

---

### Command Responsibility

`DeleteBlockCommand` MUST:

1. ✅ Store complete snapshot for undo (block + relationships)
2. ✅ Call engine promotion logic (NOT implement it itself)
3. ✅ Be atomic (all or nothing)
4. ✅ Be deterministic (same input → same output)

`DeleteBlockCommand` MUST NOT:

1. ❌ Contain promotion logic (engine owns this)
2. ❌ Branch on block type
3. ❌ Branch on child count
4. ❌ Skip children

---

### Block Responsibility

**Blocks** (ListBlock, Paragraph, Toggle, etc.) MUST:

1. ✅ Emit `delete-block` intent (if user action)
2. ✅ Trust engine to handle children
3. ✅ Never touch `block.children` during deletion

**Blocks** MUST NOT:

1. ❌ Implement child promotion
2. ❌ Call `DeleteBlockCommand` directly
3. ❌ Use PM deletion for structural blocks

---

### Resolver Responsibility

`IntentResolver` MUST:

1. ✅ Route `delete-block` intent to `DeleteBlockCommand`
2. ✅ Ensure cursor repositioning after deletion
3. ✅ Clear selection if deleted block was selected

`IntentResolver` MUST NOT:

1. ❌ Implement promotion logic
2. ❌ Skip deletion based on children

---

## Verification Requirements

### Unit Tests (Required)

Every deletion scenario MUST be tested:

1. **Delete leaf block** (no children)
   - ✅ Block removed
   - ✅ Parent.children updated
   - ✅ Undo restores

2. **Delete block with 1 child**
   - ✅ Child promoted
   - ✅ Child's parentBlockId updated
   - ✅ Undo restores both

3. **Delete block with N children**
   - ✅ All promoted in order
   - ✅ All parentBlockIds updated
   - ✅ Undo restores all

4. **Delete block with nested grandchildren**
   - ✅ Children promoted
   - ✅ Grandchildren stay with children
   - ✅ Undo restores hierarchy

5. **Delete → Undo → Redo**
   - ✅ Tree identical after redo
   - ✅ No orphans at any step

6. **Delete last root block with children**
   - ✅ Children promoted to root
   - ✅ Document invariant preserved

---

### Integration Tests (Required)

Real-world scenarios:

1. **Delete nested list item** (3 children)
2. **Delete toggle header** (5 children)
3. **Delete paragraph with indented children**
4. **Rapid delete → undo → delete → undo**
5. **Multi-block delete with nested hierarchy**

---

## Edge Cases (Explicitly Defined)

### Case 1: Type Mismatch After Promotion

**Scenario**: List child promoted under paragraph parent

**Behavior**: ✅ **Allowed**

- Promotion happens unconditionally
- Resolver/UI may convert types later
- Deletion logic does NOT branch on type

---

### Case 2: Deep Nesting (3+ Levels)

**Scenario**:

```
A
└─ B
   └─ C
      └─ D
```

**Delete B**:

```
A
└─ C  // promoted
   └─ D  // stays with C
```

**Behavior**: Only **direct children** promoted.

---

### Case 3: Deleting Root-Level Block

**Scenario**: Block at root with children

**Behavior**:

- Children promoted to root
- Document invariant: "≥ 1 block" is preserved
- If last block → create empty paragraph (resolver responsibility)

---

### Case 4: Simultaneous Multi-Block Delete

**Scenario**: User deletes 3 blocks at once (selection)

**Behavior**:

- Each block deleted individually
- Each block's children promoted
- Order preserved
- Atomic transaction (all or nothing)

---

## What This Unlocks

Once this contract is implemented:

✅ **ListBlock fixes become trivial**

- Backspace → `delete-block` intent
- Delete → `delete-block` intent
- No child logic in block code

✅ **Toggle becomes safe**

- Delete header → children promoted
- No special handling needed

✅ **Undo becomes trustworthy**

- Structure always restored
- No orphans possible

✅ **Tree integrity is guaranteed**

- No corruption possible
- No "works until refresh" bugs

✅ **Future blocks are safe by default**

- Tables, outlines, embeds all work
- No per-block child logic

---

## Next Steps

### Phase 2.2.4.2 — Implement Primitive

1. Add `engine.deleteBlock(blockId)` method
2. Implement canonical promotion logic
3. Update `DeleteBlockCommand` to use primitive

### Phase 2.2.4.3 — Unit Tests

1. Write all verification tests
2. Ensure 100% pass rate
3. No edge cases skipped

### Phase 2.2.4.4 — Integration

1. Update all `delete-block` intents to use new command
2. Remove all block-level child logic
3. Remove all PM default deletion for structural blocks

### Phase 2.2.5 — Resume ListBlock Fixes

Only AFTER engine is safe:

- Fix Backspace
- Implement Delete
- Enforce all Section B contracts

---

## Status

- [x] Law defined
- [x] Questions answered
- [x] Contract written
- [ ] Primitive implemented
- [ ] Tests written
- [ ] Integration complete

**Current Phase**: Ready for implementation

**Blockers**: None

**Next Action**: Implement `engine.deleteBlock()` primitive

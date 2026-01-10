# 🔒 Indent/Outdent Tree Invariant

**Critical Structural Rule - Never Break This**

**Created:** January 2026 (discovered during collapse refactor)  
**Status:** Authoritative — blocks all PRs that violate this

---

## 🚨 The Bug (Before Fix)

### Broken Behavior:

```
Hey (collapsed)
 ├─ I am here
 ├─ Me too          ← Shift+Tab on this
 ├─ I am here too
 └─ Hey

RESULT (WRONG):
Hey
 ├─ I am here
 ├─ I am here too   ← orphaned!
 └─ Hey             ← orphaned!

Me too              ← visually outdented, but children left behind
```

### Why This Breaks:

- **Structural inconsistency**: Children don't follow their parent
- **Tree corruption**: Ownership chain broken
- **Collapse breaks**: Hidden nodes lose their parent reference
- **Undo corrupts**: Can't restore valid tree state

---

## ✅ The Golden Rule

**When a block moves (indent/outdent), its entire subtree MUST move with it.**

A block "owns" all consecutive following blocks until a block with equal or lower indent appears.

```
Parent (indent 0)
 ├─ Child A (indent 1)    ← Parent owns this
 ├─ Child B (indent 1)    ← Parent owns this
 │  └─ Grandchild (indent 2)  ← Parent owns this too
 └─ Child C (indent 1)    ← Parent owns this

Next Parent (indent 0)    ← Parent stops owning here
```

**Invariant:** `block[i]` owns all `block[j]` where `j > i` and `block[j].indent > block[i].indent`

---

## 🧩 Canonical Algorithm

### 1. Get Subtree Range

```typescript
function getSubtreeRange(blocks: Block[], index: number): [number, number] {
  const baseIndent = blocks[index].indent;
  let end = index + 1;

  // Find all consecutive blocks with greater indent
  while (end < blocks.length && blocks[end].indent > baseIndent) {
    end++;
  }

  return [index, end]; // [start inclusive, end exclusive]
}
```

**Rules:**

- Ignores `collapsed` state (visual only, not structural)
- Works on flat block array (document order)
- Returns range `[start, end)` where all blocks must move together

---

### 2. Outdent (Shift+Tab)

```typescript
function outdent(blocks: Block[], index: number): Block[] {
  // Can't outdent root-level blocks
  if (blocks[index].indent === 0) return blocks;

  const [start, end] = getSubtreeRange(blocks, index);

  // Move entire subtree one level up
  for (let i = start; i < end; i++) {
    blocks[i].indent -= 1;
  }

  return blocks;
}
```

**Guarantees:**

- ✅ Parent and all descendants move together
- ✅ Relative indent preserved (children stay children)
- ✅ No orphaned blocks
- ✅ Tree remains valid

---

### 3. Indent (Tab)

```typescript
function indent(blocks: Block[], index: number): Block[] {
  const prev = blocks[index - 1];
  if (!prev) return blocks;

  // Can only indent one level deeper than previous block
  const maxIndent = prev.indent + 1;
  if (blocks[index].indent >= maxIndent) return blocks;

  const [start, end] = getSubtreeRange(blocks, index);

  // Move entire subtree one level deeper
  for (let i = start; i < end; i++) {
    blocks[i].indent += 1;
  }

  return blocks;
}
```

**Prevents:**

- ❌ Indent jumps (can't go from indent 0 → 2 directly)
- ❌ Invalid trees
- ❌ Orphaned descendants

---

## 🔐 Collapse: The Fixed Rule

**CRITICAL:** Collapse is **visual only** — it must **NEVER** affect structural operations.

```typescript
// ✅ CORRECT
function outdent(block) {
  const subtree = getSubtree(block); // Gets ALL descendants
  // ... move subtree regardless of collapsed state
}

// ❌ WRONG
function outdent(block) {
  if (block.collapsed) {
    // Don't move children ???
  }
  // BUG: orphans children when parent is collapsed
}
```

**Rules:**

- `collapsed = true` → Hide children visually (CSS)
- Collapsed children are **still** children structurally
- Hidden ≠ Detached
- Tree math **ignores** `collapsed` entirely

---

## 🧪 Tree Validation (Always Run in Dev)

```typescript
function assertValidTree(blocks: Block[]): void {
  for (let i = 1; i < blocks.length; i++) {
    const curr = blocks[i];
    const prev = blocks[i - 1];

    // Rule 1: No indent jumps > 1
    if (curr.indent > prev.indent + 1) {
      throw new Error(
        `Invalid indent jump at block ${i}: ` +
          `prev.indent=${prev.indent}, curr.indent=${curr.indent}`
      );
    }

    // Rule 2: Root blocks must have indent = 0
    if (i === 0 && curr.indent !== 0) {
      throw new Error(`First block must have indent=0, got ${curr.indent}`);
    }
  }
}
```

**Run this:**

- After every indent/outdent
- After undo/redo
- After document load
- In integration tests

---

## 🚫 Never Break This Again Checklist

Before merging any indent/outdent changes:

### Structural Rules

- [ ] Subtree range is calculated correctly
- [ ] All descendants move with parent
- [ ] Relative indent preserved (children stay children)
- [ ] No indent jumps > 1 level

### Collapse Independence

- [ ] `collapsed` state is NOT checked in indent logic
- [ ] Hidden blocks are treated as present
- [ ] Tree math ignores visual state

### Testing

- [ ] Outdent with children works
- [ ] Outdent collapsed parent works
- [ ] Indent with children works
- [ ] Multi-select indent/outdent works
- [ ] Undo/redo preserves tree validity

### Validation

- [ ] `assertValidTree()` passes after operation
- [ ] No orphaned blocks in document
- [ ] All blocks have valid parentId chain

---

## 🔗 Related Contracts

- [`EDITOR_BLOCK_CONTRACT.md`](./EDITOR_BLOCK_CONTRACT.md) - Block rendering rules
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) - Overall system design

---

## 📚 Why This Matters

**What breaks when this is wrong:**

- 🐛 Orphaned blocks after outdent
- 🐛 Collapse shows wrong items
- 🐛 Undo corrupts document
- 🐛 Copy/paste loses structure
- 🐛 Drag/drop breaks tree
- 🐛 Export loses hierarchy

**What works when this is right:**

- ✅ Notion-grade indent/outdent
- ✅ Reliable collapse
- ✅ Perfect undo/redo
- ✅ Structural integrity always

---

## 🏁 Implementation Status

**Current Status:** 🔴 **BROKEN** (only moves single block)

**Required Fix:**

1. Implement `getSubtreeRange()` helper
2. Update `handleIndentBlock()` to move subtree
3. Update `handleOutdentBlock()` to move subtree
4. Add `assertValidTree()` validation
5. Add integration tests

**Priority:** 🔥 **CRITICAL** — blocks merge until fixed

---

**If you're not sure whether to follow this rule: follow it.**  
**If you think this rule is wrong: it's not — open an issue for clarification.**

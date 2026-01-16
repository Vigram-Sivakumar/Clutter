# Collapse Boundary Invariant

**Date:** 2026-01-15  
**Status:** ✅ IMPLEMENTED

## The Law

> **Collapsed blocks are ATOMIC BOUNDARIES for structural keyboard operations.**

Hidden children (blocks with `data-hidden="true"`) are **non-existent** to:

- Enter key
- Backspace key
- Arrow navigation

## Principle

**"Position divergence, not visibility computation."**

Keyboard rules MUST NOT recompute visibility state.  
CollapsePlugin (`packages/editor/plugins/CollapsePlugin.ts`) is the **single authority** for visibility.

Rules detect divergence by comparing:

- **Logical position** (from collapse-aware helpers)
- **Physical position** (from ProseMirror document structure)

If they differ → collapsed range detected → skip to boundary.

## Architecture

### Single Authority (DO NOT DUPLICATE)

```typescript
// ✅ CORRECT: Use collapse-aware helpers
import { getNextBlock, getPreviousBlock } from '../../types/KeyboardContext';

const nextVisible = getNextBlock(ctx); // Already skips hidden blocks
const prevVisible = getPreviousBlock(ctx); // Already skips hidden blocks
```

```typescript
// ❌ FORBIDDEN: Recompute visibility
function isBlockHidden(doc, blockNode) {
  // DO NOT DO THIS - creates second authority
  // CollapsePlugin is the only source of truth
}
```

### Rules

**Enter Key:**

- `enterSkipHiddenBlocks` (priority 95)
  - Detects when physical next sibling != logical next block
  - Inserts paragraph at next VISIBLE position
  - Skips entire collapsed range

**Backspace Key:**

- `backspaceSkipHiddenBlocks` (priority 95)
  - Detects when physical previous sibling != logical previous block
  - Moves cursor to end of previous VISIBLE block
  - Never merges with hidden content

**Arrow Keys:**

- Already implemented (since initial flat model migration)
- Use same `getNextBlock()`/`getPreviousBlock()` helpers
- Fully collapse-aware

## Rule Priority Order

### Enter Rules

```
1000  enterOnSelectedBlocks      (halo selection)
120   enterToggleCreatesChild    (toggle behavior)
115   exitEmptyBlockInToggle     (outdent)
95    enterSkipHiddenBlocks      ← BOUNDARY GUARD ✅
90    outdentEmptyList           (list behavior)
85    exitEmptyList              (list → paragraph)
-1000 enterEmptyBlockFallback    (global delegator)
```

### Backspace Rules

```
110   normalizeEmptyBlock        (empty → paragraph)
105   outdentEmptyList           (list behavior)
100   deleteEmptyParagraph       (delete)
95    backspaceSkipHiddenBlocks  ← BOUNDARY GUARD ✅
???   mergeWithStructuralBlock   (safety)
```

## Guarantees (What Must Not Break)

| Invariant                | Protection                                   |
| ------------------------ | -------------------------------------------- |
| **List continuation**    | Higher-priority rules run first              |
| **Undo grouping**        | Single rule = single transaction             |
| **Block identity**       | Rules delegate to `performStructuralEnter()` |
| **Arrow navigation**     | Uses same helpers (consistent)               |
| **Structural integrity** | No phantom merges, no hidden deletions       |

## Historical Context

### Why This Was Broken

The skip rules existed but were **not registered** in keymaps:

- `enterSkipHiddenBlocks.ts` ✅ defined
- `backspaceSkipHiddenBlocks.ts` ✅ defined
- But NOT imported/enabled in `enter.ts` or `backspace.ts` ❌

Additionally, the original implementation used `parentBlockId` to detect hidden blocks, which doesn't exist in the **flat indent model**.

### The Fix (2026-01-15)

1. **Rewrote skip rules** to use position divergence (no visibility math)
2. **Enabled rules** by importing and registering them at priority 95
3. **Zero refactoring** of other systems (CollapsePlugin, arrow nav, etc.)

Files modified:

- `packages/editor/plugins/keyboard/rules/enter/enterSkipHiddenBlocks.ts`
- `packages/editor/plugins/keyboard/rules/backspace/backspaceSkipHiddenBlocks.ts`
- `packages/editor/plugins/keyboard/keymaps/enter.ts`
- `packages/editor/plugins/keyboard/keymaps/backspace.ts`

## Testing Scenarios

To prevent regression, verify:

### Enter Key

1. **Collapsed toggle (non-empty)** → Creates child inside (priority 120 wins)
2. **Paragraph before collapsed toggle** → Creates paragraph after toggle (skips hidden children)
3. **Collapsed task list with children** → Inserts after entire collapsed range

### Backspace Key

1. **At start of paragraph after collapsed toggle** → Moves to end of toggle header (skips hidden children)
2. **At start of paragraph after collapsed task** → Same behavior
3. **Never deletes or merges with hidden content**

### Arrow Keys (Already Working)

1. **ArrowDown from collapsed toggle** → Jumps to next visible block
2. **ArrowUp to collapsed task** → Moves to task header (not hidden children)

## Dependencies

This invariant relies on:

- `CollapsePlugin.ts` (visibility authority)
- `KeyboardContext.ts` (collapse-aware helpers)
- `KeyboardEngine.ts` (priority-based evaluation)

**DO NOT:**

- Modify `getNextBlock()`/`getPreviousBlock()` to stop skipping hidden blocks
- Add visibility logic to individual block components
- Create alternate visibility computation in keyboard rules

## Enforcement

If you need to add a new Enter/Backspace rule:

1. ✅ Check if next/previous logical block diverges from physical
2. ✅ Use `getNextBlock()`/`getPreviousBlock()` helpers
3. ❌ Do NOT check `node.attrs.collapsed` directly
4. ❌ Do NOT traverse document to compute visibility

## Rationale

**Why not compute visibility in keyboard rules?**

If keyboard rules compute visibility independently from CollapsePlugin:

- Selection positions can drift between what's "hidden" vs where cursor actually is
- Undo stack can desync (PM sees different structure than keyboard rules)
- Phantom cursors appear (rule thinks position is valid, CollapsePlugin hides it)

**Why position divergence works:**

The collapse-aware helpers (`getNextBlock`, `getPreviousBlock`) are:

- Battle-tested (arrow navigation depends on them)
- Flat-model compatible (no parent pointers needed)
- Consistent with CollapsePlugin (same visibility model)

If physical != logical position → there MUST be hidden content between them.

This is a **structural fact**, not a visibility computation.

---

**Last verified:** 2026-01-15  
**Signed off by:** Blue (diagnostic), Vigram (implementation)

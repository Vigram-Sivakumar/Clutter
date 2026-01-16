# Enter Skip Hidden Blocks - Implementation Details

**Rule ID:** `enter:skipHiddenBlocks`  
**Priority:** 95  
**Purpose:** Prevent Enter from inserting inside collapsed subtrees

---

## The Problem (From Engine Logs)

When user presses Enter on a collapsed toggle/task:

```
✓ enterToggleCreatesChild → Skipped (condition not met)
✓ exitEmptyBlockInToggle → Skipped
✓ outdentEmptyList → Skipped
✓ exitEmptyList → Skipped
✓ enter:globalFallback → FIRES (always matches)
    ↓
performStructuralEnter() called
    ↓
Calculates insertion position
    ↓
Next block is HIDDEN (inside collapsed range)
    ↓
[Error] [createBlock] Invalid insert position
```

**Root cause:** No rule intercepted before `globalFallback`, so `performStructuralEnter()` ran with invalid anchor.

---

## The Solution

**Intercept at priority 95** (after toggle rules, before fallback):

### Detection (when)

Use **position divergence**, not visibility computation:

```typescript
when(ctx: KeyboardContext): boolean {
  if (!isAtEndOfBlock(ctx)) return false;

  // Get LOGICAL next (collapse-aware)
  const nextLogical = getNextBlock(ctx);

  // Get PHYSICAL next (ProseMirror structure)
  const nextPhysical = /* calculate from current block */;

  // If positions differ → collapsed range between them
  return nextLogical?.pos !== nextPhysical.pos;
}
```

**Why position divergence?**

- `getNextBlock()` already skips hidden blocks (arrow nav uses it)
- If logical != physical → there MUST be hidden content between
- No need to recompute visibility (CollapsePlugin is authority)
- Structural fact, not visibility opinion

### Execution (execute)

Use **canonical Enter pattern** (same as `enterOnSelectedBlocks`):

```typescript
execute(ctx: KeyboardContext): boolean {
  const nextVisible = getNextBlock(ctx);
  const currentIndent = ctx.currentNode.attrs?.indent ?? 0;

  return editor.commands.command(({ state, dispatch }) => {
    if (!dispatch) return false;

    const tr = state.tr;

    // Create block using centralized function
    const paragraphNode = createBlock(state, tr, {
      type: 'paragraph',
      insertPos: nextVisible.pos,  // AFTER collapsed range
      indent: currentIndent,        // Preserve indent
    });

    if (!paragraphNode) return false;

    // Set cursor
    tr.setSelection(TextSelection.create(tr.doc, nextVisible.pos + 1));

    // Mark for undo (CRITICAL)
    tr.setMeta('addToHistory', true);
    tr.setMeta('closeHistory', true);  // One keypress = one undo

    dispatch(tr);
    return true;  // ← HARD STOP (prevents globalFallback)
  });
}
```

**Why this pattern?**

1. ✅ ONE transaction (not `chain()` which can split)
2. ✅ Uses `createBlock()` (identity + indent handling)
3. ✅ Sets `closeHistory: true` (undo grouping)
4. ✅ Returns `true` → stops rule evaluation → `globalFallback` never fires
5. ✅ `performStructuralEnter()` never called → no crash

---

## What This Does NOT Do

❌ Recompute visibility (CollapsePlugin is authority)  
❌ Check `collapsed === true` directly  
❌ Use `parentBlockId` (doesn't exist in flat model)  
❌ Let `performStructuralEnter()` run (would crash)  
❌ Use `chain()` (breaks undo)

---

## Priority Placement

```
1000  enterOnSelectedBlocks      (halo selection)
 120  enterToggleCreatesChild    (toggle creates child)
 115  exitEmptyBlockInToggle     (outdent empty)
  95  enterSkipHiddenBlocks      ← THIS RULE
  90  outdentEmptyList           (list outdent)
  85  exitEmptyList              (list → paragraph)
-1000 enter:globalFallback       (delegates to performStructuralEnter)
```

**Why 95?**

- Must run AFTER `enterToggleCreatesChild` (120)
  - When expanded, toggle should still create child
- Must run BEFORE `outdentEmptyList` (90)
  - Structural boundary takes precedence
- Must run BEFORE `enter:globalFallback` (-1000)
  - Prevents invalid anchor crash

---

## Testing

### Case 1: Collapsed toggle (non-empty)

```
Before: [Toggle with hidden children]|
Press Enter
After:  [Toggle with hidden children]
        |← cursor here (sibling, not child)
```

### Case 2: Expanded toggle

```
Before: [Toggle]|
        └ Child 1
Press Enter
After:  [Toggle]
        |← cursor here (child created by priority 120 rule)
        └ Child 1
```

### Case 3: Paragraph before collapsed toggle

```
Before: [Paragraph]|
        [Collapsed toggle]
          (hidden children)
        [Next block]
Press Enter
After:  [Paragraph]
        |← cursor here (AFTER collapsed range)
        [Collapsed toggle]
          (hidden children)
        [Next block]
```

---

## Dependencies

- `getNextBlock()` from `KeyboardContext` (collapse-aware)
- `createBlock()` from `core` (identity + guards)
- `TextSelection` from ProseMirror (cursor positioning)
- CollapsePlugin (visibility authority)

---

**Last Updated:** 2026-01-15  
**Status:** ✅ Implemented and tested

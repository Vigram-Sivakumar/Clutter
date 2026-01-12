# Selection Semantics & Escalation Law

**Status:** 🟡 Partially Implemented (Phase 4 in progress)  
**Date:** January 2026  
**Authority:** Constitutional (never regress)

---

## ⚠️ IMPLEMENTATION STATUS

| Component                                       | Status                     | Phase              |
| ----------------------------------------------- | -------------------------- | ------------------ |
| **Selection Types** (Sections I-II)             | ✅ Implemented             | Phase 4 (Current)  |
| **Selection Ownership**                         | ✅ Implemented             | Phase 4 (Current)  |
| **Visual Rendering Rules**                      | ✅ Implemented             | Phase 4 (Current)  |
| **Ctrl+A Progressive Escalation** (Section III) | ⏭️ **NOT YET IMPLEMENTED** | Phase 5 (Deferred) |
| **Placeholder Rules** (Section IV)              | ✅ Implemented             | Phase 4 (Current)  |
| **Cursor Recovery** (Section V)                 | ✅ Implemented             | Phase 4 (Current)  |

**This document serves dual purposes:**

1. **Authoritative contract** for implemented selection semantics (Sections I, II, IV-XII)
2. **Target specification** for future Ctrl+A behavior (Section III - deferred to Phase 5)

---

## I. The Three Selection Modes (No More, No Less)

### 1️⃣ Text Selection (Character-Level)

**Owner:** Browser + TipTap  
**Renderer:** Native `::selection`  
**Authority:** Browser

**Rules:**

- Browser paints highlight
- Engine mirrors, never mutates
- DOM selection is sacred
- Highest priority

**Triggers:**

- Mouse drag in text
- Shift + arrows
- Double/triple click
- Ctrl+A (cursor inside text) - ⏭️ Phase 5

**Forbidden Forever:**

```javascript
❌ window.getSelection().removeAllRanges();
❌ event.preventDefault() on selection events
❌ Manual DOM selection clearing
```

---

### 2️⃣ Block Selection (Structural / Halo)

**Owner:** EditorEngine  
**Renderer:** Halo / background  
**Authority:** Engine

**Rules:**

- Activated only by explicit block gesture
- Text highlight suppressed **visually only** (CSS)
- DOM selection untouched

**Triggers:**

- Click block handle
- Shift+click handles
- Ctrl+A (second press) - ⏭️ Phase 5

**Correct Suppression:**

```css
✅ [data-block-selected='true'] ::selection {
  background: transparent;
}
```

**Never:**

```javascript
❌ removeAllRanges()
❌ Manual DOM manipulation
```

---

### 3️⃣ Spatial / Drag Selection (Transient)

**Owner:** Interaction layer  
**Renderer:** Temporary overlay  
**Authority:** Gesture-scoped

**Rules:**

- Exists only during drag
- Converts to block selection on mouseup
- Never touches DOM selection

---

## II. Priority Order (Non-Negotiable)

```
Text selection
  ↓ (if not in text mode)
Block selection
  ↓ (if not dragging)
Spatial selection
```

**If two appear simultaneously → BUG**

---

## III. Ctrl+A Progressive Escalation

> **⏭️ PHASE 5 - NOT YET IMPLEMENTED**
>
> This section defines the **intended behavior** for Ctrl+A keyboard shortcuts.
> It is a **target specification**, not current reality.
>
> **Current Status:** Ctrl+A behavior is not yet implemented according to this spec.
> **Timeline:** Will be implemented in Phase 5, after selection semantics are fully audited and enforced.
>
> **Do not use this section for auditing current behavior.**
> Use Sections I-II for that purpose.

### The Golden Rule

> **Escalation only happens when the previous scope is already fully selected.**

This is what makes editors feel intentional, not random.

### State Machine

| Press          | Condition                 | Action                            | Visual Result               |
| -------------- | ------------------------- | --------------------------------- | --------------------------- |
| **1st Ctrl+A** | Cursor in text            | Browser selects all text in block | Blue highlight (native)     |
| **2nd Ctrl+A** | Block text fully selected | Engine selects block as node      | Halo (editor-rendered)      |
| **3rd Ctrl+A** | Block selected as node    | Engine selects all blocks         | All halos (editor-rendered) |

### Implementation (SelectAll.ts)

```typescript
// GUARD: First Ctrl+A (Case A)
if (shouldAllowNativeSelectAll(state)) {
  return false; // ✅ Let browser paint native highlight
}

// ESCALATION: Second Ctrl+A (Case B)
if (isBlockFullySelected(state)) {
  return selectCurrentBlockAsNode(state, dispatch); // ✅ Block halo
}

// ESCALATION: Third Ctrl+A (Case C)
if (isNodeSelected(state)) {
  return selectAllBlocks(state, dispatch); // ✅ All block halos
}
```

### Critical Checks

**`shouldAllowNativeSelectAll()`** - Guards first press

- Returns `true` when cursor is in text and block NOT fully selected
- Returns `false` when already in structural mode or block fully selected

**`isBlockFullySelected()`** - Guards second press

- Checks if selection spans entire block content (`blockStart` to `blockEnd`)
- This is the "previous scope is fully selected" check

**`isNodeSelected()`** - Guards third press

- Checks if selection is a `NodeSelection` (structural)

---

## IV. Placeholder Law

**Placeholder is visual hint only, never content.**

### Implementation (ONLY Correct Way)

```tsx
<span
  contentEditable={false}
  aria-hidden
  className="placeholder"
  style={
    {
      /* NO position: absolute */
    }
  }
>
  Type something…
</span>
```

### Visibility Law

```typescript
showPlaceholder =
  isEmpty && !isFocused && selection.kind === 'none' && mode === 'idle';
```

**Requirements:**

- ✅ Inline element (participates in layout)
- ✅ `contentEditable={false}`
- ✅ Inside editable flow
- ✅ No absolute positioning
- ✅ No overlays

---

## V. Cursor Recovery Law

**After any structural mutation:**

1. Same block (if survives)
2. Previous sibling (end of text)
3. Next sibling (start of text)
4. Parent block
5. New paragraph (root fallback)

**Undo restores exact cursor + selection state.**

No guessing. No heuristics. No "best effort."

---

## VI. What to Never Do (Constitutional Violations)

### ❌ DOM Selection Manipulation

```javascript
// NEVER in any file, ever
window.getSelection().removeAllRanges();
window.getSelection().setPosition();
window.getSelection().collapse();
```

### ❌ Global Selection Suppression

```css
/* NEVER suppress globally */
.editor ::selection { background: transparent; } ❌
[data-node-view-wrapper]::selection { background: transparent; } ❌
```

### ❌ Blind Escalation

```javascript
// NEVER cycle without checking state
let pressCount = 0;
if (++pressCount === 3) selectAll(); // ❌ WRONG
```

### ❌ Placeholder Overlays

```css
/* NEVER use absolute positioning */
.placeholder {
  position: absolute; ❌
  top: 0;
  left: 0;
}
```

---

## VII. Selection Regression Checklist

**Run every time before commit/deploy:**

### Text Selection

- [ ] Drag-select → highlight visible
- [ ] Ctrl+A (first press) → highlight visible
- [ ] Shift+arrow → highlight visible
- [ ] Undo → highlight restored

### Block Selection

- [ ] Handle click → halo only (no text highlight)
- [ ] Ctrl+A (second press) → single halo
- [ ] Ctrl+A (third press) → all halos
- [ ] Delete → blocks removed, cursor sane

### Placeholder

- [ ] Empty + unfocused → visible
- [ ] Focus → hidden
- [ ] Selection → hidden
- [ ] Undo → correct visibility

### Mixed Scenarios

- [ ] Ctrl+A → Delete → no weird highlights
- [ ] Delete all blocks → empty paragraph, no blue wrapper
- [ ] Block halo + text selection → NEVER both at once

**If any fail → authority violation**

---

## VIII. Architecture Guarantees

When this law is enforced:

| Guarantee                     | Status      | Phase   |
| ----------------------------- | ----------- | ------- |
| Text selection always visible | 🔍 Auditing | Phase 4 |
| Ctrl+A feels intentional      | ⏭️ Phase 5  | Phase 5 |
| Undo never surprises          | ✅ Verified | Phase 4 |
| Placeholder never overlaps    | ✅ Verified | Phase 4 |
| No DOM selection hacks        | 🔍 Auditing | Phase 4 |
| Industry-standard behavior    | 🔍 Auditing | Phase 4 |

**Legend:**

- ✅ Verified - Audited and confirmed working
- 🔍 Auditing - Needs verification against contract
- ⏭️ Phase 5 - Deferred to Ctrl+A implementation phase

---

## IX. File-Level Enforcement

### Files That Must Never Violate

1. **`SelectAll.ts`** - State-aware escalation only
2. **`EditorCore.tsx`** - No global `::selection` suppression
3. **`BlockDeletion.ts`** - No `removeAllRanges()` (migrating to intents)
4. **`tiptapBridge.ts`** - Mirror selection, never mutate
5. **All block components** - Inline placeholders only

### Violation Detection

If you see any of these in a PR or commit:

- `window.getSelection().removeAllRanges()`
- `position: absolute` on placeholder
- `::selection { background: transparent }` globally
- Escalation without state checks

→ **REJECT immediately**

---

## X. What This Achieves

You now have:

- ✅ Apple-level selection semantics
- ✅ Craft-level calm cursor behavior
- ✅ Notion-level block control
- ✅ Tana-level structural safety
- ✅ Workflowy-level predictability

**This is the hard part. Visual polish is easy after this.**

---

## XI. Future-Proofing

### When Adding New Features

**Before implementing:**

1. Does it touch DOM selection? → NO
2. Does it clear selection? → Use engine only
3. Does it add a placeholder? → Inline only
4. Does it intercept Ctrl+A? → Check this law first

### When Debugging Selection Issues

**Check in order:**

1. Is text highlight suppressed by CSS?
2. Is DOM selection being cleared somewhere?
3. Is escalation checking state properly?
4. Is placeholder overlaying content?

---

## XII. Authority Contact

If unsure whether a change violates this law:

1. Read Section VI (What to Never Do)
2. Run Section VII (Regression Checklist)
3. If still unsure → assume violation and ask

**This law is constitutional. No exceptions. No "just this once."**

---

**Last Updated:** January 12, 2026  
**Status:** 🟡 Phase 4 (Selection Semantics) - Implemented & Being Audited  
**Status:** ⏭️ Phase 5 (Ctrl+A Escalation) - Not Yet Implemented  
**Regressions:** TBD (audit in progress)

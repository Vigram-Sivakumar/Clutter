# 🔒 Editor Block Contract

**Never Break This Again Checklist**

This document defines the non-negotiable contract every block in the editor must follow.

If any rule here is violated, the editor will regress (cursor bugs, crashes, delayed collapse, selection corruption).

**Created:** January 2026 (after flat toggle implementation + legacy cleanup)  
**Status:** Authoritative — no exceptions

---

## ✅ 1. Structural Contract (DOM)

Every block MUST render exactly:

```
ProseMirror
└─ react-renderer (1 per block)
   └─ NodeViewWrapper (exactly one)
      ├─ Block handle (contenteditable=false)
      └─ Block content root (data-node-view-content)
```

### ❌ Forbidden

- Nesting `react-renderer`
- Rendering multiple `NodeViewWrapper`s
- Rendering block content outside `data-node-view-content`

---

## ✅ 2. NodeViewWrapper Rules (Critical)

### REQUIRED

- Always wrap the block in `<NodeViewWrapper>`
- Must contain `data-node-view-wrapper`
- Must carry:
  - `data-type`
  - `data-level`
  - `data-hidden`
- Collapse = `style={{ display: 'none' }}`

### ❌ Forbidden

- Hiding children instead of the wrapper
- Using `opacity`, `height`, `visibility`, or `position` to hide
- Conditional rendering of the wrapper

**Rule of thumb:** If the wrapper disappears or stays visible when collapsed → ❌ broken

---

## ✅ 3. Collapse Contract

### Collapse logic MUST:

- Be derived from `parentBlockId`
- Be purely structural
- Live outside the block (plugin / helper / shared logic)

### Blocks MUST:

- Respect `data-hidden`
- Never override collapse behavior
- Never compute their own collapse state

### ❌ Forbidden

- Per-block collapse logic
- DOM traversal for collapse
- React state for collapse

---

## ✅ 4. Keyboard Safety Contract

### Guarantees that MUST remain true:

- Cursor can never land inside `data-hidden="true"`
- `ENTER` can never insert inside collapsed subtrees
- `BACKSPACE` can never delete hidden blocks
- Arrow keys must skip hidden blocks

### ❌ Forbidden

- Keyboard logic inside block components
- Position math inside NodeViews
- Bypassing shared keyboard helpers

**Keyboard logic belongs in global rules only**

---

## ✅ 5. Contenteditable Rules

### REQUIRED

- `contenteditable=true` exists only on `.ProseMirror`
- Block handles MUST be `contenteditable=false`
- UI affordances MUST be `contenteditable=false`

### ❌ Forbidden

- `contenteditable` on wrappers
- Editable icons / counters
- Editable toggle chevrons

---

## ✅ 6. Indentation & Layout Rules

### REQUIRED

- Indentation derived from `level`
- Layout spacing handled by:

```css
.ProseMirror {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

### ❌ Forbidden

- Margins between blocks
- Hardcoded padding not derived from `level`
- Layout logic inside content nodes

---

## ✅ 7. Hidden ≠ Removed

### Hidden blocks MUST:

- Exist in the document
- Exist in the DOM
- Be `display: none`
- Be skipped by selection helpers

### ❌ Forbidden

- Unmounting hidden blocks
- Conditionally rendering children
- Removing nodes on collapse

---

## ✅ 8. Block Handle Rules

### REQUIRED

- Block handle always exists
- Pointer events allowed
- May be visually hidden, never removed

### ❌ Forbidden

- Conditional rendering
- `contenteditable=true`
- Coupling handle logic with content logic

---

## ✅ 9. New Block Implementation Checklist

Before merging a new block:

### 🧪 Visual

- [ ] Collapses instantly
- [ ] Reappears instantly
- [ ] Indents correctly
- [ ] Does not shift layout when hidden

### ⌨️ Keyboard

- [ ] Arrow keys skip it when hidden
- [ ] `ENTER` never inserts inside it when hidden
- [ ] `BACKSPACE` never deletes it when hidden

### 🧱 Structure

- [ ] Exactly one `react-renderer`
- [ ] Exactly one `NodeViewWrapper`
- [ ] One `data-node-view-content`
- [ ] `data-hidden` respected

### 🔍 Debug

- [ ] Toggling collapse does NOT log selection warnings
- [ ] No TipTap "use NodeViewWrapper" errors
- [ ] No delayed hide/show behavior

---

## 🚨 10. Red Flags (STOP REVIEW IMMEDIATELY)

If you see any of these in a PR:

- `useState` for collapse
- `opacity: 0` instead of `display: none`
- `querySelector` inside blocks
- Keyboard logic inside NodeView
- Multiple `NodeViewWrapper`s
- Conditional rendering of wrapper

→ **Block the PR.**

---

## 🧠 Mental Model (Remember This)

**Blocks do not own behavior.**  
**The editor owns behavior.**  
**Blocks only render structure.**

If a block starts "deciding" things → the editor rots.

---

## 🏁 Final Rule

If a new block works when **collapsed, expanded, navigated, deleted, and nested** without special logic — it is **correct**.

If it needs **exceptions** — it's **wrong**.

---

## 📚 Related Documentation

- [`ARCHITECTURE.md`](../ARCHITECTURE.md) - Overall editor architecture
- [`PUBLIC_API.md`](../PUBLIC_API.md) - Public API contracts
- [`packages/editor/core/engine/README.md`](../packages/editor/core/engine/README.md) - Engine internals

---

## 🔗 References

This contract was established after:

1. Flat toggle implementation (Jan 2026)
2. Universal collapse system (CollapsePlugin + decorations)
3. Keyboard navigation hardening (Steps 1-3)
4. Legacy toggle system deletion (Phases 1-3)

All rules here are proven in production and backed by the current implementation.

**If you're not sure whether to follow a rule: follow it.**  
**If you think a rule is wrong: open an issue first, don't break it.**

# Flat Indent Model - Canonical Editor Architecture

## Non-Negotiable Principles

1. **The document is a flat ordered list**
   - No tree structure
   - No parent pointers
   - No children arrays
   - Order in array defines document order

2. **Indent is structure**
   - `indent` level defines nesting depth
   - Visual hierarchy is computed during rendering
   - No stored parent relationships

3. **Collapse is view-only**
   - `collapsed` is a boolean flag
   - Does NOT affect structure
   - Only affects rendering/visibility

4. **Never infer parents**
   - No "find parent" logic
   - No "adopt nearest" heuristics
   - Structure is explicit in indent levels

5. **Never auto-fix structure**
   - User input is always valid
   - No "repair" passes
   - No invariant enforcement

**If any code violates these principles, it's a bug.**

---

## Data Model

```typescript
type Block = {
  id: string;
  text: string;
  indent: number; // 0..n (depth in outline)
  collapsed: boolean; // UI state only
};
```

**That's it. Nothing else.**

---

## Why This Works

- **Battle-tested**: Craft, Bear, Workflowy, Logseq all use this
- **Simple**: Flat array, no graph traversal
- **Fast**: O(n) rendering, no tree walks
- **Debuggable**: Structure is always visible
- **Unbreakable**: No invariants to violate

---

## What We Never Add Back

❌ `parentBlockId`  
❌ `children` arrays  
❌ Tree validators  
❌ Recompute passes  
❌ Invariant enforcement  
❌ Auto-fixers  
❌ Bridge sync

**The old system fought itself. The new one can't.**

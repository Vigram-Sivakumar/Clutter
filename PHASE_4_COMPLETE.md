# Selection Semantics — Audited & Locked

⸻

## Status

**Phase 4: COMPLETE**  
**Confidence level:** High (audited, not assumed)  
**Last verified:** 2026-01-12

This document records the completion of Phase 4: Selection Semantics for the editor system.
It exists to freeze correctness, prevent regression, and clearly separate implemented behavior from future policy work.

⸻

## 🎯 Purpose of Phase 4

Phase 4 establishes **what selection is** in the editor — not how keyboard shortcuts behave, not UX escalation policies, but the core ownership and semantics of selection.

This phase answers:

- Who owns selection truth?
- Who is allowed to mutate it?
- Who is allowed to observe it?
- How visual selection maps to state
- What is explicitly forbidden

All conclusions below are **validated through code audits**, not inferred.

⸻

## 🔒 Locked Architectural Invariants

These invariants are now **non-negotiable**.

### 1. Selection Ownership

- **Engine owns block selection truth**
  - `engine.selection` is the source of truth for block selection
  - UI components NEVER mutate selection state
- **ProseMirror owns text selection only**
  - PM `TextSelection` is primary
  - PM selection is treated as write-only by the system

⸻

### 2. NodeSelection Status (Transitional)

- **NodeSelection exists in exactly two places:**
  1. `EditorCore.scrollToBlock()` — programmatic block highlighting
  2. `SelectAll.ts` — Ctrl+A escalation (Phase 5 territory)
- **NodeSelection is:**
  - ❌ NOT the source of truth
  - ❌ NOT expanded elsewhere
  - ✅ Documented as a Phase 4 → Phase 5 transitional bridge

**Phase 5 target:** Remove NodeSelection entirely and replace with pure engine-driven selection + CSS halos.

⸻

### 3. UI Is Observer-Only

- **UI components:**
  - ❌ Never mutate PM selection
  - ❌ Never mutate engine selection
  - ✅ Only render based on derived state
- **Halo rendering:**
  - Driven by `engine.selection`
  - Observed via `useBlockSelection`
  - Rendered via `BlockSelectionHalo`
  - No feedback loops

⸻

### 4. No DOM Selection Manipulation

The following are **explicitly forbidden** and verified absent:

- `window.getSelection`
- `removeAllRanges`
- `Selection.collapse`
- Manual `Range` manipulation
- DOM-driven resurrection of selection state

Selection rendering is **visual only**, never stateful.

⸻

### 5. CSS Selection Rules

- Text selection is rendered by the browser (`::selection`)
- Text selection is visually suppressed **only when:**
  - A block halo is active
  - Via CSS only (`background-color: transparent`)
- No global suppression
- No DOM interference

⸻

### 6. Cursor Boundaries

- **Cursor never enters block chrome**
  - All non-content areas are `contentEditable={false}`
  - Caret plane is strictly `[contenteditable="true"]`
  - Placeholder rendering targets caret plane only

⸻

## 🧪 Audits Performed (Evidence-Based)

All audits were performed with **read-only, evidence-collection discipline**.

| Audit | Scope                  | Result                               |
| ----- | ---------------------- | ------------------------------------ |
| A     | CSS Selection Rules    | ✅ Compliant                         |
| B     | DOM / PM Manipulation  | ✅ Clean (NodeSelection documented)  |
| C     | SelectAll Behavior     | ✅ Phase 5-scoped                    |
| D     | Block Selection & Halo | ✅ Gold-standard observer model      |
| E     | useBlockSelection Hook | ✅ Pure observer, no authority creep |

**Outcome:** No Phase 4 violations found.

⸻

## 📚 Documentation State

All documentation is now **honest and aligned with reality**:

- **SELECTION_ESCALATION_LAW.md**
  - Phase 4 semantics marked as implemented
  - Phase 5 Ctrl+A escalation clearly deferred
- **EditorCore.tsx**
  - Contract header documents transitional NodeSelection usage
- **SelectAll.ts**
  - Explicitly marked as Phase 5 territory
  - Inline comments at all NodeSelection creation sites

No aspirational claims remain undocumented.

⸻

## 🚧 Explicitly Out of Scope (Phase 5)

The following are **not part of Phase 4** and must not be back-ported:

- Ctrl+A progressive escalation policy
- Multi-press selection behavior
- Keyboard shortcut UX tuning
- Removal of NodeSelection
- Selection UX enhancements

**Any change touching these areas is Phase 5 work.**

⸻

## 🟢 What This Enables

With Phase 4 complete, the system now supports:

- Deterministic selection behavior
- Safe extension of block types
- Confident refactors without selection regressions
- Clean separation of semantics vs policy
- Clear onboarding path for contributors

⸻

## 🚨 Regression Rule

Any change that violates the invariants in this document is either:

- A Phase 5 change, or
- A regression

**There is no third category.**

⸻

## ✅ Phase 4 Final State

- No loose ends
- No hidden debt
- No TODOs masking architectural uncertainty
- Selection semantics are **proven, not assumed**

**Phase 4 is complete.**

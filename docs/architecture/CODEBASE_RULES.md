# Clutter Codebase Rules & Architecture Contracts

This document defines non-negotiable rules for exports, package boundaries, and code ownership in Clutter.

These rules exist to keep the codebase **honest, refactorable, and scalable**.

---

## 1. Core Principle

> **Usage, not intention, defines API.**

- Code is exported only when it is consumed
- Comments like "for future use" do not justify exports
- Git history is the archive for experiments, not the codebase

---

## 2. Package Responsibilities

### `domain`

**Purpose:** Core types and pure logic

**Rules:**
- No UI concerns
- No framework dependencies
- Exports must be minimal and intentional
- Types are exported only if used across packages

❌ Do not export speculative types  
✅ Export only types that are actively consumed

---

### `state`

**Purpose:** Application orchestration and state management

**Rules:**
- May depend on `domain` and `shared`
- Internal helpers must stay private
- No UI imports
- No "helper exports" unless used externally

❌ Future-intent helpers  
❌ UI-facing utilities  
✅ State logic + selectors + actions only

---

### `shared`

**Purpose:** Cross-package utilities and hooks

**Rules:**
- Export only what is used by more than one package
- No generic utility dumping ground
- Helpers used by a single consumer stay local

❌ Date/math/string utility libraries "just in case"  
❌ Constants without active consumers  
✅ Small, boring, well-used surface

**Current exports (approved):**
- `sortByOrder`, `getTodayDateString`, `formatTaskDateLabel`, `compareDates`
- `useTheme`, `useConfirmation`

---

### `ui`

**Purpose:** Reusable, rendered UI components

**Rules:**
- Every component must be rendered by a real app
- No prototype, experimental, or playground components
- No backup files or abandoned variants

❌ `playground/`, `*.backup`, experimental components  
❌ Unused visual variants  
✅ Only components that appear on screen

---

### `editor`

**Purpose:** Isolated editor system

**Rules:**
- Must be dependency-inverted
- Receives data and callbacks via adapters
- Does not import app or state orchestration directly

**Editor is a leaf, not a hub.**

#### Editor UX Invariants

**Core Principle:** The editor never disappears. Only the document changes.

**Implementation:**
- Editor instance lifetime = app lifetime (single instance reused across notes, content updated via props)
- Editor mounts once per note, documents flow through it
- No "Loading editor" spinners or blank states
- Smooth 120ms opacity transition during note switches (0.92 opacity)
- Editor is non-editable during transition (`isFrozen={isSwitchingNote}`)
- No auto-focus on note switch to prevent cursor jump

**Why:**
- Feels like Apple Notes / Notion
- No jarring unmount/remount flashes
- User trusts the editor is always there
- Hydration is a data concern, not a render concern

#### Silence & Trust

**Core Principle:** The app never narrates its internal work.

**Rules:**
- No "Initializing database..." messages
- No "Hydration complete" logs
- No "Saving..." notifications
- No "Editor ready" indicators
- No loading spinners for normal operations

**Why:**
- Apple/Notion don't narrate - they just work
- User logs should be actionable, not informative
- Silence builds trust
- Narration creates anxiety

**Exception:** Error messages and warnings about actual problems (e.g., save failures, integrity issues) should always be shown.

---

## 3. Export Rules (Strict)

Before exporting anything, ask:

1. Is it used outside this file?
2. Is it used outside this package?
3. Is it required **today**?

**If the answer is no → do not export.**

Exporting is a promise. Broken promises rot codebases.

---

## 4. Experiments & Prototypes

### Where experiments live:
- Feature branches
- Apps (temporary routes)
- Storybook (if introduced)

### Where experiments do NOT live:
- Packages
- Shared utilities
- UI component directories

**Git preserves experiments. Packages preserve truth.**

---

## 5. Cleanup Expectations

Dead code is not neutral — it is technical debt.

**Rules:**
- Unused exports should be removed immediately
- Orphaned files should be deleted
- Duplicate utilities should be consolidated or removed

**Cleanups are encouraged and expected.**

---

## 6. PR Review Checklist (Required)

Before approving a PR, verify:

- [ ] All exports are actively used
- [ ] No speculative or future-intent code added
- [ ] No UI components added without rendering path
- [ ] No helpers leaked into `shared` unnecessarily
- [ ] Package boundaries respected
- [ ] Dead code removed when discovered

**If unsure — default to removal.**

---

## 7. Architectural North Star

Clutter favors:

- **Explicit** over clever
- **Small surfaces** over flexibility
- **Deletion** over preservation
- **Refactorability** over premature abstraction

---

## Final Note

These rules are not about restriction — they exist to make large refactors **safe** and future changes **cheap**.

**If something feels hard to delete, it probably shouldn't exist.**

---

## ✅ Status

- **Adopted:** After Phase 8 (Dead-Code & Dependency Pruning)
- **Enforced:** Going forward
- **Last Updated:** January 2026

---

## Related Documents

- `ARCHITECTURE.md` — Package architecture and boundaries
- `PUBLIC_API.md` — Public API reference for each package
- `PROJECT_STRUCTURE.md` — File organization guidelines


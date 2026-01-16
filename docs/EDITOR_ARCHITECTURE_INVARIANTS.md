# Editor Architecture Invariants

## 🏗️ Core Principle

**ONE EditorCore + ONE EditorEngine = Single Source of Truth**

The editor layer (`packages/editor`) owns all editor behavior, structure, and state.  
The UI layer (`packages/ui`) imports and renders, never mutates or instantiates engines.

---

## 📜 The Four Laws

### 1. UI Must NOT Import EditorEngine

```typescript
❌ BAD: import { EditorEngine } from '@clutter/editor'
✅ GOOD: Pass content via props, use declarative pattern
```

**Why:** UI components should use declarative props, not imperative engine calls.

### 2. Only ONE Canonical EditorCore

```
✅ packages/editor/core/EditorCore.tsx
❌ packages/ui/.../EditorCore.tsx (duplicate, forbidden)
```

**Why:** Split reality causes phantom unmounts, undefined methods, and cascading bugs.

### 3. Only ONE EditorEngine Implementation

```
✅ packages/editor/core/engine/EditorEngine.ts
❌ packages/editor/src/engine/EditorEngine.ts (legacy, removed)
```

**Why:** Duplicate engines create API drift and broken method calls.

### 4. UI Must NOT Instantiate Engines

```typescript
❌ BAD: const engine = new EditorEngine()
✅ GOOD: Engine created internally by EditorCore
```

**Why:** Engine creation is owned by EditorCore's bridge setup only.

---

## 🔍 Automated Checks

Run the architectural invariant checker:

```bash
npm run lint:arch
```

This script verifies:

- No UI imports of `EditorEngine`
- Exactly one `EditorCore.tsx` at canonical location
- Exactly one `EditorEngine` class definition
- No engine instantiation in UI layer

**Exit code 0** = All invariants maintained  
**Exit code 1** = Violations detected (blocks CI)

---

## 🚨 What Happens When These Are Violated

### Symptom: `editorEngine.setDocument is not a function`

**Cause:** UI importing old/wrong engine, calling deprecated methods  
**Fix:** Remove engine import, use declarative content prop

### Symptom: Editor unmounts unexpectedly

**Cause:** Duplicate `EditorCore` in multiple packages  
**Fix:** Delete duplicate, use canonical version only

### Symptom: Methods missing or undefined

**Cause:** Multiple engine classes with different APIs  
**Fix:** Delete legacy engine, use canonical version

---

## ✅ Correct Pattern (v2.0)

### In UI Components

```typescript
// ✅ Declarative - content flows via props
<TipTapWrapper
  value={contentString}
  onChange={(newContent) => {
    setContent(newContent);
    saveToDatabase(newContent);
  }}
/>
```

### In Editor Package

```typescript
// ✅ EditorCore creates engine internally via bridge
const { engine, resolver } = useEditorEngine(editor);
```

---

## 📘 History

This invariant was established after the **v2.0 architecture refactor** where:

- Old imperative `EditorEngine` API was replaced with declarative pattern
- Engine moved inside EditorCore's bridge lifecycle
- UI layer was cleaned to render-only responsibility

**Reference Issues:**

- `editorEngine.setDocument is not a function` (Jan 2026)
- Duplicate EditorCore causing phantom unmounts
- Split engine reality with API drift

---

## 🛡️ Enforcement

1. **Pre-commit:** Invariant checker runs automatically
2. **CI:** Blocks merge if violations detected
3. **Code Review:** Reviewers verify no engine imports in UI

**If you see a violation:**

1. Run `npm run lint:arch` to diagnose
2. Read error output for specific files/lines
3. Follow architectural rules above to fix
4. Re-run check until exit code 0

---

## 🔗 Related Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Overall system design
- [PUBLIC_API.md](../PUBLIC_API.md) - Public API contracts
- [EditorCore source](../packages/editor/core/EditorCore.tsx) - Implementation

---

**Last Updated:** January 2026  
**Status:** ✅ All invariants maintained

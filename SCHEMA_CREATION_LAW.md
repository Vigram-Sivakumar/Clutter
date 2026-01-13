# Schema Creation Law

**Architectural Invariant: ONE SCHEMA, ONE LIFECYCLE**

---

## The Law

> **Editor rendering must never parse. Importing parses. Rendering renders.**

In this codebase:

- ✅ **ONE schema** exists per editor instance
- ✅ **ONE place** creates that schema: `EditorCore`
- ✅ **ONE format** is canonical: ProseMirror JSON
- ❌ **NEVER** call `generateJSON()` during render
- ❌ **NEVER** create duplicate schemas

---

## Why This Matters

### The Problem (What We Fixed)

**Before:**

```typescript
// ❌ BAD: TipTapWrapper creating its own schema
const content = useMemo(() => {
  return generateJSON(value, htmlExtensions); // ← DUPLICATE SCHEMA
}, [noteId]);
```

**What happened:**

1. `TipTapWrapper` called `generateJSON()` on every render
2. This created a **separate schema** from `EditorCore`
3. `htmlExtensions` was an **incomplete subset** of the full extensions list
4. Missing dependencies caused ProseMirror to **silently drop nodes**
5. Including the `doc` node → **"Schema is missing its top node type ('doc')"**
6. This crashed **BEFORE** `EditorCore` could mount
7. No recovery possible - the app was stuck in a crash loop

### The Core Issue

**TipTap/ProseMirror schema creation is NOT idempotent:**

- Each `generateJSON()` call builds a **completely new schema**
- It does NOT reuse existing schemas
- It does NOT merge with `EditorCore`'s schema
- If the extension list is incomplete, **nodes are dropped**
- If `doc` is dropped, **the entire schema is invalid**

**ProseMirror's behavior:**

- Schema must be **self-contained** (all dependencies present)
- Invalid nodes are **silently removed**
- If `topNode` is invalid → **schema is unusable**
- No warnings, no recovery, just: `RangeError: Schema is missing its top node type ('doc')`

---

## The Solution

### Current (Correct) Architecture

```typescript
// ✅ GOOD: Use JSON directly
const content = useMemo(() => {
  if (!value) return EMPTY_DOC;

  try {
    return JSON.parse(value); // ← Already ProseMirror JSON
  } catch (error) {
    console.error('Invalid JSON:', error);
    return EMPTY_DOC;
  }
}, [noteId]);
```

**Why this works:**

- ✅ No schema creation during render
- ✅ Content is already canonical ProseMirror JSON from database
- ✅ `EditorCore` is the **only** place schema is built
- ✅ Single source of truth
- ✅ No timing races
- ✅ No incomplete schemas

---

## Rules

### ✅ DO

1. **Store ProseMirror JSON in the database**
   - It's already the canonical format
   - No conversion needed

2. **Pass JSON directly to `EditorCore`**

   ```typescript
   <EditorCore content={parsedJSON} />
   ```

3. **Let `EditorCore` own the schema**
   - It has the complete extension list
   - It creates the schema once
   - It manages the lifecycle

4. **Use `generateJSON()` ONLY for imports**
   ```typescript
   // ✅ OK: Explicit import pipeline
   function importFromHtml(html: string) {
     return generateJSON(html, FULL_EXTENSIONS);
   }
   ```

### ❌ DON'T

1. **Never call `generateJSON()` during render**

   ```typescript
   // ❌ BAD: Creates duplicate schema
   const content = generateJSON(value, extensions);
   ```

2. **Never create partial extension lists**

   ```typescript
   // ❌ BAD: Subset will be incomplete
   const htmlExtensions = [Document, Paragraph, Text];
   ```

3. **Never assume "it's just for parsing"**
   - Every `generateJSON()` call = full schema compilation
   - Expensive, fragile, crash-prone

4. **Never convert JSON → JSON**
   ```typescript
   // ❌ BAD: Redundant and dangerous
   const json = JSON.parse(value);
   const reparsed = generateJSON(renderHTML(json), extensions);
   ```

---

## When To Use `generateJSON()`

**ONLY in these scenarios:**

### 1. Clipboard Paste (HTML → JSON)

```typescript
function handlePaste(html: string) {
  const json = generateJSON(html, FULL_EXTENSIONS);
  editor.commands.insertContent(json);
}
```

### 2. External Import (Notion, Google Docs, etc.)

```typescript
async function importNote(externalHtml: string) {
  const json = generateJSON(externalHtml, FULL_EXTENSIONS);
  await saveNote(json);
}
```

### 3. Migration (Legacy HTML → JSON)

```typescript
async function migrateOldNotes() {
  for (const note of oldNotes) {
    const json = generateJSON(note.htmlContent, FULL_EXTENSIONS);
    note.content = JSON.stringify(json);
  }
}
```

**Critical requirement:** ALWAYS use `FULL_EXTENSIONS`, never a subset.

---

## Why Cache Clearing Didn't Fix This

This was **NOT** a cache issue. It was an **architectural bug**.

**Why it seemed like cache:**

- Error was consistent across restarts
- Fresh builds didn't help
- Line numbers kept changing
- Logs pointed to "old" code

**What was really happening:**

- `generateJSON()` created schema **synchronously on every render**
- The incomplete schema **always** crashed
- No amount of cache clearing could fix an invalid extension list
- The "stale code" was actually fresh code with a structural bug

---

## Diagnostic: How To Detect This Bug

**Symptoms:**

1. ✅ `RangeError: Schema is missing its top node type ('doc')`
2. ✅ Error happens **before** `[EditorCore] BUILD` log
3. ✅ Stack trace shows `generateJSON` or `getSchemaByResolvedExtensions`
4. ✅ Crashes on first render, every time
5. ✅ No recovery possible

**Root cause:**

- Look for `generateJSON()` calls in render paths
- Check if extension lists are subsets
- Verify if schema is created multiple times

---

## Testing This Invariant

### Unit Test (Recommended)

```typescript
it('should never call generateJSON during render', () => {
  const spy = jest.spyOn(require('@tiptap/core'), 'generateJSON');

  render(<TipTapWrapper value={JSON_CONTENT} />);

  expect(spy).not.toHaveBeenCalled();
});
```

### Runtime Assertion

```typescript
// Add to EditorCore or TipTapWrapper
if (process.env.NODE_ENV === 'development') {
  const originalGenerateJSON = generateJSON;
  generateJSON = (...args: any[]) => {
    console.error('❌ generateJSON called during render - this is forbidden');
    throw new Error('Schema creation during render is not allowed');
  };
}
```

---

## Related Bugs We Fixed

1. **StrictMode Double Mount** → Editor instance reuse via `useRef`
2. **Stale Editor Closures** → `window.__editor` canonical reference
3. **Bridge Lifecycle** → Module-level singleton
4. **Plugin Stale References** → Runtime `window.__editor` access

**This schema bug was hiding underneath all of those.**

Once we fixed the lifecycle issues, the schema creation race became visible.

---

## Summary

**Before:**

- 2 schemas (EditorCore + TipTapWrapper)
- 2 extension lists (full + subset)
- Race condition on mount
- Incomplete schema → crashed

**After:**

- 1 schema (EditorCore only)
- 1 extension list (full, in EditorCore)
- No parsing during render
- Direct JSON → stable

**The principle:**

> If you already have ProseMirror JSON, never call `generateJSON()`.

---

## References

- [TipTap Schema Documentation](https://tiptap.dev/guide/prosemirror)
- [ProseMirror Schema Guide](https://prosemirror.net/docs/guide/#schema)
- Codebase: `packages/editor/core/EditorCore.tsx` (schema owner)
- Codebase: `packages/ui/.../TipTapWrapper.tsx` (JSON consumer)

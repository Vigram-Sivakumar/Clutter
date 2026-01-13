# WebView Module Cache Issue

## The Problem

When developing with **Tauri + Vite + monorepo prebuilt packages**, the WebView can cache compiled JavaScript modules in memory, completely bypassing Vite's hot module replacement and even full rebuilds.

### Symptoms

- ✅ Source code is updated
- ✅ Package is rebuilt (`packages/editor/dist`)
- ✅ Vite dev server serves fresh files
- ❌ **App still runs old code**
- ❌ **Console logs don't change**
- ❌ **Bugs persist despite fixes**

---

## Why This Happens

**The Caching Stack:**

1. **Source Code** (`packages/editor/core/EditorCore.tsx`)
2. **Built Package** (`packages/editor/dist/index.mjs`) ← Vite reads this
3. **Vite Pre-bundles** (`node_modules/.vite/`) ← Vite caches here
4. **WebView Module Cache** ← **TAURI CACHES HERE IN MEMORY**
5. **Browser Execution**

Clearing layers 1-3 doesn't affect layer 4. The WebView keeps serving old modules.

---

## The Solution

### Always Use the Reset Script

When changing core editor code:

```bash
./scripts/reset-dev.sh
```

This script:

1. ✅ Kills Tauri app (clears WebView memory cache)
2. ✅ Kills dev server
3. ✅ Clears all Vite caches
4. ✅ Clears WebView disk caches (`~/Library/Caches/*`, `~/Library/WebKit/*`)
5. ✅ Clears built packages
6. ✅ Rebuilds editor with fresh code

---

## Verification: The BUILD Fingerprint

**The only way to know you're running fresh code:**

```typescript
// In EditorCore.tsx
console.log('[EditorCore] BUILD', new Date().toISOString());
```

**Expected behavior:**

```javascript
[EditorCore] BUILD 2026-01-13T20:15:30.123Z v2.0.0-strictmode-safe
[EditorCore] Creating new editor instance
[EditorCore] Reusing editor instance (StrictMode)
```

**If the BUILD log is missing:**

- ❌ You are NOT running fresh code
- ❌ WebView is serving cached modules
- 🔥 Run `./scripts/reset-dev.sh` again

---

## The Rule

> **After rebuilding a package used via `@fs/` imports, you MUST restart the Tauri app process.**
>
> **Reload is not enough. Kill the process.**

---

## Why Simple Restarts Don't Work

| Method                       | WebView Memory Cache | WebView Disk Cache | Vite Cache |
| ---------------------------- | -------------------- | ------------------ | ---------- |
| `Cmd+R` (Reload)             | ❌ Survives          | ❌ Survives        | ✅ Cleared |
| Hard Refresh (`Cmd+Shift+R`) | ❌ Survives          | ❌ Survives        | ✅ Cleared |
| DevTools "Disable cache"     | ❌ Survives          | ⚠️ Maybe           | ✅ Cleared |
| Kill dev server              | ❌ Survives          | ❌ Survives        | ✅ Cleared |
| `rm -rf node_modules/.vite`  | ❌ Survives          | ❌ Survives        | ✅ Cleared |
| **Kill Tauri app**           | ✅ **Cleared**       | ❌ Survives        | ✅ Cleared |
| **Clear `~/Library` caches** | ✅ Cleared           | ✅ **Cleared**     | ✅ Cleared |

---

## Optional: Force Vite Rebuild

For faster iteration without full nuclear reset:

```bash
VITE_FORCE=true npm run dev:desktop
```

This forces Vite to invalidate dependency pre-bundles. Configured in `vite.config.ts`:

```typescript
optimizeDeps: {
  force: process.env.VITE_FORCE === 'true',
  disabled: process.env.VITE_FORCE === 'true',
}
```

---

## Stack Trace Line Numbers Are Lies

**Never trust line numbers in error stacks when debugging:**

```
(anonymous function) (index.mjs:13949)
```

This line number is meaningless if:

- Code was rebuilt
- Sourcemaps changed
- WebView is serving stale modules

**Trust logs, not line numbers.**

---

## The Perfect Storm

This issue is **uniquely painful** in your setup because you have:

1. ✅ Monorepo with workspace packages
2. ✅ Prebuilt package (`packages/editor/dist`)
3. ✅ Vite dev server with `@fs/` imports
4. ✅ Tauri WebView (aggressive caching)
5. ✅ React StrictMode (double mount exposes timing bugs)
6. ✅ TipTap with custom extensions

Each layer has its own caching strategy, all trying to be "helpful."

---

## Summary

**The workflow:**

```bash
# When changing EditorCore / extensions / engine:
./scripts/reset-dev.sh

# When app launches, verify:
[EditorCore] BUILD <timestamp>  # ← Must appear first

# If missing → still cached, run reset again
```

**The mental model:**

- ✅ Your architecture is correct
- ✅ Your extensions are correct
- ✅ Your lifecycle is correct
- ⚠️ **Your environment lies to you**

**Trust the BUILD log. Nothing else.**

---

## References

- [Tauri WebView Caching](https://tauri.app/v1/guides/debugging/application/)
- [Vite Dependency Pre-Bundling](https://vitejs.dev/guide/dep-pre-bundling.html)
- [React StrictMode](https://react.dev/reference/react/StrictMode)

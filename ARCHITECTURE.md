# Clutter Notes - Architecture

## 🏗️ Package Architecture

Clutter Notes uses a monorepo structure with strict architectural boundaries enforced by ESLint.

```
apps/
├── desktop/          # Tauri desktop app
└── web/              # Web app

packages/
├── domain/           # Pure types & constants (no dependencies)
├── state/            # Zustand stores (depends on: domain)
├── shared/           # Utilities & hooks (depends on: domain, state)
├── editor/           # Isolated editor engine (no app dependencies)
└── ui/               # Presentational components (depends on: domain, state, shared)
```

---

## 🔒 Architectural Boundaries

### **Enforced by ESLint** (`no-restricted-imports`)

Each package has explicit import rules to prevent architectural drift:

### 1️⃣ **domain** — Pure Types & Constants
- **Can import from:** ❌ Nothing
- **Cannot import from:** ❌ state, shared, editor, ui, apps
- **Purpose:** Pure type definitions and constants with zero dependencies
- **Example:** `Note`, `Folder`, `Tag`, `CLUTTERED_FOLDER_ID`

### 2️⃣ **state** — Zustand Stores
- **Can import from:** ✅ domain
- **Cannot import from:** ❌ shared, editor, ui, apps
- **Purpose:** Global application state management
- **Example:** `useNotesStore`, `useTagsStore`, `useFoldersStore`

### 3️⃣ **shared** — Utilities & Hooks
- **Can import from:** ✅ domain, state
- **Cannot import from:** ❌ editor, ui, apps
- **Purpose:** Reusable utilities and React hooks
- **Example:** `sortByOrder`, `useTheme`, `useConfirmation`

### 4️⃣ **editor** — Isolated Editor Engine
- **Can import from:** ⚠️ Currently: shared, ui (temporary)
- **Cannot import from:** ❌ domain, state (enforced as warnings until Phase 2-4)
- **Purpose:** TipTap-based editor with plugins and behaviors
- **Status:** ⚠️ **Boundary enforcement is currently set to `warn` instead of `error`**
  - This is temporary until Phase 2-4 (Editor Extraction & Dependency Inversion) is complete
  - Once complete, editor will be fully isolated with dependencies injected via `EditorProvider`

### 5️⃣ **ui** — Presentational Components
- **Can import from:** ✅ domain, state, shared
- **Cannot import from:** ⚠️ editor (enforced as warnings until Phase 2-4)
- **Purpose:** Reusable UI components and design system
- **Example:** `AppSidebar`, `ListItem`, `TagPill`

### 6️⃣ **apps** — Composition Layer
- **Can import from:** ✅ domain, state, shared, editor, ui
- **Purpose:** Compose packages into complete applications
- **Responsibilities:**
  - Routing
  - Platform-specific concerns (Tauri, web)
  - Adapter layer (e.g., `noteToEditorDocument`)

---

## 📋 Dependency Graph

```
domain (pure types)
  ↓
state (Zustand stores)
  ↓
shared (utils & hooks)
  ↓
ui (components)
  ↓
apps (composition)

editor (isolated)
  ↑
apps (inject dependencies)
```

---

## 🎯 Design Principles

### **1. Dependency Inversion**
- Lower-level packages (domain, state) don't know about higher-level packages (ui, apps)
- Editor is isolated and receives dependencies via context/props

### **2. Single Responsibility**
- `domain`: Types only
- `state`: State management only
- `shared`: Generic utilities only
- `editor`: Editing behavior only
- `ui`: Presentation only
- `apps`: Composition only

### **3. Explicit Public APIs**
- Each package exports through `index.ts`
- Deep imports (e.g., `@clutter/ui/internal/...`) are discouraged

### **4. Testability**
- Pure functions in `shared` are easy to test
- Stores in `state` can be tested in isolation
- Editor can be tested without app state

---

## 🚨 Boundary Violations

If you see an ESLint error like:

```
❌ domain cannot import from other packages. It must remain pure (types & constants only).
```

This means you're violating an architectural boundary. To fix:

1. **Move the code to the correct package**
   - If it's a type → `domain`
   - If it's state → `state`
   - If it's a utility → `shared`
   - If it's UI → `ui`

2. **Use dependency injection**
   - If editor needs app state → inject via `EditorProvider`
   - If a component needs state → use Zustand hooks

3. **Refactor the dependency**
   - If `domain` needs a utility → move the utility to `domain`
   - If `state` needs a utility → move it to `domain` or keep it in `state`

---

## 📝 Future Work (Phase 2-4)

### **Editor Extraction & Isolation**

Currently, the editor package has temporary warnings instead of errors for boundary violations. The plan:

1. **Phase 2:** Create `EditorProvider` for dependency injection
2. **Phase 3:** Remove all `@clutter/domain` and `@clutter/state` imports from editor
3. **Phase 4:** Move editor-specific UI components from `ui` to `editor`
4. **Phase 5:** Change ESLint rules from `warn` to `error`

Once complete, the editor will be:
- ✅ Fully isolated from app state
- ✅ Reusable in any context (desktop, web, mobile)
- ✅ Testable without mocking app state
- ✅ Ready for collaborative editing

---

## 🔍 Checking Boundaries

```bash
# Run ESLint to check all boundaries
npm run lint

# Check a specific package
npx eslint packages/domain --ext .ts,.tsx

# See all boundary violations
npx eslint packages --ext .ts,.tsx | grep "no-restricted-imports"
```

---

## 📚 Related Documents

- `PROJECT_STRUCTURE.md` — Detailed file structure
- `packages/editor/types/EditorDocument.ts` — Editor's data contract
- `apps/desktop/adapters/` — Adapter layer between app and editor

---

**Last Updated:** Phase C (ESLint Architectural Boundaries) - January 2026


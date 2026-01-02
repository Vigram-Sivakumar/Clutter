# Component Structure Guidelines

This document defines our component organization pattern. **Always follow this structure** when adding new components.

## 🎯 Organizing Principle

**Components are organized by their role in the app, not by technical type.**

The folder structure should mirror the visual hierarchy and layout of the application, making it easy to:
- Navigate to components you see on screen
- Understand relationships between components
- Find where to add new features

## 📁 Top-Level Structure

```
components/
├── app-layout/          → Main application structure
├── ui-buttons/          → Button components
├── ui-modals/           → Modal dialogs and overlays
├── ui-primitives/       → Reusable base components
└── index.ts             → Public exports
```

## 📐 Current Layout Structure

```
app-layout/
├── AppSidebar/
│   └── AppSidebar.tsx                  (Left navigation panel)
│
└── NoteEditor/
    ├── NoteEditor.tsx                  (Main container - orchestrates everything)
    │
    ├── editor-header/                  (Sticky header with breadcrumbs)
    │   └── EditorHeader.tsx
    │
    └── editor-content/                 (Main note editing area)
        ├── content-meta/               (Add emoji/description/tags controls)
        │   └── ContentMetaControls.tsx
        │
        ├── title/
        │   └── NoteTitle.tsx
        │
        ├── description/
        │   └── NoteDescription.tsx
        │
        ├── editor-area/                (Main text editor - TipTap)
        │   └── TipTapEditor.tsx
        │
        ├── emoji-picker/
        │   ├── EmojiPicker.tsx
        │   └── EmojiTray.tsx
        │
        └── tags/
            ├── Tag.tsx
            ├── TagInput.tsx
            ├── TagsList.tsx
            └── TagAutocomplete.tsx
```

## 🎨 Naming Conventions

### Folders (kebab-case)
- Use descriptive, context-aware names
- Add context prefix for clarity:
  - `editor-header/` not just `header/`
  - `content-meta/` not just `meta/`
  - `app-layout/` not just `layout/`

### Components (PascalCase)
- Match the visual element they represent
- Include context when needed:
  - `EditorHeader.tsx` not `Header.tsx`
  - `AppSidebar.tsx` not `Sidebar.tsx`
  - `TipTapEditor.tsx` not `Editor.tsx`

### Category Prefixes
Use clear prefixes for different types:
- `ui-buttons/` - UI components that are buttons
- `ui-modals/` - UI components that are modals
- `ui-primitives/` - Base reusable UI components
- `app-layout/` - Application layout structure

## ✅ When Adding New Components

### 1. Ask: Where does this appear in the UI?
- Is it part of the sidebar? → `app-layout/AppSidebar/`
- Is it in the note editor? → `app-layout/NoteEditor/editor-content/`
- Is it a modal? → `ui-modals/`
- Is it reusable everywhere? → `ui-primitives/`

### 2. Ask: Does it need its own folder?
Create a folder if:
- ✅ It has multiple related components
- ✅ It represents a distinct UI section
- ✅ It will likely grow with more features

Keep it flat if:
- ❌ It's a single, simple component
- ❌ It's unlikely to expand

### 3. Use meaningful names
❌ Bad: `components/Header.tsx`
✅ Good: `app-layout/NoteEditor/editor-header/EditorHeader.tsx`

❌ Bad: `components/Controls.tsx`
✅ Good: `app-layout/NoteEditor/editor-content/content-meta/ContentMetaControls.tsx`

## 📦 Exports

Each folder should have an `index.ts` that exports its public components:

```typescript
// app-layout/NoteEditor/index.ts
export { NoteEditor } from './NoteEditor';
// Internal components are not exported
```

Only export from the main `components/index.ts` what should be public API:

```typescript
// components/index.ts
export * from './app-layout';
export * from './ui-buttons';
export * from './ui-modals';
export * from './ui-primitives';
```

## 🚫 Anti-Patterns to Avoid

❌ Organizing by technical type
```
components/
├── containers/
├── presentational/
└── hoc/
```

❌ Generic names without context
```
components/
├── Header/
├── Content/
└── Controls/
```

❌ Flat structure for everything
```
components/
├── Component1.tsx
├── Component2.tsx
├── Component3.tsx
... (100 files)
```

## 📚 Examples

### Adding a new "Comments" feature to notes

```
app-layout/NoteEditor/editor-content/
└── comments/
    ├── CommentsList.tsx
    ├── CommentItem.tsx
    ├── CommentInput.tsx
    └── index.ts
```

### Adding a new "Settings" sidebar

```
app-layout/
├── AppSidebar/
└── SettingsSidebar/
    ├── SettingsSidebar.tsx
    ├── SettingsSection.tsx
    └── index.ts
```

### Adding a new reusable "Dropdown" component

```
ui-primitives/
└── Dropdown.tsx
```

## 🔄 Refactoring Guidelines

When you notice:
- A folder growing too large (>10 files)
- Components that should be grouped
- Names that are no longer accurate

→ **Refactor immediately** to maintain clarity

## 📖 Remember

> **The folder structure is documentation.** 
> A developer should be able to find any component by thinking about where it appears in the UI.


# Public API Reference

This document defines the **public, stable API** for each package in the Clutter Notes monorepo.

**Golden Rule:** Only import from package entry points (`@clutter/domain`, `@clutter/state`, etc.). Never use deep imports.

---

## 📦 `@clutter/domain`

**Pure domain types and constants. Zero dependencies.**

### Types
```typescript
import type {
  Note,
  Folder,
  Tag,
  ThemeMode,
} from '@clutter/domain';
```

### Constants
```typescript
import {
  CLUTTERED_FOLDER_ID,
  DAILY_NOTES_FOLDER_ID,
} from '@clutter/domain';
```

---

## 📦 `@clutter/state`

**Zustand stores for global application state.**

Dependencies: `@clutter/domain`

### Stores & Hooks
```typescript
import {
  // Notes Store
  useNotesStore,
  setNotes,
  addNote,
  updateNote,
  deleteNote,
  setCurrentNoteId,
  findDailyNoteByDate,
  createDailyNote,
  
  // Folders Store
  useFoldersStore,
  setFolders,
  addFolder,
  updateFolder,
  deleteFolder,
  
  // Tags Store
  useTagsStore,
  useAllTags,
  setTagMetadata,
  addTag,
  updateTag,
  deleteTag,
  clearAllTags,
  
  // Ordering Store
  useOrderingStore,
  setNoteOrder,
  setFolderOrder,
  setTagOrder,
  
  // Hydration Store
  useHydrationStore,
  setHydrated,
  setInitialized,
  
  // Theme Store
  useThemeStore,
  
  // UI State Store
  useUIStateStore,
  
  // Confirmation Store
  useConfirmationStore,
  
  // Form Dialog Store
  useFormDialogStore,
  
  // Current Date Store
  useCurrentDateStore,
} from '@clutter/state';
```

---

## 📦 `@clutter/shared`

**Pure utilities and React hooks.**

Dependencies: `@clutter/domain`, `@clutter/state`

### Utilities

#### ID Generation
```typescript
import { generateId } from '@clutter/shared';
```

#### Theme
```typescript
import { getThemeColors } from '@clutter/shared';
```

#### Date Formatting
```typescript
import {
  formatDate,
  getTodayDateString,
  getTomorrowDateString,
  dateToYYYYMMDD,
  formatTaskDateLabel,
  compareDates,
  isSameDay,
  addDays,
  groupByDate,
  DAY_NAMES,
  MONTH_NAMES,
  MONTH_NAMES_FULL,
} from '@clutter/shared';
```

#### Sorting
```typescript
import { sortByOrder } from '@clutter/shared';
```

### Hooks
```typescript
import {
  useTheme,
  useConfirmation,
} from '@clutter/shared';
```

---

## 📦 `@clutter/editor`

**Isolated editor engine with TipTap extensions and plugins.**

**Status:** ⚠️ Currently has warnings for imports from `domain`/`state`/`ui`. Will be fully isolated after Phase 2-4.

Dependencies (temporary): `@clutter/shared`, `@clutter/ui`

### Types (Stable Contract)
```typescript
import type {
  EditorDocument,
  TipTapJSON,
  TipTapNode,
  TipTapMark,
  SerializedEditorDocument,
  EditorTag,
  EditorLinkedNote,
  EditorFolder,
} from '@clutter/editor/types';
```

### Core Components
```typescript
import {
  EditorProvider,
  useEditorContext,
  EditorCore,
  type EditorCoreHandle,
  type EditorContextValue,
  type EditorTagMetadata,
} from '@clutter/editor';
```

### Extensions & Plugins
```typescript
import {
  // Extensions: Nodes
  Document,
  Text,
  Paragraph,
  Heading,
  ListBlock,
  Blockquote,
  CodeBlock,
  HorizontalRule,
  ToggleHeader,
  Callout,
  
  // Extensions: Marks
  Bold,
  Italic,
  Underline,
  Strike,
  Code,
  WavyUnderline,
  Link,
  CustomHighlight,
  TextColor,
  
  // Plugins
  MarkdownShortcuts,
  SlashCommands,
  SLASH_COMMANDS,
  SLASH_PLUGIN_KEY,
  filterSlashCommands,
  BackspaceHandler,
  EscapeMarks,
  DoubleSpaceEscape,
  
  // Types
  type SlashCommand,
} from '@clutter/editor';
```

### Components
```typescript
import {
  SlashCommandMenu,
  BlockWrapper,
  MarkerContainer,
  blockStyles,
  getBlockContainerStyle,
  getMarkerStyle,
  getContentStyle,
  ParagraphComponent,
  HeadingComponent,
  ListBlockComponent,
  BlockquoteComponent,
  CodeBlockComponent,
  HorizontalRuleComponent,
  CalloutComponent,
  ToggleHeaderComponent,
} from '@clutter/editor';
```

### Utils
```typescript
import {
  addTagToBlock,
  isMultiBlockSelection,
} from '@clutter/editor';
```

---

## 📦 `@clutter/ui`

**Design system, tokens, and reusable UI components.**

Dependencies: `@clutter/domain`, `@clutter/state`, `@clutter/shared`

### Design Tokens
```typescript
import {
  // Colors
  neutral,
  accent,
  semantic,
  overlayOpacity,
  
  // Theme
  themeColors,
  
  // Spacing
  spacing,
  
  // Typography
  typography,
  
  // Sizing
  sizing,
  
  // Other tokens
  radius,
  interactions,
  animations,
  transitions,
} from '@clutter/ui';
```

### Hooks
```typescript
import {
  useTheme,
  useUIPreferences,
} from '@clutter/ui';
```

### Components

**Note:** The UI package exports many components. Apps typically only use:
```typescript
import {
  ThemeProvider,
  NotesContainer, // Legacy alias for NoteEditor
  ConfirmationDialog,
  FormDialog,
  RightClickContextMenuProvider,
} from '@clutter/ui';
```

For a full list of components, see `packages/ui/src/index.ts`.

### Utilities
```typescript
import {
  // Tag operations
  getTagColor,
  isSystemTag,
  
  // Tag colors
  tagColors,
  getRandomTagColor,
} from '@clutter/ui';
```

---

## 🚨 What NOT to Import

### ❌ Deep Imports
```typescript
// BAD - Deep import
import { Note } from '@clutter/domain/types';
import { useNotesStore } from '@clutter/state/stores/notes';

// GOOD - Entry point only
import { Note } from '@clutter/domain';
import { useNotesStore } from '@clutter/state';
```

### ❌ Internal Files
```typescript
// BAD - Internal directory
import { CalendarDateGrid } from '@clutter/ui/components/app-layout/layout/sidebar/internal/CalendarDateGrid';

// GOOD - Use public API
import { CalendarDateGrid } from '@clutter/ui';
```

### ❌ Relative Imports Across Packages
```typescript
// BAD - Relative import across packages
import { Note } from '../../../domain/src/types';

// GOOD - Use workspace package
import { Note } from '@clutter/domain';
```

---

## 📋 ESLint Enforcement

These boundaries are enforced by ESLint. Violations will trigger errors:

```
❌ domain cannot import from other packages. It must remain pure (types & constants only).
❌ state can only import from domain.
❌ shared can only import from domain and state.
⚠️ editor should not import from domain/state/ui (warnings until Phase 2-4).
⚠️ ui should not import from editor (warnings until Phase 2-4).
```

---

## 🔄 Versioning & Breaking Changes

### Stable APIs
- `@clutter/domain` — **Stable**
- `@clutter/state` — **Stable**
- `@clutter/shared` — **Stable**

### Evolving APIs
- `@clutter/editor` — **Evolving** (will be isolated in Phase 2-4)
- `@clutter/ui` — **Stable** (but may be pruned to reduce surface area)

### Breaking Change Policy
- Any removal or signature change in public exports is a **breaking change**
- New exports are **non-breaking**
- Internal reorganization (without changing public exports) is **non-breaking**

---

## 📚 Related Documentation

- `ARCHITECTURE.md` — Package architecture and boundaries
- `PROJECT_STRUCTURE.md` — File organization
- `packages/editor/types/EditorDocument.ts` — Editor data contract

---

**Last Updated:** Phase 7 (Public API Hardening) - January 2026


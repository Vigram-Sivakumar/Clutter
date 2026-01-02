# Project Structure

## Overview

Clutter Notes 2.0 is a Turborepo monorepo for a cross-platform note-taking application.

```
clutter-notes/
├── apps/                       # Application implementations
│   ├── web/                    # React web application
│   ├── desktop/                # Tauri desktop application
│   ├── mobile/                 # React Native mobile app (not actively developed)
│   └── component/              # Component testing playground (temporary)
│
├── packages/                   # Shared packages
│   ├── shared/                 # Business logic, types, state management
│   └── ui/                     # UI components and design tokens
│
├── docs/                       # Documentation
│   └── history/                # Historical bug fixes and architecture decisions
│
└── [config files]              # Root configuration files
```

---

## Apps

### `apps/web/`
React + TypeScript web application using Vite.

```
web/
├── src/
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

**Port:** 3000  
**Command:** `npm run dev:web`

---

### `apps/desktop/`
Tauri desktop application wrapping the web app with native capabilities.

```
desktop/
├── src/                     # Frontend (React)
│   ├── App.tsx
│   ├── main.tsx
│   ├── hooks/
│   │   └── useDesktopStorage.ts
│   └── lib/
│       └── storage.ts
│
├── src-tauri/               # Backend (Rust)
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
│
├── package.json
├── tsconfig.json
└── vite.config.ts
```

**Port:** 1420  
**Command:** `npm run dev:desktop`

---

### `apps/mobile/`
React Native mobile application using Expo.

```
mobile/
├── App.tsx
├── assets/
├── app.json
├── babel.config.js
├── expo-env.d.ts
├── package.json
└── tsconfig.json
```

**Status:** ⚠️ Not actively developed  
**Command:** `npm run dev:mobile`

---

### `apps/component/`
Testing playground for isolated component development and debugging.

```
component/
├── src/
│   ├── App.tsx              # Component showcase
│   ├── main.tsx
│   └── index.css
├── README.md                # Testing guide
├── package.json
└── vite.config.ts
```

**Port:** 3002  
**Status:** 🧪 Temporary - Remove after components are verified  
**Command:** `npm run dev:component`

---

## Packages

### `packages/shared/`
Shared business logic, types, utilities, and state management.

```
shared/
├── src/
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # Note, Folder, Tag types
│   │
│   ├── stores/              # Zustand state stores
│   │   ├── notes.ts         # Notes management
│   │   ├── folders.ts       # Folders management
│   │   ├── tags.ts          # Tags management
│   │   ├── theme.ts         # Theme state
│   │   └── ordering.ts      # Item ordering
│   │
│   ├── utils/               # Utility functions
│   │   ├── sorting.ts       # Sorting utilities
│   │   └── index.ts
│   │
│   ├── hooks/               # Shared React hooks
│   │   ├── useTheme.ts      # Theme hook
│   │   └── index.ts
│   │
│   └── index.ts             # Public exports
│
├── package.json
├── tsconfig.json
└── tsup.config.ts           # Build configuration
```

**Usage:**
```typescript
import { useNotes, useTheme, Note, Folder } from '@clutter/shared';
```

---

### `packages/ui/`
UI components, design tokens, and editor implementation.

```
ui/
├── src/
│   ├── components/          # React components
│   │   ├── app-layout/      # Application layout structure
│   │   ├── ui-buttons/      # Button components
│   │   ├── ui-inputs/       # Input components
│   │   ├── ui-modals/       # Modal dialogs
│   │   ├── ui-primitives/   # Base reusable components
│   │   ├── README.md        # Component documentation
│   │   └── STRUCTURE.md     # Component organization guidelines
│   │
│   ├── editor/              # TipTap editor implementation
│   │   ├── components/      # Editor UI components
│   │   ├── extensions/      # TipTap extensions
│   │   │   ├── marks/       # Text marks (bold, italic, etc.)
│   │   │   ├── nodes/       # Block nodes (paragraph, heading, etc.)
│   │   │   └── plugins/     # Editor plugins
│   │   ├── hooks/           # Editor hooks
│   │   ├── plugins/         # Keyboard handlers
│   │   ├── utils/           # Editor utilities
│   │   ├── tokens.ts        # Editor-specific tokens
│   │   └── types.ts         # Editor types
│   │
│   ├── tokens/              # Design system tokens
│   │   ├── colors.ts        # Color palette
│   │   ├── spacing.ts       # Spacing scale
│   │   ├── typography.ts    # Font system
│   │   ├── sizing.ts        # Component sizes
│   │   ├── interactions.ts  # Interaction patterns
│   │   └── animations.ts    # Animation tokens
│   │
│   ├── icons/               # Icon components (Lucide)
│   ├── hooks/               # UI hooks
│   ├── utils/               # UI utilities
│   └── index.ts             # Public exports
│
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

**Usage:**
```typescript
import { colors, spacing, typography } from '@clutter/ui/tokens';
import { Button, Input } from '@clutter/ui/components';
import { NoteEditor } from '@clutter/ui/editor';
```

---

## Component Structure (packages/ui/src/components/)

Components are organized by role, not technical type:

```
components/
├── app-layout/                    # 🏗️ Main application structure
│   │
│   ├── layout/                    # Core layout (used globally)
│   │   ├── AppLayout.tsx          # Main layout wrapper
│   │   ├── Container.tsx          # Content container
│   │   │
│   │   ├── topbar/                # Top navigation bar
│   │   │   ├── TopBar.tsx         # Main top bar
│   │   │   └── Breadcrumbs.tsx   # Breadcrumb navigation
│   │   │
│   │   └── sidebar/               # Left sidebar
│   │       ├── AppSidebar.tsx    # Main sidebar
│   │       ├── SidebarSection.tsx
│   │       ├── SidebarNotesView.tsx
│   │       ├── SidebarTagsView.tsx
│   │       ├── SidebarTasksView.tsx
│   │       └── ... (other sidebar components)
│   │
│   ├── pages/                     # 📄 Page-level views
│   │   ├── note/                  # Note editor page
│   │   ├── folder/                # Folder views
│   │   ├── tag/                   # Tag views
│   │   ├── favourites/            # Favourites view
│   │   ├── deleted/               # Recently deleted view
│   │   └── tasks/                 # Tasks view
│   │
│   └── shared/                    # 🔄 Reusable cross-page components
│       ├── page-title-section/    # Page title, description, tags
│       ├── emoji/                 # Emoji picker
│       ├── page-content/          # Page content wrapper
│       ├── notes-list/            # Notes list component
│       ├── tags-list/             # Tags list component
│       ├── section-title/         # Section titles
│       └── wavy-divider/          # Decorative divider
│
├── ui-buttons/                    # Button components
├── ui-inputs/                     # Input components
├── ui-modals/                     # Modal dialogs
└── ui-primitives/                 # Base reusable components
```

**See:** `packages/ui/src/components/STRUCTURE.md` for detailed organization guidelines

---

## Editor Architecture (packages/ui/src/editor/)

The editor uses TipTap (ProseMirror) with a hierarchical block system:

### **Key Concepts:**
- **Block Hierarchy:** Blocks can be nested using `parentBlockId`
- **Level Derivation:** Visual indent level is computed from the parent chain
- **Structural Operations:** Tab/Shift-Tab modify parent relationships, not levels
- **Block IDs:** Every block has a unique ID for stable references

### **Extensions:**

**Marks** (inline formatting):
- Bold, Italic, Underline, Strike
- Code, Highlight
- Text Color, Wavy Underline
- Link

**Nodes** (block types):
- Paragraph, Heading (H1-H3)
- ListBlock (bullet, number, task)
- Blockquote, Callout
- CodeBlock
- HorizontalRule
- ToggleHeader (collapsible blocks)

**Plugins** (keyboard behavior):
- EnterHandler, BackspaceHandler
- TabHandler (indent/outdent)
- MarkdownShortcuts
- SlashCommands
- HashtagDetection
- SelectAll, UndoBoundaries

---

## Documentation (`docs/`)

### `docs/history/`
Historical bug fixes and architectural decisions:

- `architecture-review.md` - Hierarchical block architecture
- `crash-fix.md` - Fix for missing level attribute
- `hierarchy-fix.md` - Fix for Enter key indentation
- `infinite-loop-fix.md` - Fix for BlockIdGenerator loop
- `tab-phase1.md` - Tab implementation Phase 1

---

## Root Configuration Files

```
Root/
├── package.json              # Monorepo root with workspaces
├── turbo.json                # Turborepo pipeline configuration
├── tsconfig.json             # Base TypeScript config (strict)
├── .eslintrc.js              # ESLint rules
├── .prettierrc               # Code formatting
├── .lintstagedrc.js          # Pre-commit hooks
├── .husky/                   # Git hooks
├── .gitignore
├── .npmrc
└── README.md                 # Main documentation
```

---

## Build Outputs (Git-ignored)

```
Build Artifacts/
├── apps/*/dist/              # Built applications
├── apps/desktop/src-tauri/target/  # Rust compilation
├── packages/*/dist/          # Built packages
├── apps/mobile/.expo/        # Expo build cache
└── node_modules/             # Dependencies
```

---

## Development Workflow

1. **Install:** `npm install`
2. **Start dev servers:** `npm run dev` (all apps) or `npm run dev:web/desktop`
3. **Make changes** in any app or package
4. **Auto-reloading** via Vite HMR
5. **Linting** runs on commit (Husky)
6. **Type checking** via Turbo

---

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps |
| `npm run dev:web` | Web app (port 3000) |
| `npm run dev:desktop` | Desktop app (port 1420) |
| `npm run dev:component` | Component testing (port 3002) |
| `npm run build` | Build all |
| `npm run lint` | Lint all packages |
| `npm run format` | Format code |
| `npm run clean` | Remove build artifacts |

---

## Technology Stack

**Core:**
- Turborepo (monorepo)
- TypeScript (strict mode)
- Zustand (state management)
- React Router / Expo Router

**Web/Desktop:**
- React 18 + Vite
- Tauri (desktop native)

**Mobile:**
- React Native + Expo

**Editor:**
- TipTap / ProseMirror

**Tooling:**
- ESLint + Prettier
- Husky + lint-staged

---

## Status & Next Steps

### ✅ Complete
- Monorepo structure
- Design system tokens
- Editor architecture (hierarchical blocks)
- Desktop app with Tauri
- Web app foundation

### 🚧 In Progress
- Component structure refactor (see `REFACTOR_PLAN.md`)
- Component testing and verification

### 📋 Planned
- Mobile app development
- Feature implementation
- Production deployment

---

**Last Updated:** Dec 30, 2025

# App Layout Refactor Plan - Final Structure

## 🎯 Goals
1. **Clear separation** of layout, pages, and shared components
2. **Better naming** - eliminate confusion (e.g., two "PageHeader" components)
3. **Logical grouping** - related components together
4. **Easier navigation** - predictable folder structure
5. **Reduced duplication** - shared components in one place

---

## 📁 New Structure

```
packages/ui/src/components/app-layout/
│
├── layout/                           # 🏗️  Core layout components (used globally)
│   │
│   ├── AppLayout.tsx                 # Main layout wrapper
│   ├── Container.tsx                 # Content container
│   │
│   ├── topbar/                       # Top navigation bar
│   │   ├── TopBar.tsx                # RENAMED from PageHeader.tsx (navigation + actions)
│   │   ├── Breadcrumbs.tsx           # Breadcrumb navigation
│   │   └── index.ts
│   │
│   ├── sidebar/                      # Left sidebar
│   │   ├── AppSidebar.tsx            # Main sidebar component
│   │   ├── SidebarSection.tsx        # Section wrapper
│   │   ├── SidebarSectionHeader.tsx  # Section header with collapse
│   │   ├── SidebarNotesView.tsx      # Notes tab content
│   │   ├── SidebarTagsView.tsx       # Tags tab content
│   │   ├── SidebarItemNote.tsx       # Note item
│   │   ├── SidebarItemFolder.tsx     # Folder item
│   │   ├── SidebarItemTag.tsx        # Tag item
│   │   ├── SidebarEmptyState.tsx     # Empty state
│   │   ├── SidebarTabs.tsx           # Tab switcher
│   │   ├── SidebarActionBar.tsx      # Bottom action bar
│   │   ├── SidebarContainer.tsx      # Sidebar wrapper
│   │   ├── SidebarWindowControls.tsx # Window controls (desktop)
│   │   ├── WindowControls.tsx        # Generic window controls
│   │   ├── SidebarFoldersHeader.tsx  # Folders section header
│   │   ├── InsertionLine.tsx         # Drag & drop line
│   │   ├── types.ts                  # Sidebar types
│   │   ├── types/
│   │   │   └── dragAndDrop.ts        # Drag & drop types
│   │   └── index.ts
│   │
│   └── index.ts
│
├── pages/                            # 📄 Page-level views
│   │
│   ├── note/                         # Note editor page
│   │   ├── NoteEditor.tsx            # Main note editor
│   │   ├── TipTapWrapper.tsx         # TipTap editor wrapper
│   │   ├── NoteTopBar.tsx            # Note-specific top bar
│   │   ├── MainContentLayout.tsx     # Layout for main content area
│   │   ├── NoteDrawer.tsx            # Side drawer for notes
│   │   ├── useBreadcrumbs.ts         # Breadcrumb hook (note-specific)
│   │   └── index.ts
│   │
│   ├── folder/                       # Folder views
│   │   ├── AllFoldersListView.tsx    # "All Folders" view
│   │   ├── FolderListView.tsx        # Single folder view
│   │   ├── FolderGrid.tsx            # Grid of folder cards (MOVED)
│   │   ├── FolderCard.tsx            # Individual folder card (MOVED)
│   │   └── index.ts
│   │
│   ├── tag/                          # Tag views
│   │   ├── AllTagsListView.tsx       # "All Tags" view
│   │   ├── FavouriteTagsListView.tsx # Favorite tags view
│   │   ├── TagFilteredNotesView.tsx  # Tag-filtered notes view
│   │   └── index.ts
│   │
│   ├── favourites/                   # Favourites view
│   │   ├── FavouritesListView.tsx    # "Favourites" view
│   │   └── index.ts
│   │
│   ├── deleted/                      # Recently deleted view
│   │   ├── DeletedItemsListView.tsx  # "Recently Deleted" view
│   │   └── index.ts
│   │
│   └── index.ts
│
├── shared/                           # 🔄 Reusable components (used across pages)
│   │
│   ├── page-title-section/          # Page title, description, tags (RENAMED)
│   │   ├── PageTitleSection.tsx      # RENAMED from PageHeader.tsx (main component)
│   │   ├── ContentHeader.tsx         # Content header variant
│   │   │
│   │   ├── title/                    # Title components
│   │   │   ├── NoteTitle.tsx         # Title display
│   │   │   └── NoteTitleInput.tsx    # Title input field
│   │   │
│   │   ├── description/              # Description components
│   │   │   ├── NoteDescription.tsx   # Description display
│   │   │   └── NoteDescriptionInput.tsx # Description input
│   │   │
│   │   ├── tags/                     # Tags components
│   │   │   ├── NoteTags.tsx          # Tags container
│   │   │   ├── NoteTagsList.tsx      # Tags list
│   │   │   ├── NoteTag.tsx           # Individual tag pill
│   │   │   ├── NoteTagInput.tsx      # Tag input field
│   │   │   ├── NoteTagAutocomplete.tsx # Tag autocomplete
│   │   │   ├── TagContextContent.tsx # Tag edit menu content
│   │   │   ├── FloatingContextMenu.tsx # Floating menu wrapper
│   │   │   └── ColorTray.tsx         # Color picker tray
│   │   │
│   │   ├── NoteMetaDataActions.tsx   # Metadata action buttons
│   │   └── index.ts
│   │
│   ├── emoji/                        # Emoji picker (MOVED - used everywhere)
│   │   ├── EmojiPicker.tsx           # Main emoji picker
│   │   ├── EmojiTray.tsx             # Emoji tray dropdown
│   │   ├── EmojiIconButton.tsx       # Emoji icon button
│   │   └── index.ts
│   │
│   ├── page-content/                 # Page content wrapper
│   │   ├── PageContent.tsx           # Content wrapper with padding
│   │   └── index.ts
│   │
│   ├── notes-list/                   # Notes list component
│   │   ├── NotesListView.tsx         # List of notes
│   │   └── index.ts
│   │
│   ├── generic-list/                 # Generic list template
│   │   ├── GenericListView.tsx       # Template for all list views
│   │   └── index.ts
│   │
│   ├── section-title/                # Section titles
│   │   ├── SectionTitle.tsx          # "Notes", "Folders", etc.
│   │   └── index.ts
│   │
│   ├── wavy-divider/                 # Decorative divider
│   │   ├── WavyDivider.tsx           # Wavy section divider
│   │   └── index.ts
│   │
│   └── index.ts
│
└── index.ts                          # Main barrel export
```

---

## 🔄 Key Changes

### 1. **Naming Clarity**
- ❌ `TopBar/PageHeader.tsx` → ✅ `layout/topbar/TopBar.tsx`
- ❌ `PageTitleSection/PageHeader.tsx` → ✅ `shared/page-title-section/PageTitleSection.tsx`
- ❌ `Sidebar/` → ✅ `layout/sidebar/`
- ❌ `FolderGrid/` (separate) → ✅ `pages/folder/FolderGrid.tsx`
- ❌ `FolderCard/` (separate) → ✅ `pages/folder/FolderCard.tsx`

### 2. **Better Grouping**
- 🎯 **Emoji components** moved from `PageNote/` to `shared/emoji/` (used everywhere)
- 🎯 **Folder components** grouped together in `pages/folder/`
- 🎯 **Tag-related UI** organized in `shared/page-title-section/tags/`
- 🎯 **Layout components** separated from page components

### 3. **Consistent Folder Names**
- All lowercase with hyphens: `page-title-section/`, `notes-list/`, `wavy-divider/`
- Clear purpose from name: `layout/`, `pages/`, `shared/`

### 4. **Reduced Nesting**
- Flat structure where possible
- Sub-folders only when it adds clarity (e.g., `tags/`, `title/`, `description/`)

---

## 📊 Impact Analysis

### Files to Move: **~80 files**
### Import Statements to Update: **~200 imports**
### New Folders to Create: **18 folders**
### Old Folders to Remove: **15 folders**

---

## ⚡ Migration Steps

### Phase 1: Create New Structure (5 min)
- Create all new folders
- Move `index.ts` files

### Phase 2: Move Layout Components (10 min)
- Move Sidebar files → `layout/sidebar/`
- Move TopBar files → `layout/topbar/`
- Rename `TopBar/PageHeader.tsx` → `TopBar.tsx`

### Phase 3: Move Page Components (15 min)
- Move note files → `pages/note/`
- Move folder files + FolderCard/Grid → `pages/folder/`
- Move tag files → `pages/tag/`
- Move favourites → `pages/favourites/`
- Move deleted → `pages/deleted/`

### Phase 4: Move Shared Components (15 min)
- Move PageTitleSection → `shared/page-title-section/`
- Rename `PageHeader.tsx` → `PageTitleSection.tsx`
- Organize into sub-folders (tags, title, description)
- Move emoji components → `shared/emoji/`
- Move other shared components

### Phase 5: Update Imports (20 min)
- Update all import paths across the codebase
- Update barrel exports in index.ts files

### Phase 6: Cleanup & Test (10 min)
- Remove empty old folders
- Test app functionality
- Fix any broken imports

**Total Time: ~75 minutes**

---

## ✅ Benefits After Refactor

1. ✨ **No naming confusion** - Each component has a clear, unique name
2. 📍 **Easy to find** - Predictable locations (layout vs pages vs shared)
3. 🎯 **Better imports** - Clear import paths (`layout/topbar`, `shared/emoji`)
4. 🚀 **Easier onboarding** - New developers understand structure instantly
5. 🔧 **Maintainable** - Related components grouped together
6. 📦 **Scalable** - Easy to add new pages or shared components

---

**Ready to proceed?** 🚀


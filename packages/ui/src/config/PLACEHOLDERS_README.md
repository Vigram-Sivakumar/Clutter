# Application Placeholders & Empty States

**Single Source of Truth** for all placeholder text, empty state messages, default names, and helper text throughout the application.

## 📁 File Location

`packages/ui/src/config/placeholders.ts`

---

## 📚 Categories

### 1. **SIDEBAR_EMPTY_STATES**

Empty state messages shown in sidebar sections (Notes, Tasks, Tags, Calendar tabs).

```typescript
import { SIDEBAR_EMPTY_STATES } from '../config/placeholders';

// Usage in SidebarSection
<SidebarSection
  emptyMessage={SIDEBAR_EMPTY_STATES.today.message}
  emptyShortcut={SIDEBAR_EMPTY_STATES.today.shortcut}
  emptyShortcutText={SIDEBAR_EMPTY_STATES.today.shortcutText}
/>
```

**Available:**

- `favouritesNotes`, `folders`, `cluttered`
- `dailyNotes`
- `today`, `overdue`, `upcoming`, `someday`, `completed`
- `favouriteTags`, `allTags`

---

### 2. **PAGE_EMPTY_STATES**

Empty state messages for main page views.

```typescript
import { PAGE_EMPTY_STATES } from '../config/placeholders';

// Static messages
<EmptyState message={PAGE_EMPTY_STATES.favouritesPage} />

// Dynamic messages (functions)
<EmptyState message={PAGE_EMPTY_STATES.dailyNotesYear('2024')} />
<EmptyState message={PAGE_EMPTY_STATES.dailyNotesMonth('January', '2024')} />
```

**Available:**

- `favouritesPage`, `allFoldersPage`
- `folderNoNotes`, `folderIsEmpty`, `tagNoContent`
- `dailyNotesYear(year)`, `dailyNotesMonth(month, year)`
- Task page variants
- And more...

---

### 3. **INPUT_PLACEHOLDERS**

Placeholder text for inputs and editors.

```typescript
import { INPUT_PLACEHOLDERS } from '../config/placeholders';

<input placeholder={INPUT_PLACEHOLDERS.noteTitle} />
<textarea placeholder={INPUT_PLACEHOLDERS.editorDefault} />
<SearchInput placeholder={INPUT_PLACEHOLDERS.searchNotes} />
```

**Available:**

- `noteTitle`, `folderTitle`, `tagTitle`
- `editorDefault`, `editorDaily`, `editorTask`
- `search`, `searchNotes`, `searchTags`
- `tagInput`, `description`, `emoji`

---

### 4. **DEFAULT_NAMES**

Default names for newly created items.

```typescript
import { DEFAULT_NAMES } from '../config/placeholders';

// Base names
const newNote = createNote(DEFAULT_NAMES.note); // "Untitled"
const newFolder = createFolder(DEFAULT_NAMES.folder); // "Untitled Folder"

// With numbers
const name = DEFAULT_NAMES.folderWithNumber(2); // "Untitled Folder 2"

// Display helpers
<div>{DEFAULT_NAMES.getNoteName(note.title)}</div> // Shows "Untitled" if null
<div>{DEFAULT_NAMES.getFolderName(folder.name)}</div> // Shows "Untitled Folder" if null
```

**Available:**

- `note`, `folder`, `tag`
- `noteWithNumber(n)`, `folderWithNumber(n)`, `tagWithNumber(n)`
- `getNoteName(title?)`, `getFolderName(name?)`, `getTagName(name?)`

---

### 5. **EMPTY_STATE_SHORTCUTS**

Keyboard shortcut configurations for empty states.

```typescript
import { EMPTY_STATE_SHORTCUTS } from '../config/placeholders';

const shortcut = EMPTY_STATE_SHORTCUTS.createTask;
// { keys: ['⌘', 'T'], text: 'Create a task with' }

<EmptyState
  message="No tasks"
  shortcut={shortcut.keys}
  shortcutText={shortcut.text}
/>
```

**Available:**

- `createTask` (⌘T)
- `createNote` (⌘N)
- `createTag` (⌘⇧T)
- `search` (⌘K)

---

### 6. **CONFIRMATIONS**

Confirmation dialog messages.

```typescript
import { CONFIRMATIONS } from '../config/placeholders';

const message = CONFIRMATIONS.deleteFolder('My Folder');
// "Delete "My Folder"?"

const message2 = CONFIRMATIONS.deleteFolderWithNotes('Work', 5);
// "Delete "Work" and 5 notes?"
```

---

## 🛠️ Helper Functions

### `getUniqueName(baseName, existingNames, startNumber?)`

Generate unique name by appending numbers.

```typescript
import { getUniqueName } from '../config/placeholders';

const allTags = ['Untitled Tag', 'Untitled Tag 1', 'Work'];
const uniqueName = getUniqueName('Untitled Tag', allTags);
// Returns: "Untitled Tag 2"
```

### `isUntitled(name?)`

Check if a name is an untitled default.

```typescript
import { isUntitled } from '../config/placeholders';

isUntitled('Untitled'); // true
isUntitled('Untitled Folder 2'); // true
isUntitled('My Note'); // false
isUntitled(null); // true
```

---

## 📝 Updating Placeholders

### To add a new empty state:

1. **Choose the correct category** in `placeholders.ts`
2. **Add the entry:**

```typescript
export const SIDEBAR_EMPTY_STATES = {
  // ... existing
  myNewSection: {
    message: 'No items yet',
    shortcut: ['⌘', 'I'],
    shortcutText: 'Create an item with',
  },
} as const;
```

3. **Use it in your component:**

```typescript
<SidebarSection
  emptyMessage={SIDEBAR_EMPTY_STATES.myNewSection.message}
  emptyShortcut={SIDEBAR_EMPTY_STATES.myNewSection.shortcut}
/>
```

---

## ✅ Benefits

1. **Single Source of Truth** - All text in one place
2. **Easy to Update** - Change text once, updates everywhere
3. **Type Safe** - TypeScript autocomplete and validation
4. **Consistent** - Same style and formatting across app
5. **Searchable** - Find all placeholders quickly
6. **Translatable** - Easy to add i18n in the future

---

## 🚨 Migration Notes

When updating existing code to use this system:

1. **Find all hardcoded strings** (`grep` for "No ", "Untitled", etc.)
2. **Replace with imports:**

```typescript
// Before
emptyMessage: 'No tasks for today';

// After
import { SIDEBAR_EMPTY_STATES } from '../config/placeholders';
emptyMessage: SIDEBAR_EMPTY_STATES.today.message;
```

3. **Update types** to use exported types if needed

---

## 📦 Related Files

- `/config/placeholders.ts` - Main configuration
- `/config/sidebarConfig.ts` - Sidebar-specific config (can import from placeholders)
- `/components/app-layout/layout/sidebar/sections/EmptyState.tsx` - Empty state component

---

## 🔮 Future Enhancements

- [ ] i18n support (localization)
- [ ] Context-aware shortcuts (Windows/Linux vs Mac)
- [ ] Dynamic placeholder generation
- [ ] A/B testing support for messages

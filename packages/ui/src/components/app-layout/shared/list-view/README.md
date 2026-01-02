# Unified ListView Component

A flexible, reusable list view component that supports multiple item types (notes, tags, tasks, folders) with consistent styling and behavior.

## Architecture

```
ListView (Generic container)
  └── ListItem (Variant-based renderer)
      ├── note variant
      ├── tag variant
      ├── task variant
      └── folder variant
```

## Usage Examples

### Notes List

```tsx
import { ListView, ListItem, NoteListItemData } from '../list-view';

const notes: NoteListItemData[] = [
  { id: '1', title: 'My Note', emoji: '📝', tags: ['work'], taskCount: 3 }
];

<ListView<NoteListItemData>
  items={notes}
  selectedId={selectedNoteId}
  onItemClick={onNoteClick}
  renderItem={(note, isSelected) => (
    <ListItem
      variant="note"
      data={note}
      isSelected={isSelected}
      onTagClick={onTagClick}
      onEmojiClick={onEmojiClick}
    />
  )}
  emptyState="No notes yet."
  title="Notes"
/>
```

### Tags List

```tsx
import { ListView, ListItem, TagListItemData } from '../list-view';

const tags: TagListItemData[] = [
  { id: 'work', tag: 'work', count: 5 }
];

<ListView<TagListItemData>
  items={tags}
  selectedId={selectedTag}
  onItemClick={onTagClick}
  renderItem={(tag, isSelected) => (
    <ListItem
      variant="tag"
      data={tag}
      isSelected={isSelected}
      actions={getTagActions(tag.tag)}
    />
  )}
  emptyState="No tags yet."
/>
```

### Tasks List

```tsx
import { ListView, ListItem, TaskListItemData } from '../list-view';

const tasks: TaskListItemData[] = [
  { 
    id: '1', 
    text: 'Buy groceries', 
    checked: false, 
    noteId: 'note1',
    noteTitle: 'Shopping List',
    noteEmoji: '🛒'
  }
];

<ListView<TaskListItemData>
  items={tasks}
  selectedId={null}
  renderItem={(task, isSelected) => (
    <ListItem
      variant="task"
      data={task}
      isSelected={isSelected}
      onToggle={onToggleTask}
    />
  )}
  emptyState="No tasks yet."
  showDividers={false}
/>
```

### Folders List

```tsx
import { ListView, ListItem, FolderListItemData } from '../list-view';

const folders: FolderListItemData[] = [
  { id: '1', name: 'Work', emoji: '💼', noteCount: 10, folderCount: 2 }
];

<ListView<FolderListItemData>
  items={folders}
  selectedId={selectedFolderId}
  onItemClick={onFolderClick}
  renderItem={(folder, isSelected) => (
    <ListItem
      variant="folder"
      data={folder}
      isSelected={isSelected}
      onEmojiClick={onEmojiClick}
    />
  )}
  emptyState="No folders yet."
/>
```

## Benefits

1. **Consistency**: All list views use the same base component with consistent styling
2. **Flexibility**: Easy to add new variants without duplicating code
3. **Type Safety**: Full TypeScript support with proper typing for each variant
4. **Maintainability**: Changes to list behavior only need to be made in one place
5. **Reusability**: Can be used anywhere in the app for any list-based UI

## Variants

### Note
- Emoji/icon button
- Title
- Task count badge
- Tags (up to 3 visible)
- Height: 28px

### Tag
- Tag icon
- Colored pill with tag name
- Note count badge
- Actions (visible on hover)
- Height: 32px

### Task
- Checkbox
- Task text (with strikethrough when checked)
- Note emoji + title
- Height: 32px

### Folder
- Emoji/folder icon
- Folder name
- Note count badge
- Folder count badge (if > 0)
- Height: 32px


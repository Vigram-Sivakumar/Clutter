# All Tasks View - Integration Guide

## What Was Done

1. ✅ Created `AllTasksListView` component
2. ✅ Added `onAllTasksHeaderClick` prop to `SidebarTasksView`
3. ✅ Wired up header click in `AppSidebar` to call `onFolderClick('all-tasks')`
4. ✅ Exported `AllTasksListView` from the UI package

## What You Need to Do

In your parent component (likely `NoteEditor` or wherever you handle `onFolderClick`), you need to handle the special `'all-tasks'` ID to show the `AllTasksListView`.

### Example Integration

```tsx
import { AllTasksListView } from '@clutter/ui';

// In your NoteEditor or main app component
const handleFolderClick = (folderId: string) => {
  if (folderId === 'all-tasks') {
    // Show All Tasks view
    setMainView({ type: 'allTasks' });
    return;
  }
  
  if (folderId === 'all-tags') {
    // Show All Tags view
    setMainView({ type: 'allTags' });
    return;
  }
  
  // ... handle other folder IDs
};

// In your render logic
{mainView.type === 'allTasks' && (
  <AllTasksListView
    onTaskClick={(noteId, taskId) => {
      // Navigate to note and scroll to task
      setCurrentNoteId(noteId);
      setTargetBlockId(taskId);
      setMainView({ type: 'editor' });
      
      // If using TipTap, scroll to and highlight the block
      editorRef.current?.scrollToBlock(taskId, true);
    }}
  />
)}
```

### Main View Type

Add the `allTasks` type to your `MainView` union:

```typescript
type MainView = 
  | { type: 'editor' }
  | { type: 'tagFilter'; tag: string }
  | { type: 'allTags' }
  | { type: 'favouriteTags' }
  | { type: 'allTasks' }  // ← Add this
  | { type: 'folderView'; folderId: string }
  | { type: 'favourites' };
```

### Task Click Behavior

When a task is clicked in the All Tasks view:
1. Switch to the note containing the task (`setCurrentNoteId(noteId)`)
2. Set the target block for scrolling (`setTargetBlockId(taskId)`)
3. Switch back to editor view (`setMainView({ type: 'editor' })`)
4. Scroll to and highlight the task block (using TipTap's `scrollToBlock`)

### Breadcrumb Navigation

You may want to add breadcrumb support for the All Tasks view:

```typescript
const getBreadcrumbs = (mainView: MainView) => {
  if (mainView.type === 'allTasks') {
    return [
      { label: 'Calendar', icon: <Calendar />, onClick: () => {} },
      { label: 'All Tasks', icon: <CheckSquare /> }
    ];
  }
  // ... other breadcrumb logic
};
```

### Back Navigation

Support back button to return from All Tasks view:

```typescript
const handleBackNavigation = () => {
  if (mainView.type === 'allTasks') {
    setMainView({ type: 'editor' });
  }
  // ... other back navigation logic
};
```

## Testing

1. Click on "All Tasks" header in the Calendar section of the sidebar
2. Verify the `AllTasksListView` appears
3. Click on a task → should navigate to the parent note and highlight the task
4. Toggle task checkboxes → should update task completion state
5. Verify back navigation works to return to the editor

## Special Folder IDs

The following special IDs are used for navigation:
- `'all-tasks'` → All Tasks view
- `'all-tags'` → All Tags view
- `'favourite-tags'` → Favourite Tags view
- `'all-favourites'` → Favourites view
- `'cluttered'` → Cluttered notes view

All handled via the `onFolderClick` callback with special string IDs.


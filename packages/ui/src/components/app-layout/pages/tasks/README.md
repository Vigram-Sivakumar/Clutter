# All Tasks List View

A unified list view for displaying all tasks from across all notes and folders.

## Features

- ✅ Displays all tasks from all active notes
- ✅ Shows incomplete tasks first, then completed tasks
- ✅ Checkbox to toggle task completion
- ✅ Click task to navigate to parent note and highlight the task
- ✅ Shows note emoji and title for context
- ✅ Uses unified ListView component with task variant
- ✅ Search, sort, and filter controls (UI ready)

## Usage

```tsx
import { AllTasksListView } from '@clutter/ui';

<AllTasksListView
  onTaskClick={(noteId, taskId) => {
    // Navigate to note and scroll to task
    // Highlight the task block
    setCurrentNoteId(noteId);
    setTargetBlockId(taskId);
  }}
/>
```

## How It Works

### Task Extraction
Tasks are extracted from note content by traversing the JSON structure:
- Looks for `listBlock` nodes with `listType: 'task'`
- Extracts text content from the task
- Captures task state (checked/unchecked)
- Includes parent note information (title, emoji)

### Task Toggle
When a checkbox is clicked:
1. Finds the note containing the task
2. Parses the note's JSON content
3. Toggles the `checked` attribute on the task node
4. Updates the note with the modified content

### Task Navigation
When a task is clicked:
1. Calls `onTaskClick(noteId, taskId)` with the parent note ID and task block ID
2. The parent component should:
   - Set the current note to the parent note
   - Scroll to the task block using `taskId` (blockId)
   - Optionally highlight the task block

## Integration Example

```tsx
// In your main app/editor component
const handleTaskClick = (noteId: string, taskId: string) => {
  // Switch to the note containing the task
  setCurrentNoteId(noteId);
  
  // Set target block for scrolling/highlighting
  setTargetBlockId(taskId);
  
  // If using TipTap editor, call scrollToBlock
  editorRef.current?.scrollToBlock(taskId, true); // true = highlight
};

<AllTasksListView onTaskClick={handleTaskClick} />
```

## Task Item Structure

Each task in the list displays:
- **Checkbox** - Toggle completion state
- **Task text** - The task content (with strikethrough if completed)
- **Note emoji** - Visual indicator of parent note (if set)
- **Note title** - Name of the parent note

## Styling

Tasks use the unified `ListItem` component with `variant="task"`:
- Height: 32px
- Checkbox: 16px × 16px
- Font size: 14px
- Completed tasks: gray text with strikethrough
- No dividers between tasks (cleaner look)


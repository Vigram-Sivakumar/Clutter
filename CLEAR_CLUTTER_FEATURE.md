# Clear Clutter Feature Implementation

## Overview
Added a "Clear clutter" button to the topbar that appears only on the Recently Deleted page, allowing users to permanently delete all items in the trash with a single action.

## Changes Made

### 1. UI Components

#### TopBar Component (`packages/ui/src/components/app-layout/layout/topbar/TopBar.tsx`)
- Added `customActions?: ReactNode` prop to allow custom action buttons
- Custom actions are rendered before favorite/width/menu buttons in the right section
- Maintains consistent spacing and layout with existing action buttons

#### NoteTopBar Component (`packages/ui/src/components/app-layout/pages/note/NoteTopBar.tsx`)
- Added `customActions?: ReactNode` prop
- Passes through custom actions to the underlying TopBar component

#### NoteEditor Component (`packages/ui/src/components/app-layout/pages/note/NoteEditor.tsx`)
- Added `permanentlyDeleteNote` and `permanentlyDeleteFolder` to store imports
- Created `handleClearClutter` handler that:
  - Counts all deleted notes and folders
  - Shows confirmation dialog with total count
  - Permanently deletes all deleted items
  - Logs deletion summary
- Added "Clear clutter" button that only appears when `mainView.type === 'deletedItemsView'`
- Button uses TertiaryButton with "small" size for consistency

### 2. Backend - Database Layer

#### Rust Commands (`apps/desktop/src-tauri/src/database.rs`)
- Added `delete_note_permanently` command:
  - Deletes note record from database
  - Junction table entries cascade delete automatically
  - Logs deletion for debugging
- Added `delete_folder_permanently` command:
  - Deletes folder record from database
  - Junction table entries cascade delete automatically
  - Logs deletion for debugging

#### Tauri Registration (`apps/desktop/src-tauri/src/main.rs`)
- Registered `delete_note_permanently` command
- Registered `delete_folder_permanently` command

#### TypeScript Wrappers (`apps/desktop/src/lib/database.ts`)
- Added `deleteNotePermanently(noteId: string)` function
- Added `deleteFolderPermanently(folderId: string)` function
- Both functions invoke Rust commands and handle errors

### 3. State Management

#### Notes Store (`packages/shared/src/stores/notes.ts`)
- Updated `permanentlyDeleteNote` to call `storageHandlers.delete(id)`
- Now properly deletes from database, not just memory
- Added error logging for failed deletions

#### Folders Store (`packages/shared/src/stores/folders.ts`)
- Added `deleteFolderHandler` storage handler
- Added `setDeleteFolderHandler` setter function
- Updated `permanentlyDeleteFolder` to call `deleteFolderHandler(id)`
- Now properly deletes from database, not just memory
- Added error logging for failed deletions

#### App Initialization (`apps/desktop/src/App.tsx`)
- Imported `setDeleteFolderHandler`, `deleteNotePermanently`, `deleteFolderPermanently`
- Set up `deleteNotePermanently` as the delete handler for notes
- Set up `deleteFolderPermanently` as the delete handler for folders
- Handlers are configured during app initialization before data loading

## User Experience

1. **Navigation**: User navigates to "Recently deleted" page from sidebar
2. **Button Visibility**: "Clear clutter" button appears in the topbar (right side, before favorite/width/menu buttons)
3. **Action**: User clicks "Clear clutter"
4. **Confirmation**: Dialog shows: "Permanently delete all X item(s) in trash? This cannot be undone."
5. **Execution**: If confirmed, all deleted notes and folders are permanently removed from:
   - In-memory store (immediate UI update)
   - SQLite database (persistent deletion)
6. **Feedback**: Console logs summary of deleted items

## Technical Details

### Database Deletion
- Uses SQL `DELETE FROM` statements (not soft delete)
- Foreign key constraints ensure junction table cleanup via `ON DELETE CASCADE`
- Deletion is permanent and cannot be undone
- Database operations are asynchronous with error handling

### Safety Features
- Confirmation dialog prevents accidental deletion
- Shows total count of items to be deleted
- Only appears on deleted items view (not accessible elsewhere)
- Error handling with console logging for debugging

### Performance
- Batch deletion using `forEach` for simplicity
- Could be optimized with Promise.all() if needed for large datasets
- Database operations are async and don't block UI

## Testing Checklist

- [ ] Button appears only on "Recently deleted" page
- [ ] Button does not appear on other pages (notes, folders, tags, etc.)
- [ ] Confirmation dialog shows correct item count
- [ ] Clicking "Cancel" in dialog does not delete items
- [ ] Clicking "OK" in dialog permanently deletes all items
- [ ] Deleted items disappear from UI immediately
- [ ] Deleted items do not reappear after app reload
- [ ] Console logs show deletion summary
- [ ] Empty trash shows "Trash is empty" message after clearing
- [ ] Button styling matches other topbar buttons

## Future Enhancements

1. **Selective Deletion**: Add checkboxes to select specific items to delete
2. **Undo Feature**: Implement a grace period before permanent deletion
3. **Auto-cleanup**: Automatically delete items older than 30 days
4. **Progress Indicator**: Show progress bar for large batch deletions
5. **Statistics**: Show storage space reclaimed after deletion


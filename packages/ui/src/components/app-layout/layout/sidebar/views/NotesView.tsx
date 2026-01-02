import { ReactNode } from 'react';
import { SidebarSection } from '../sections/Section';
import { SidebarItemNote } from '../items/NoteItem';
import { SidebarItemFolder } from '../items/FolderItem';
import { SidebarEmptyState } from '../sections/EmptyState';
import { transitions } from '../../../../../tokens/transitions';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { SidebarNote, SidebarFolder } from '../types';

interface SidebarNotesViewProps {
  // Cluttered Note
  clutteredNotes: SidebarNote[];
  onClutteredNoteClick: (noteId: string, event?: React.MouseEvent) => void;
  isClutteredCollapsed: boolean;
  onClutteredToggle: () => void;
  onClutteredFolderClick?: () => void; // Click folder name to open Cluttered folder view

  // Favourites
  favouriteNotes: SidebarNote[];
  onFavouriteClick: (noteId: string, event?: React.MouseEvent) => void;
  isFavouritesCollapsed: boolean;
  onFavouritesToggle: () => void;
  onFavouritesHeaderClick?: () => void; // Click favourites section header to navigate

  // Folders
  folders: SidebarFolder[];
  onFolderClick?: (folderId: string, event?: React.MouseEvent) => void; // Click folder name to open folder view
  onFolderToggle: (folderId: string) => void; // Click chevron to expand/collapse
  onFolderAdd: () => void;
  isFoldersCollapsed: boolean;
  onFoldersToggle: () => void;
  onFoldersHeaderClick?: () => void; // Click "Folders" section title to navigate
  foldersHeaderActions?: ReactNode[];

  // Common
  selectedNoteId: string | null;
  selectedNoteIds?: Set<string>;
  selectedFolderIds?: Set<string>;
  
  // Action builders
  getNoteActions?: (noteId: string) => ReactNode[];
  getFolderActions?: (folderId: string) => ReactNode[];
  
  // Drag and drop
  onNoteDragStart?: (noteId: string, context: string) => void;
  onFolderDragStart?: (folderId: string, context: string) => void;
  onDragEnd?: () => void;
  onFolderDragOver?: (folderId: string) => void;
  onClutteredDragOver?: () => void;
  onDragLeave?: () => void;
  onFolderDrop?: (folderId: string) => void;
  onClutteredDrop?: () => void;
  draggedItemId?: string[] | null;
  dropTargetId?: string | null;
  dropTargetType?: 'folder' | 'cluttered' | null;
  
  // Reordering
  onNoteDragOverForReorder?: (noteId: string, position: 'before' | 'after', context: string) => void;
  onNoteDragLeaveForReorder?: () => void;
  onNoteDropForReorder?: (noteId: string, position: 'before' | 'after', context: string) => void;
  onFolderDragOverForReorder?: (folderId: string, position: 'before' | 'after', context: string) => void;
  onFolderDragLeaveForReorder?: () => void;
  onFolderDropForReorder?: (folderId: string, position: 'before' | 'after', context: string) => void;
  reorderDropTarget?: { id: string; position: 'before' | 'after'; type: 'note' | 'folder' } | null;
  
  // Inline editing
  editingNoteId?: string | null;
  editingFolderId?: string | null;
  onNoteRenameComplete?: (noteId: string, newTitle: string) => void;
  onNoteRenameCancel?: () => void;
  onFolderRenameComplete?: (folderId: string, newName: string) => void;
  onFolderRenameCancel?: () => void;
  
  // Emoji picker
  onNoteEmojiClick?: (noteId: string, buttonElement: HTMLButtonElement) => void;
  onFolderEmojiClick?: (folderId: string, buttonElement: HTMLButtonElement) => void;
}

export const NotesView = ({
  clutteredNotes,
  onClutteredNoteClick,
  isClutteredCollapsed,
  onClutteredToggle,
  onClutteredFolderClick,
  favouriteNotes,
  onFavouriteClick,
  isFavouritesCollapsed,
  onFavouritesToggle,
  onFavouritesHeaderClick,
  folders,
  onFolderClick,
  onFolderToggle,
  onFolderAdd,
  isFoldersCollapsed,
  onFoldersToggle,
  onFoldersHeaderClick,
  foldersHeaderActions,
  selectedNoteId,
  selectedNoteIds,
  selectedFolderIds,
  getNoteActions,
  getFolderActions,
  onNoteDragStart,
  onFolderDragStart,
  onDragEnd,
  onFolderDragOver,
  onClutteredDragOver,
  onDragLeave,
  onFolderDrop,
  onClutteredDrop,
  draggedItemId,
  dropTargetId,
  dropTargetType,
  onNoteDragOverForReorder,
  onNoteDragLeaveForReorder,
  onNoteDropForReorder,
  onFolderDragOverForReorder,
  onFolderDragLeaveForReorder,
  onFolderDropForReorder,
  reorderDropTarget,
  editingNoteId,
  editingFolderId,
  onNoteRenameComplete,
  onNoteRenameCancel,
  onFolderRenameComplete,
  onFolderRenameCancel,
  onNoteEmojiClick,
  onFolderEmojiClick,
}: SidebarNotesViewProps) => {
  // Recursive function to render folders and their nested content
  // parentFolderId is used to determine the ordering context
  const renderFolder = (folder: SidebarFolder, level: number, parentFolderId: string | null = null) => {
    // Determine the context for this folder based on its parent
    const folderContext = parentFolderId ? `folder-children-${parentFolderId}` : 'root-folders';
    
    return (
      <div
        key={folder.id}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: sidebarLayout.itemGap,
        }}
      >
        <SidebarItemFolder
          id={folder.id}
          label={folder.name || 'Untitled Folder'}
          emoji={folder.emoji}
          isOpen={folder.isOpen}
          badge={String(folder.notes.length)}
          level={level}
          onClick={(e) => onFolderClick?.(folder.id, e)} // Click folder name to open folder view
          onToggle={() => onFolderToggle(folder.id)} // Click chevron to expand/collapse
          actions={getFolderActions ? getFolderActions(folder.id) : undefined}
          onDragStart={onFolderDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onFolderDragOver}
          onDragLeave={onDragLeave}
          onDrop={onFolderDrop}
          isDragging={draggedItemId?.includes(folder.id) || false}
          isDropTarget={dropTargetId === folder.id}
          isSelected={selectedFolderIds?.has(folder.id) || false}
          context={folderContext}
          onClearAllReorderIndicators={() => {
            // Clear both note and folder reorder indicators when hovering over folder
            onNoteDragLeaveForReorder?.();
            onFolderDragLeaveForReorder?.();
          }}
          onDragOverForReorder={(id, pos) => {
            onFolderDragOverForReorder?.(id, pos, folderContext);
          }}
          onDragLeaveForReorder={onFolderDragLeaveForReorder}
          onDropForReorder={(id, pos) => {
            onFolderDropForReorder?.(id, pos, folderContext);
          }}
          dropPosition={reorderDropTarget?.type === 'folder' && reorderDropTarget?.id === folder.id ? reorderDropTarget.position : null}
          isEditing={editingFolderId === folder.id}
          onRenameComplete={onFolderRenameComplete}
          onRenameCancel={onFolderRenameCancel}
          onEmojiClick={onFolderEmojiClick}
        />
        {/* Folder children with collapse animation */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: folder.isOpen ? '1fr' : '0fr',
            transition: transitions.collapse.height,
            overflow: 'visible',
          }}
        >
          <div
            style={{
              minHeight: 0,
              overflow: 'hidden',
              opacity: folder.isOpen ? 1 : 0,
              transition: transitions.collapse.content,
            }}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: sidebarLayout.itemGap,
                paddingTop: '2px',
                paddingBottom: '2px',
              }}
            >
              {/* Empty state - shown when folder has no notes or subfolders */}
              {folder.notes.length === 0 && (!folder.subfolders || folder.subfolders.length === 0) ? (
                <div style={{ paddingLeft: 0 }}>
                  <SidebarEmptyState message="Folder is empty. Use the + button to add a note." />
                </div>
              ) : (
                <>
                  {/* Notes in folder */}
                  {folder.notes.map((note) => (
                    <SidebarItemNote
                      key={note.id}
                      id={note.id}
                      title={note.title}
                      icon={note.icon || undefined}
                      hasContent={note.hasContent}
                      isSelected={selectedNoteIds?.has(note.id) || selectedNoteId === note.id}
                      level={level + 1}
                      onClick={(e) => onClutteredNoteClick(note.id, e)}
                      actions={getNoteActions ? getNoteActions(note.id) : undefined}
                      onDragStart={onNoteDragStart}
                      onDragEnd={onDragEnd}
                      isDragging={draggedItemId?.includes(note.id) || false}
                      context={`folder-notes-${folder.id}`}
                      onDragOverForReorder={(id, pos) => onNoteDragOverForReorder?.(id, pos, `folder-notes-${folder.id}`)}
                      onDragLeaveForReorder={onNoteDragLeaveForReorder}
                      onDropForReorder={(id, pos) => {
                        console.log('[SidebarNotesView] 📝 Note Drop For Reorder (Folder):', {
                          noteId: id,
                          position: pos,
                          context: `folder-notes-${folder.id}`,
                          folderId: folder.id,
                          folderName: folder.name,
                        });
                        onNoteDropForReorder?.(id, pos, `folder-notes-${folder.id}`);
                      }}
                      dropPosition={reorderDropTarget?.type === 'note' && reorderDropTarget?.id === note.id ? reorderDropTarget.position : null}
                      onClearAllReorderIndicators={() => {
                        // Clear both note and folder reorder indicators
                        onNoteDragLeaveForReorder?.();
                        onFolderDragLeaveForReorder?.();
                      }}
                      isEditing={editingNoteId === note.id}
                      onRenameComplete={onNoteRenameComplete}
                      onRenameCancel={onNoteRenameCancel}
                      onEmojiClick={onNoteEmojiClick}
                    />
                  ))}
                  {/* Subfolders */}
                  {folder.subfolders?.map((subfolder) => renderFolder(subfolder, level + 1, folder.id))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: sidebarLayout.sectionGap,
      }}
    >
      {/* Favourites Section - Always visible */}
        <SidebarSection
          title="Favourites"
          isCollapsed={isFavouritesCollapsed}
          onToggle={onFavouritesToggle}
          onHeaderClick={onFavouritesHeaderClick}
          badge={String(favouriteNotes.length)}
          onClearAllReorderIndicators={() => {
            // Clear both note and folder reorder indicators when hovering over section
            onNoteDragLeaveForReorder?.();
            onFolderDragLeaveForReorder?.();
          }}
        >
      
        {favouriteNotes.length === 0 ? (
          <SidebarEmptyState message="No favorite yet. Use the star icon to add favorites." />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: sidebarLayout.itemGap,
              paddingTop: '2px',
              paddingBottom: '2px',
            }}
          >
            {favouriteNotes.map((note) => (
              <SidebarItemNote
                key={note.id}
                id={note.id}
                title={note.title}
                icon={note.icon || undefined}
                hasContent={note.hasContent}
                isSelected={selectedNoteIds?.has(note.id) || selectedNoteId === note.id}
                level={0}
                onClick={(e) => onFavouriteClick(note.id, e)}
                actions={getNoteActions ? getNoteActions(note.id) : undefined}
                onDragStart={onNoteDragStart}
                onDragEnd={onDragEnd}
                isDragging={draggedItemId?.includes(note.id) || false}
                context="favourites"
                onDragOverForReorder={(id, pos) => onNoteDragOverForReorder?.(id, pos, 'favourites')}
                onDragLeaveForReorder={onNoteDragLeaveForReorder}
                onDropForReorder={(id, pos) => {
                  console.log('[SidebarNotesView] 📝 Note Drop For Reorder (Favourites):', {
                    noteId: id,
                    position: pos,
                    context: 'favourites',
                  });
                  onNoteDropForReorder?.(id, pos, 'favourites');
                }}
                dropPosition={reorderDropTarget?.type === 'note' && reorderDropTarget?.id === note.id ? reorderDropTarget.position : null}
                onClearAllReorderIndicators={() => {
                  // Clear both note and folder reorder indicators
                  onNoteDragLeaveForReorder?.();
                  onFolderDragLeaveForReorder?.();
                }}
                isEditing={editingNoteId === note.id}
                onRenameComplete={onNoteRenameComplete}
                onRenameCancel={onNoteRenameCancel}
                onEmojiClick={onNoteEmojiClick}
              />
            ))}
          </div>
        )}
        </SidebarSection>

      {/* Folders Section */}
      <SidebarSection
        title="Folders"
        isCollapsed={isFoldersCollapsed}
        onToggle={onFoldersToggle}
        onHeaderClick={onFoldersHeaderClick}
        badge={String(folders.length)}
        actions={foldersHeaderActions}
        enableAutoExpandHeader={true}
        onClearAllReorderIndicators={() => {
          // Clear both note and folder reorder indicators when hovering over section
          onNoteDragLeaveForReorder?.();
          onFolderDragLeaveForReorder?.();
        }}
      >
        <>
          {/* Cluttered Folder - Special system folder - Always visible */}
          <div
            key="cluttered-folder"
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: sidebarLayout.itemGap,
            }}
          >
            <SidebarItemFolder
              id="cluttered"
              label="Cluttered"
              emoji="📮"
              isOpen={!isClutteredCollapsed}
              badge={String(clutteredNotes.length)}
              level={0}
              onClick={onClutteredFolderClick || (() => {})}
              onToggle={onClutteredToggle}
              onDragEnd={onDragEnd}
              onDragOver={onClutteredDragOver}
              onDragLeave={onDragLeave}
              onDrop={onClutteredDrop}
              isDropTarget={dropTargetType === 'cluttered'}
              context="cluttered"
              onClearAllReorderIndicators={() => {
                // Clear both note and folder reorder indicators when hovering over cluttered
                onNoteDragLeaveForReorder?.();
                onFolderDragLeaveForReorder?.();
              }}
              // No onEmojiClick - Cluttered is a system folder and icon cannot be changed
            />
            {/* Cluttered folder children with collapse animation */}
            <div
              style={{
                display: 'grid',
                gridTemplateRows: !isClutteredCollapsed ? '1fr' : '0fr',
                transition: transitions.collapse.height,
                overflow: 'visible',
              }}
            >
              <div
                style={{
                  minHeight: 0,
                  overflow: 'hidden',
                  opacity: !isClutteredCollapsed ? 1 : 0,
                  transition: transitions.collapse.content,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: sidebarLayout.itemGap,
                    paddingTop: '2px',
                    paddingBottom: '2px',
                  }}
                >
                  {clutteredNotes.length === 0 ? (
                  <div style={{ paddingLeft: '28px' }}>
                    <SidebarEmptyState message="All notes are organized ✨" />
                  </div>
                ) : (
                  clutteredNotes.map((note) => (
                    <SidebarItemNote
                      key={note.id}
                      id={note.id}
                      title={note.title}
                      icon={note.icon || undefined}
                      hasContent={note.hasContent}
                      isSelected={selectedNoteIds?.has(note.id) || selectedNoteId === note.id}
                      level={1}
                      onClick={(e) => onClutteredNoteClick(note.id, e)}
                      actions={getNoteActions ? getNoteActions(note.id) : undefined}
                      onDragStart={onNoteDragStart}
                      onDragEnd={onDragEnd}
                      isDragging={draggedItemId?.includes(note.id) || false}
                      context="cluttered"
                      onDragOverForReorder={(id, pos) => onNoteDragOverForReorder?.(id, pos, 'cluttered')}
                      onDragLeaveForReorder={onNoteDragLeaveForReorder}
                      onDropForReorder={(id, pos) => {
                        console.log('[SidebarNotesView] 📝 Note Drop For Reorder (Cluttered):', {
                          noteId: id,
                          position: pos,
                          context: 'cluttered',
                        });
                        onNoteDropForReorder?.(id, pos, 'cluttered');
                      }}
                      dropPosition={reorderDropTarget?.type === 'note' && reorderDropTarget?.id === note.id ? reorderDropTarget.position : null}
                      onClearAllReorderIndicators={() => {
                        // Clear both note and folder reorder indicators
                        onNoteDragLeaveForReorder?.();
                        onFolderDragLeaveForReorder?.();
                      }}
                      isEditing={editingNoteId === note.id}
                      onRenameComplete={onNoteRenameComplete}
                      onRenameCancel={onNoteRenameCancel}
                      onEmojiClick={onNoteEmojiClick}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Regular folders */}
          {folders.map((folder) => renderFolder(folder, 0))}
        </>
      </SidebarSection>
    </div>
  );
};


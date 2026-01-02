import { ReactNode, useState } from 'react';
import { ListView, ListItem, NoteListItemData } from '../list-view';
import { EmojiTray } from '../emoji';

export interface NoteListItem {
  id: string;
  title: string;
  emoji?: string | null;
  tags: string[];
  taskCount: number;
  dailyNoteDate?: string | null; // ISO date string for daily notes
}

export interface NotesListViewProps {
  notes: NoteListItem[];
  selectedNoteId?: string | null;
  onNoteClick: (noteId: string) => void;
  onTagClick?: (tag: string) => void;
  onRemoveTag?: (noteId: string, tag: string) => void;
  onUpdateEmoji?: (noteId: string, emoji: string) => void;
  emptyState?: ReactNode;
  /** Optional section title (e.g., "Notes") to display above the list */
  title?: string;
}

export const NotesListView = ({
  notes,
  selectedNoteId,
  onNoteClick,
  onTagClick,
  onRemoveTag,
  onUpdateEmoji,
  emptyState,
  title,
}: NotesListViewProps) => {
  const [isEmojiTrayOpen, setIsEmojiTrayOpen] = useState(false);
  const [emojiTrayPosition, setEmojiTrayPosition] = useState<{ top: number; left: number }>({ top: 100, left: 100 });
  const [editingEmojiNoteId, setEditingEmojiNoteId] = useState<string | null>(null);

  const handleOpenEmojiTray = (noteId: string, buttonElement: HTMLButtonElement) => {
    const rect = buttonElement.getBoundingClientRect();
    setEmojiTrayPosition({ top: rect.bottom + 8, left: rect.left });
    setEditingEmojiNoteId(noteId);
    setIsEmojiTrayOpen(true);
  };

  const handleEmojiSelect = (emoji: string) => {
    if (editingEmojiNoteId && onUpdateEmoji) {
      onUpdateEmoji(editingEmojiNoteId, emoji);
    }
    setIsEmojiTrayOpen(false);
    setEditingEmojiNoteId(null);
  };

  return (
    <>
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
            onRemoveTag={onRemoveTag}
              onEmojiClick={onUpdateEmoji ? handleOpenEmojiTray : undefined}
            />
        )}
        emptyState={emptyState}
        title={title}
              />
    
    {/* Emoji Tray */}
    <EmojiTray
      isOpen={isEmojiTrayOpen}
      onClose={() => {
        setIsEmojiTrayOpen(false);
        setEditingEmojiNoteId(null);
      }}
      onSelect={handleEmojiSelect}
      position={emojiTrayPosition}
    />
    </>
  );
};


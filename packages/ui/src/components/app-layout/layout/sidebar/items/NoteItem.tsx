import { ReactNode } from 'react';
import { SidebarItem } from './SidebarItem';

interface SidebarItemNoteProps {
  id: string;
  title: string;
  icon?: string;
  labelColor?: string; // Optional color override for the label (e.g., calendarAccent for today's note)
  hasContent?: boolean;
  dailyNoteDate?: string | null; // For daily notes - date in YYYY-MM-DD format
  isToday?: boolean; // Whether this is today's daily note (for showing dot indicator)
  isSelected: boolean;
  hasOpenContextMenu?: boolean; // Whether this note's context menu is currently open
  level: number;
  onClick: (event?: React.MouseEvent) => void;
  actions?: ReactNode[];
  // Drag and drop
  onDragStart?: (id: string, context: string) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  context: string; // Context for ordering (e.g., 'cluttered', 'favourites', 'folder-notes-123')
  // Drop zone detection for reordering
  onDragOverForReorder?: (id: string, position: 'before' | 'after') => void;
  onDragLeaveForReorder?: () => void;
  onDropForReorder?: (id: string, position: 'before' | 'after') => void;
  dropPosition?: 'before' | 'after' | null;
  onClearAllReorderIndicators?: () => void; // Clear all reorder indicators
  // Inline editing
  isEditing?: boolean;
  onRenameComplete?: (id: string, newTitle: string) => void;
  onRenameCancel?: () => void;
  // Emoji picker
  onEmojiClick?: (noteId: string, buttonElement: HTMLButtonElement) => void;
}

/**
 * SidebarItemNote - Wrapper around unified SidebarItem component
 * Maintains backwards compatibility while using the unified component
 */
export const SidebarItemNote = ({
  id,
  title,
  icon,
  labelColor,
  hasContent,
  dailyNoteDate,
  isToday = false,
  isSelected,
  hasOpenContextMenu = false,
  level,
  onClick,
  actions,
  onDragStart,
  onDragEnd,
  isDragging = false,
  context,
  onDragOverForReorder,
  onDragLeaveForReorder,
  onDropForReorder,
  dropPosition = null,
  onClearAllReorderIndicators,
  isEditing = false,
  onRenameComplete,
  onRenameCancel,
  onEmojiClick,
}: SidebarItemNoteProps) => {
  return (
    <SidebarItem
      variant="note"
      id={id}
      label={title}
      icon={icon}
      labelColor={labelColor}
      hasContent={hasContent}
      dailyNoteDate={dailyNoteDate}
      isToday={isToday}
      level={level}
      isSelected={isSelected}
      hasOpenContextMenu={hasOpenContextMenu}
      isDragging={isDragging}
      onClick={onClick}
      actions={actions}
      draggable={!!onDragStart}
      context={context}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      reorderable={!!onDragOverForReorder}
      onDragOverForReorder={onDragOverForReorder}
      onDragLeaveForReorder={onDragLeaveForReorder}
      onDropForReorder={onDropForReorder}
      dropPosition={dropPosition}
      onClearAllReorderIndicators={onClearAllReorderIndicators}
      isEditing={isEditing}
      onRenameComplete={onRenameComplete}
      onRenameCancel={onRenameCancel}
      onEmojiClick={onEmojiClick}
    />
  );
};

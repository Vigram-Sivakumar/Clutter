import { ReactNode } from 'react';
import { SidebarItem } from './SidebarItem';

interface SidebarItemFolderProps {
  id: string;
  label: string;
  isOpen: boolean;
  badge?: string;
  level: number;
  emoji?: string | ReactNode | null; // Optional emoji string or icon component for folder
  folderId?: string; // Folder ID for system folder identification (cluttered, __daily_notes__)
  labelColor?: string; // Optional color override for the label (e.g., calendarAccent for current year/month)
  isToday?: boolean; // Whether this is today's month (for showing dot indicator)
  onClick: (_event?: React.MouseEvent) => void; // Click folder to open folder view
  onToggle?: () => void; // Click chevron to expand/collapse
  actions?: ReactNode[];
  sticky?: boolean; // Whether this folder header should stick to the top when scrolling
  // Drag and drop (for moving into folder)
  onDragStart?: (_id: string, _context: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (_id: string) => void;
  onDragLeave?: () => void;
  onDrop?: (_id: string) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  isSelected?: boolean; // For multi-select visual feedback
  hasOpenContextMenu?: boolean; // Whether this folder's context menu is currently open
  context: string; // Context for ordering (e.g., 'root-folders', 'folder-children-123')
  // Drop zone detection for reordering
  onDragOverForReorder?: (_id: string, _position: 'before' | 'after') => void;
  onDragLeaveForReorder?: () => void;
  onDropForReorder?: (_id: string, _position: 'before' | 'after') => void;
  dropPosition?: 'before' | 'after' | null;
  onClearAllReorderIndicators?: () => void; // Clear all reorder indicators when becoming drop target
  // Inline editing
  isEditing?: boolean;
  onRenameComplete?: (_id: string, _newName: string) => void;
  onRenameCancel?: () => void;
  // Emoji picker
  onEmojiClick?: (_folderId: string, _buttonElement: HTMLButtonElement) => void;
}

/**
 * SidebarItemFolder - Wrapper around unified SidebarItem component
 * Maintains backwards compatibility while using the unified component
 */
export const SidebarItemFolder = ({
  id,
  label,
  isOpen,
  badge,
  level,
  emoji,
  folderId,
  labelColor,
  isToday = false,
  onClick,
  onToggle,
  actions,
  sticky = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging = false,
  isDropTarget = false,
  isSelected = false,
  hasOpenContextMenu = false,
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
}: SidebarItemFolderProps) => {
  return (
    <SidebarItem
      variant="folder"
      id={id}
      label={label}
      icon={emoji || undefined}
      folderId={folderId}
      labelColor={labelColor}
      isToday={isToday}
      level={level}
      badge={badge}
      isOpen={isOpen}
      isSelected={isSelected}
      hasOpenContextMenu={hasOpenContextMenu}
      isDragging={isDragging}
      isDropTarget={isDropTarget}
      onClick={onClick}
      onToggle={onToggle}
      actions={actions}
      sticky={sticky}
      draggable={!!onDragStart}
      context={context}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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

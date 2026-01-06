import { ReactNode } from 'react';
import { SidebarItem } from './SidebarItem';
import { TertiaryButton } from '../../../../ui-buttons';
import { ArrowBendDownRight } from '../../../../../icons';

interface SidebarItemTaskProps {
  // Identity
  id: string; // Task/block ID
  noteId: string; // Parent note ID
  noteTitle?: string; // Parent note title (for tooltip)

  // Content
  text: string; // Task text content
  checked: boolean; // Completion state
  badge?: string; // Badge text (e.g., due date for overdue tasks)

  // State
  isSelected?: boolean;
  hasOpenContextMenu?: boolean;

  // Interactions
  onClick: (_event?: React.MouseEvent) => void;
  onToggle: (_taskId: string) => void;
  onNavigate: (_noteId: string, _blockId: string) => void;

  // Actions (context menu items)
  actions?: ReactNode[];
}

/**
 * SidebarItemTask - Wrapper around unified SidebarItem component for tasks
 *
 * Tasks have a unique interaction model:
 * - Click task → Select (enables multi-select)
 * - Click checkbox → Toggle completion
 * - Click navigate icon → Navigate to note and scroll to block
 */
export const SidebarItemTask = ({
  id,
  noteId,
  noteTitle,
  text,
  checked,
  badge,
  isSelected = false,
  hasOpenContextMenu = false,
  onClick,
  onToggle,
  onNavigate,
  actions = [],
}: SidebarItemTaskProps) => {
  // Build navigate action (shown on hover)
  const navigateAction = (
    <TertiaryButton
      icon={<ArrowBendDownRight size={14} />}
      onClick={(e) => {
        e.stopPropagation();
        onNavigate(noteId, id);
      }}
      size="xs"
      tooltip={noteTitle ? `Open in "${noteTitle}"` : 'Open in note'}
    />
  );

  return (
    <SidebarItem
      variant="task"
      id={id}
      label={text}
      badge={badge}
      isSelected={isSelected}
      hasOpenContextMenu={hasOpenContextMenu}
      onClick={onClick}
      isTaskChecked={checked}
      onTaskToggle={onToggle}
      taskNoteId={noteId}
      onTaskNavigate={onNavigate}
      actions={[navigateAction, ...actions]}
      level={0} // Tasks under section headers are not indented (like Favourites)
      // No drag/drop, rename, or emoji picker for tasks
    />
  );
};

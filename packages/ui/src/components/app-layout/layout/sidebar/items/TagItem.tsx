import { ReactNode } from 'react';
import { SidebarItem } from './SidebarItem';

interface SidebarItemTagProps {
  tag: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
  actions?: ReactNode[];
  // Inline editing
  isEditing?: boolean;
  onRenameComplete?: (tag: string, newTag: string) => void;
  onRenameCancel?: () => void;
}

/**
 * SidebarItemTag - Wrapper around unified SidebarItem component
 * Maintains backwards compatibility while using the unified component
 */
export const SidebarItemTag = ({
  tag,
  count,
  isSelected,
  onClick,
  actions,
  isEditing = false,
  onRenameComplete,
  onRenameCancel,
}: SidebarItemTagProps) => {
  return (
    <SidebarItem
      variant="tag"
      id={tag}
      label={tag}
      isSelected={isSelected}
      onClick={onClick}
      actions={actions}
      isEditing={isEditing}
      onRenameComplete={onRenameComplete}
      onRenameCancel={onRenameCancel}
      tagCount={count}
    />
  );
};

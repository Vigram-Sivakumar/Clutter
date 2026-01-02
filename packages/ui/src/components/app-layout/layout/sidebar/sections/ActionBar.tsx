import { MouseEvent } from 'react';
import { FilledButton } from '../../../../ui-buttons';
import { Plus, Search } from '../../../../../icons';
import { spacing } from '../../../../../tokens/spacing';

interface SidebarActionBarProps {
  onCreateNote: (e: MouseEvent<HTMLButtonElement>) => void;
  onSearch: (e: MouseEvent<HTMLButtonElement>) => void;
  createButtonShortcut?: string;
}

export const SidebarActionBar = ({
  onCreateNote,
  onSearch,
  createButtonShortcut,
}: SidebarActionBarProps) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: spacing['8'],
        alignItems: 'center',
      }}
    >
      {/* Create Note Button - fills available space */}
      <div style={{ flex: 1,           textWrap: 'nowrap',
          textOverflow: 'ellipsis', }}>
        <FilledButton
          icon={<Plus size={16} />}
          onClick={onCreateNote}
          size="medium"
          shortcut={createButtonShortcut}
          fullWidth
          onBackground="secondary"
        >
          Create Note
        </FilledButton>
      </div>

      {/* Search Button - icon only, hugs content */}
      <FilledButton
        icon={<Search size={16} />}
        onClick={onSearch}
        size="medium"
        onBackground="secondary"

      />
    </div>
  );
};


import { MouseEvent, ReactNode } from 'react';
import { FilledButton } from '../../../../ui-buttons';
import { Search } from '../../../../../icons';
import { spacing } from '../../../../../tokens/spacing';

interface SidebarActionBarProps {
  onPrimaryAction: (_e: MouseEvent<HTMLButtonElement>) => void;
  onSecondaryAction: (_e: MouseEvent<HTMLButtonElement>) => void;
  primaryLabel: string;
  primaryIcon?: ReactNode;
  secondaryIcon?: ReactNode;
  primaryShortcut?: string;
}

export const SidebarActionBar = ({
  onPrimaryAction,
  onSecondaryAction,
  primaryLabel,
  primaryIcon,
  secondaryIcon = <Search size={16} />,
  primaryShortcut,
}: SidebarActionBarProps) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: spacing['8'],
        alignItems: 'center',
      }}
    >
      {/* Primary Button - fills available space */}
      <div style={{ flex: 1, textWrap: 'nowrap', textOverflow: 'ellipsis' }}>
        <FilledButton
          {...(primaryIcon && { icon: primaryIcon })}
          onClick={onPrimaryAction}
          size="medium"
          shortcut={primaryShortcut}
          fullWidth
          onBackground="secondary"
        >
          {primaryLabel}
        </FilledButton>
      </div>

      {/* Secondary Button - icon only, hugs content */}
      <FilledButton
        {...(secondaryIcon && { icon: secondaryIcon })}
        onClick={onSecondaryAction}
        size="medium"
        onBackground="secondary"
      />
    </div>
  );
};

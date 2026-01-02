import { MouseEvent } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { X } from '../../icons';
import { sizing } from '../../tokens/sizing';

interface DismissButtonProps {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  size?: number;
  iconSize?: number;
  disabled?: boolean;
}

export const DismissButton = ({
  onClick,
  size = 16,
  iconSize = sizing.icon.xs,
  disabled = false,
}: DismissButtonProps) => {
  const { colors } = useTheme();

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        position: 'absolute',
        top: '-6px',
        right: '-6px',
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.background.default,
        border: `1px solid ${colors.border.default}`,
        borderRadius: '50%',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: 0,
        color: colors.text.secondary,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        transition: 'background-color 150ms cubic-bezier(0.2, 0, 0, 1), color 150ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms cubic-bezier(0.2, 0, 0, 1)',
        boxSizing: 'border-box',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        opacity: disabled ? 0.4 : 1,
      } as any}
      onMouseEnter={disabled ? undefined : (e) => {
        e.currentTarget.style.backgroundColor = colors.background.hover;
        e.currentTarget.style.color = colors.text.default;
      }}
      onMouseLeave={disabled ? undefined : (e) => {
        e.currentTarget.style.backgroundColor = colors.background.default;
        e.currentTarget.style.color = colors.text.secondary;
      }}
    >
      <X size={iconSize} />
    </button>
  );
};


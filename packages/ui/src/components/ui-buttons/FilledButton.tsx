import { ReactNode, MouseEvent } from 'react';
import { Button } from './Button';

interface FilledButtonProps {
  children?: ReactNode;
  icon?: ReactNode;
  iconSize?: number;
  iconPosition?: 'left' | 'right';
  shortcut?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  onMouseDown?: (e: MouseEvent<HTMLButtonElement>) => void;
  size?: 'xs' | 'small' | 'medium';
  onBackground?: 'default' | 'secondary' | 'tertiary';
  fullWidth?: boolean;
  disabled?: boolean;
}

export const FilledButton = ({
  children,
  icon,
  iconSize,
  iconPosition,
  shortcut,
  onClick,
  onMouseDown,
  size = 'medium',
  onBackground = 'secondary',
  fullWidth = false,
  disabled = false,
}: FilledButtonProps) => {
  return (
    <Button
      variant="filled"
      size={size}
      icon={icon}
      iconSize={iconSize}
      iconPosition={iconPosition}
      shortcut={shortcut}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onBackground={onBackground}
      fullWidth={fullWidth}
      disabled={disabled}
    >
      {children}
    </Button>
  );
};


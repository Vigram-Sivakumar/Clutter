import { ReactNode, MouseEvent } from 'react';
import { Button } from './Button';

interface PrimaryButtonProps {
  children?: ReactNode;
  icon?: ReactNode;
  iconSize?: number;
  iconPosition?: 'left' | 'right';
  shortcut?: string;
  onClick?: (_e: MouseEvent<HTMLButtonElement>) => void;
  onMouseDown?: (_e: MouseEvent<HTMLButtonElement>) => void;
  danger?: boolean;
  size?: 'xs' | 'small' | 'medium';
  fullWidth?: boolean;
  centerText?: boolean;
  disabled?: boolean;
}

export const PrimaryButton = ({
  children,
  icon,
  iconSize,
  iconPosition,
  shortcut,
  onClick,
  onMouseDown,
  danger,
  size = 'medium',
  fullWidth = false,
  centerText = false,
  disabled = false,
}: PrimaryButtonProps) => {
  return (
    <Button
      variant="primary"
      size={size}
      icon={icon}
      iconSize={iconSize}
      iconPosition={iconPosition}
      shortcut={shortcut}
      onClick={onClick}
      onMouseDown={onMouseDown}
      danger={danger}
      fullWidth={fullWidth}
      centerText={centerText}
      disabled={disabled}
    >
      {children}
    </Button>
  );
};

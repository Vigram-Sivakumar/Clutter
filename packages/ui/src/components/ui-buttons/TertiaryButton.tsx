import { ReactNode, MouseEvent } from 'react';
import { Button } from './Button';

interface TertiaryButtonProps {
  children?: ReactNode;
  icon?: ReactNode;
  iconSize?: number;
  iconPosition?: 'left' | 'right';
  shortcut?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  onMouseDown?: (e: MouseEvent<HTMLButtonElement>) => void;
  subtle?: boolean;
  size?: 'xs' | 'small' | 'medium';
  active?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  fontSize?: string;
  gap?: string;
  noHoverBackground?: boolean;
}

export const TertiaryButton = ({
  children,
  icon,
  iconSize,
  iconPosition,
  shortcut,
  onClick,
  onMouseDown,
  subtle = false,
  size = 'medium',
  active,
  fullWidth = false,
  disabled = false,
  fontSize,
  gap,
  noHoverBackground = false,
}: TertiaryButtonProps) => {
  return (
    <Button
      variant="tertiary"
      size={size}
      icon={icon}
      iconSize={iconSize}
      iconPosition={iconPosition}
      shortcut={shortcut}
      onClick={disabled ? undefined : onClick}
      onMouseDown={disabled ? undefined : onMouseDown}
      subtle={subtle}
      active={active}
      fullWidth={fullWidth}
      disabled={disabled}
      fontSize={fontSize}
      gap={gap}
      noHoverBackground={noHoverBackground}
    >
      {children}
    </Button>
  );
};


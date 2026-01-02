import { ReactNode, MouseEvent, cloneElement, isValidElement, CSSProperties, useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { sizing } from '../../tokens/sizing';
import { KeyboardShortcut } from '../ui-primitives/KeyboardShortcut';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'filled';
  size?: 'xs' | 'small' | 'medium';
  icon?: ReactNode;
  iconSize?: number;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
  shortcut?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  onMouseDown?: (e: MouseEvent<HTMLButtonElement>) => void;
  danger?: boolean;
  subtle?: boolean;
  active?: boolean;
  onBackground?: 'default' | 'secondary' | 'tertiary'; // For filled variant context
  fullWidth?: boolean; // Control whether button fills width or hugs content
  withBackground?: boolean; // Add background color to secondary variant
  noBorder?: boolean; // Remove border from button
  disabled?: boolean; // Disabled state
  fontSize?: string; // Custom font size
  gap?: string; // Custom gap between icon and label
  noHoverBackground?: boolean; // Disable hover background color
}

export const Button = ({
  variant = 'tertiary',
  size = 'medium',
  icon,
  iconSize = sizing.icon.sm,
  iconPosition = 'left',
  children,
  shortcut,
  onClick,
  onMouseDown,
  danger = false,
  subtle = false,
  active = false,
  onBackground = 'secondary', // Default context for filled variant
  fullWidth = false,
  withBackground = false,
  noBorder = false,
  disabled = false,
  fontSize = '14px',
  gap,
  noHoverBackground = false,
}: ButtonProps) => {
  const { colors } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const sizeMap = {
    xs: '20px',
    small: '24px',
    medium: '28px',
  };

  const buttonHeight = sizeMap[size];
  const isIconOnly = icon && !children;
  const isTextOnly = !icon && children;

  // Clone icon with size if it's a valid React element
  const iconElement = icon && isValidElement(icon) ? cloneElement(icon, { size: iconSize } as any) : icon;

  // Padding based on content type and size
  const getPadding = () => {
    if (isIconOnly) return '0'; // Icon-only buttons are square with no padding
    if (isTextOnly) return '0 8px'; // Same left and right for text-only
    // Icon + text - adjust based on icon position
    if (iconPosition === 'right') {
      return '0 4px 0 8px'; // Less padding on right (icon side), more on left
    }
    return '0 8px 0 4px'; // Less padding on left (icon side), more on right
  };

  // Base styles
  const baseStyles: CSSProperties = {
    padding: getPadding(),
    height: buttonHeight,
    minWidth: isIconOnly ? buttonHeight : 'auto',
    width: fullWidth ? '100%' : 'auto',
    fontSize: fontSize,
    fontWeight: variant === 'primary' ? 500 : 400,
    border: 'none',
    borderRadius: '3px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: isIconOnly ? 'center' : 'flex-start',
    gap: gap || '4px',
    transition: 'background-color 150ms cubic-bezier(0.2, 0, 0, 1), color 150ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms cubic-bezier(0.2, 0, 0, 1), border-color 150ms cubic-bezier(0.2, 0, 0, 1)',
    boxSizing: 'border-box',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  } as any;

  // Variant-specific styles
  const getVariantStyles = (): CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          color: danger ? colors.text.inverse : colors.text.secondary,
          background: danger ? colors.semantic.error : colors.background.tertiary,
          border: 'none',
        };
      case 'secondary':
        const getSecondaryBackground = () => {
          if (!withBackground) return 'transparent';
          if (onBackground === 'default') return colors.background.secondary;
          if (onBackground === 'secondary') return colors.background.tertiary;
          return colors.background.tertiary;
        };
        return {
          color: danger ? colors.semantic.error : colors.text.secondary,
          background: getSecondaryBackground(),
          border: noBorder ? 'none' : `1px solid ${danger ? colors.semantic.error : colors.border.default}`,
        };
      case 'filled':
        // Adapts background based on container context
        const getFilledBackground = () => {
          if (onBackground === 'default') return colors.background.secondary;
          if (onBackground === 'secondary') return colors.background.tertiary;
          return colors.background.tertiary;
        };
        return {
          color: colors.text.secondary,
          background: getFilledBackground(),
          border: 'none',
        };
      case 'tertiary':
      default:
        return {
          color: active ? colors.text.default : (subtle ? colors.text.tertiary : colors.text.secondary),
          background: active ? colors.background.tertiary : 'transparent',
          border: 'none',
        };
    }
  };

  const variantStyles = getVariantStyles();

  // Clear inline hover styles when button becomes disabled
  useEffect(() => {
    if (disabled && buttonRef.current) {
      // Reset to default variant styles
      buttonRef.current.style.backgroundColor = variantStyles.background as string;
      buttonRef.current.style.color = variantStyles.color as string;
      if (variant === 'secondary' && !noBorder) {
        buttonRef.current.style.borderColor = (danger ? colors.semantic.error : colors.border.default);
      }
    }
  }, [disabled, variantStyles.background, variantStyles.color, variant, noBorder, danger, colors.semantic.error, colors.border.default]);

  // Hover styles
  const handleMouseEnter = (e: MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    
    // If noHoverBackground is true, only change text color
    if (noHoverBackground) {
      if (variant === 'tertiary' && !active) {
        target.style.color = colors.text.default;
      }
      return;
    }
    
    switch (variant) {
      case 'primary':
        target.style.backgroundColor = danger ? colors.semantic.error : colors.background.active;
        break;
      case 'secondary':
        target.style.backgroundColor = colors.background.hover;
        if (!noBorder) {
        target.style.borderColor = danger ? colors.semantic.error : colors.border.hover;
        }
        target.style.color = danger ? colors.semantic.error : colors.text.default;
        break;
      case 'filled':
        target.style.backgroundColor = colors.background.hover;
        break;
      case 'tertiary':
      default:
        if (!active) {
        target.style.backgroundColor = colors.background.hover;
        target.style.color = colors.text.secondary;
        }
        break;
    }
  };

  const handleMouseLeave = (e: MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    switch (variant) {
      case 'primary':
        target.style.backgroundColor = danger ? colors.semantic.error : colors.background.tertiary;
        break;
      case 'secondary':
        const getSecondaryBg = () => {
          if (!withBackground) return 'transparent';
          if (onBackground === 'default') return colors.background.secondary;
          if (onBackground === 'secondary') return colors.background.tertiary;
          return colors.background.tertiary;
        };
        target.style.backgroundColor = getSecondaryBg();
        if (!noBorder) {
        target.style.borderColor = danger ? colors.semantic.error : colors.border.default;
        }
        target.style.color = danger ? colors.semantic.error : colors.text.secondary;
        break;
      case 'filled':
        const getFilledBackground = () => {
          if (onBackground === 'default') return colors.background.secondary;
          if (onBackground === 'secondary') return colors.background.tertiary;
          return colors.background.tertiary;
        };
        target.style.backgroundColor = getFilledBackground();
        break;
      case 'tertiary':
      default:
        if (!active) {
        target.style.backgroundColor = 'transparent';
        target.style.color = subtle ? colors.text.tertiary : colors.text.secondary;
        } else {
          target.style.backgroundColor = colors.background.tertiary;
          target.style.color = colors.text.default;
        }
        break;
    }
  };

  const handleMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
    // Prevent button from stealing focus (important for floating toolbars)
    e.preventDefault();
    
    if (onMouseDown) {
      onMouseDown(e);
    }
    if (variant === 'primary') {
      e.currentTarget.style.backgroundColor = danger ? colors.semantic.error : colors.background.active;
    }
  };

  const handleMouseUp = (e: MouseEvent<HTMLButtonElement>) => {
    if (variant === 'primary') {
      e.currentTarget.style.backgroundColor = danger ? colors.semantic.error : colors.background.active;
    }
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={disabled ? undefined : handleClick}
      onMouseDown={disabled ? undefined : handleMouseDown}
      onMouseUp={disabled ? undefined : handleMouseUp}
      onMouseEnter={disabled ? undefined : handleMouseEnter}
      onMouseLeave={disabled ? undefined : handleMouseLeave}
      disabled={disabled}
      style={{
        ...baseStyles,
        ...variantStyles,
        justifyContent: isIconOnly ? 'center' : 'flex-start',
        paddingRight: shortcut ? '6px' : baseStyles.padding,
      }}
    >
      {iconPosition === 'left' && iconElement}
      {children && <span style={{ flex: shortcut ? 1 : 'none', textAlign: 'left' }}>{children}</span>}
      {iconPosition === 'right' && iconElement}
      {shortcut && <KeyboardShortcut keys={shortcut} />}
    </button>
  );
};


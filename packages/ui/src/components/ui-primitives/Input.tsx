/**
 * Input Component
 * 
 * Reusable input field using design tokens
 * Consistent styling across all input fields
 * 
 * Sizes match Button component heights:
 * - xs: 20px
 * - small: 24px
 * - medium: 28px
 * 
 * Variants:
 * - default: Background with border (shows focus border)
 * - secondary: Secondary background with border (shows focus border)
 * - tertiary: Transparent background, no border ever (like tertiary button)
 *   - Default: transparent
 *   - Hover: subtleHover background
 *   - Focus: secondary background, no border
 */

import { forwardRef, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { sizing } from '../../tokens/sizing';
import { typography } from '../../tokens/typography';
import { animations } from '../../tokens/animations';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'secondary' | 'tertiary';
  size?: 'xs' | 'small' | 'medium';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', size = 'medium', style, onFocus, onBlur, ...props }, ref) => {
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Get background color based on variant and state
    const getBackgroundColor = () => {
      if (variant === 'tertiary') {
        // Tertiary stays transparent always, only shows subtle hover
        if (isHovered && !isFocused) return colors.background.subtleHover;
        return 'transparent';
      }
      if (variant === 'secondary') return colors.background.secondary;
      return colors.background.default;
    };

    // Get border color based on variant and state
    const getBorderColor = () => {
      if (variant === 'tertiary') {
        // Tertiary never shows border, even when focused
        return 'transparent';
      }
      if (isFocused) return colors.border.focus;
      return colors.border.default;
    };

    const baseStyle: React.CSSProperties = {
      height: sizing.input[size],
      padding: '0 8px', // No vertical padding, horizontal only
      fontSize: typography.fontSize.sm,
      fontFamily: typography.fontFamily.sans,
      lineHeight: typography.lineHeightPx.sm,
      color: colors.text.secondary,
      backgroundColor: getBackgroundColor(),
      border: `1px solid ${getBorderColor()}`,
      borderRadius: sizing.radius.sm,
      outline: 'none',
      transition: 'background-color 150ms ease, border-color 150ms ease',
      boxSizing: 'border-box',
      ...style,
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
    };

    return (
      <input
        ref={ref}
        style={baseStyle}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';


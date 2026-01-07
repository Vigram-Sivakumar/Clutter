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
 * Multiline support:
 * - multiline: false (default) - renders as input (single line)
 * - multiline: true - renders as textarea (height = 3x line height = 60px)
 * 
 * Variants:
 * - default: Background with border (border stays same on focus)
 * - secondary: Secondary background, no border ever
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
import { spacing } from '../../tokens/spacing';
import { radius } from '../../tokens/radius';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'secondary' | 'tertiary';
  size?: 'xs' | 'small' | 'medium';
  label?: string;
  multiline?: boolean;
  error?: string; // Error message to display below input
}

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  ({ variant = 'default', size = 'medium', label, multiline = false, error, style, onFocus, onBlur, ...props }, ref) => {
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Get background color based on variant and state
    const getBackgroundColor = () => {
      if (variant === 'tertiary') {
        // Tertiary stays transparent always, only shows hover
        if (isHovered && !isFocused) return colors.background.hover;
        return 'transparent';
      }
      if (variant === 'secondary') return colors.background.secondary;
      return colors.background.default;
    };

    // Get border color based on variant and state
    const getBorderColor = () => {
      // Show error border if error exists
      if (error) {
        return colors.semantic.error;
      }
      if (variant === 'tertiary' || variant === 'secondary') {
        // Tertiary and secondary never show border, even when focused
        return 'transparent';
      }
      // Default variant keeps same border color even when focused
      return colors.border.default;
    };

    // Calculate height based on multiline
    // For multiline: 3x line height (20px * 3 = 60px)
    const lineHeight = parseInt(typography.lineHeightPx.sm);
    const calculatedHeight = multiline ? `${lineHeight * 3}px` : sizing.input[size];

    const baseStyle: React.CSSProperties = {
      width: '100%',
      height: multiline ? 'auto' : calculatedHeight,
      minHeight: multiline ? calculatedHeight : undefined,
      padding: multiline ? '8px' : '0 8px', // Vertical padding for textarea
      fontSize: typography.fontSize['14'],
      fontFamily: typography.fontFamily.sans,
      lineHeight: typography.lineHeightPx.sm,
      color: colors.text.default,
      backgroundColor: getBackgroundColor(),
      border: `1px solid ${getBorderColor()}`,
      borderRadius: radius['6'],
      outline: 'none',
      transition: 'background-color 150ms ease, border-color 150ms ease',
      boxSizing: 'border-box',
      resize: 'none',
      ...style,
    } as React.CSSProperties;

    const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setIsFocused(true);
      onFocus?.(e as any);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setIsFocused(false);
      onBlur?.(e as any);
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
    };

    // Placeholder styles
    const placeholderStyle = `
      ::placeholder {
        color: ${colors.text.placeholder};
        opacity: 1;
      }
      ::-webkit-input-placeholder {
        color: ${colors.text.placeholder};
        opacity: 1;
      }
      ::-moz-placeholder {
        color: ${colors.text.placeholder};
        opacity: 1;
      }
      :-ms-input-placeholder {
        color: ${colors.text.placeholder};
        opacity: 1;
      }
    `;

    return (
      <div style={{ width: '100%' }}>
        {label && (
          <label
            style={{
              fontSize: typography.fontSize['12'],
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.tertiary,
              display: 'block',
              marginBottom: spacing['4'],
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {label}
          </label>
        )}
        {multiline ? (
          <>
            <style>{`textarea${placeholderStyle}`}</style>
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              style={baseStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          </>
        ) : (
          <>
            <style>{`input${placeholderStyle}`}</style>
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              style={baseStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              {...props}
            />
          </>
        )}
        {error && (
          <div
            style={{
              fontSize: typography.fontSize['12'],
              color: colors.semantic.error,
              marginTop: spacing['4'],
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';


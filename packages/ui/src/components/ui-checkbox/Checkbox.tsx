import { useTheme } from '../../hooks/useTheme';

export interface CheckboxProps {
  checked: boolean;
  onChange: (_checked: boolean) => void;
  onKeyDown?: (_e: React.KeyboardEvent) => void;
  onClick?: (_e: React.MouseEvent) => void;
  onFocus?: (_e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (_e: React.FocusEvent<HTMLInputElement>) => void;
  /** Size in pixels (defaults to 16) */
  size?: number;
  /** Additional styles to apply */
  style?: React.CSSProperties;
}

/**
 * Checkbox component - Consistent checkbox styling across the app
 *
 * Features:
 * - Matches editor's ListBlock checkbox styling
 * - Uses colors.marker for border
 * - Uses colors.text.default background when checked
 * - Uses colors.background.default background when unchecked
 * - Circular shape (50% border radius)
 * - Checkmark SVG that matches theme
 *
 * Usage:
 * ```tsx
 * <Checkbox
 *   checked={isChecked}
 *   onChange={(checked) => setIsChecked(checked)}
 * />
 * ```
 */
export const Checkbox = ({
  checked,
  onChange,
  onKeyDown,
  onClick,
  onFocus,
  onBlur,
  size = 16,
  style,
}: CheckboxProps) => {
  const { colors } = useTheme();

  // URL-encode the checkmark color for SVG data URL
  const checkmarkColor = colors.background.default.replace('#', '%23');

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      onKeyDown={onKeyDown}
      onClick={onClick}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        width: size,
        height: size,
        margin: 0,
        flexShrink: 0,
        cursor: 'pointer',
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        border: `1.5px solid ${checked ? colors.text.default : colors.marker}`,
        borderRadius: '50%',
        backgroundColor: checked
          ? colors.text.default
          : colors.background.default,
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
        outline: 'none',
        // SVG checkmark when checked (dynamic color based on theme)
        backgroundImage: checked
          ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='${checkmarkColor}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E")`
          : 'none',
        backgroundSize: '14px 14px',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    />
  );
};

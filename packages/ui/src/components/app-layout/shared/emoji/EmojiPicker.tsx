import { useRef, ReactNode } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { sizing } from '../../../../tokens/sizing';

interface EmojiPickerProps {
  selectedEmoji: string | null;
  onClick?: () => void;
  isHovered?: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  defaultIcon?: ReactNode; // Custom default icon (e.g., FileText, Folder, Tag)
  disabled?: boolean; // If true, shows as static/disabled (for system folders, section headers)
  backgroundColor?: string; // Optional custom background color
}

export const EmojiPicker = ({ 
  selectedEmoji, 
  onClick, 
  isHovered = false, 
  buttonRef,
  defaultIcon,
  disabled = false,
  backgroundColor,
}: EmojiPickerProps) => {
  const internalRef = useRef<HTMLButtonElement>(null);
  const ref = buttonRef || internalRef;
  const { colors } = useTheme();

  const defaultBackground = backgroundColor || 'transparent';
  const hoverBackground = colors.background.hover;

  return (
    <button
      ref={ref}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '6px',
        border: 'none',
        background: isHovered && !disabled ? hoverBackground : defaultBackground,
        fontSize: sizing.icon.pageTitleIcon,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 150ms cubic-bezier(0.2, 0, 0, 1)',
        padding: 0,
        color: colors.text.placeholder,
        opacity: disabled ? 1 : 1, // Keep full opacity even when disabled
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = hoverBackground;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isHovered ? hoverBackground : defaultBackground;
      }}
    >
      {selectedEmoji ? (
        <span style={{ fontSize: sizing.icon.pageTitleIcon }}>{selectedEmoji}</span>
      ) : (
        <span style={{ color: 'currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {defaultIcon}
        </span>
      )}
    </button>
  );
};


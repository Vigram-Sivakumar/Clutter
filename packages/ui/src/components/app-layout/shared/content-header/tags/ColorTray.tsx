import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing } from '../../../../../tokens/spacing';
import { sizing } from '../../../../../tokens/sizing';

interface ColorTrayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (color: string) => void;
  selectedColor?: string;
  position?: { top: number; left: number };
}

const TAG_COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'purple', 'pink', 'red'] as const;

export const ColorTray = ({ isOpen, onClose, onSelect, selectedColor, position }: ColorTrayProps) => {
  const trayRef = useRef<HTMLDivElement>(null);
  const { colors } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      // Delay adding listener to prevent immediate close
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={trayRef}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: (position?.top ?? 100) + window.scrollY,
        left: (position?.left ?? 100) + window.scrollX,
        marginTop: '4px',
        zIndex: 1000,
        backgroundColor: colors.background.default,
        border: `1px solid ${colors.border.default}`,
        borderRadius: sizing.radius.md,
        padding: spacing['6'],
        boxShadow: `0 4px 12px ${colors.shadow.md}`,
      }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: spacing['6'],
      }}>
        {TAG_COLORS.map((color) => {
          const accent = colors.accent[color as keyof typeof colors.accent];
          const isSelected = color === selectedColor;
          
          return (
            <button
              key={color}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(color);
                onClose();
              }}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent editor focus change
              }}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: accent?.text || colors.text.default,
                border: isSelected 
                  ? `2px solid ${colors.text.default}` 
                  : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                padding: 0,
                boxShadow: isSelected 
                  ? `0 0 0 1px ${colors.background.default}, 0 0 0 3px ${colors.text.default}`
                  : 'none',
              }}
              onMouseEnter={(e) => !isSelected && (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => !isSelected && (e.currentTarget.style.transform = 'scale(1)')}
            />
          );
        })}
      </div>
    </div>,
    document.body
  );
};


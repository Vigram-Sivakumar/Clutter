import { ReactNode, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing } from '../../../../../tokens/spacing';
import { radius } from '../../../../../tokens/radius';

interface FloatingContextMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  onRemove?: () => void;
  onCancelScheduledClose: () => void;
  children: ReactNode;
}

export const FloatingContextMenu = ({
  isOpen,
  position,
  onClose,
  onCancelScheduledClose,
  children,
}: FloatingContextMenuProps) => {
  const { colors } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
      ref={menuRef}
      onMouseEnter={onCancelScheduledClose}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        backgroundColor: colors.background.default,
        border: `1px solid ${colors.border.default}`,
        borderRadius: radius['6'],
        boxShadow: `0 4px 16px ${colors.shadow.md}`,
        zIndex: 9999,
        padding: spacing['8'],
        minWidth: '200px',
      }}
    >
      {children}
    </div>,
    document.body
  );
};


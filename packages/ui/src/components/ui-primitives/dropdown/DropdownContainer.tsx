/**
 * DropdownContainer - Shared visual primitive for all dropdown types
 * 
 * Handles:
 * - Consistent styling (colors, padding, shadows, radius)
 * - Portal rendering
 * - Click-outside behavior
 * - Scrollbar styling
 */

import { useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../hooks/useTheme';
import { sizing } from '../../../tokens/sizing';
import { spacing } from '../../../tokens/spacing';

interface DropdownContainerProps {
  isOpen: boolean;
  position: { top?: number; bottom?: number; left: number };
  onClose: () => void;
  children: ReactNode;
  minWidth?: string;
  maxWidth?: string;
  maxHeight?: string;
}

export const DropdownContainer = ({
  isOpen,
  position,
  onClose,
  children,
  minWidth = '220px',
  maxWidth = '220px',
  maxHeight = '300px',
}: DropdownContainerProps) => {
  const { colors } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Block page scrolling when dropdown is open (global behavior for all dropdowns)
  useEffect(() => {
    if (!isOpen) return;

    // Store original overflow value
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Block scrolling and add padding to prevent content shift
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      // Restore original values
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <>
      {/* Custom scrollbar styles */}
      <style>{`
        .dropdown-container {
          scrollbar-width: thin;
          scrollbar-color: ${colors.border.default} transparent;
        }
        .dropdown-container::-webkit-scrollbar {
          width: 6px;
        }
        .dropdown-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .dropdown-container::-webkit-scrollbar-thumb {
          background-color: ${colors.border.default};
          border-radius: 3px;
        }
        .dropdown-container::-webkit-scrollbar-thumb:hover {
          background-color: ${colors.border.focus};
        }
      `}</style>

      <div
        ref={containerRef}
        className="dropdown-container"
        style={{
          position: 'fixed',
          ...(position.top !== undefined ? { top: position.top } : { bottom: position.bottom }),
          left: position.left,
          backgroundColor: colors.background.default,
          border: `1px solid ${colors.border.default}`,
          borderRadius: sizing.radius.lg,
          boxShadow: `0 ${spacing['6']} ${spacing['16']} ${colors.shadow.md}`,
          zIndex: sizing.zIndex.dropdown,
          padding: spacing['4'],
          minWidth,
          maxWidth,
          maxHeight,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollBehavior: 'smooth',
          // Smooth transitions for position and size changes
          transition: position.top !== undefined 
            ? 'top 200ms cubic-bezier(0.4, 0, 0.2, 1), max-height 200ms cubic-bezier(0.4, 0, 0.2, 1)'
            : 'bottom 200ms cubic-bezier(0.4, 0, 0.2, 1), max-height 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: position.top !== undefined ? 'top, max-height' : 'bottom, max-height',
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </div>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};


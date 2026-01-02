import { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../tokens/spacing';

// Menu Item Component - Notion style
interface MenuItemProps {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  danger?: boolean;
  onClick: () => void;
  colors: any;
}

const MenuItem = ({ icon, label, shortcut, danger, onClick, colors }: MenuItemProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing['8'],
        padding: '6px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        backgroundColor: isHovered ? colors.background.tertiary : 'transparent',
        transition: 'background-color 100ms ease',
        userSelect: 'none',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '16px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: danger ? colors.semantic.error : colors.text.secondary,
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <span
        style={{
          flex: 1,
          fontSize: '14px',
          fontWeight: 400,
          color: danger ? colors.semantic.error : colors.text.secondary,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>

      {/* Shortcut (optional) */}
      {shortcut && (
        <span
          style={{
            fontSize: '12px',
            fontWeight: 400,
            color: colors.text.tertiary,
            flexShrink: 0,
          }}
        >
          {shortcut}
        </span>
      )}
    </div>
  );
};

interface ContextMenuProps {
  children: ReactNode;
  items: Array<
    | {
        icon: ReactNode;
        label: string;
        onClick: () => void;
        danger?: boolean;
        shortcut?: string;
      }
    | {
        separator: true;
      }
  >;
  onOpenChange?: (isOpen: boolean) => void;
}

export const ContextMenu = ({ children, items, onOpenChange }: ContextMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { colors } = useTheme();

  // Notify parent when open state changes
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);

  // Smart positioning with collision detection (using portal + fixed positioning)
  useEffect(() => {
    if (isOpen && containerRef.current && menuRef.current) {
      const buttonRect = containerRef.current.getBoundingClientRect();
      const menuWidth = menuRef.current.offsetWidth || 240;
      const menuHeight = menuRef.current.offsetHeight || 200;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8;
      const gap = 2;

      let top: number;
      let left: number;

      // Check vertical overflow
      const spaceBelow = viewportHeight - buttonRect.bottom - gap;
      const spaceAbove = buttonRect.top - gap;
      
      if (spaceBelow >= menuHeight || spaceBelow > spaceAbove) {
        // Position below
        top = buttonRect.bottom + gap;
      } else {
        // Position above
        top = buttonRect.top - menuHeight - gap;
      }

      // Check horizontal overflow (right-aligned by default)
      const wouldOverflowLeft = buttonRect.right - menuWidth < padding;
      const spaceFromLeft = buttonRect.left;
      const spaceFromRight = viewportWidth - buttonRect.right;
      
      if (wouldOverflowLeft && spaceFromLeft > spaceFromRight) {
        // Left-aligned (menu extends to the right of button)
        left = buttonRect.left;
      } else {
        // Right-aligned (menu extends to the left of button's right edge)
        left = buttonRect.right - menuWidth;
      }

      // Ensure menu stays within viewport bounds
      if (left < padding) {
        left = padding;
      }
      if (left + menuWidth > viewportWidth - padding) {
        left = viewportWidth - menuWidth - padding;
      }
      if (top < padding) {
        top = padding;
      }
      if (top + menuHeight > viewportHeight - padding) {
        top = viewportHeight - menuHeight - padding;
      }

      setMenuPosition({ top, left });
    }
  }, [isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't interfere with scrollbars or drag operations
      const target = event.target as HTMLElement;
      
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use 'click' instead of 'mousedown' to allow scrolling to work
      // Delay adding the listener to avoid closing on the same click that opened the menu
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleItemClick = (onClick: () => void) => {
    onClick();
    setIsOpen(false); // Close menu after clicking an item
  };

  const menuContent = isOpen && (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: menuPosition.top,
        left: menuPosition.left,
        backgroundColor: colors.background.default,
        border: `1px solid ${colors.border.default}`,
        borderRadius: '6px',
        boxShadow: `0 4px 16px ${colors.shadow.md}`,
        zIndex: 9999,
        padding: spacing['4'],
        display: 'flex',
        flexDirection: 'column',
        minWidth: '200px',
        maxWidth: '240px',
      }}
    >
          {items.map((item, index) => {
            if ('separator' in item && item.separator) {
              return (
                <div
                  key={index}
                  style={{
                    width: '100%',
                    height: '1px',
                    backgroundColor: colors.border.divider,
                    margin: '4px 0',
                  }}
                />
              );
            }
            if ('icon' in item && 'onClick' in item) {
              return (
                <MenuItem
                  key={index}
                  icon={item.icon}
                  label={item.label}
                  shortcut={item.shortcut}
                  danger={item.danger}
                  onClick={() => handleItemClick(item.onClick)}
                  colors={colors}
                />
              );
            }
            return null;
          })}
    </div>
  );

  return (
    <>
      <div ref={containerRef} style={{ display: 'inline-block' }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          style={{ display: 'inline-block' }}
        >
          {children}
        </div>
      </div>
      {isOpen && typeof document !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
};


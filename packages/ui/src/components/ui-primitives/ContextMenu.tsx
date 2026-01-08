import { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../tokens/spacing';
import { radius } from '../../tokens/radius';

// Menu Item Component - Notion style
interface MenuItemProps {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  danger?: boolean;
  onClick: (_e: React.MouseEvent) => void;
  colors: any;
}

const MenuItem = ({
  icon,
  label,
  shortcut,
  danger,
  onClick,
  colors,
}: MenuItemProps) => {
  const [isHovered, setIsHovered] = useState(false);

  // Softer red for hover (less intense than blood red)
  const dangerHoverBg = '#8B3A3A'; // Deep red-brown, less intense
  const dangerHoverText = '#FFE5E5'; // Light pink text for contrast

  return (
    <div
      onClick={(_e) => {
        _e.stopPropagation();
        onClick(_e);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing['8'],
        padding: '6px 8px',
        borderRadius: radius['3'],
        cursor: 'pointer',
        backgroundColor: isHovered
          ? danger
            ? dangerHoverBg
            : colors.background.tertiary
          : 'transparent',
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
          color: danger
            ? isHovered
              ? dangerHoverText
              : colors.semantic.error
            : colors.text.secondary,
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
          color: danger
            ? isHovered
              ? dangerHoverText
              : colors.semantic.error
            : colors.text.secondary,
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
        onClick: (_e?: React.MouseEvent) => void;
        danger?: boolean;
        shortcut?: string;
      }
    | {
        separator: true;
      }
    | {
        content: ReactNode;
      }
    | {
        buttonGroup: ReactNode[]; // Array of Button components to stack horizontally
      }
  >;
  onOpenChange?: (_isOpen: boolean) => void;
}

export const ContextMenu = ({
  children,
  items,
  onOpenChange,
}: ContextMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { colors } = useTheme();

  // Notify parent when open state changes
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);

  // Disable body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Smart positioning with collision detection (using portal + fixed positioning)
  useEffect(() => {
    if (isOpen && containerRef.current && menuRef.current) {
      const buttonRect = containerRef.current.getBoundingClientRect();
      const menuWidth = menuRef.current.offsetWidth || 240;
      const menuHeight = menuRef.current.offsetHeight || 200;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8;
      const gap = 8;

      let top: number;
      let left: number;

      // Position to the right of the button (horizontally)
      const spaceRight = viewportWidth - buttonRect.right - gap;
      const spaceLeft = buttonRect.left - gap;

      if (spaceRight >= menuWidth) {
        // Position to the right
        left = buttonRect.right + gap;
      } else if (spaceLeft >= menuWidth) {
        // Position to the left if no space on right
        left = buttonRect.left - menuWidth - gap;
      } else {
        // Not enough space on either side, align to right edge of viewport
        left = viewportWidth - menuWidth - padding;
      }

      // Vertically center the menu with the button
      top = buttonRect.top + buttonRect.height / 2 - menuHeight / 2;

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

  const handleItemClick = (
    onClick: (_e?: React.MouseEvent) => void,
    _e: React.MouseEvent
  ) => {
    onClick(_e);
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
        borderRadius: radius['6'],
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
        if ('buttonGroup' in item) {
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing['4'],
                width: '100%',
              }}
            >
              {item.buttonGroup}
            </div>
          );
        }
        if ('content' in item) {
          return <div key={index}>{item.content}</div>;
        }
        if ('icon' in item && 'onClick' in item) {
          return (
            <MenuItem
              key={index}
              icon={item.icon}
              label={item.label}
              shortcut={item.shortcut}
              danger={item.danger}
              onClick={(e) => handleItemClick(item.onClick, e)}
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
            e.stopPropagation(); // Prevent triggering parent item's onClick (e.g., opening folder)
            setIsOpen(!isOpen);
          }}
          style={{ display: 'inline-block' }}
        >
          {children}
        </div>
      </div>
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(menuContent, document.body)}
    </>
  );
};

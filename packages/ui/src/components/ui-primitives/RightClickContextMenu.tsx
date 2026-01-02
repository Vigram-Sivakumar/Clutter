import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { createPortal } from 'react-dom';
import { spacing } from '../../tokens/spacing';
import { sizing } from '../../tokens/sizing';
import { typography } from '../../tokens/typography';

// Menu item types
export type RightClickMenuItem = 
  | {
      icon: ReactNode;
      label: string;
      onClick: () => void;
      danger?: boolean;
      shortcut?: string;
    }
  | {
      separator: true;
    };

// Context state
interface RightClickContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  items: RightClickMenuItem[];
}

interface RightClickContextMenuContextValue {
  showMenu: (x: number, y: number, items: RightClickMenuItem[]) => void;
  hideMenu: () => void;
}

const RightClickContextMenuContext = createContext<RightClickContextMenuContextValue | null>(null);

// Provider component
export const RightClickContextMenuProvider = ({ children }: { children: ReactNode }) => {
  const [menuState, setMenuState] = useState<RightClickContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    items: [],
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const { colors } = useTheme();

  const showMenu = (x: number, y: number, items: RightClickMenuItem[]) => {
    setMenuState({ isOpen: true, position: { x, y }, items });
  };

  const hideMenu = () => {
    setMenuState((prev) => ({ ...prev, isOpen: false }));
  };

  // Handle clicks outside menu
  useEffect(() => {
    if (!menuState.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideMenu();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideMenu();
      }
    };

    // Small delay to prevent immediate close from the right-click event
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuState.isOpen]);

  // Smart positioning to prevent overflow
  useEffect(() => {
    if (!menuState.isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let { x, y } = menuState.position;

    // Adjust horizontal position if overflowing
    if (x + rect.width > viewport.width) {
      x = viewport.width - rect.width - 8;
    }

    // Adjust vertical position if overflowing
    if (y + rect.height > viewport.height) {
      y = viewport.height - rect.height - 8;
    }

    // Ensure minimum padding from edges
    x = Math.max(8, x);
    y = Math.max(8, y);

    if (x !== menuState.position.x || y !== menuState.position.y) {
      setMenuState((prev) => ({
        ...prev,
        position: { x, y },
      }));
    }
  }, [menuState.isOpen, menuState.position]);

  return (
    <RightClickContextMenuContext.Provider value={{ showMenu, hideMenu }}>
      {children}
      
      {/* Global context menu portal */}
      {menuState.isOpen && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menuState.position.y,
            left: menuState.position.x,
            zIndex: 10000,
            minWidth: '200px',
            backgroundColor: colors.background.elevated,
            border: `1px solid ${colors.border.default}`,
            borderRadius: sizing.radius.md,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            padding: `${spacing['4']} 0`,
            fontFamily: typography.fontFamily.sans,
          }}
        >
          {menuState.items.map((item, index) => {
            if ('separator' in item && item.separator) {
              return (
                <div
                  key={`separator-${index}`}
                  style={{
                    height: '1px',
                    backgroundColor: colors.border.divider,
                    margin: `${spacing['4']} 0`,
                  }}
                />
              );
            }

            return (
              <div
                key={index}
                onClick={() => {
                  item.onClick();
                  hideMenu();
                }}
                onMouseDown={(e) => e.preventDefault()} // Prevent menu from closing before click
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing['12'],
                  padding: `${spacing['4']} ${spacing['12']}`,
                  fontSize: '14px',
                  color: item.danger ? colors.accent.red.text : colors.text.secondary,
                  cursor: 'pointer',
                  transition: 'background-color 100ms ease',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.background.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing['6'] }}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '16px' }}>
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: colors.text.tertiary,
                    }}
                  >
                    {item.shortcut}
                  </span>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </RightClickContextMenuContext.Provider>
  );
};

// Hook to use the context menu
export const useRightClickMenu = () => {
  const context = useContext(RightClickContextMenuContext);
  if (!context) {
    throw new Error('useRightClickMenu must be used within RightClickContextMenuProvider');
  }
  return context;
};

// Helper function to create right-click handler
export const createRightClickHandler = (
  showMenu: (x: number, y: number, items: RightClickMenuItem[]) => void,
  items: RightClickMenuItem[]
) => {
  return (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default browser context menu
    e.stopPropagation(); // Prevent event bubbling
    showMenu(e.clientX, e.clientY, items);
  };
};


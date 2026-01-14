/**
 * Menu Context - Global menu state manager
 *
 * Phase 3 - Step 3D: Scroll lock for editor menus
 *
 * Purpose:
 * - Track if any editor menu is open (slash, block, inline, etc.)
 * - Lock scroll on .scroll-wrapper when menu is open
 * - Restore scroll when all menus close
 *
 * Architecture:
 * - Single source of truth for "menu open" state
 * - Prevents scroll fights between multiple menus
 * - Automatic cleanup on unmount
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';

type MenuContextValue = {
  isAnyMenuOpen: boolean;
  registerMenuOpen: () => void;
  registerMenuClosed: () => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

/**
 * Provider for menu state
 * Should wrap AppLayout or higher
 */
export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [openMenuCount, setOpenMenuCount] = useState(0);

  const registerMenuOpen = useCallback(() => {
    setOpenMenuCount((prev) => prev + 1);
  }, []);

  const registerMenuClosed = useCallback(() => {
    setOpenMenuCount((prev) => Math.max(0, prev - 1));
  }, []);

  const isAnyMenuOpen = openMenuCount > 0;

  // 🔒 SCROLL LOCK: Disable scroll on .scroll-wrapper when any menu is open
  useEffect(() => {
    const scrollWrapper = document.querySelector(
      '.scroll-wrapper'
    ) as HTMLElement;
    if (!scrollWrapper) return;

    if (isAnyMenuOpen) {
      // Lock scroll
      scrollWrapper.style.overflow = 'hidden';
    } else {
      // Restore scroll
      scrollWrapper.style.overflow = 'auto';
    }

    return () => {
      // Cleanup: Always restore scroll on unmount
      scrollWrapper.style.overflow = 'auto';
    };
  }, [isAnyMenuOpen]);

  return (
    <MenuContext.Provider
      value={{
        isAnyMenuOpen,
        registerMenuOpen,
        registerMenuClosed,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

/**
 * Hook to access menu context
 * Throws if used outside MenuProvider
 */
export function useMenuContext() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenuContext must be used within MenuProvider');
  }
  return context;
}

/**
 * Hook to register menu open/closed state
 * Call registerMenuOpen() when menu opens
 * Call registerMenuClosed() when menu closes
 *
 * Or use the convenience hook below for automatic management
 */
export function useMenuState(isOpen: boolean) {
  const { registerMenuOpen, registerMenuClosed } = useMenuContext();

  useEffect(() => {
    if (isOpen) {
      registerMenuOpen();
      return () => {
        registerMenuClosed();
      };
    }
  }, [isOpen, registerMenuOpen, registerMenuClosed]);
}

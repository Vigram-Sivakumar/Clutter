import { useState, useCallback, useEffect } from 'react';

interface UseSidebarResizeOptions {
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  isCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

interface UseSidebarResizeReturn {
  sidebarWidth: number;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Hook for managing sidebar resize functionality
 * Handles mouse drag events to resize the sidebar within min/max constraints
 * Also manages document.body cursor/userSelect styles during resize
 */
export const useSidebarResize = ({
  minWidth,
  maxWidth,
  defaultWidth,
  isCollapsed = false,
  onToggleSidebar,
}: UseSidebarResizeOptions): UseSidebarResizeReturn => {
  const [sidebarWidth, setSidebarWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    // If sidebar is collapsed, expand it when starting to drag
    if (isCollapsed && onToggleSidebar) {
      onToggleSidebar();
    }
  }, [isCollapsed, onToggleSidebar]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  }, [isResizing, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    // Immediately clear styles (don't wait for useEffect)
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Ensure userSelect is cleared on mount (in case it was left set)
  useEffect(() => {
    document.body.style.userSelect = '';
  }, []);

  // Handle resize state changes
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Global mouseup listener as backup (handles mouseup outside window)
  useEffect(() => {
    const globalMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    
    window.addEventListener('mouseup', globalMouseUp);
    return () => window.removeEventListener('mouseup', globalMouseUp);
  }, [isResizing]);

  return {
    sidebarWidth,
    isResizing,
    handleMouseDown,
  };
};


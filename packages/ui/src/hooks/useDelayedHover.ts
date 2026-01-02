/**
 * useDelayedHover - Unified hook for delayed hover interactions
 * 
 * Manages delayed open/close logic for hover-triggered UI elements
 * (like floating menus, tooltips, dropdowns).
 * 
 * Features:
 * - Configurable open/close delays
 * - Conditional close prevention (e.g., don't close while editing)
 * - Automatic cleanup of timeouts
 * - Simple API: { isOpen, scheduleOpen, scheduleClose, cancelScheduled, forceClose }
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseDelayedHoverOptions {
  /** Delay in ms before opening (default: 200) */
  openDelay?: number;
  
  /** Delay in ms before closing (default: 150) */
  closeDelay?: number;
  
  /** Function that returns true if close should be prevented (e.g., during editing) */
  preventCloseWhen?: () => boolean;
  
  /** Callback when state changes */
  onChange?: (isOpen: boolean) => void;
}

export function useDelayedHover({
  openDelay = 200,
  closeDelay = 150,
  preventCloseWhen = () => false,
  onChange,
}: UseDelayedHoverOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any pending timeout
  const cancelScheduled = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Schedule opening after delay
  const scheduleOpen = useCallback(() => {
    cancelScheduled();
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
      onChange?.(true);
    }, openDelay);
  }, [openDelay, cancelScheduled, onChange]);

  // Schedule closing after delay (unless prevented)
  const scheduleClose = useCallback(() => {
    if (preventCloseWhen()) {
      return; // Don't close if prevented
    }
    
    cancelScheduled();
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      onChange?.(false);
    }, closeDelay);
  }, [closeDelay, preventCloseWhen, cancelScheduled, onChange]);

  // Force immediate close (bypasses preventCloseWhen)
  const forceClose = useCallback(() => {
    cancelScheduled();
    setIsOpen(false);
    onChange?.(false);
  }, [cancelScheduled, onChange]);

  // Force immediate open
  const forceOpen = useCallback(() => {
    cancelScheduled();
    setIsOpen(true);
    onChange?.(true);
  }, [cancelScheduled, onChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isOpen,
    scheduleOpen,
    scheduleClose,
    cancelScheduled,
    forceClose,
    forceOpen,
  };
}


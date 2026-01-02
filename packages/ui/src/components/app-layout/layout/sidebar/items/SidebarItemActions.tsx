import { ReactNode, memo } from 'react';
import { useTheme } from '../../../../../hooks/useTheme';
import { ChevronDown } from '../../../../../icons';
import { TertiaryButton } from '../../../../ui-buttons';
import { sidebarStyles } from '../config/sidebarConfig';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { animations } from '../../../../../tokens/animations';

/**
 * SidebarItemActions
 * Handles action buttons, badge, and toggle chevron
 * 
 * Responsibilities:
 * - Render quick add button (+ icon)
 * - Render context menu (⋮ icon)
 * - Render badge/count
 * - Render toggle chevron (for headers)
 * - Handle action visibility (CSS-driven hover)
 * 
 * NOT responsible for:
 * - Action onClick logic (passed through as ReactNode)
 * - Determining which actions to show (passed through props)
 */

interface SidebarItemActionsProps {
  // Actions (pre-built ReactNode from parent)
  actions?: ReactNode[];
  
  // Badge
  badge?: string;
  
  // Toggle (for headers only)
  variant: 'note' | 'folder' | 'tag' | 'header';
  showToggle?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  
  // State
  hasOpenContextMenu?: boolean;
  isEditing?: boolean;
  isDropTarget?: boolean;
  
  // Context for determining which actions to show
  hasQuickAdd?: boolean; // Whether this item should show + button
}

export const SidebarItemActions = memo(({
  actions,
  badge,
  variant,
  showToggle = false,
  isOpen = false,
  onToggle,
  hasOpenContextMenu = false,
  isEditing = false,
  isDropTarget = false,
  hasQuickAdd = false,
}: SidebarItemActionsProps) => {
  const { colors } = useTheme();
  
  // Render quick add button (+ icon) - first action
  const renderQuickAdd = () => {
    if (!hasQuickAdd || !actions || actions.length === 0) return null;
    
    // Keep visible when context menu is open
    const shouldShowForContextMenu = hasOpenContextMenu && !isEditing;
    
    return (
      <div 
        className="sidebar-item__quick-add"
        style={{
          display: 'flex',
          alignItems: 'center',
          opacity: shouldShowForContextMenu ? 1 : 0,
          pointerEvents: shouldShowForContextMenu ? 'auto' : 'none',
          width: shouldShowForContextMenu ? 'auto' : '0px',
          overflow: 'hidden',
          transition: `${animations.transition.opacity}, width 150ms cubic-bezier(0.2, 0, 0, 1)`,
        }}
      >
        {actions[0]}
      </div>
    );
  };
  
  // Render context menu (⋮ icon) - second action (or first if no quick add)
  const renderContextMenu = () => {
    if (!actions || actions.length === 0) return null;
    
    // For items with + icon, the context menu is the second action
    // For items without + icon (notes/tags), it's the first action
    const contextMenuAction = hasQuickAdd 
      ? (actions.length > 1 ? actions[1] : null)
      : actions[0];
    
    if (!contextMenuAction) return null;
    
    // Keep visible when context menu is open
    const shouldShowForContextMenu = hasOpenContextMenu && !isEditing;
    
    return (
      <div
        className="sidebar-item__context-menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          opacity: shouldShowForContextMenu ? 1 : 0,
          pointerEvents: shouldShowForContextMenu ? 'auto' : 'none',
          width: shouldShowForContextMenu ? 'auto' : '0px',
          overflow: 'hidden',
          transition: `${animations.transition.opacity}, width 150ms cubic-bezier(0.2, 0, 0, 1)`,
        }}
      >
        {contextMenuAction}
      </div>
    );
  };
  
  // Render badge/count
  const renderBadge = () => {
    // Badge is always rendered but hidden on hover via CSS (when actions exist)
    // Tags show count
    // Folders/headers show nested count
    
    if (!badge) return null;
    
    // For headers with toggle, badge swaps with chevron (handled in renderToggle)
    if (variant === 'header' && showToggle) {
      return null;
    }
    
    // For folders/notes/tags, badge shows normally
    return (
      <div
        style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '20px',
        minWidth: '20px',
        fontSize: sidebarLayout.badgeFontSize,
        color: colors.text.tertiary,
        pointerEvents: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        } as any}
      >
        {badge}
      </div>
    );
  };
  
  // Render toggle button (for headers only - chevron on right)
  // Badge and chevron swap in the same 20px container
  const renderToggle = () => {
    if (!showToggle || variant !== 'header' || !onToggle) return null;
    
    return (
      <div
        style={{
          position: 'relative',
          width: '20px',
          height: '20px',
          flexShrink: 0,
        }}
      >
        {/* Badge - always rendered, CSS controls visibility (hidden on hover unless isDropTarget) */}
        {badge && (
          <div
            className={sidebarStyles.classes.badge}
            style={{
              position: 'absolute',
              inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: sidebarLayout.badgeFontSize,
            color: colors.text.tertiary,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            opacity: isDropTarget ? 1 : undefined, // Keep visible when drop target
            transition: animations.transition.opacity,
          } as any}
        >
          {badge}
        </div>
        )}
        
        {/* Chevron - clickable to toggle expand/collapse */}
        <div
          className={sidebarStyles.classes.chevronRight}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
          justifyContent: 'center',
          opacity: isDropTarget ? 0 : 0, // Hidden by default, CSS shows on hover
          transition: animations.transition.opacity,
          pointerEvents: isDropTarget ? 'none' : 'auto',
          }}
        >
          <TertiaryButton
            icon={
              <ChevronDown
                size={16}
                style={{
                  transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                  transition: animations.transition.transform,
                }}
              />
            }
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            size="xs"
          />
        </div>
      </div>
    );
  };
  
  return (
    <>
      {renderQuickAdd()}
      {renderBadge()}
      {renderContextMenu()}
      {renderToggle()}
    </>
  );
});

SidebarItemActions.displayName = 'SidebarItemActions';


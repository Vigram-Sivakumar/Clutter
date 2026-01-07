import { ReactNode, memo } from 'react';
import { useTheme } from '../../../../../hooks/useTheme';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { sidebarStyles } from '../config/sidebarConfig';
import { DropIndicator } from '../internal/DropIndicator';

/**
 * SidebarItemLayout
 * Pure layout container for sidebar items
 * 
 * Responsibilities:
 * - Container layout and spacing
 * - Background colors (selected, hover, drop target)
 * - Indentation based on level
 * - Drag & drop visual feedback
 * - Reorder drop indicators
 * 
 * NOT responsible for:
 * - Business logic
 * - Icon/emoji selection
 * - Action visibility rules
 * - Event handlers (passed through)
 */

interface SidebarItemLayoutProps {
  // Slots for content
  left?: ReactNode;      // Icon/emoji or chevron
  center: ReactNode;     // Label or tag pill
  right?: ReactNode;     // Actions, badge, toggle
  
  // Layout
  variant: 'note' | 'folder' | 'tag' | 'header';
  level?: number;        // Nesting level (0 = root)
  
  // Visual state
  isSelected?: boolean;
  hasOpenContextMenu?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  isHeaderDragOver?: boolean; // For header auto-expand visual feedback
  isOpen?: boolean;          // For folders/headers - whether expanded
  
  // Drag & drop
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  
  // Reorder indicators
  reorderable?: boolean;
  dropPosition?: 'before' | 'after' | null;
  
  // Click handler
  onClick?: (e?: React.MouseEvent) => void;
  
  // Ref for measuring
  itemRef?: React.RefObject<HTMLDivElement>;
}

export const SidebarItemLayout = memo(({
  left,
  center,
  right,
  variant,
  level = 0,
  isSelected = false,
  hasOpenContextMenu = false,
  isDragging = false,
  isDropTarget = false,
  isHeaderDragOver = false,
  isOpen = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onMouseUp,
  reorderable = false,
  dropPosition = null,
  onClick,
  itemRef,
}: SidebarItemLayoutProps) => {
  const { colors } = useTheme();
  
  // Calculate indentation
  const maxIndent = 3; // sidebarLayout.maxVisualIndent
  const paddingLeft = variant === 'tag' || variant === 'header' 
    ? 0 
    : Math.min(level, maxIndent) * parseInt(sidebarLayout.indentPerLevel);
  
  // CSS Variables for theming
  const cssVars = {
    '--sidebar-hover-bg': colors.background.hover,
    '--sidebar-selected-bg': colors.background.tertiary,
  } as React.CSSProperties;
  
  return (
    <div
      style={{
        width: '100%',
        paddingLeft: `${paddingLeft}px`,
        position: 'relative',
        overflow: 'visible',
        boxSizing: 'border-box',
      }}
    >
      {/* Drop indicators for reordering */}
      {reorderable && (
        <>
          <DropIndicator position="before" visible={dropPosition === 'before'} level={level} />
          <DropIndicator position="after" visible={dropPosition === 'after'} level={level} />
        </>
      )}
      
      <div
        ref={itemRef}
        className={sidebarStyles.classes.item}
        data-selected={isSelected || hasOpenContextMenu}
        data-drop-target={isDropTarget}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onMouseUp={onMouseUp}
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          height: sidebarLayout.itemHeight,
          paddingLeft: sidebarLayout.itemPaddingX,
          paddingRight: sidebarLayout.itemPaddingX,
          boxSizing: 'border-box',
          cursor: isDragging ? 'grabbing' : 'pointer',
          backgroundColor: isSelected || hasOpenContextMenu
            ? colors.background.tertiary
            : (variant === 'header' && isHeaderDragOver && !isOpen)
              ? colors.background.tertiary
              : isDropTarget 
                ? colors.background.hover 
                : 'transparent',
          borderRadius: sidebarLayout.itemBorderRadius,
          gap: sidebarLayout.itemContentGap,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          transition: sidebarStyles.transitions.hover,
          opacity: isDragging ? 0.5 : 1,
          border: variant === 'folder' && isDropTarget 
            ? `1px solid ${colors.semantic.info}` 
            : '0.5px solid transparent',
          ...cssVars,
        } as any}
      >
        {/* Left slot - Icon/emoji or chevron */}
        {left}
        
        {/* Center slot - Label or tag pill */}
        {center}
        
        {/* Right slot - Actions, badge, toggle */}
        {right && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: sidebarLayout.itemRightSideGap,
            }}
          >
            {right}
          </div>
        )}
      </div>
    </div>
  );
});

SidebarItemLayout.displayName = 'SidebarItemLayout';


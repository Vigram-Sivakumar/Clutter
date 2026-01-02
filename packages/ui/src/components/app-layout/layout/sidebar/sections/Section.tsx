import { ReactNode, useState } from 'react';
import { useTheme } from '../../../../../hooks/useTheme';
import { transitions } from '../../../../../tokens/transitions';
import { SidebarItem } from '../items/SidebarItem';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { spacing } from '../../../../../tokens/spacing';

interface SidebarSectionProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onHeaderClick?: () => void; // Click on title text (optional)
  badge?: string;
  actions?: ReactNode[];
  
  // Drop target props (for section body)
  isDropTarget?: boolean;
  onDragOver?: () => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
  
  // Reorder state management
  onClearAllReorderIndicators?: () => void; // Clear all reorder indicators when entering section drop zone
  
  // Auto-expand section header on drag
  enableAutoExpandHeader?: boolean;
  
  // Data-driven rendering (NEW)
  items?: any[];
  renderItem?: (item: any, index: number) => ReactNode;
  
  // OR manual children (backwards compatible)
  children?: ReactNode;
}

export const SidebarSection = ({
  title,
  isCollapsed,
  onToggle,
  onHeaderClick,
  badge,
  actions,
  isDropTarget = false,
  onDragOver,
  onDragLeave,
  onDrop,
  onClearAllReorderIndicators,
  enableAutoExpandHeader = false,
  items,
  renderItem,
  children,
}: SidebarSectionProps) => {
  const { colors } = useTheme();
  const [isHoveredDrop, setIsHoveredDrop] = useState(false);
  
  // Auto-render items if provided, otherwise use children
  const content = items && renderItem ? (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: sidebarLayout.itemGap,
        width: '100%',
        paddingTop: '2px',
        paddingBottom: '2px',
      }}
    >
      {items.map((item, index) => renderItem(item, index))}
    </div>
  ) : children;

  const handleDragEnter = (e: React.DragEvent) => {
    if (!onDragOver) return;
    e.preventDefault();
    e.stopPropagation();
    setIsHoveredDrop(true);
    
    // Clear all reorder indicators when entering section drop zone
    if (onClearAllReorderIndicators) {
      onClearAllReorderIndicators();
    }
    
    onDragOver();
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!onDragOver) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    // Call onDragOver continuously to keep the highlight active
    if (!isHoveredDrop) {
      setIsHoveredDrop(true);
    }
    
    // Clear all reorder indicators when hovering over section drop zone
    if (onClearAllReorderIndicators) {
      onClearAllReorderIndicators();
    }
    
    onDragOver();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!onDragLeave) return;
    // Only trigger if we're actually leaving the container, not just moving to a child
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return; // Still inside the container
    }
    setIsHoveredDrop(false);
    onDragLeave();
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!onDrop) return;
    e.preventDefault();
    e.stopPropagation();
    setIsHoveredDrop(false);
    
    // Clear all reorder indicators after section drop
    if (onClearAllReorderIndicators) {
      onClearAllReorderIndicators();
    }
    
    onDrop();
  };

  const dragHandlers = onDragOver ? {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  } : {};

  return (
    <div
      {...dragHandlers}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: sidebarLayout.headerToItemsGap,
        backgroundColor: isDropTarget && isHoveredDrop ? colors.background.hover : 'transparent',
        border: `1px solid ${isDropTarget && isHoveredDrop ? colors.semantic.info : 'transparent'}`,
        borderRadius: '6px',
        transition: 'background-color 150ms ease, border-color 150ms ease',
      }}
    >
      {/* Section Header - using SidebarItem with variant='header' */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <SidebarItem
          variant="header"
          id={title}
          label={title}
          badge={badge}
          isOpen={!isCollapsed}
          onClick={onHeaderClick || (() => {})}
          onToggle={onToggle}
          actions={actions}
          enableAutoExpandHeader={enableAutoExpandHeader}
        />
      </div>

      {/* Section Content - collapsible with slide + fade */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isCollapsed ? '0fr' : '1fr',
          transition: transitions.collapse.height,
          overflow: 'visible',
        }}
      >
        <div
          style={{
            minHeight: 0,
            overflow: 'hidden',
            opacity: isCollapsed ? 0 : 1,
            transition: transitions.collapse.content,
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
};


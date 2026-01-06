import { ReactNode } from 'react';
import { useTheme } from '../../../../../hooks/useTheme';
import { transitions } from '../../../../../tokens/transitions';
import { radius } from '../../../../../tokens/radius';
import { SidebarItem } from '../items/SidebarItem';
import { sidebarLayout } from '../../../../../tokens/sidebar';

interface SidebarSectionProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onHeaderClick?: () => void; // Click on title text (optional)
  badge?: string;
  icon?: ReactNode; // Optional icon for the section header
  actions?: ReactNode[];
  sticky?: boolean; // Whether the section header should be sticky

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
  renderItem?: (_item: any, _index: number) => ReactNode;

  // OR manual children (backwards compatible)
  children?: ReactNode;
}

export const SidebarSection = ({
  title,
  isCollapsed,
  onToggle,
  onHeaderClick,
  badge,
  icon,
  actions,
  sticky = false,
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
  // Note: isDropTarget prop already controls visual feedback
  // No need for internal hover state - drag events are sufficient

  // Auto-render items if provided, otherwise use children
  const content =
    items && renderItem ? (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: sidebarLayout.itemGap,
          width: '100%',
          minWidth: 0, // Allow shrinking below content size
          paddingTop: '2px',
          paddingBottom: '24px',
        }}
      >
        {items.map((item, index) => renderItem(item, index))}
      </div>
    ) : (
      children
    );

  const handleDragEnter = (e: React.DragEvent) => {
    if (!onDragOver) return;
    e.preventDefault();
    e.stopPropagation();

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
    onDragLeave();
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!onDrop) return;
    e.preventDefault();
    e.stopPropagation();

    // Clear all reorder indicators after section drop
    if (onClearAllReorderIndicators) {
      onClearAllReorderIndicators();
    }

    onDrop();
  };

  const dragHandlers = onDragOver
    ? {
        onDragEnter: handleDragEnter,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
      }
    : {};

  return (
    <div
      {...dragHandlers}
      style={{
        width: '100%',
        minWidth: 0, // Allow shrinking below content size
        display: 'flex',
        flexDirection: 'column',
        gap: sidebarLayout.headerToItemsGap,
        backgroundColor: isDropTarget ? colors.background.hover : 'transparent',
        border: `1px solid ${isDropTarget ? colors.semantic.info : 'transparent'}`,
        borderRadius: radius['6'],
        transition: 'background-color 150ms ease, border-color 150ms ease',
      }}
    >
      {/* Section Header - using SidebarItem with variant='header' */}
      <SidebarItem
        variant="header"
        id={title}
        label={title}
        badge={badge}
        icon={icon}
        isOpen={!isCollapsed}
        onClick={onHeaderClick || (() => {})}
        onToggle={onToggle}
        actions={actions}
        enableAutoExpandHeader={enableAutoExpandHeader}
        sticky={sticky}
      />

      {/* Section Content - collapsible with slide + fade */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isCollapsed ? '0fr' : '1fr',
          transition: transitions.collapse.height,
          overflow: 'visible', // Allow sticky children to work
          width: '100%',
          minWidth: 0, // Allow shrinking below content size
        }}
      >
        <div
          style={{
            minHeight: 0,
            minWidth: 0, // Allow shrinking below content size
            overflow: 'visible', // Changed to visible - ListGroup handles item overflow
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

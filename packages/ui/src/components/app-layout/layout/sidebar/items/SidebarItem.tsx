import { useState, useEffect, useRef, ReactNode } from 'react';
import { useTheme } from '../../../../../hooks/useTheme';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Note, NoteBlank } from '../../../../../icons';
import { TertiaryButton } from '../../../../ui-buttons';
import { DropIndicator } from '../internal/DropIndicator';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { Tag } from '../../../shared/content-header/tags/Tag';

/**
 * SidebarItem Design Specification
 * Single source of truth for all design tokens used in this component
 */
const DESIGN = {
  spacing: {
    contentGap: sidebarLayout.itemContentGap,      // Gap between icon and label text
    actionsGap: sidebarLayout.itemActionsGap,      // Gap between action buttons in the actions group
    rightSideGap: sidebarLayout.itemRightSideGap,  // Gap between label, actions, badge, and chevron
    paddingX: sidebarLayout.itemPaddingX,          // Horizontal padding inside the item
    headerPaddingX: sidebarLayout.headerPaddingX,  // Horizontal padding for header variant
    indentPerLevel: sidebarLayout.indentPerLevel,  // Left indent added per nesting level
  },
  sizing: {
    height: sidebarLayout.itemHeight,              // Height of the entire item container
    iconButtonSize: sidebarLayout.iconButtonSize,  // Size of icon/emoji button containers
    iconSize: sidebarLayout.iconSize,              // Size of icons inside buttons
    badgeMinSize: sidebarLayout.badgeMinSize,      // Minimum size of badge/count container
    borderRadius: sidebarLayout.itemBorderRadius,  // Corner radius of the item
  },
  typography: {
    fontSize: sidebarLayout.itemFontSize,          // Font size for item label
    fontWeight: sidebarLayout.itemFontWeight,      // Font weight for item label
    badgeFontSize: sidebarLayout.badgeFontSize,    // Font size for badge/count text
  },
  limits: {
    maxVisualIndent: sidebarLayout.maxVisualIndent, // Maximum visual indentation levels
  },
} as const;

type SidebarItemVariant = 'note' | 'folder' | 'tag' | 'header';

interface SidebarItemProps {
  // Core
  id: string;
  label: string;
  variant: SidebarItemVariant;
  level?: number; // Default: 0
  
  // Visual
  icon?: string | ReactNode; // emoji string or React icon component
  badge?: string;
  isOpen?: boolean; // For folders - whether children are expanded
  isSelected?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  hasContent?: boolean; // For notes - whether note has editor content (switches between Note/NoteBlank)
  
  // Interactions
  onClick: (event?: React.MouseEvent) => void;
  onToggle?: () => void; // For folders - click chevron to expand/collapse
  actions?: ReactNode[];
  
  // Drag & Drop (optional)
  draggable?: boolean;
  context?: string; // Context for ordering
  onDragStart?: (id: string, context: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (id: string) => void;
  onDragLeave?: () => void;
  onDrop?: (id: string) => void;
  
  // Reorder (optional)
  reorderable?: boolean;
  onDragOverForReorder?: (id: string, position: 'before' | 'after') => void;
  onDragLeaveForReorder?: () => void;
  onDropForReorder?: (id: string, position: 'before' | 'after') => void;
  dropPosition?: 'before' | 'after' | null;
  onClearAllReorderIndicators?: () => void; // Clear all reorder indicators when becoming a drop target
  
  // Rename (optional)
  isEditing?: boolean;
  onRenameComplete?: (id: string, newValue: string) => void;
  onRenameCancel?: () => void;
  
  // Special props for specific variants
  onEmojiClick?: (id: string, buttonElement: HTMLButtonElement) => void; // For notes/folders
  tagCount?: number; // For tags - total usage count (notes + folders)
  enableAutoExpandHeader?: boolean; // For headers - auto-expand on drag
}

export const SidebarItem = ({
  id,
  label,
  variant,
  level = 0,
  icon,
  badge,
  isOpen = false,
  isSelected = false,
  isDragging = false,
  isDropTarget = false,
  hasContent = true,
  onClick,
  onToggle,
  actions,
  draggable = false,
  context = '',
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  reorderable = false,
  onDragOverForReorder,
  onDragLeaveForReorder,
  onDropForReorder,
  dropPosition = null,
  onClearAllReorderIndicators,
  isEditing = false,
  onRenameComplete,
  onRenameCancel,
  onEmojiClick,
  tagCount,
  enableAutoExpandHeader = false,
}: SidebarItemProps) => {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  
  // For header auto-expand on drag
  const [isHeaderDragOver, setIsHeaderDragOver] = useState(false);
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const paddingLeft = variant === 'tag' || variant === 'header' 
    ? 0 
    : Math.min(level, DESIGN.limits.maxVisualIndent) * parseInt(DESIGN.spacing.indentPerLevel);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      if (inputRef.current) {
        inputRef.current.focus();
        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }
  }, [isEditing]);

  // Reset edit value when label changes
  useEffect(() => {
    setEditValue(label);
  }, [label]);

  // Cleanup expand timeout on unmount (for headers)
  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
      setIsHeaderDragOver(false);
    };
  }, []);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable || !onDragStart || isEditing) return;
    e.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag preview with more opacity
    if (itemRef.current) {
      const original = itemRef.current;
      const rect = original.getBoundingClientRect();
      
      // Create a wrapper container for opacity control
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.top = '-9999px';
      wrapper.style.left = '-9999px';
      wrapper.style.width = `${rect.width}px`;
      wrapper.style.height = `${rect.height}px`;
      wrapper.style.opacity = '0.5'; // Adjust this value (0.0 to 1.0) for more/less transparency
      wrapper.style.pointerEvents = 'none';
      
      // Clone and add to wrapper
      const dragPreview = original.cloneNode(true) as HTMLElement;
      dragPreview.style.width = '100%';
      dragPreview.style.height = '100%';
      dragPreview.style.boxSizing = 'border-box';
      wrapper.appendChild(dragPreview);
      
      document.body.appendChild(wrapper);
      
      // Set the wrapper as the drag image
      e.dataTransfer.setDragImage(wrapper, 0, 0);
      
      // Clean up the wrapper after a short delay
      setTimeout(() => {
        document.body.removeChild(wrapper);
      }, 0);
    }
    
    onDragStart(id, context);
  };

  const handleDragEnd = () => {
    // Clear all reorder indicators when drag ends
    if (onClearAllReorderIndicators) {
      onClearAllReorderIndicators();
    }
    
    if (onDragEnd) onDragEnd();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    // Header-specific: Auto-expand on drag
    if (variant === 'header' && enableAutoExpandHeader) {
      e.preventDefault();
      
      // Only highlight if collapsed (isOpen=false means collapsed for headers)
      if (!isOpen) {
        setIsHeaderDragOver(true);
        
        // Auto-expand collapsed section after hovering for 800ms
        if (onToggle) {
          expandTimeoutRef.current = setTimeout(() => {
            onToggle();
          }, 800);
        }
      }
    }
    
    // Regular drag enter for items (folders)
    if (onDragOver) {
      e.preventDefault();
      e.stopPropagation();
      
      // Clear all reorder indicators when entering a drop zone
      if (onClearAllReorderIndicators) {
        onClearAllReorderIndicators();
      }
      
      onDragOver(id);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Header-specific: Auto-expand on drag
    if (variant === 'header' && enableAutoExpandHeader) {
      e.preventDefault();
      
      // Only highlight if collapsed
      if (!isOpen) {
        setIsHeaderDragOver(true);
      }
    }
    
    // Handle drag over with zone-based logic
    if (itemRef.current && (reorderable || onDragOver)) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      
      const rect = itemRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const height = rect.height;
      const relativePos = relativeY / height; // 0.0 to 1.0
      
      // Define zones
      const isTopEdge = relativePos < 0.2; // Top 20%
      const isBottomEdge = relativePos > 0.8; // Bottom 20%
      // Center zone (middle 60%) is implicit: !isTopEdge && !isBottomEdge
      
      // ZONE-BASED LOGIC (folders only - they can be drop targets AND reorderable)
      // Notes are only reorderable, so they always show reorder indicator
      
      if (variant === 'folder' && onDragOver && onDragOverForReorder && reorderable) {
        // FOLDER: Zone-based mutually exclusive indicators
        if (isTopEdge || isBottomEdge) {
          // Edge zones: Show reorder line only
          const position: 'before' | 'after' = isTopEdge ? 'before' : 'after';
          onDragOverForReorder(id, position);
        } else {
          // Center zone: Show folder drop highlight only
          onDragOver(id);
        }
      } else if (reorderable && onDragOverForReorder) {
        // NOTE or other reorderable item: Always show reorder indicator
        const position: 'before' | 'after' = relativePos < 0.5 ? 'before' : 'after';
        onDragOverForReorder(id, position);
      } else if (onDragOver) {
        // Non-reorderable drop target: Always show drop highlight
        onDragOver(id);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Header-specific: Clear drag state and timeout
    if (variant === 'header' && enableAutoExpandHeader) {
      setIsHeaderDragOver(false);
      
      // Clear the expand timeout when leaving
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
        expandTimeoutRef.current = null;
      }
    }
    
    if (onDragLeave) {
      e.preventDefault();
      e.stopPropagation();
      onDragLeave();
    }
    
    if (reorderable && onDragLeaveForReorder) {
      e.preventDefault();
      e.stopPropagation();
      onDragLeaveForReorder();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    // Header-specific: Clear drag state
    if (variant === 'header' && enableAutoExpandHeader) {
      e.preventDefault();
      setIsHeaderDragOver(false);
      
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
        expandTimeoutRef.current = null;
      }
    }
    
    // Handle drop with zone-based logic (matching dragOver)
    if (itemRef.current && (reorderable || onDrop)) {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = itemRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const height = rect.height;
      const relativePos = relativeY / height; // 0.0 to 1.0
      
      // Define zones
      const isTopEdge = relativePos < 0.2; // Top 20%
      const isBottomEdge = relativePos > 0.8; // Bottom 20%
      
      // ZONE-BASED DROP (matching dragOver logic)
      if (variant === 'folder' && onDrop && onDropForReorder && reorderable) {
        // FOLDER: Zone-based mutually exclusive drop
        if (isTopEdge || isBottomEdge) {
          // Edge zones: Reorder drop
          const position: 'before' | 'after' = isTopEdge ? 'before' : 'after';
          onDropForReorder(id, position);
        } else {
          // Center zone: Folder drop
          onDrop(id);
        }
        
        if (onClearAllReorderIndicators) {
          onClearAllReorderIndicators();
        }
      } else if (reorderable && onDropForReorder) {
        // NOTE or other reorderable item: Always reorder drop
        const position: 'before' | 'after' = relativePos < 0.5 ? 'before' : 'after';
        onDropForReorder(id, position);
        
        if (onClearAllReorderIndicators) {
          onClearAllReorderIndicators();
        }
      } else if (onDrop) {
        // Non-reorderable drop target: Always folder drop
        onDrop(id);
        
        if (onClearAllReorderIndicators) {
          onClearAllReorderIndicators();
        }
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Workaround: If we're a drop target and mouse is released, trigger drop
    if (isDropTarget && onDrop) {
      e.preventDefault();
      e.stopPropagation();
      onDrop(id);
    }
  };

  // Rename handlers
  const handleRenameComplete = () => {
    if (editValue.trim() !== '' && onRenameComplete) {
      onRenameComplete(id, editValue.trim());
    } else if (onRenameCancel) {
      onRenameCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameComplete();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (onRenameCancel) {
        onRenameCancel();
      }
    }
  };

  // Render icon based on variant
  const renderIcon = () => {
    // Headers don't have icons
    if (variant === 'header') {
      return null;
    }
    
    if (variant === 'note') {
      // Use TertiaryButton for notes (clickable to change emoji)
      const noteIcon = (icon && typeof icon === 'string') ? (
        <span style={{ fontSize: '16px', lineHeight: 1 }}>{icon}</span>
      ) : hasContent ? (
        <Note size={16} style={{ color: isSelected ? colors.text.default : colors.text.secondary }} />
      ) : (
        <NoteBlank size={16} style={{ color: isSelected ? colors.text.default : colors.text.secondary }} />
      );
      
      return (
        <TertiaryButton
          icon={noteIcon}
          onClick={(e) => {
            e.stopPropagation();
            if (onEmojiClick) {
              onEmojiClick(id, e.currentTarget as HTMLButtonElement);
            }
          }}
          size="xs"
        />
      );
    }
    
    if (variant === 'folder') {
      const hasEmoji = icon && typeof icon === 'string';
      
      // If has emoji AND onEmojiClick, use TertiaryButton
      if (hasEmoji && onEmojiClick) {
        const folderIcon = <span style={{ fontSize: '16px', lineHeight: 1 }}>{icon}</span>;
        
        return (
          <TertiaryButton
            icon={folderIcon}
            onClick={(e) => {
              e.stopPropagation();
              onEmojiClick(id, e.currentTarget as HTMLButtonElement);
            }}
            size="xs"
          />
        );
      }
      
      // Has emoji but NO onEmojiClick - show static emoji (for system folders like Cluttered)
      if (hasEmoji && !onEmojiClick) {
        return (
          <div
            style={{
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '16px',
            }}
          >
            {icon}
          </div>
        );
      }
      
      // No emoji - show folder icon (clickable to add emoji if onEmojiClick provided)
      if (onEmojiClick) {
        const iconColor = isSelected ? colors.text.default : colors.text.secondary;
        const folderIcon = isOpen ? (
          <FolderOpen size={16} style={{ color: iconColor }} />
        ) : (
          <Folder size={16} style={{ color: iconColor }} />
        );
        
        return (
          <TertiaryButton
            icon={folderIcon}
            onClick={(e) => {
              e.stopPropagation();
              const target = e.currentTarget as HTMLButtonElement;
              onEmojiClick(id, target);
            }}
            size="xs"
          />
        );
      }
      
      // No emoji and no click handler - just show static folder icon
      return (
        <div
          style={{
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: isSelected ? colors.text.default : colors.text.secondary,
            position: 'relative',
          }}
        >
          {isOpen ? <FolderOpen size={16} /> : <Folder size={16} />}
        </div>
      );
    }
    
    if (variant === 'tag') {
      // Tags use NoteTag component, no icon here
      return null;
    }
    
    return null;
  };

  // Render toggle button (for folders and headers)
  // Badge and chevron swap in the same 20px container
  const renderToggle = () => {
    if ((variant !== 'folder' && variant !== 'header') || !onToggle) return null;
    
    return (
      <div
        style={{
          position: 'relative',
          width: '20px',
          height: '20px',
          flexShrink: 0,
        }}
      >
        {/* Badge - show only when NOT hovered OR when something is being dragged over (isDropTarget) */}
        {badge && (isDropTarget || !isHovered) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: colors.text.tertiary,
              userSelect: 'none',
              WebkitUserSelect: 'none',
            } as any}
          >
            {badge}
          </div>
        )}
        
        {/* Chevron - clickable to toggle expand/collapse */}
        {/* Headers: always swap with badge (show on hover) | Folders: If no badge: always visible | If badge: show on hover */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: variant === 'header' ? ((isHovered && !isDropTarget) ? 1 : 0) : (!badge ? 1 : ((isHovered && !isDropTarget) ? 1 : 0)),
            transition: 'opacity 150ms ease',
            pointerEvents: variant === 'header' ? ((isHovered && !isDropTarget) ? 'auto' : 'none') : (!badge ? 'auto' : ((isHovered && !isDropTarget) ? 'auto' : 'none')),
          }}
        >
          <TertiaryButton
            icon={
              variant === 'header' ? (
                <ChevronDown
                  size={16}
                  style={{
                    transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 150ms ease',
                  }}
                />
              ) : (
                <ChevronRight
                  size={16}
                  style={{
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 150ms ease',
                  }}
                />
              )
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

  // Render label content
  const renderLabel = () => {
    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleRenameComplete}
          onKeyDown={handleKeyDown}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            fontSize: DESIGN.typography.fontSize,
            fontWeight: DESIGN.typography.fontWeight,
            color: isSelected ? colors.text.default : colors.text.secondary,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            padding: 0,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }
    
    // Header variant - uppercase, smaller font
    if (variant === 'header') {
      return (
        <span
          style={{
            fontSize: sidebarLayout.headerFontSize,
            fontWeight: sidebarLayout.headerFontWeight,
            textTransform: 'uppercase',
            letterSpacing: sidebarLayout.headerLetterSpacing,
            color: colors.text.default,
            flex: '1 1 0',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            cursor: 'pointer',
          } as any}
        >
          {label}
        </span>
      );
    }
    
    // Tag variant - use global NoteTag component
    if (variant === 'tag') {
      return (
        <Tag
          label={label}
          // No onRemove - user can't dismiss from sidebar
          // No onClick - user clicks the sidebar item itself
        />
      );
    }
    
    // Note and folder variants - plain text
    return (
      <span
        style={{
          fontSize: DESIGN.typography.fontSize,
          fontWeight: DESIGN.typography.fontWeight,
          color: isSelected ? colors.text.default : colors.text.secondary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: '1 1 0',
          minWidth: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        } as any}
      >
        {label}
      </span>
    );
  };

  // Render badge/count
  const renderBadge = () => {
    if (variant === 'tag') {
      // Tags: just show count (no actions, no swapping)
      if (tagCount !== undefined && tagCount !== null) {
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '20px',
              minWidth: '20px',
              fontSize: '12px',
              color: colors.text.tertiary,
              userSelect: 'none',
              WebkitUserSelect: 'none',
            } as any}
          >
            {tagCount}
          </div>
        );
      }
      return null;
    } else if (badge) {
      // For folders/headers with toggle, badge is rendered in renderToggle() (swaps with chevron)
      if ((variant === 'folder' || variant === 'header') && onToggle) {
        return null;
      }
      
      // For notes or folders without toggle, render badge normally
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '20px',
            minWidth: '20px',
            fontSize: '12px',
            color: colors.text.tertiary,
            pointerEvents: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          } as any}
        >
          {badge}
        </div>
      );
    }
    return null;
  };

  // Render actions
  const renderActions = () => {
    if (!actions || actions.length === 0) return null;
    if (!isHovered || isEditing) return null;
    
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN.spacing.actionsGap,
        }}
      >
        {actions.map((action, index) => (
          <div key={index}>{action}</div>
        ))}
      </div>
    );
  };

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
        draggable={draggable && !isEditing}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseUp={handleMouseUp}
        onClick={isEditing ? undefined : (e) => onClick(e)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          height: DESIGN.sizing.height,
          paddingLeft: DESIGN.spacing.paddingX,
          paddingRight: DESIGN.spacing.paddingX,
          boxSizing: 'border-box',
          cursor: isDragging ? 'grabbing' : 'pointer',
          backgroundColor: isSelected
            ? colors.background.tertiary
            : (variant === 'header' && isHeaderDragOver && !isOpen)
              ? colors.background.tertiary
              : isDropTarget 
                ? colors.background.subtleHover 
                : isHovered 
                  ? colors.background.subtleHover 
                  : 'transparent',
          borderRadius: DESIGN.sizing.borderRadius,
          gap: DESIGN.spacing.contentGap,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          transition: 'background-color 150ms ease, border-color 150ms ease',
          opacity: isDragging ? 0.5 : 1,
          border: variant === 'folder' && isDropTarget ? `1px solid ${colors.semantic.info}` : '0.5px solid transparent',
        } as any}
      >
        {/* Icon */}
        {renderIcon()}
        
        {/* Label */}
        {renderLabel()}
        
        {/* Right side elements - all together with tight spacing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.rightSideGap }}>
          {/* Actions (for notes/folders only, not tags) */}
          {variant !== 'tag' && renderActions()}
          
          {/* Badge/Count (for notes/tags) */}
          {renderBadge()}
          
          {/* Badge/Chevron Toggle (for folders/headers, on right like section header) */}
          {renderToggle()}
        </div>
      </div>
    </div>
  );
};


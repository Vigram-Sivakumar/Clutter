import { useState, useEffect, useRef, ReactNode } from 'react';
import { useTheme } from '../../../../../hooks/useTheme';
import { ChevronRight, ChevronDown, Plus, MoreVertical } from '../../../../../icons';
import { TertiaryButton } from '../../../../ui-buttons';
import { DropIndicator } from '../internal/DropIndicator';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { Tag } from '../../../shared/content-header/tags/Tag';
import { getNoteIcon, getFolderIcon, ALL_TASKS_FOLDER_ID } from '../../../../../utils/itemIcons';
import { CLUTTERED_FOLDER_ID, DAILY_NOTES_FOLDER_ID } from '@clutter/shared';
import { sidebarStyles } from '../config/sidebarConfig';
import { animations } from '../../../../../tokens/animations';

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
  hasOpenContextMenu?: boolean; // Whether this item's context menu is currently open
  isDragging?: boolean;
  isDropTarget?: boolean;
  hasContent?: boolean; // For notes - whether note has editor content (switches between Note/NoteBlank)
  dailyNoteDate?: string | null; // For notes - if it's a daily note (YYYY-MM-DD format)
  folderId?: string; // For folders - the folder ID (used to identify system folders)
  
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
  hasOpenContextMenu = false,
  isDragging = false,
  isDropTarget = false,
  hasContent = true,
  dailyNoteDate,
  folderId,
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
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  
  // For header auto-expand on drag
  const [isHeaderDragOver, setIsHeaderDragOver] = useState(false);
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // CSS Variables for theming (hover effects)
  const cssVars = {
    '--sidebar-hover-bg': colors.background.subtleHover,
    '--sidebar-selected-bg': colors.background.tertiary,
    '--sidebar-transition': sidebarStyles.transitions.hover,
  } as React.CSSProperties;

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
    // Headers can have optional icons (e.g., All Tasks with CheckSquare)
    if (variant === 'header') {
      if (icon) {
        return icon;
      }
      return null;
    }
    
    if (variant === 'note') {
      const iconColor = isSelected ? colors.text.default : colors.text.secondary;
      const noteIcon = getNoteIcon({
        emoji: typeof icon === 'string' ? icon : undefined,
        dailyNoteDate,
        hasContent,
        size: 16,
        color: iconColor,
      });
      
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
      // For folders with toggle: Show chevron on hover (replaces icon), otherwise show icon
      if (onToggle) {
        return (
          <div
            className={sidebarStyles.classes.iconWrapper}
            style={{
              position: 'relative',
              width: '20px',
              height: '20px',
              flexShrink: 0,
            }}
          >
            {/* Icon - always rendered, CSS controls visibility */}
            <div
              className={sidebarStyles.classes.icon}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 1,
              transition: animations.transition.opacity,
              }}
            >
              <TertiaryButton
                icon={getFolderIcon({
                  folderId: folderId || id,
                  emoji: typeof icon === 'string' ? icon : undefined,
                  isOpen,
                  size: 16,
                  color: isSelected ? colors.text.default : colors.text.secondary,
                })}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEmojiClick) {
                    onEmojiClick(id, e.currentTarget as HTMLButtonElement);
                  }
                }}
                disabled={!onEmojiClick}
                disabledNoFade={!onEmojiClick}
                size="xs"
              />
            </div>
            
            {/* Chevron - always rendered, CSS controls visibility (shown on hover) */}
            <div
              className={sidebarStyles.classes.chevronLeft}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: animations.transition.opacity,
              }}
            >
              <TertiaryButton
                icon={
                  <ChevronRight
                    size={16}
                    style={{
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
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
      }
      
      // Folder without toggle: Just show icon
      const iconColor = isSelected ? colors.text.default : colors.text.secondary;
      const folderIcon = getFolderIcon({
        folderId: folderId || id,
        emoji: typeof icon === 'string' ? icon : undefined,
        isOpen,
        size: 16,
        color: iconColor,
      });
      
      if (onEmojiClick) {
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
      
      return (
        <TertiaryButton
          icon={folderIcon}
          onClick={(e) => e.stopPropagation()}
          disabled={true}
          disabledNoFade={true}
          size="xs"
        />
      );
    }
    
    if (variant === 'tag') {
      // Tags use NoteTag component, no icon here
      return null;
    }
    
    return null;
  };

  // Render toggle button (for headers only - chevron on right)
  // For folders, chevron is handled in renderIcon() on the left
  // Badge and chevron swap in the same 20px container
  const renderToggle = () => {
    if (variant !== 'header' || !onToggle) return null;
    
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
        {/* Headers: always swap with badge (show on hover) */}
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
    
    // Header variant - smaller font, same case as items
    if (variant === 'header') {
      return (
        <span
          style={{
            fontSize: sidebarLayout.headerFontSize,
            fontWeight: sidebarLayout.headerFontWeight,
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
        <div
          style={{
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Tag
            label={label}
            // No onRemove - user can't dismiss from sidebar
            // No onClick - user clicks the sidebar item itself
          />
        </div>
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
    // Badge is always rendered but hidden on hover via CSS (when actions exist)
    // This is controlled by CSS class in the main container

    if (variant === 'tag') {
      // Tags: show count
      if (tagCount !== undefined && tagCount !== null) {
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
      // For headers with toggle, badge is rendered in renderToggle() (swaps with chevron on right)
      // For folders, badge is rendered normally here (chevron is on left, swaps with icon)
      if (variant === 'header' && onToggle) {
        return null;
      }
      
      // For folders, notes, or any item without toggle in renderToggle()
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
    }
    return null;
  };

  // Render quick add button (+ icon) for folders and containers
  const renderQuickAdd = () => {
    // Show + icon for:
    // 1. All folders
    // 2. System folders (Cluttered, Daily Notes, All Tasks)
    // 3. Section headers that can expand
    const shouldShowPlusIcon =
      variant === 'folder' ||
      folderId === CLUTTERED_FOLDER_ID ||
      folderId === DAILY_NOTES_FOLDER_ID ||
      folderId === ALL_TASKS_FOLDER_ID ||
      (variant === 'header' && onToggle);

    if (!shouldShowPlusIcon) return null;

    // For now, use the first action if provided (which should be the + button from getFolderActions)
    // In the future, we might want to handle the onClick directly here
    if (actions && actions.length > 0) {
      // Always render, CSS controls visibility (show on hover OR when context menu is open)
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
    }

    return null;
  };

  // Render context menu (replaces badge on hover)
  const renderContextMenu = () => {
    if (!actions || actions.length === 0) return null;

    // Determine if this item has a quick add button (+ icon)
    const hasQuickAddButton =
      variant === 'folder' ||
      folderId === CLUTTERED_FOLDER_ID ||
      folderId === DAILY_NOTES_FOLDER_ID ||
      folderId === ALL_TASKS_FOLDER_ID ||
      (variant === 'header' && onToggle);

    // For items with + icon, the context menu is the second action (if it exists)
    // For items without + icon (notes/tags), it's the first action
    const contextMenuAction = hasQuickAddButton 
      ? (actions.length > 1 ? actions[1] : null)
      : actions[0];

    if (!contextMenuAction) return null;

    // Always render, CSS controls visibility (show on hover OR when context menu is open)
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

  return (
    <>
      {/* CSS for hover effects - no JS state needed */}
      <style>{`
        /* Hide icon, show chevron on hover for folders */
        .${sidebarStyles.classes.item}:hover .${sidebarStyles.classes.icon} {
          opacity: 0 !important;
        }
        
        .${sidebarStyles.classes.item}:hover .${sidebarStyles.classes.chevronLeft} {
          opacity: 1 !important;
        }
        
        /* Show action buttons on hover */
        .${sidebarStyles.classes.item}:hover .sidebar-item__quick-add,
        .${sidebarStyles.classes.item}:hover .sidebar-item__context-menu {
          opacity: 1 !important;
          pointer-events: auto !important;
          width: auto !important;
        }
        
        /* Hide badge on hover for headers (when not drop target) */
        .${sidebarStyles.classes.item}:not([data-drop-target="true"]):hover .${sidebarStyles.classes.badge} {
          opacity: 0 !important;
        }
        
        /* Show chevron on hover for headers (when not drop target) */
        .${sidebarStyles.classes.item}:not([data-drop-target="true"]):hover .${sidebarStyles.classes.chevronRight} {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        
        /* Background hover - only when not selected */
        .${sidebarStyles.classes.item}:not([data-selected="true"]):hover {
          background-color: var(--sidebar-hover-bg) !important;
        }
      `}</style>
      
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
          draggable={draggable && !isEditing}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onMouseUp={handleMouseUp}
          onClick={isEditing ? undefined : (e) => onClick(e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            height: DESIGN.sizing.height,
            paddingLeft: DESIGN.spacing.paddingX,
            paddingRight: DESIGN.spacing.paddingX,
            boxSizing: 'border-box',
            cursor: isDragging ? 'grabbing' : 'pointer',
            backgroundColor: isSelected || hasOpenContextMenu
              ? colors.background.tertiary
              : (variant === 'header' && isHeaderDragOver && !isOpen)
                ? colors.background.tertiary
                : isDropTarget 
                  ? colors.background.subtleHover 
                  : 'transparent',
            borderRadius: DESIGN.sizing.borderRadius,
            gap: DESIGN.spacing.contentGap,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          transition: `${animations.transition.backgroundColor}, ${animations.transition.borderColor}`,
          opacity: isDragging ? 0.5 : 1,
            border: variant === 'folder' && isDropTarget ? `1px solid ${colors.semantic.info}` : '0.5px solid transparent',
            ...cssVars,
          } as any}
        >
        {/* Icon */}
        {renderIcon()}
        
        {/* Label */}
        {renderLabel()}
        
        {/* Right side elements - all together with tight spacing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.rightSideGap }}>
          {/* Quick add button (+ icon for folders/containers) */}
          {renderQuickAdd()}
          
          {/* Badge or Context Menu (swaps on hover) */}
          {renderBadge()}
          {renderContextMenu()}
          
          {/* Badge/Chevron Toggle (for folders/headers, on right like section header) */}
          {renderToggle()}
        </div>
      </div>
    </div>
    </>
  );
};


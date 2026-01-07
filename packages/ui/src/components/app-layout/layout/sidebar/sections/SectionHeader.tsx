import { useState, useEffect, useRef, ReactNode } from 'react';
import { useTheme } from '../../../../../hooks/useTheme';
import { radius } from '../../../../../tokens/radius';
import { ChevronDown } from '../../../../../icons';
import { TertiaryButton } from '../../../../ui-buttons';

interface SidebarSectionHeaderProps {
  title: string;
  isCollapsed: boolean;
  onClick: () => void; // Chevron click - toggle expand/collapse
  onHeaderClick?: () => void; // Title click - navigate (optional)
  badge?: string;
  actions?: ReactNode[];
  enableAutoExpand?: boolean; // Enable auto-expand on drag over
}

export const SidebarSectionHeader = ({
  title,
  isCollapsed,
  onClick,
  onHeaderClick,
  badge,
  actions,
  enableAutoExpand = false,
}: SidebarSectionHeaderProps) => {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
      setIsDragOver(false);
    };
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    if (!enableAutoExpand) return;
    e.preventDefault();
    
    // Only highlight if collapsed
    if (isCollapsed) {
      setIsDragOver(true);
      
      // Auto-expand collapsed section after hovering for 800ms
      if (onClick) {
        expandTimeoutRef.current = setTimeout(() => {
          onClick(); // This toggles the section open
        }, 800);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!enableAutoExpand) return;
    e.preventDefault();
    
    // Only highlight if collapsed
    if (isCollapsed) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (_e: React.DragEvent) => {
    if (!enableAutoExpand) return;
    
    setIsDragOver(false);
    
    // Clear the expand timeout when leaving
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!enableAutoExpand) return;
    e.preventDefault();
    
    setIsDragOver(false);
    
    // Clear the expand timeout on drop
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }
  };

  const handleDragEnd = () => {
    if (!enableAutoExpand) return;
    setIsDragOver(false);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '28px',
        paddingLeft: '8px',
        paddingRight: '4px',
        cursor: onHeaderClick ? 'pointer' : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        borderRadius: radius['6'],
        gap: '0px',
        backgroundColor: (isDragOver && isCollapsed) ? colors.background.tertiary : (isHovered ? colors.background.hover : 'transparent'),
        transition: 'background-color 150ms ease',
      } as any}
    >
      {/* Title - clickable if onHeaderClick is provided */}
      <span
        onClick={onHeaderClick}
        style={{
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: colors.text.tertiary,
          textWrap: 'nowrap',
          textOverflow: 'ellipsis',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: onHeaderClick ? 'pointer' : 'default',
          flex: 1,
        } as any}
      >
        {title}
      </span>

      {/* Action buttons (optional) - shown on hover, hidden during drag */}
      {isHovered && !isDragOver && actions && actions.length > 0 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0px',
          }}
        >
          {actions.map((action, index) => (
            <div key={index}>{action}</div>
          ))}
        </div>
      )}

      {/* Combined Badge/Chevron container - always takes same space */}
      <div
        style={{
          position: 'relative',
          width: '20px',
          height: '20px',
          flexShrink: 0,
        }}
      >
        {/* Badge - show only when NOT hovered (chevron shows on hover) OR during drag */}
        {badge && (isDragOver || !isHovered) && (
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

        {/* Chevron - clickable to toggle expand/collapse, hidden during drag */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: (isHovered && !isDragOver) ? 1 : 0,
            transition: 'opacity 150ms ease',
            pointerEvents: (isHovered && !isDragOver) ? 'auto' : 'none',
          }}
        >
          <TertiaryButton
            icon={
              <ChevronDown
                size={16}
                style={{
                  transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 150ms ease',
                }}
              />
            }
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            size="xs"
          />
        </div>
      </div>
    </div>
  );
};


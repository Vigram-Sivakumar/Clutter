import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Star, StarFilled, MoreVertical, UnfoldHorizontal, FoldHorizontal, PanelRight } from '../../../../icons';
import { TertiaryButton } from '../../../ui-buttons';
import { ContextMenu } from '../../../ui-primitives';
import { spacing } from '../../../../tokens/spacing';
import { sizing } from '../../../../tokens/sizing';
import { useTheme } from '../../../../hooks/useTheme';

/**
 * TopBar Design Specification
 * Single source of truth for all design tokens used in this component
 */
const DESIGN = {
  sizing: {
    height: '24px',                                 // Height of the top bar
    iconSize: sizing.icon.sm,                       // Icon size
    buttonSize: 'small' as const,                   // Size of buttons (TertiaryButton size prop)
  },
  spacing: {
    containerMargin: spacing['12'],                 // Margin around the top bar container
    buttonGroupGap: spacing['4'],                   // Gap between buttons in navigation/actions groups
    contentGap: spacing['8'],                       // Gap between navigation and custom content
  },
} as const;

interface TopBarProps {
  // Sidebar toggle
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  
  // Navigation buttons
  onBack?: () => void;
  onForward?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  
  // Right side actions
  isFullWidth?: boolean;
  onToggleWidth?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  contextMenuItems?: Array<
    | {
        icon: ReactNode;
        label: string;
        onClick: () => void;
        danger?: boolean;
        shortcut?: string;
      }
    | {
        separator: true;
      }
  >;
  
  // Custom content (can be breadcrumbs, title, or any custom component)
  children?: ReactNode;
  
  // Style options
  showBorderGuide?: boolean;
}

export const TopBar = ({ 
  isSidebarCollapsed = false,
  onToggleSidebar,
  onBack,
  onForward,
  canGoBack = true,
  canGoForward = true,
  isFullWidth = false,
  onToggleWidth,
  isFavorite = false,
  onToggleFavorite,
  contextMenuItems,
  children,
  showBorderGuide = false,
}: TopBarProps) => {
  const { colors } = useTheme();

  const guideBorder = showBorderGuide ? '2px dashed #00ff0080' : 'none';
  const guideBackground = showBorderGuide ? '#00ff0008' : 'transparent';

  return (
    <div
      style={{
        width: '100%',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {/* Drag layer - covers full TopBar area including padding */}
      <div
        data-tauri-drag-region
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          WebkitAppRegion: 'drag',
          // backgroundColor: 'rgba(255, 0, 0, 0.1)', // 🔴 TEMP: Red = Draggable area
          pointerEvents: 'auto',
          zIndex: 0,
        } as any}
      />
      
      {/* Content layer - above drag layer */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 0,
          paddingLeft: DESIGN.spacing.containerMargin,
          paddingRight: DESIGN.spacing.containerMargin,
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
          border: guideBorder,
          // height: 24+16,
        } as any}
      >
        {/* Left: Navigation + Custom content */}
        <div 
          data-tauri-drag-region="false"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: spacing['4'],
            flex: 1,
            minWidth: 0,
            WebkitAppRegion: 'no-drag',
          } as any}>
          {/* Navigation buttons - always visible */}
          <div 
            data-tauri-drag-region="false"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: spacing['2'],
              WebkitAppRegion: 'no-drag',
              marginRight: '8px',
            } as any}>
            {/* Sidebar expand button - fades in when collapsed */}
            {onToggleSidebar && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  opacity: isSidebarCollapsed ? 1 : 0,
                  maxWidth: isSidebarCollapsed ? '32px' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.2s ease-out, max-width 0.2s ease-out',
                  pointerEvents: isSidebarCollapsed ? 'auto' : 'none',
                }}
              >
                <TertiaryButton
                  icon={
                    <PanelRight 
                      size={DESIGN.sizing.iconSize}
                      style={{
                        transform: 'rotateY(180deg)',
                      }}
                    />
                  }
                  onClick={onToggleSidebar}
                  size={DESIGN.sizing.buttonSize}
                />
              </div>
            )}
            
            <TertiaryButton
              icon={<ChevronLeft size={DESIGN.sizing.iconSize} />}
              onClick={onBack || (() => {})}
              size={DESIGN.sizing.buttonSize}
              disabled={!canGoBack || !onBack}
            />
            <TertiaryButton
              icon={<ChevronRight size={DESIGN.sizing.iconSize} />}
              onClick={onForward || (() => {})}
              size={DESIGN.sizing.buttonSize}
              disabled={!canGoForward || !onForward}
            />
          </div>

          {/* Custom content - sits above drag layer */}
          <div 
            data-tauri-drag-region="false"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              flex: 1,
              minWidth: 0,
              height: 24+24,
              WebkitAppRegion: 'no-drag',
          // backgroundColor: 'rgba(255, 0, 0, 0.1)', // 🔴 TEMP: Red = Draggable area

            } as any}>
            {children}
          </div>
        </div>
        
        {/* Right: Action buttons */}
        <div 
          data-tauri-drag-region="false"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: spacing['2'],
            WebkitAppRegion: 'no-drag',
          } as any}>
          {/* Favorite button */}
          {onToggleFavorite && (
            <TertiaryButton
              icon={isFavorite ? <StarFilled size={sizing.icon.sm} color={colors.accent.gold} /> : <Star size={sizing.icon.sm} />}
              onClick={onToggleFavorite}
              size={DESIGN.sizing.buttonSize}
            />
          )}
          
          {/* Width toggle button */}
          {onToggleWidth && (
            <TertiaryButton
              icon={isFullWidth ? <FoldHorizontal size={sizing.icon.sm} /> : <UnfoldHorizontal size={sizing.icon.sm} />}
              onClick={onToggleWidth}
              size={DESIGN.sizing.buttonSize}
            />
          )}
          
          {/* Three dot menu */}
          {contextMenuItems && contextMenuItems.length > 0 && (
            <ContextMenu items={contextMenuItems}>
              <TertiaryButton
                icon={<MoreVertical size={DESIGN.sizing.iconSize} />}
                size={DESIGN.sizing.buttonSize}
              />
            </ContextMenu>
          )}
        </div>
      </div>
    </div>
  );
};


import { ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  StarFilled,
  MoreVertical,
  UnfoldHorizontal,
  FoldHorizontal,
  PanelRight,
} from '../../../../icons';
import { TertiaryButton } from '../../../ui-buttons';
import { ContextMenu } from '../../../ui-primitives';
import { spacing } from '../../../../tokens/spacing';
import { sizing } from '../../../../tokens/sizing';
import { useTheme } from '../../../../hooks/useTheme';
import { DragRegion } from '../DragRegion';

/**
 * TopBar Design Specification
 * Single source of truth for all design tokens used in this component
 */
const DESIGN = {
  sizing: {
    height: '24px', // Height of the top bar
    iconSize: sizing.icon.sm, // Icon size
    buttonSize: 'small' as const, // Size of buttons (TertiaryButton size prop)
  },
  spacing: {
    containerMargin: spacing['12'], // Margin around the top bar container
    buttonGroupGap: spacing['4'], // Gap between buttons in navigation/actions groups
    contentGap: spacing['8'], // Gap between navigation and custom content
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

  // Custom actions - additional action buttons to show before favorite/width/menu
  customActions?: ReactNode;

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
  customActions,
  children,
  showBorderGuide = false,
}: TopBarProps) => {
  const { colors } = useTheme();

  const guideBorder = showBorderGuide ? '2px dashed #00ff0080' : 'none';

  return (
    <DragRegion
      padding={{
        top: 12,
        right: 12,
        bottom: 12,
        left: 12, // DESIGN.spacing.containerMargin = 12px
      }}
      containerStyle={{
        width: '100%',
        padding: DESIGN.spacing.containerMargin, // 12px on all sides
        boxSizing: 'border-box',
        height: '48px', // Fixed height (total including padding)
        zIndex: 100,
        flexShrink: 0,
        backgroundColor: colors.background.default,
        border: guideBorder,
      }}
      contentStyle={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing['16'], // 16px gap between left (nav+breadcrumbs) and right (actions)
        width: '100%',
        height: '100%', // Fill parent height
        userSelect: 'none',
      }}
    >
      {/* Left: Navigation + Custom content */}
      <div
        style={
          {
            display: 'flex',
            alignItems: 'center',
            gap: spacing['4'],
            flex: 1,
            minWidth: 0,
          } as any
        }
      >
        {/* Navigation buttons - always visible */}
        <div
          style={
            {
              display: 'flex',
              alignItems: 'center',
              gap: spacing['2'],
              marginRight: '8px',
              WebkitAppRegion: 'no-drag', // ✅ Buttons are clickable, not draggable
            } as any
          }
        >
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

        {/* Custom content - DRAGGABLE AREA */}
        <div
          data-tauri-drag-region // ✅ Center area is draggable
          style={
            {
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              minWidth: 0,
              height: 24 + 24,
            } as any
          }
        >
          {children}
        </div>
      </div>

      {/* Right: Action buttons */}
      <div
        style={
          {
            display: 'flex',
            alignItems: 'center',
            gap: spacing['2'],
            WebkitAppRegion: 'no-drag', // ✅ Buttons are clickable, not draggable
          } as any
        }
      >
        {/* Custom actions */}
        {customActions}

        {/* Favorite button */}
        {onToggleFavorite && (
          <TertiaryButton
            icon={
              isFavorite ? (
                <StarFilled size={sizing.icon.sm} color={colors.accent.gold} />
              ) : (
                <Star size={sizing.icon.sm} />
              )
            }
            onClick={onToggleFavorite}
            size={DESIGN.sizing.buttonSize}
          />
        )}

        {/* Width toggle button */}
        {onToggleWidth && (
          <TertiaryButton
            icon={
              isFullWidth ? (
                <FoldHorizontal size={sizing.icon.sm} />
              ) : (
                <UnfoldHorizontal size={sizing.icon.sm} />
              )
            }
            onClick={onToggleWidth}
            size={DESIGN.sizing.buttonSize}
          />
        )}

        {/* Three dot menu */}
        {contextMenuItems && contextMenuItems.length > 0 && (
          <ContextMenu items={contextMenuItems} align="right">
            <TertiaryButton
              icon={<MoreVertical size={DESIGN.sizing.iconSize} />}
              size={DESIGN.sizing.buttonSize}
            />
          </ContextMenu>
        )}
      </div>
    </DragRegion>
  );
};

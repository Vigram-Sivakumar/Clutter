import { ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useUIPreferences } from '../../hooks/useUIPreferences';
import { spacing } from '../../tokens/spacing';
import { radius } from '../../tokens/radius';
import { sizing } from '../../tokens/sizing';

// Floating action bar for deleted items

interface FloatingActionBarProps {
  /** Optional message to display before the actions */
  message?: string;
  /** Action buttons (typically 2 buttons) */
  actions: ReactNode[];
}

/**
 * Reusable floating action bar component
 *
 * Positioned at the bottom center of the viewport, stays fixed during scrolling.
 * Uses the same design tokens as FloatingToolbar and ContextMenu for consistency.
 *
 * @example
 * ```tsx
 * <FloatingActionBar
 *   message="It will automatically be deleted in 30 days."
 *   actions={[
 *     <SecondaryButton onClick={onRestore}>Restore</SecondaryButton>,
 *     <PrimaryButton danger onClick={onDelete}>Permanently Delete</PrimaryButton>,
 *   ]}
 * />
 * ```
 */
export const FloatingActionBar = ({
  message,
  actions,
}: FloatingActionBarProps) => {
  const { colors } = useTheme();
  const { preferences } = useUIPreferences();

  // Calculate the horizontal center of the content area (accounting for sidebar)
  const sidebarWidth = preferences.sidebarCollapsed ? 48 : 280;
  const contentAreaLeft = sidebarWidth;
  const contentMaxWidth = 720;

  return (
    <div
      style={{
        position: 'fixed', // Fixed positioning - doesn't scroll with page
        bottom: spacing['24'],
        // Center within the available content area
        left: `${contentAreaLeft}px`,
        right: 0,
        marginLeft: 'auto',
        marginRight: 'auto',
        width: 'fit-content',
        maxWidth: `min(${contentMaxWidth}px, calc(100vw - ${sidebarWidth}px - ${spacing['24']} * 2))`,
        zIndex: sizing.zIndex.dropdown, // Same as FloatingToolbar
        backgroundColor: colors.background.default, // Same as FloatingToolbar and ContextMenu
        border: `1px solid ${colors.border.default}`, // Same as FloatingToolbar and ContextMenu
        borderRadius: radius['12'], // Same as FloatingToolbar
        boxShadow: `0 4px 12px ${colors.shadow.md}`, // Same as FloatingToolbar
        padding: spacing['12'], // Slightly more padding for message
        display: 'flex',
        alignItems: 'center',
        gap: spacing['12'],
        userSelect: 'none',
      }}
    >
      {/* Optional message */}
      {message && (
        <span
          style={{
            fontSize: '14px',
            color: colors.text.secondary,
            flexShrink: 1, // Allow message to shrink if needed
          }}
        >
          {message}
        </span>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing['8'],
          flexShrink: 0, // Never shrink buttons
        }}
      >
        {actions}
      </div>
    </div>
  );
};

import { ReactNode } from 'react';
import { SidebarItem } from '../items/SidebarItem';
import { sidebarLayout } from '../../../../../tokens/sidebar';

interface SidebarListGroupProps {
  title: string;
  children: ReactNode;
  connectorColor?: string;
  showConnector?: boolean;
  sticky?: boolean; // Optional: for nested sticky headers
  id?: string; // Optional: for unique identification
}

/**
 * SidebarListGroup - Sub-grouping component for date groups, categories, etc.
 *
 * Used within SidebarSection to create sub-groups with optional:
 * - Sticky headers
 * - Vertical connector lines
 * - Indented content
 *
 * Example: Date groups in TaskView ("Overdue", "6 Jan, Today")
 */
export const SidebarListGroup = ({
  title,
  children,
  connectorColor,
  showConnector = true,
  sticky = false,
  id,
}: SidebarListGroupProps) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: sidebarLayout.itemGap,
        width: '100%',
        minWidth: 0, // Allow shrinking below content size
      }}
    >
      {/* Group header - can be sticky */}
      <SidebarItem
        variant="group"
        id={id || `group-${title}`}
        label={title}
        onClick={() => {}}
        sticky={sticky}
      />

      {/* Group content with optional connector line */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          minWidth: 0, // Allow shrinking below content size
        }}
      >
        {showConnector && connectorColor && (
          <div
            style={{
              position: 'absolute',
              left: '12.5px', // Center of 3px line aligned with folder icon center
              top: 0,
              bottom: `-${sidebarLayout.itemGap}`,
              width: '3px',
              backgroundColor: connectorColor,
              borderRadius: '3px',
            }}
          />
        )}

        {/* Items wrapper - overflow hidden here for item animations */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: sidebarLayout.itemGap,
            overflow: 'hidden', // Enable collapse animations for items
            width: '100%',
            minWidth: 0, // Allow shrinking below content size
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

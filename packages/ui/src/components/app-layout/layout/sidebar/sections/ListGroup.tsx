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
  labelBackgroundColor?: string; // Optional: background color for the title text
  labelColor?: string; // Optional: text color for the title
  showDivider?: boolean; // Optional: show horizontal line after title
  dividerColor?: string; // Optional: color for the divider line
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
  labelBackgroundColor,
  labelColor,
  showDivider = false,
  dividerColor,
}: SidebarListGroupProps) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: sidebarLayout.groupTitleToItemsGap,
        width: '100%',
        minWidth: 0, // Allow shrinking below content size
      }}
    >
      {/* Group header - can be sticky */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <SidebarItem
          variant="group"
          id={id || `group-${title}`}
          label={title}
          onClick={() => {}}
          sticky={sticky}
          labelBackgroundColor={labelBackgroundColor}
          labelColor={labelColor}
        />

        {/* Optional horizontal divider */}
        {showDivider && (
          <div
            style={{
              height: '1px',
              backgroundColor: dividerColor,
              width: '100%',
            }}
          />
        )}
      </div>

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
              bottom: `-${sidebarLayout.groupTitleToItemsGap}`,
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
            gap: sidebarLayout.itemToItemGap,
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

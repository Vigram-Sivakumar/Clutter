import { useTheme } from '../../../../hooks/useTheme';
import { spacing } from '../../../../tokens/spacing';

/**
 * ViewAllLink - Clickable link to show all items in a truncated list
 * 
 * Usage:
 * ```tsx
 * <ViewAllLink
 *   onClick={() => navigate(...)}
 *   count={25}
 *   label="notes"
 * />
 * // Renders: "View all 25 notes →"
 * ```
 */

export interface ViewAllLinkProps {
  /** Click handler to view all items */
  onClick: () => void;
  
  /** Total count of items */
  count: number;
  
  /** Label for items (e.g., "notes", "tasks", "items") */
  label?: string;
  
  /** Custom text (overrides count + label) */
  customText?: string;
}

export const ViewAllLink = ({ 
  onClick, 
  count, 
  label = 'items',
  customText 
}: ViewAllLinkProps) => {
  const { colors } = useTheme();
  
  const displayText = customText || `View all ${count} ${label} →`;
  
  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = colors.text.secondary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = colors.text.tertiary;
      }}
      style={{
        fontSize: '13px',
        color: colors.text.tertiary,
        cursor: 'pointer',
        paddingLeft: spacing['2'],
        transition: 'color 0.15s ease',
        userSelect: 'none',
      }}
    >
      {displayText}
    </div>
  );
};


import { spacing } from './spacing';

/**
 * Global empty state styling
 * Used across all list views, grids, and pages for consistent empty state presentation
 * 
 * Usage:
 * ```tsx
 * import { emptyStateStyles } from '../../../../tokens/emptyState';
 * 
 * <div style={emptyStateStyles(colors)}>
 *   No items found
 * </div>
 * ```
 */
export const emptyStateStyles = (colors: { text: { tertiary: string } }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1, // Fill available height
  minHeight: '200px', // Minimum height fallback
  padding: spacing['20'],
  color: colors.text.tertiary,
  fontSize: '14px',
  textAlign: 'center' as const,
});


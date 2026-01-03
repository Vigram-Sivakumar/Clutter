import { ReactNode } from 'react';
import { ViewAllLink } from './ViewAllLink';

/**
 * TruncatedSection - Reusable component for showing a preview of items with "View all" link
 * 
 * Purpose:
 * - Shows first N items from a list
 * - Displays "View all X items →" link if there are more
 * - Centralizes truncation logic across pages
 * 
 * Usage:
 * ```tsx
 * <TruncatedSection
 *   items={notes}
 *   limit={3}
 *   renderItems={(truncatedNotes) => <NotesListView notes={truncatedNotes} />}
 *   onViewAll={() => navigate('/full-list')}
 *   totalCount={notes.length}
 *   itemLabel="notes"
 * />
 * ```
 * 
 * What this does:
 * ✅ Truncates array to specified limit
 * ✅ Shows "View all" link if more items exist
 * ✅ Handles click navigation
 * ✅ Customizable labels
 * 
 * What this does NOT do:
 * ❌ Fetching data
 * ❌ Filtering/sorting
 * ❌ Managing state
 */

export interface TruncatedSectionProps<T = any> {
  /** Full array of items to truncate */
  items: T[];
  
  /** Number of items to show before truncating */
  limit: number;
  
  /** Render function that receives truncated items */
  renderItems: (truncatedItems: T[]) => ReactNode;
  
  /** Click handler for "View all" link */
  onViewAll: () => void;
  
  /** Total count to display (defaults to items.length) */
  totalCount?: number;
  
  /** Label for items in "View all X {label}" (default: "items") */
  itemLabel?: string;
  
  /** Custom "View all" text (overrides default) */
  customViewAllText?: string;
}

/**
 * Generic truncation component - works with any item type
 */
export function TruncatedSection<T = any>({ 
  items, 
  limit, 
  renderItems,
  onViewAll,
  totalCount,
  itemLabel = 'items',
  customViewAllText,
}: TruncatedSectionProps<T>) {
  // Truncate to limit
  const truncatedItems = items.slice(0, limit);
  const actualCount = totalCount ?? items.length;
  const hasMore = actualCount > limit;
  
  return (
    <>
      {/* Render truncated items */}
      {renderItems(truncatedItems)}
      
      {/* Show "View all" link if there are more items */}
      {hasMore && (
        <ViewAllLink
          onClick={onViewAll}
          count={actualCount}
          label={itemLabel}
          customText={customViewAllText}
        />
      )}
    </>
  );
}


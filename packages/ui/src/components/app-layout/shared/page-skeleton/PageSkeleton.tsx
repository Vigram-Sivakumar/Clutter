import { ReactNode } from 'react';
import { ListViewLayout, ListViewSection } from '../list-view-layout';

/**
 * PageSkeleton - Structural primitive for all list-based pages
 * 
 * Purpose:
 * - Enforces consistent page structure across the app
 * - Removes JSX boilerplate from page components
 * - Zero business logic - purely structural
 * 
 * Design Principles:
 * - Uses composition (ReactNode) not configuration (prop object)
 * - PageTitleSection owns its own complexity
 * - Pages own all data, state, and behavior
 * - Skeleton is dumb and declarative
 * 
 * Usage:
 * ```tsx
 * <PageSkeleton
 *   header={
 *     <PageTitleSection
 *       variant="folder"
 *       title="2026"
 *       staticDescription="All months in 2026"
 *       staticIcon={<CalendarBlank />}
 *     />
 *   }
 *   content={{
 *     sections: [
 *       {
 *         id: 'january',
 *         title: 'January',
 *         show: true,
 *         content: <NotesListView ... />
 *       }
 *     ],
 *     emptyState: 'No notes yet'
 *   }}
 * />
 * ```
 * 
 * What this does:
 * ✅ Enforces header + content structure
 * ✅ Guarantees ListViewLayout usage
 * ✅ Type-safe sections array
 * 
 * What this does NOT do:
 * ❌ Data fetching
 * ❌ State management
 * ❌ Business logic
 * ❌ Conditionals based on variants
 * ❌ Event handling (just passes through)
 */

export interface PageSkeletonProps {
  /** 
   * Header section - typically a PageTitleSection component
   * Page component builds and configures this
   */
  header: ReactNode;
  
  /**
   * Content configuration - sections and empty state
   */
  content: {
    /** Array of sections to display */
    sections: ListViewSection[];
    
    /** Shown when no sections are visible */
    emptyState?: ReactNode;
  };
}

/**
 * Dumb structural primitive - enforces page layout
 * All complexity lives in page components and shared components
 */
export const PageSkeleton = ({ header, content }: PageSkeletonProps) => {
  return (
    <>
      {/* Header Section - Page component controls configuration */}
      {header}

      {/* Content Section - Declarative sections array */}
      <ListViewLayout
        sections={content.sections}
        emptyState={content.emptyState}
      />
    </>
  );
};


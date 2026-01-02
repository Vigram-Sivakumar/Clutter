import { ReactNode, Children } from 'react';
import { spacing } from '../../../../tokens/spacing';
import { WavyDivider } from '../wavy-divider';

export interface PageContentProps {
  /** Content sections to be rendered with consistent spacing */
  children: ReactNode;
}

/**
 * Global wrapper for page content sections (below PageTitleSection)
 * 
 * Provides:
 * - Wavy dividers between sections (automatically inserted)
 * - Consistent gap between sections (spacing['12'] = 12px)
 * - Fills viewport height by default (minHeight: 50vh)
 * - Grows to fit content naturally
 * 
 * Note: 
 * - Gap from PageTitleSection is controlled by parent Container (42px)
 * - Padding should be controlled by parent view/layout
 * - Empty states will be centered vertically within available space
 * 
 * Usage:
 * ```tsx
 * <PageTitleSection ... />
 * <PageContent>
 *   <FolderGrid ... />
 *   <NotesListView ... />
 * </PageContent>
 * ```
 */
export const PageContent = ({ children }: PageContentProps) => {
  // Insert wavy dividers between children
  const childrenArray = Children.toArray(children);
  const childrenWithDividers: ReactNode[] = [];
  
  childrenArray.forEach((child, index) => {
    childrenWithDividers.push(child);
    
    // Add divider after each child except the last one
    if (index < childrenArray.length - 1) {
      childrenWithDividers.push(
        <WavyDivider key={`divider-${index}`} />
      );
    }
  });
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing['md'], // 12px gap between sections
        minHeight: '50vh', // Fill at least half viewport by default
        flex: 1, // Grow to fill available space
      }}
    >
      {childrenWithDividers}
    </div>
  );
};


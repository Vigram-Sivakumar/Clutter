import { ReactNode, Fragment } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { PageContent } from '../page-content/PageContent';
import { SectionTitle } from '../section-title';
import { WavyDivider } from '../wavy-divider';
import { spacing } from '../../../../tokens/spacing';
import { emptyStateStyles } from '../../../../tokens/emptyState';

/**
 * Section configuration for ListViewLayout
 */
export interface ListViewSection {
  /** Unique identifier for the section */
  id: string;
  
  /** Section title (e.g., "Folders", "Notes", "January 2026") */
  title: string;
  
  /** Whether to show this section */
  show: boolean;
  
  /** Section content to render */
  content: ReactNode;
  
  /** Whether the section can be collapsed */
  collapsible?: boolean;
  
  /** Whether the section is currently collapsed */
  isCollapsed?: boolean;
  
  /** Handler for toggle collapse/expand */
  onToggle?: () => void;
  
  /** Optional color override for the section title (e.g., calendarAccent for current year/month) */
  titleColor?: string;
}

export interface ListViewLayoutProps {
  /** Array of sections to render */
  sections: ListViewSection[];
  
  /** Empty state message or component to show when no sections are visible */
  emptyState?: ReactNode;
}

/**
 * Unified layout component for all list views
 * 
 * Provides consistent structure for pages showing multiple sections:
 * - Folders + Notes (Favourites, Folder View, Tag Filtered, Recently Deleted)
 * - Single section (All Folders, All Tasks, All Tags, Favourite Tags)
 * - Future: Grouped sections (Daily Notes by month/year)
 * 
 * Features:
 * - Automatic wavy dividers between visible sections
 * - Optional collapsible sections
 * - Centered empty state when no sections are shown
 * - Fills available height for proper vertical centering
 * 
 * Usage:
 * ```tsx
 * <ListViewLayout
 *   sections={[
 *     { 
 *       id: 'folders', 
 *       title: 'Folders', 
 *       show: folders.length > 0, 
 *       content: <FolderGrid folders={folders} />,
 *       collapsible: true,
 *       isCollapsed: foldersCollapsed,
 *       onToggle: () => setFoldersCollapsed(!foldersCollapsed)
 *     },
 *     { 
 *       id: 'notes', 
 *       title: 'Notes', 
 *       show: notes.length > 0, 
 *       content: <NotesListView notes={notes} />
 *     }
 *   ]}
 *   emptyState="No items yet"
 * />
 * ```
 */
export const ListViewLayout = ({ sections, emptyState }: ListViewLayoutProps) => {
  const { colors } = useTheme();
  
  // Filter to only visible sections
  const visibleSections = sections.filter(s => s.show);
  
  return (
    <PageContent>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing['4'], // 4px between sections
          flex: 1, // Fill available height for empty state centering
          height: '100%', // Fallback for non-flex contexts
        }}
      >
        {visibleSections.length > 0 ? (
          visibleSections.map((section, index) => (
            <Fragment key={section.id}>
              {/* Section */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: spacing['4'] // 4px between section title and section content
              }}>
                {/* Section Title (if provided) */}
                {section.title && (
                  <SectionTitle
                    collapsible={section.collapsible}
                    isCollapsed={section.isCollapsed}
                    onToggle={section.onToggle}
                    titleColor={section.titleColor}
                  >
                    {section.title}
                  </SectionTitle>
                )}
                
                {/* Section Content (if not collapsed) */}
                {!section.isCollapsed && section.content}
              </div>
              
              {/* Wavy Divider (only show if current section is expanded and not last) */}
              {!section.isCollapsed && index < visibleSections.length - 1 && (
                <div style={{ marginTop: spacing['24'], marginBottom: spacing['24'] }}>
                  <WavyDivider />
                </div>
              )}
            </Fragment>
          ))
        ) : (
          /* Empty State (when no sections are visible) */
          emptyState && (
            <div style={emptyStateStyles(colors)}>
              {emptyState}
            </div>
          )
        )}
      </div>
    </PageContent>
  );
};


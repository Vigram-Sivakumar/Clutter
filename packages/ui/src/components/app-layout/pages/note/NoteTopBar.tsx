import { ReactNode, useMemo } from 'react';
import { TopBar, Breadcrumbs, BreadcrumbItem } from '../../layout/topbar';

interface NoteTopBarProps {
  folderPath?: string[]; // Folder hierarchy e.g., ['Work', 'Projects', 'Q1']
  noteTitle?: string;
  onNavigateToRoot?: () => void; // Click "Uncluttered" or first folder
  onNavigateToFolder?: (folderIndex: number) => void; // Click nested folder
  
  // Sidebar
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  
  // Navigation
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
}

export const NoteTopBar = ({ 
  folderPath, 
  noteTitle, // No default value - undefined means we're viewing a folder, not a note
  onNavigateToRoot, 
  onNavigateToFolder,
  isSidebarCollapsed,
  onToggleSidebar,
  onBack,
  onForward,
  canGoBack,
  canGoForward,
  isFullWidth,
  onToggleWidth,
  isFavorite,
  onToggleFavorite,
  contextMenuItems 
}: NoteTopBarProps) => {
  // Convert old API to new generic breadcrumb items
  const breadcrumbItems = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [];
    
    // Build breadcrumb items from folder path
    if (folderPath && folderPath.length > 0) {
      // Add all items in the path
      folderPath.forEach((folder, index) => {
        // Last item in path is current location (not clickable) if there's no noteTitle
        const isLastInPathAndNoNote = index === folderPath.length - 1 && (noteTitle === undefined || noteTitle === null);
        items.push({
          label: folder,
          onClick: isLastInPathAndNoNote ? undefined : () => onNavigateToFolder?.(index),
          isCurrentPage: isLastInPathAndNoNote,
        });
      });
    }
    // If no path and no note title, show nothing (edge case that shouldn't happen)
    
    // Current page (note title) - only show if we're actually viewing a note
    if (noteTitle !== undefined && noteTitle !== null) {
      items.push({
        label: noteTitle || 'Untitled',
        maxWidth: '200px',
        isCurrentPage: true,
      });
    }
    
    return items;
  }, [folderPath, noteTitle, onNavigateToRoot, onNavigateToFolder]);

  return (
    <TopBar
      isSidebarCollapsed={isSidebarCollapsed}
      onToggleSidebar={onToggleSidebar}
      onBack={onBack}
      onForward={onForward}
      canGoBack={canGoBack}
      canGoForward={canGoForward}
      isFullWidth={isFullWidth}
      onToggleWidth={onToggleWidth}
      isFavorite={isFavorite}
      onToggleFavorite={onToggleFavorite}
      contextMenuItems={contextMenuItems}
    >
      <Breadcrumbs items={breadcrumbItems} />
    </TopBar>
  );
};


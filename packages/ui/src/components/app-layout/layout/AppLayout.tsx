import { ReactNode, RefObject } from 'react';
import { AppSidebar } from './sidebar';
import { AppLayout } from './Container';
import { radius } from '../../../tokens/radius';

// Check if running in Tauri (native app)
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

interface SidebarProps {
  onToggleTheme: () => void;
  onShowKeyboardShortcuts: () => void;
  keyboardButtonRef: RefObject<HTMLDivElement>;
  isCollapsed?: boolean;
  onTagClick?: (tag: string) => void;
  onBackToEditor?: () => void;
  onNoteClickFromSidebar?: () => void;
  onNoteClickWithBlock?: (noteId: string, blockId: string) => void;
  onDateSelect?: (date: Date) => void;
  onToggleSidebar: () => void;
}

interface AppShellProps {
  /** Props to pass through to the sidebar */
  sidebarProps: SidebarProps;
  
  /** Header content for the main area (e.g., NoteTopBar, PageHeader) */
  header: ReactNode;
  
  /** Main content of the page */
  children: ReactNode;
  
  /** Toggle between constrained (720px) and full width */
  isFullWidth?: boolean;
  
  /** Background color for the main content area */
  backgroundColor?: string;
}

/**
 * Global app shell that combines Sidebar + Main Content Area
 * This is a "dumb" layout component - it receives all props and renders structure
 * 
 * Usage:
 * ```tsx
 * <AppShell
 *   sidebarProps={{ onToggleTheme, onShowKeyboardShortcuts, ... }}
 *   header={<NoteTopBar ... />}
 *   backgroundColor={color}
 * >
 *   <YourPageContent />
 * </AppShell>
 * ```
 */
export const AppShell = ({ 
  sidebarProps, 
  header, 
  children, 
  isFullWidth = false,
  backgroundColor 
}: AppShellProps) => {
  return (
    <div
      className="app-container"
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        overscrollBehavior: 'none',
        // macOS-specific styles (rounded window with background)
        ...(isTauri && {
          borderRadius: radius['12'],
          backgroundColor,
        }),
      }}
    >
      {/* Left Side: Sidebar */}
      <AppSidebar {...sidebarProps} />
      
      {/* Right Side: Main Content Area */}
      <AppLayout
        backgroundColor={backgroundColor}
        header={header}
        isFullWidth={isFullWidth}
      >
        {children}
      </AppLayout>
    </div>
  );
};


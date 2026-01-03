import { ReactNode, useRef, useState, useEffect } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing } from '../../../../tokens/spacing';
import { SidebarTabs } from './sections/Tabs';
import { SidebarActionBar } from './sections/ActionBar';
import { WindowControls } from './internal/WindowControls';
import { CalendarMonthHeader, CalendarDateGrid } from './internal';
import { Folder, Calendar, Tag, CheckSquare } from '../../../../icons';

const DESIGN = {
  spacing: {
    paddingBase: spacing['16'],
  },
} as const;

interface SidebarContainerProps {
  // Header
  contentType: 'notes' | 'tasks' | 'tags' | 'task';
  onContentTypeChange: (type: string) => void;
  onCreateNote: () => void;
  onSearch: () => void;
  createButtonShortcut?: string;

  // Calendar (for tasks tab)
  currentWeekStart?: Date;
  onWeekChange?: (newWeekStart: Date) => void;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;

  // Dynamic content
  children: ReactNode;

  // Styling
  width?: string;
  height?: string;
  
  // Testing
  showWindowControls?: boolean; // Force show window controls for testing
  
  // Collapse
  onToggleSidebar?: () => void;
  isCollapsed?: boolean;
  
  // Scroll control
  disableScroll?: boolean; // Disable scrolling when context menu or other overlay is open
}

export const SidebarContainer = ({
  contentType,
  onContentTypeChange,
  onCreateNote,
  onSearch,
  createButtonShortcut,
  currentWeekStart,
  onWeekChange,
  selectedDate,
  onDateSelect,
  children,
  width = '280px',
  height = '100vh',
  showWindowControls = false,
  onToggleSidebar,
  isCollapsed = false,
  disableScroll = false,
}: SidebarContainerProps) => {
  const { colors } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const tabOptions = [
    { value: 'notes', icon: <Folder size={16} /> },
    { value: 'tasks', icon: <Calendar size={16} /> },
    { value: 'task', icon: <CheckSquare size={16} /> },
    { value: 'tags', icon: <Tag size={16} /> },
  ];

  // Check if running in Tauri (native app)
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
  const hasWindowControls = isTauri || showWindowControls;

  // Track scroll position
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      setIsScrolled(scrollElement.scrollTop > 0);
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px', // ✅ 4px gap from window controls to app layer
        paddingTop: hasWindowControls ? '0' : '12px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {/* System Layer: Window Controls (macOS only) */}
      <div style={{ flexShrink: 0 }}>
        <WindowControls 
        variant="sidebar"
        showToggleButton 
          forceShow={showWindowControls}
          onToggleSidebar={onToggleSidebar}
          isCollapsed={isCollapsed}
        />
      </div>

      {/* App Layer - 16px gaps between all elements */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px', // 16px within app layer
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Tab Toggle */}
      <div style={{ paddingLeft: DESIGN.spacing.paddingBase, paddingRight: DESIGN.spacing.paddingBase, flexShrink: 0 }}>
        <SidebarTabs
          value={contentType}
          onChange={onContentTypeChange}
          options={tabOptions}
          size="medium"
        />
      </div>

        {/* Tab-specific Action Area */}
        {contentType === 'notes' && (
      <div style={{ paddingLeft: DESIGN.spacing.paddingBase, paddingRight: DESIGN.spacing.paddingBase, flexShrink: 0 }}>
        <SidebarActionBar
          onCreateNote={onCreateNote}
          onSearch={onSearch}
          createButtonShortcut={createButtonShortcut}
        />
      </div>
        )}

        {contentType === 'tasks' && currentWeekStart && onWeekChange && (
          <div style={{ paddingLeft: DESIGN.spacing.paddingBase, paddingRight: DESIGN.spacing.paddingBase, flexShrink: 0 }}>
            <div style={{ marginBottom: '6px' }}>
              <CalendarMonthHeader 
                currentWeekStart={currentWeekStart}
                onWeekChange={onWeekChange}
                onDateSelect={onDateSelect}
              />
            </div>
            <CalendarDateGrid
              view="week"
              weekStart={currentWeekStart}
              selectedDate={selectedDate}
              onDateClick={onDateSelect}
            />
          </div>
        )}

        {contentType === 'tags' && (
          // Tags tab: no action area (or could add search later)
          null
        )}

        {contentType === 'task' && (
          // Task tab: no action area for now
          null
        )}

        {/* Scrollable Content Area */}
      <div 
        style={{ 
          flex: 1, 
          overflow: 'hidden', 
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div 
          ref={scrollRef}
          style={{ 
              flex: 1,
              overflowY: disableScroll ? 'hidden' : 'auto', 
            overflowX: 'hidden',
            padding: `0px ${DESIGN.spacing.paddingBase}`, 
              borderTop: isScrolled ? `1px solid ${colors.border.subtle}` : 'none',
          }}
        >
          {children}
          </div>
        </div>
      </div>
    </div>
  );
};


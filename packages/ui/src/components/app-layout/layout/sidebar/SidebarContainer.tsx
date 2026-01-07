import { ReactNode, useRef, useState, useEffect } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing } from '../../../../tokens/spacing';
import { SidebarTabs } from './sections/Tabs';
import { SidebarActionBar } from './sections/ActionBar';
import { WindowControls } from './internal/WindowControls';
import { CalendarMonthHeader, CalendarDateGrid } from './internal';
import { SIDEBAR_TABS, renderIcon } from '../../../../config/sidebarConfig';
import { Note, CheckCircle, Tag, Calendar, Hash } from '../../../../icons';

const DESIGN = {
  spacing: {
    paddingBase: spacing['16'],
  },
} as const;

interface SidebarContainerProps {
  // Header
  contentType: 'notes' | 'tasks' | 'tags' | 'task';
  onContentTypeChange: (_type: string) => void;

  // Notes tab actions
  onCreateNote: () => void;
  onSearch: () => void;
  createButtonShortcut?: string;

  // Tasks tab actions
  onCreateTask?: () => void;
  onOpenCalendar?: () => void;

  // Tags tab actions
  onCreateTag?: () => void;

  // Calendar (for tasks tab)
  currentWeekStart?: Date;
  onWeekChange?: (_newWeekStart: Date) => void;
  selectedDate?: Date;
  onDateSelect?: (_date: Date) => void;

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
  onCreateTask,
  onOpenCalendar,
  onCreateTag,
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
  const { colors: _colors } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [_isScrolled, setIsScrolled] = useState(false);

  const tabOptions = Object.values(SIDEBAR_TABS).map((tab) => ({
    value: tab.id,
    icon: renderIcon(tab.iconName),
  }));

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
        overflow: 'visible', // Allow sticky positioning for section/group headers
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
          overflow: 'visible', // Allow sticky positioning for section/group headers
        }}
      >
        {/* Tab Toggle */}
        <div
          style={{
            paddingLeft: DESIGN.spacing.paddingBase,
            paddingRight: DESIGN.spacing.paddingBase,
            flexShrink: 0,
          }}
        >
          <SidebarTabs
            value={contentType}
            onChange={onContentTypeChange}
            options={tabOptions}
            size="medium"
          />
        </div>

        {/* Tab-specific Action Area */}
        {contentType === 'notes' && (
          <div
            style={{
              paddingLeft: DESIGN.spacing.paddingBase,
              paddingRight: DESIGN.spacing.paddingBase,
              flexShrink: 0,
            }}
          >
            <SidebarActionBar
              onPrimaryAction={onCreateNote}
              onSecondaryAction={onSearch}
              primaryLabel="Create Note"
              primaryIcon={<Note size={16} />}
              primaryShortcut={createButtonShortcut}
            />
          </div>
        )}

        {contentType === 'task' && onCreateTask && (
          <div
            style={{
              paddingLeft: DESIGN.spacing.paddingBase,
              paddingRight: DESIGN.spacing.paddingBase,
              flexShrink: 0,
            }}
          >
            <SidebarActionBar
              onPrimaryAction={onCreateTask}
              onSecondaryAction={onOpenCalendar || (() => {})}
              primaryLabel="Create Task"
              primaryIcon={<CheckCircle size={16} />}
              secondaryIcon={<Calendar size={16} />}
              primaryShortcut="⌘T"
            />
          </div>
        )}

        {contentType === 'tags' && onCreateTag && (
          <div
            style={{
              paddingLeft: DESIGN.spacing.paddingBase,
              paddingRight: DESIGN.spacing.paddingBase,
              flexShrink: 0,
            }}
          >
            <SidebarActionBar
              onPrimaryAction={onCreateTag}
              onSecondaryAction={() => {}}
              primaryLabel="Create Tag"
              primaryIcon={<Tag size={16} />}
              secondaryIcon={<Hash size={16} />}
              primaryShortcut="⌘⇧T"
            />
          </div>
        )}

        {contentType === 'tasks' && currentWeekStart && onWeekChange && (
          <div
            style={{
              paddingLeft: DESIGN.spacing.paddingBase,
              paddingRight: DESIGN.spacing.paddingBase,
              flexShrink: 0,
            }}
          >
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

        {contentType === 'tags' &&
          // Tags tab: no action area (or could add search later)
          null}

        {contentType === 'task' &&
          // Task tab: no action area for now
          null}

        {/* Scrollable Content Area */}
        <div
          style={{
            flex: 1,
            overflow: 'visible', // Allow sticky positioning for section/group headers
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
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

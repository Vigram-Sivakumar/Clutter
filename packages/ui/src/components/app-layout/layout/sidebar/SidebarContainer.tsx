import { ReactNode, useRef, useState, useEffect } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing } from '../../../../tokens/spacing';
import { SidebarTabs } from './sections/Tabs';
import { SidebarActionBar } from './sections/ActionBar';
import { WindowControls } from './internal/WindowControls';
import { Folder, CalendarDots, Tag } from '../../../../icons';

const DESIGN = {
  spacing: {
    paddingBase: spacing['16'],
  },
} as const;

interface SidebarContainerProps {
  // Header
  contentType: 'notes' | 'tasks' | 'tags';
  onContentTypeChange: (type: string) => void;
  onCreateNote: () => void;
  onSearch: () => void;
  createButtonShortcut?: string;

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
}

export const SidebarContainer = ({
  contentType,
  onContentTypeChange,
  onCreateNote,
  onSearch,
  createButtonShortcut,
  children,
  width = '280px',
  height = '100vh',
  showWindowControls = false,
  onToggleSidebar,
  isCollapsed = false,
}: SidebarContainerProps) => {
  const { colors } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const tabOptions = [
    { value: 'notes', icon: <Folder size={16} /> },
    { value: 'tasks', icon: <CalendarDots size={16} /> },
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
        gap: '16px', // Gap between Window Controls, Content Type Toggle, Action Buttons
        paddingTop: hasWindowControls ? '0' : '12px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {/* Window Controls (macOS only) - at the very top */}
      <div style={{ flexShrink: 0 }}>
        <WindowControls 
        variant="sidebar"
        showToggleButton 
          forceShow={showWindowControls}
          onToggleSidebar={onToggleSidebar}
          isCollapsed={isCollapsed}
        />
      </div>

      {/* Content Type Toggle */}
      <div style={{ paddingLeft: DESIGN.spacing.paddingBase, paddingRight: DESIGN.spacing.paddingBase, flexShrink: 0 }}>
        <SidebarTabs
          value={contentType}
          onChange={onContentTypeChange}
          options={tabOptions}
          size="medium"
        />
      </div>

      {/* Action Buttons */}
      <div style={{ paddingLeft: DESIGN.spacing.paddingBase, paddingRight: DESIGN.spacing.paddingBase, flexShrink: 0 }}>
        <SidebarActionBar
          onCreateNote={onCreateNote}
          onSearch={onSearch}
          createButtonShortcut={createButtonShortcut}
        />
      </div>

      {/* Dynamic Content Area */}
      <div 
        style={{ 
          flex: 1, 
          overflow: 'hidden', 
          minHeight: 0,
          // borderTop: isScrolled ? `1px solid ${colors.border.default}` : 'none',
          transition: 'border-color 150ms ease',
        }}
      >
        <div 
          ref={scrollRef}
          style={{ 
            height: '100%', 
            overflowY: 'auto', 
            overflowX: 'hidden',
            padding: `0px ${DESIGN.spacing.paddingBase}`, 
            borderTop: isScrolled ? `1px solid ${colors.border.default}` : 'none',


          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};


import { ReactNode, useRef, useLayoutEffect } from 'react';
import { spacing } from '../../../tokens/spacing';

interface AppLayoutProps {
  /** Content for the global header */
  header: ReactNode;
  /** Main content of the page/view */
  children: ReactNode;
  /** Toggle between constrained (720px) and full width */
  isFullWidth?: boolean;
  /** Background color for the main content area */
  backgroundColor?: string;
}

/**
 * Main content area wrapper (used internally by AppShell)
 * Provides header positioning and scrollable content area
 * 
 * Note: Use AppShell for the complete layout (sidebar + content)
 * This component is typically used as a building block within AppShell
 */
export const AppLayout = ({ header, children, isFullWidth = false, backgroundColor }: AppLayoutProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Scroll to top whenever content changes (new note, new view, etc.)
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [children]);
  
  return (
    <div
      className="main-content-area"
      style={{
        flex: 1,
        minWidth: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'auto',
        backgroundColor,
      } as React.CSSProperties}
    >
      {/* Global Topbar - Absolutely positioned at top */}
      <div
        className="global-header"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        {header}
      </div>

      {/* Scroll wrapper - Full width scrollable area (scrollbar at screen edge) */}
      <div
        ref={scrollRef}
        className="scroll-wrapper"
        style={{
          height: '100%',
          width: '100%',
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center', // Center the content horizontally
        }}
      >
        {/* Content wrapper - Constrained width content area */}
        <div
          className="content-wrapper"
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: spacing['48'], // Gap between PageTitleSection and PageContent
            width: '100%',
            maxWidth: isFullWidth ? '100%' : '720px', // Content max width - toggles based on prop
            paddingLeft: spacing['48'], // Horizontal padding
            paddingRight: spacing['48'],
            paddingBottom: 'max(25vh, 100px)', // Bottom space for scrolling
            minHeight: 'min-content', // Allow wrapper to grow with content
            height: 'fit-content', // Fit to content + padding
          }}
        >
          {children}
        </div>
      </div>

      {/* Bottom fade gradient - Visual indicator for more content below */}
      <div
        className="bottom-fade"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px', // interactions.fadeGradient.length
          background: `linear-gradient(to bottom, transparent, ${backgroundColor || 'transparent'})`,
          pointerEvents: 'none', // Don't block scrollbar interactions
          zIndex: 5, // Below header (z-index: 10), above content
        }}
      />
    </div>
  );
};


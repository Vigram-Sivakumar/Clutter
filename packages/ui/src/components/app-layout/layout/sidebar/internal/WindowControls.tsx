import { PanelRight } from '../../../../../icons';
import { TertiaryButton } from '../../../../ui-buttons';
import { sizing } from '../../../../../tokens/sizing';
import { spacing } from '../../../../../tokens/spacing';

// Check if running in Tauri (native app)
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

interface WindowControlsProps {
  /**
   * Show the sidebar toggle button on the right side
   * Used in SidebarWindowControls variant
   */
  showToggleButton?: boolean;
  onToggleSidebar?: () => void;
  isCollapsed?: boolean;
  
  /**
   * Style variant
   * - 'sidebar': Used in sidebar header (with padding, margin, toggle button)
   * - 'topbar': Used in top bar (minimal styling, no toggle)
   */
  variant?: 'sidebar' | 'topbar';
  
  /**
   * Force show component even on web (for testing)
   */
  forceShow?: boolean;
}

export const WindowControls = ({ 
  showToggleButton = false,
  onToggleSidebar,
  isCollapsed = false,
  variant = 'topbar',
  forceShow = false,
}: WindowControlsProps) => {
  // On web: only render if showing toggle button or forceShow is true
  // In Tauri: always render
  if (!isTauri && !showToggleButton && !forceShow) return null;

  const buttonStyle = {
    width: variant === 'sidebar' ? '16px' : '12px',
    height: variant === 'sidebar' ? '16px' : '12px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  } as any;

  const containerStyle = variant === 'sidebar' 
    ? {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing['8'],
        padding: '0px 16px',
        marginTop: '12px',
        height: '24px',
        flexShrink: 0,
        WebkitAppRegion: isTauri ? 'drag' : 'no-drag',
      }
    : {
        display: 'flex',
        alignItems: 'center',
        gap: spacing['8'],
        padding: '4px 0', // 4px vertical padding to match NoteTopBar top padding
        flexShrink: 0,
        WebkitAppRegion: isTauri ? 'drag' : 'no-drag',
        userSelect: 'none',
      };

  return (
    <div
      data-tauri-drag-region={isTauri}
      style={containerStyle as any}
    >
      {/* macOS Window Controls - only show in Tauri */}
      {isTauri && (
        <>
          <button
            data-tauri-drag-region="false"
            onClick={async () => {
              if (isTauri) {
                const { appWindow } = await import('@tauri-apps/api/window');
                appWindow.close();
              }
            }}
            style={{
              ...buttonStyle,
              backgroundColor: '#FF5F57',
              WebkitAppRegion: 'no-drag',
            } as any}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          />
          <button
            data-tauri-drag-region="false"
            onClick={async () => {
              if (isTauri) {
                const { appWindow } = await import('@tauri-apps/api/window');
                appWindow.minimize();
              }
            }}
            style={{
              ...buttonStyle,
              backgroundColor: '#FFBD2E',
              WebkitAppRegion: 'no-drag',
            } as any}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          />
          <button
            data-tauri-drag-region="false"
            onClick={async () => {
              if (isTauri) {
                const { appWindow } = await import('@tauri-apps/api/window');
                appWindow.toggleMaximize();
              }
            }}
            style={{
              ...buttonStyle,
              backgroundColor: '#28C840',
              WebkitAppRegion: 'no-drag',
            } as any}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          />
        </>
      )}

      {/* Sidebar variant: Spacer and toggle button */}
      {variant === 'sidebar' && showToggleButton && (
        <>
          {/* Spacer to push collapse button to the right - always present */}
          <div style={{ 
            flex: isCollapsed ? 0 : 1,
            transition: 'flex 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)',
            minWidth: 0,
          }} />

          {/* Collapse button at far right - fades out when collapsing */}
          {onToggleSidebar && (
            <div 
              style={{ 
                WebkitAppRegion: 'no-drag',
                opacity: isCollapsed ? 0 : 1,
                transition: 'opacity 0.2s ease-out',
                pointerEvents: isCollapsed ? 'none' : 'auto',
              } as any}
            >
              <TertiaryButton
                icon={
                  <PanelRight 
                    size={sizing.icon.sm}
                  />
                }
                onClick={onToggleSidebar}
                size="medium"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};


import { PanelRight } from '../../../../../icons';
import { TertiaryButton } from '../../../../ui-buttons';
import { sizing } from '../../../../../tokens/sizing';
import { spacing } from '../../../../../tokens/spacing';
import { DragRegion } from '../../DragRegion';

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
        padding: '12px 18px 12px 16px', // ✅ 12px top and bottom, 18px right, 16px left
        height: '48px', // ✅ Increased from 36px to account for bottom padding
        flexShrink: 0,
      }
    : {
        display: 'flex',
        alignItems: 'center',
        gap: spacing['8'],
        padding: '4px 0', // 4px vertical padding to match NoteTopBar top padding
        flexShrink: 0,
        userSelect: 'none',
      };

  // Sidebar variant uses different padding
  const padding = variant === 'sidebar' 
    ? { left: 16, right: 18, top: 12, bottom: 12 } // ✅ Added bottom: 12 to extend drag area
    : { top: 4 };

  return (
    <DragRegion
      padding={padding}
      containerStyle={containerStyle as any}
      contentStyle={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
      }}
    >
      {/* macOS Window Controls - only show in Tauri */}
      {isTauri && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing['8'],
            WebkitAppRegion: 'no-drag', // ✅ Buttons not draggable
          } as any}
        >
          <button
            onClick={async () => {
              if (isTauri) {
                const { appWindow } = await import('@tauri-apps/api/window');
                appWindow.close();
              }
            }}
            style={{
              ...buttonStyle,
              backgroundColor: '#FF5F57',
            } as any}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          />
          <button
            onClick={async () => {
              if (isTauri) {
                const { appWindow } = await import('@tauri-apps/api/window');
                appWindow.minimize();
              }
            }}
            style={{
              ...buttonStyle,
              backgroundColor: '#FFBD2E',
            } as any}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          />
          <button
            onClick={async () => {
              if (isTauri) {
                const { appWindow } = await import('@tauri-apps/api/window');
                appWindow.toggleMaximize();
              }
            }}
            style={{
              ...buttonStyle,
              backgroundColor: '#28C840',
            } as any}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          />
        </div>
      )}

      {/* Sidebar variant: Spacer and toggle button */}
      {variant === 'sidebar' && showToggleButton && (
        <>
          {/* Spacer to push collapse button to the right - draggable */}
          <div 
            data-tauri-drag-region
            style={{ 
              flex: isCollapsed ? 0 : 1,
              transition: 'flex 0.3s ease-out',
              minWidth: 0,
            }} />

          {/* Collapse button at far right - fades out when collapsing */}
          {onToggleSidebar && (
            <div 
              style={{ 
                opacity: isCollapsed ? 0 : 1,
                transition: 'opacity 0.2s ease-out',
                pointerEvents: isCollapsed ? 'none' : 'auto',
                WebkitAppRegion: 'no-drag', // ✅ Button not draggable
              } as any}
            >
              <TertiaryButton
                icon={
                  <PanelRight 
                    size={sizing.icon.sm}
                  />
                }
                onClick={onToggleSidebar}
                size="small"
              />
            </div>
          )}
        </>
      )}
    </DragRegion>
  );
};


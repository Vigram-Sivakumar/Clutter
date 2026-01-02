import { ReactNode } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { TopBar } from '../../layout/topbar';

interface MainContentLayoutProps {
  // Navigation
  onBack?: () => void;
  onForward?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  
  // Right-side actions
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
  
  headerContent?: ReactNode;
  
  // Main content
  children: ReactNode;
  
  // Layout options
  showBorderGuides?: boolean;
}

export const MainContentLayout = ({
  onBack,
  onForward,
  canGoBack,
  canGoForward,
  isFullWidth,
  onToggleWidth,
  isFavorite,
  onToggleFavorite,
  contextMenuItems,
  headerContent,
  children,
  showBorderGuides = false,
}: MainContentLayoutProps) => {
  const { colors } = useTheme();

  const guideBorder = showBorderGuides ? '2px dashed #ff006680' : 'none';
  const guideBackground = showBorderGuides ? '#ff000008' : 'transparent';

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.background.default,
        overflow: 'hidden',
        border: guideBorder,
      }}
    >
      {/* Global Page Header */}
      <TopBar
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
        {headerContent}
      </TopBar>

      {/* Main Content Area - Scrollable */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          border: guideBorder,
          backgroundColor: guideBackground,
        }}
      >
        {children}
      </div>
    </div>
  );
};


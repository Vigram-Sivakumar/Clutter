import { ReactNode, useState } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing } from '../../../../tokens/spacing';
import { ChevronDown } from '../../../../icons';
import { transitions } from '../../../../tokens/transitions';

export interface SectionTitleProps {
  /** The section title text */
  children: ReactNode;
  /** Enable collapse/expand functionality */
  collapsible?: boolean;
  /** Controlled collapsed state (if collapsible) */
  isCollapsed?: boolean;
  /** Callback when collapse state changes (if collapsible) */
  onToggle?: () => void;
  /** Optional color override for the title (e.g., calendarAccent for current year/month) */
  titleColor?: string;
}

/**
 * Section title component for consistent section headers
 * 
 * Used for "Folders", "Notes", and other section titles within PageContent
 * Matches SidebarSectionHeader styling for consistency
 * 
 * Styling:
 * - 12px font size
 * - 28px height (matches SidebarSectionHeader)
 * - Uppercase with 0.5px letter-spacing
 * - Tertiary text color
 * - No margin (use gap in parent flex container)
 * 
 * Collapsible:
 * - Set collapsible={true} to enable collapse/expand
 * - Use isCollapsed and onToggle for controlled state
 * - Shows chevron icon that rotates
 * 
 * Usage:
 * ```tsx
 * <PageContent>
 *   <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['12'] }}>
 *     <SectionTitle collapsible isCollapsed={collapsed} onToggle={() => setCollapsed(!collapsed)}>
 *       Folders
 *     </SectionTitle>
 *     {!collapsed && <FolderGrid ... />}
 *   </div>
 * </PageContent>
 * ```
 */
export const SectionTitle = ({ 
  children, 
  collapsible = false,
  isCollapsed = false,
  onToggle,
  titleColor,
}: SectionTitleProps) => {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = () => {
    if (collapsible && onToggle) {
      onToggle();
    }
  };
  
  return (
    <h3
      onClick={handleClick}
      onMouseEnter={() => collapsible && setIsHovered(true)}
      onMouseLeave={() => collapsible && setIsHovered(false)}
      style={{
        fontSize: '12px',
        fontWeight: 600,
        color: isHovered ? colors.text.secondary : colors.text.tertiary,
        backgroundColor: isHovered ? colors.background.hover : 'transparent',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        margin: 0,
        paddingLeft: spacing['6'],
        paddingRight: spacing['6'],
        height: '28px',
        borderRadius: '6px',
        cursor: collapsible ? 'pointer' : 'default',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: spacing['4'],
        transition: `color ${transitions.standard.duration} ${transitions.standard.easing}, background-color ${transitions.standard.duration} ${transitions.standard.easing}`,
      }}
    >
      {collapsible && (
        <ChevronDown
          size={12}
          style={{
            color: titleColor || (isHovered ? colors.text.secondary : colors.text.tertiary),
            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: `transform ${transitions.standard.duration} ${transitions.standard.easing}, color ${transitions.standard.duration} ${transitions.standard.easing}`,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </h3>
  );
};


import { useTheme } from '../../../../../hooks/useTheme';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { KeyboardShortcut } from '../../../../ui-primitives/KeyboardShortcut';

interface SidebarEmptyStateProps {
  message: string;
  level?: number;
  shortcut?: string | string[] | readonly string[] | null; // Optional keyboard shortcut to display
  suffix?: string | null; // Optional text after shortcut
}

export const SidebarEmptyState = ({
  message,
  level = 0,
  shortcut,
  suffix,
}: SidebarEmptyStateProps) => {
  const { colors } = useTheme();

  // At level 0 (root folder), use 8px padding. Otherwise, respect the level.
  const paddingLeft =
    level === 0
      ? 8
      : parseInt(sidebarLayout.emptyStatePaddingLeft) +
        Math.min(level, sidebarLayout.maxVisualIndent) *
          parseInt(sidebarLayout.indentPerLevel);

  return (
    <div
      style={{
        paddingTop: sidebarLayout.emptyStatePaddingTop,
        paddingRight: sidebarLayout.emptyStatePaddingRight,
        paddingBottom: sidebarLayout.emptyStatePaddingBottom,
        paddingLeft: `${paddingLeft}px`,
        fontSize: sidebarLayout.emptyStateFontSize,
        lineHeight: sidebarLayout.emptyStateLineHeight,
        userSelect: 'none',
        color: colors.text.tertiary,
      }}
    >
      {message} {shortcut && <KeyboardShortcut keys={shortcut} size="small" />}
      {suffix && ` ${suffix}`}
    </div>
  );
};

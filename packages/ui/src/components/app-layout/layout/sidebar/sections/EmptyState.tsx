import { useTheme } from '../../../../../hooks/useTheme';
import { sidebarLayout } from '../../../../../tokens/sidebar';

interface SidebarEmptyStateProps {
  message: string;
  level?: number;
}

export const SidebarEmptyState = ({
  message,
  level = 0,
}: SidebarEmptyStateProps) => {
  const { colors } = useTheme();

  const paddingLeft =
    parseInt(sidebarLayout.emptyStatePaddingLeft) +
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
        color:
          colors.text[
            sidebarLayout.emptyStateTextColor as keyof typeof colors.text
          ],
        lineHeight: sidebarLayout.emptyStateLineHeight,
        userSelect: 'none',
      }}
    >
      {message}
    </div>
  );
};

import { useTheme } from '../../../../../hooks/useTheme';

interface SidebarEmptyStateProps {
  message: string;
  level?: number;
}

export const SidebarEmptyState = ({ message, level = 0 }: SidebarEmptyStateProps) => {
  const { colors } = useTheme();
  const MAX_VISUAL_INDENT = 3;
  const paddingLeft = 8 + (Math.min(level, MAX_VISUAL_INDENT) * 24);

  return (
    <div
      style={{
        padding: `2px 8px 8px 8px`,
        fontSize: '12px',
        color: colors.text.placeholder,
        lineHeight: '1.5',
        userSelect: 'none',
        // marginLeft: '8px',
      }}
    >
      {message}
    </div>
  );
};


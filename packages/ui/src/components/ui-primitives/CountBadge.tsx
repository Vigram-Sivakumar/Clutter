import { ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../tokens/spacing';
import { Note, Folder, CheckSquare, Tag } from '../../icons';

type CountType = 'notes' | 'folders' | 'tasks' | 'tags' | 'custom';

interface CountBadgeProps {
  count: number;
  type?: CountType;
  customIcon?: ReactNode;
  size?: 'sm' | 'md'; // 12px or 14px
  showZero?: boolean;
}

const ICON_MAP = {
  notes: Note,
  folders: Folder,
  tasks: CheckSquare,
  tags: Tag,
};

export const CountBadge = ({ 
  count, 
  type = 'notes',
  customIcon,
  size = 'sm',
  showZero = false,
}: CountBadgeProps) => {
  const { colors } = useTheme();
  
  if (count === 0 && !showZero) {
    return null;
  }
  
  const iconSize = size === 'sm' ? 12 : 14;
  const fontSize = size === 'sm' ? '12px' : '14px';
  
  const IconComponent = type === 'custom' ? null : ICON_MAP[type];
  const icon = customIcon || (IconComponent && <IconComponent size={iconSize} style={{ color: colors.text.secondary }} />);
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing['4'],
        fontSize,
        color: colors.text.secondary,
        pointerEvents: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        paddingRight: '4px',
      } as any}
    >
      {icon}
      <span>{count}</span>
    </div>
  );
};


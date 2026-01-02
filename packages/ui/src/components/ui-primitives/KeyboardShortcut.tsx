import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../tokens/typography';

interface KeyboardShortcutProps {
  keys: string | string[];
  size?: 'small' | 'medium';
}

export const KeyboardShortcut = ({ keys, size = 'small' }: KeyboardShortcutProps) => {
  const { colors } = useTheme();
  const keyArray = Array.isArray(keys) ? keys : [keys];

  const keySize = size === 'small' ? '12px' : '12px';
  const keyPadding = size === 'small' ? '2px 4px' : '3px 6px';

  return (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '3px',
      flexShrink: 0,
      userSelect: 'none',
      WebkitUserSelect: 'none',
    } as any}>
      {keyArray.map((key, index) => (
        <kbd
          key={index}
          style={{
            fontSize: keySize,
            fontFamily: typography.fontFamily.sans,
            fontWeight: 500,
            color: colors.text.tertiary,
            backgroundColor: colors.background.tertiary,
            border: 'none',
            borderRadius: '3px',
            padding: keyPadding,
            lineHeight: 1,
            minWidth: keySize === '12px' ? '16px' : '18px',
            textAlign: 'center',
            display: 'inline-block',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          } as any}
        >
          {key}
        </kbd>
      ))}
    </span>
  );
};


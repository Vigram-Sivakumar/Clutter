import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../tokens/typography';
import { radius } from '../../tokens/radius';

interface KeyboardShortcutProps {
  keys: string | string[] | readonly string[];
  size?: 'small' | 'medium';
}

export const KeyboardShortcut = ({
  keys,
  size = 'small',
}: KeyboardShortcutProps) => {
  const { colors } = useTheme();
  const keyArray = Array.isArray(keys) ? [...keys] : [keys];

  const keySize = size === 'small' ? '12px' : '12px';
  const keyPadding = size === 'small' ? '2px 4px' : '3px 6px';

  return (
    <>
      {keyArray.map((key, index) => (
        <kbd
          key={index}
          style={
            {
              fontSize: keySize,
              fontFamily: typography.fontFamily.sans,
              fontWeight: 500,
              color: colors.text.secondary,
              backgroundColor: colors.background.tertiary,
              border: 'none',
              borderRadius: radius['3'],
              padding: keyPadding,
              lineHeight: 1,
              minWidth: keySize === '12px' ? '16px' : '18px',
              textAlign: 'center',
              display: 'inline-block',
              marginRight: index < keyArray.length - 1 ? '2px' : '0',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              verticalAlign: 'middle',
            } as any
          }
        >
          {key}
        </kbd>
      ))}
    </>
  );
};

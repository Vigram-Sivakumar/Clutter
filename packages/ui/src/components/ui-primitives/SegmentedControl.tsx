import { ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../tokens/spacing';
import { radius } from '../../tokens/radius';

interface SegmentedControlOption {
  value: string;
  icon: ReactNode;
  label?: string;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'small' | 'medium';
}

export const SegmentedControl = ({
  options,
  value,
  onChange,
  size = 'medium',
}: SegmentedControlProps) => {
  const { colors } = useTheme();

  const height = size === 'small' ? '24px' : '28px';

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const segmentWidthPercent = 100 / options.length;
  const segmentWidth = `${segmentWidthPercent}%`;
  const leftPosition = `calc(2px + ${segmentWidthPercent * selectedIndex}%)`;

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        backgroundColor: colors.background.tertiary,
        borderRadius: radius['6'],
        padding: spacing['2'],
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      } as any}
    >
      {/* Sliding background */}
      <div
        style={{
          position: 'absolute',
          top: '2px',
          left: leftPosition,
          width: `calc(${segmentWidth} - 4px)`,
          height: `calc(${height})`,
          backgroundColor: colors.background.secondary,
          borderRadius: radius['6'],
          transition: 'left 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
        }}
      />

      {/* Buttons */}
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing['6'],
              flex: 1,
              height,
              padding: option.label ? '0 12px' : '0 10px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: radius['3'],
              cursor: 'pointer',
              transition: 'color 200ms ease',
              color: isSelected ? colors.text.default : colors.text.secondary,
              fontSize: '12px',
              fontWeight: isSelected ? 500 : 400,
              position: 'relative',
              zIndex: 1,
              userSelect: 'none',
              WebkitUserSelect: 'none',
            } as any}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {option.icon}
            </span>
            {option.label && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
};


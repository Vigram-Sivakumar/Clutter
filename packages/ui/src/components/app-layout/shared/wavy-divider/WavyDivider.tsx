import { useTheme } from '../../../../hooks/useTheme';

export interface WavyDividerProps {
  /** Color variant - default uses divider color, accent uses orange */
  color?: 'default' | 'accent';
  /** Custom width for the SVG - defaults to 128px */
  width?: string;
}

/**
 * Wavy horizontal divider using the same pattern as editor's HorizontalRule
 *
 * Provides visual separation between sections with a subtle wave pattern
 *
 * Wave pattern:
 * - Smooth S-curve using cubic bezier curves
 * - Tiles seamlessly at 16px intervals
 * - 128px width (8 complete wave cycles)
 * - 6px height with 1.2px stroke width
 *
 * Usage:
 * ```tsx
 * <WavyDivider />
 * <WavyDivider color="accent" />
 * ```
 */
export const WavyDivider = ({
  color = 'default',
  width = '128px',
}: WavyDividerProps) => {
  const { colors } = useTheme();

  // Wave pattern from editor tokens
  const WAVE = {
    path: 'M0 3 C4 3, 4 1, 8 1 S12 3, 16 3',
    width: 16,
    height: 6,
    strokeWidth: 1.2,
  };

  const dividerColor =
    color === 'accent' ? colors.semantic.orange : colors.border.divider;

  return (
    <div
      style={{
        height: '24px', // Total height including spacing
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <svg
        width={width}
        height={WAVE.height}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <defs>
          <pattern
            id="wavyDividerPattern"
            patternUnits="userSpaceOnUse"
            width={WAVE.width}
            height={WAVE.height}
          >
            <path
              d={WAVE.path}
              stroke={dividerColor}
              strokeWidth={WAVE.strokeWidth}
              strokeLinecap="round"
              fill="none"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height={WAVE.height}
          fill="url(#wavyDividerPattern)"
        />
      </svg>
    </div>
  );
};

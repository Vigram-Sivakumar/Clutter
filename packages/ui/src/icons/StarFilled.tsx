import { Star as PhosphorStar, type IconProps } from '@phosphor-icons/react';
import { colors } from '../tokens/colors';

export const StarFilled = ({ color = 'currentColor', ...props }: IconProps) => {
  // Use the provided color, defaulting to gold for favorites
  const fillColor = color === 'currentColor' ? colors.light.accent.gold : color;
  return <PhosphorStar weight="fill" {...props} color={fillColor} />;
};


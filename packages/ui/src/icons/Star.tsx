import { Star as PhosphorStar, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Star = (props: IconProps) => {
  return <PhosphorStar weight={ICON_WEIGHT} {...props} />;
};


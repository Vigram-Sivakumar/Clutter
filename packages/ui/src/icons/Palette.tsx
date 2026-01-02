import { Palette as PhosphorPalette, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Palette = (props: IconProps) => {
  return <PhosphorPalette weight={ICON_WEIGHT} {...props} />;
};


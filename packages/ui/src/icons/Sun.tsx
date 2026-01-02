import { Sun as PhosphorSun, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Sun = (props: IconProps) => {
  return <PhosphorSun weight={ICON_WEIGHT} {...props} />;
};



import { Moon as PhosphorMoon, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Moon = (props: IconProps) => {
  return <PhosphorMoon weight={ICON_WEIGHT} {...props} />;
};



import { ArrowsDownUp as PhosphorArrowsDownUp, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const ArrowUpDown = (props: IconProps) => {
  return <PhosphorArrowsDownUp weight={ICON_WEIGHT} {...props} />;
};


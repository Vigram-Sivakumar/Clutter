import { Tent as PhosphorTent, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Tent = (props: IconProps) => {
  return <PhosphorTent weight={ICON_WEIGHT} {...props} />;
};


import { X as PhosphorX, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const X = (props: IconProps) => {
  return <PhosphorX weight={ICON_WEIGHT} {...props} />;
};


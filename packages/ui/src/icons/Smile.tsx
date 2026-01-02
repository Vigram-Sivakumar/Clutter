import { Smiley as PhosphorSmiley, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Smile = (props: IconProps) => {
  return <PhosphorSmiley weight={ICON_WEIGHT} {...props} />;
};


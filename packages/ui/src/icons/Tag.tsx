import { Tag as PhosphorTag, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Tag = (props: IconProps) => {
  return <PhosphorTag weight={ICON_WEIGHT} {...props} />;
};



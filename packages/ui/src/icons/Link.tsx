import { Link as PhosphorLink, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Link = (props: IconProps) => {
  return <PhosphorLink weight={ICON_WEIGHT} {...props} />;
};


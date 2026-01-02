import { List as PhosphorList, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Menu = (props: IconProps) => {
  return <PhosphorList weight={ICON_WEIGHT} {...props} />;
};


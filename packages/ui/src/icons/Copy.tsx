import { Copy as PhosphorCopy, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Copy = (props: IconProps) => {
  return <PhosphorCopy weight={ICON_WEIGHT} {...props} />;
};


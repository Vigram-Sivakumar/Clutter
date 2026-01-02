import { Plus as PhosphorPlus, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Plus = (props: IconProps) => {
  return <PhosphorPlus weight={ICON_WEIGHT} {...props} />;
};


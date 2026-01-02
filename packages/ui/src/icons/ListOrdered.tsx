import { ListNumbers as PhosphorListNumbers, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const ListOrdered = (props: IconProps) => {
  return <PhosphorListNumbers weight={ICON_WEIGHT} {...props} />;
};




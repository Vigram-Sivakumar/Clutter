import { DotsThreeVertical as PhosphorDotsThreeVertical, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const MoreVertical = (props: IconProps) => {
  return <PhosphorDotsThreeVertical weight='bold' {...props} />;
};


import { TextT as PhosphorTextT, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Type = (props: IconProps) => {
  return <PhosphorTextT weight={ICON_WEIGHT} {...props} />;
};


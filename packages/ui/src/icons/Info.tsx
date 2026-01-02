import { Info as PhosphorInfo, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Info = (props: IconProps) => {
  return <PhosphorInfo weight={ICON_WEIGHT} {...props} />;
};




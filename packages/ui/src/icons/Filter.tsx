import { Funnel as PhosphorFunnel, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Filter = (props: IconProps) => {
  return <PhosphorFunnel weight={ICON_WEIGHT} {...props} />;
};


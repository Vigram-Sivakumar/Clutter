import { At as PhosphorAt, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const At = (props: IconProps) => {
  return <PhosphorAt weight={ICON_WEIGHT} {...props} />;
};


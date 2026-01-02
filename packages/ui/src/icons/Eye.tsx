import { Eye as PhosphorEye, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Eye = (props: IconProps) => {
  return <PhosphorEye weight={ICON_WEIGHT} {...props} />;
};


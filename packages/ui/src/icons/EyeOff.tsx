import { EyeClosed as PhosphorEyeClosed, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const EyeOff = (props: IconProps) => {
  return <PhosphorEyeClosed weight={ICON_WEIGHT} {...props} />;
};


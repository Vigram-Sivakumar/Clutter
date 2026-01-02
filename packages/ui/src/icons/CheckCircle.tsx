import { CheckCircle as PhosphorCheckCircle, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const CheckCircle = (props: IconProps) => {
  return <PhosphorCheckCircle weight={ICON_WEIGHT} {...props} />;
};




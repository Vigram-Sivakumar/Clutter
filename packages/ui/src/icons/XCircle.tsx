import { XCircle as PhosphorXCircle, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const XCircle = (props: IconProps) => {
  return <PhosphorXCircle weight={ICON_WEIGHT} {...props} />;
};




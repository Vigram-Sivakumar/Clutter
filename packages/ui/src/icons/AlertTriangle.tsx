import { Warning as PhosphorWarning, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const AlertTriangle = (props: IconProps) => {
  return <PhosphorWarning weight={ICON_WEIGHT} {...props} />;
};




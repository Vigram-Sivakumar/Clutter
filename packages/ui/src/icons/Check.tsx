import { Check as PhosphorCheck, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Check = (props: IconProps) => {
  return <PhosphorCheck weight={ICON_WEIGHT} {...props} />;
};


import { Clock as PhosphorClock, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Clock = (props: IconProps) => {
  return <PhosphorClock weight={ICON_WEIGHT} {...props} />;
};


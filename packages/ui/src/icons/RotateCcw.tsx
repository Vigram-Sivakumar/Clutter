import { ArrowCounterClockwise as PhosphorArrowCounterClockwise, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const RotateCcw = (props: IconProps) => {
  return <PhosphorArrowCounterClockwise weight={ICON_WEIGHT} {...props} />;
};


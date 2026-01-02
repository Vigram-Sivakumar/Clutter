import { CalendarDots as PhosphorCalendarDots, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const CalendarDots = (props: IconProps) => {
  return <PhosphorCalendarDots weight={ICON_WEIGHT} {...props} />;
};


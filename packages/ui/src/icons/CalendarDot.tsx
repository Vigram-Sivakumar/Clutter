import { CalendarDot as PhosphorCalendarDot, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const CalendarDot = (props: IconProps) => {
  return <PhosphorCalendarDot weight={ICON_WEIGHT} {...props} />;
};


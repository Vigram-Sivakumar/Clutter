import { CalendarBlank as PhosphorCalendarBlank, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const CalendarBlank = (props: IconProps) => {
  return <PhosphorCalendarBlank weight={ICON_WEIGHT} {...props} />;
};


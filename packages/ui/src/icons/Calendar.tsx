import { Calendar as PhosphorCalendar, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Calendar = (props: IconProps) => {
  return <PhosphorCalendar weight={ICON_WEIGHT} {...props} />;
};


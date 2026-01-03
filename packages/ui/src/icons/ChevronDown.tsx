import { CaretDown, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const ChevronDown = (props: IconProps) => {
  return <CaretDown weight={ICON_WEIGHT} {...props} />;
};


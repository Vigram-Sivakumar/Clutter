import { CaretRight as PhosphorCaretRight, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const ChevronRight = (props: IconProps) => {
  return <PhosphorCaretRight weight={ICON_WEIGHT} {...props} />;
};


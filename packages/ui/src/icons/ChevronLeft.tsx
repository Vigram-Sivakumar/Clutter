import { CaretLeft as PhosphorCaretLeft, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const ChevronLeft = (props: IconProps) => {
  return <PhosphorCaretLeft weight={ICON_WEIGHT} {...props} />;
};


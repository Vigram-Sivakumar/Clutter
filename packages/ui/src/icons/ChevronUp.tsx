import { CaretUp as PhosphorCaretUp, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const ChevronUp = (props: IconProps) => {
  return <PhosphorCaretUp weight={ICON_WEIGHT} {...props} />;
};


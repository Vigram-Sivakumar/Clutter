import { CaretDown as PhosphorCaretDown, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const ChevronDown = (props: IconProps) => {
  return <PhosphorCaretDown weight={ICON_WEIGHT} {...props} />;
};


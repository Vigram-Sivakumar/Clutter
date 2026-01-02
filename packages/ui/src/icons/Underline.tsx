import { TextUnderline as PhosphorUnderline, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Underline = (props: IconProps) => {
  return <PhosphorUnderline weight={ICON_WEIGHT} {...props} />;
};


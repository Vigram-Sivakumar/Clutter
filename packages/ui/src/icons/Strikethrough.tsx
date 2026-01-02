import { TextStrikethrough as PhosphorStrikethrough, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Strikethrough = (props: IconProps) => {
  return <PhosphorStrikethrough weight={ICON_WEIGHT} {...props} />;
};


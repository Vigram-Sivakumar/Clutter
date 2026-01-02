import { Keyboard as PhosphorKeyboard, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Keyboard = (props: IconProps) => {
  return <PhosphorKeyboard weight={ICON_WEIGHT} {...props} />;
};


import { Clipboard as PhosphorClipboard, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Clipboard = (props: IconProps) => {
  return <PhosphorClipboard weight={ICON_WEIGHT} {...props} />;
};


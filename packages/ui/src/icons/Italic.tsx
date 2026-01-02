import { TextItalic as PhosphorItalic, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Italic = (props: IconProps) => {
  return <PhosphorItalic weight={ICON_WEIGHT} {...props} />;
};


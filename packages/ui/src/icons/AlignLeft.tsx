import { TextAlignLeft as PhosphorTextAlignLeft, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const AlignLeft = (props: IconProps) => {
  return <PhosphorTextAlignLeft weight={ICON_WEIGHT} {...props} />;
};


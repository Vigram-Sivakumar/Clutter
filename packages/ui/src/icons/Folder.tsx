import { Folder as PhosphorFolder, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Folder = (props: IconProps) => {
  return <PhosphorFolder weight={ICON_WEIGHT} {...props} />;
};


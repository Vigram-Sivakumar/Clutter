import { FolderOpen as PhosphorFolderOpen, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const FolderOpen = (props: IconProps) => {
  return <PhosphorFolderOpen weight={ICON_WEIGHT} {...props} />;
};


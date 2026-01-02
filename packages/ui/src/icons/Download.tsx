import { Download as PhosphorDownload, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Download = (props: IconProps) => {
  return <PhosphorDownload weight={ICON_WEIGHT} {...props} />;
};


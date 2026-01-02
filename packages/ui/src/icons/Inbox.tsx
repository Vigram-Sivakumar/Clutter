import { Tray as PhosphorTray, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Tray = (props: IconProps) => {
  return <PhosphorTray weight={ICON_WEIGHT} {...props} />;
};


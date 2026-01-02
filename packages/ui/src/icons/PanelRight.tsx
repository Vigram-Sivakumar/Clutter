import { SidebarSimple as PhosphorSidebarSimple, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const PanelRight = (props: IconProps) => {
  return <PhosphorSidebarSimple weight={ICON_WEIGHT} {...props} />;
};


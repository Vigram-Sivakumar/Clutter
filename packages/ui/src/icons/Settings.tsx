import { Gear as PhosphorGear, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Settings = (props: IconProps) => {
  return <PhosphorGear weight={ICON_WEIGHT} {...props} />;
};


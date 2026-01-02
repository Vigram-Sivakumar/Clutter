import { DotsSixVertical as PhosphorDotsSixVertical, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const GripVertical = (props: IconProps) => {
  return <PhosphorDotsSixVertical weight={ICON_WEIGHT} {...props} />;
};


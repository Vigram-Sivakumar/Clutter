import { Trash as PhosphorTrash, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Trash2 = (props: IconProps) => {
  return <PhosphorTrash weight={ICON_WEIGHT} {...props} />;
};


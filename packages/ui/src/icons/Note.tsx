import { Note as PhosphorNote, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Note = (props: IconProps) => {
  return <PhosphorNote weight={ICON_WEIGHT} {...props} />;
};


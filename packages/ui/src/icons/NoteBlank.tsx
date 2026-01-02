import { NoteBlank as PhosphorNoteBlank, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const NoteBlank = (props: IconProps) => {
  return <PhosphorNoteBlank weight={ICON_WEIGHT} {...props} />;
};


import { FileText as PhosphorFileText, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const FileText = (props: IconProps) => {
  return <PhosphorFileText weight={ICON_WEIGHT} {...props} />;
};


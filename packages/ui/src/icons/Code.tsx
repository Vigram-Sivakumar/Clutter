import { Code as PhosphorCode, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Code = (props: IconProps) => {
  return <PhosphorCode weight={ICON_WEIGHT} {...props} />;
};


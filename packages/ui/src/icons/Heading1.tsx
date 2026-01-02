import { TextHOne as PhosphorTextHOne, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Heading1 = (props: IconProps) => {
  return <PhosphorTextHOne weight={ICON_WEIGHT} {...props} />;
};




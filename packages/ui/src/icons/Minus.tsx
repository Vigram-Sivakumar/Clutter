import { Minus as PhosphorMinus, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Minus = (props: IconProps) => {
  return <PhosphorMinus weight={ICON_WEIGHT} {...props} />;
};




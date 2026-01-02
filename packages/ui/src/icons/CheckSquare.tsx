import { CheckSquare as PhosphorCheckSquare, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const CheckSquare = (props: IconProps) => {
  return <PhosphorCheckSquare weight={ICON_WEIGHT} {...props} />;
};




import { HashStraight as PhosphorHashStraight, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const HashStraight = (props: IconProps) => {
  return <PhosphorHashStraight weight={ICON_WEIGHT} {...props} />;
};


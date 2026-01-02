import { ArrowsOutLineHorizontal as PhosphorArrowsOutLineHorizontal, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const UnfoldHorizontal = (props: IconProps) => {
  return <PhosphorArrowsOutLineHorizontal weight={ICON_WEIGHT} {...props} />;
};


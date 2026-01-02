import { ArrowsInLineHorizontal as PhosphorArrowsInLineHorizontal, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const FoldHorizontal = (props: IconProps) => {
  return <PhosphorArrowsInLineHorizontal weight={ICON_WEIGHT} {...props} />;
};


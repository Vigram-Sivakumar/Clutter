import { Paragraph as PhosphorParagraph, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Pilcrow = (props: IconProps) => {
  return <PhosphorParagraph weight={ICON_WEIGHT} {...props} />;
};




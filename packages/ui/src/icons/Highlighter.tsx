import { Highlighter as PhosphorHighlighter, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Highlighter = (props: IconProps) => {
  return <PhosphorHighlighter weight={ICON_WEIGHT} {...props} />;
};


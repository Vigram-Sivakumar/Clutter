import { Quotes as PhosphorQuotes, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Quote = (props: IconProps) => {
  return <PhosphorQuotes weight={ICON_WEIGHT} {...props} />;
};




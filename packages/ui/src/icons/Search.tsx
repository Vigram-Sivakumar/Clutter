import { MagnifyingGlass as PhosphorMagnifyingGlass, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const Search = (props: IconProps) => {
  return <PhosphorMagnifyingGlass weight={ICON_WEIGHT} {...props} />;
};


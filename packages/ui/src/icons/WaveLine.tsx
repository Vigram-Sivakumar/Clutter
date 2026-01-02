import { WaveSine as PhosphorWaveSine, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const WaveLine = (props: IconProps) => {
  return <PhosphorWaveSine weight={ICON_WEIGHT} {...props} />;
};


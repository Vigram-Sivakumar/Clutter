import { Question as PhosphorQuestion, type IconProps } from '@phosphor-icons/react';
import { ICON_WEIGHT } from '../tokens/icons';

export const HelpCircle = (props: IconProps) => {
  return <PhosphorQuestion weight={ICON_WEIGHT} {...props} />;
};


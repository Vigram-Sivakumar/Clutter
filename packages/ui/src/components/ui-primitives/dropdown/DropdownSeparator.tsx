/**
 * DropdownSeparator - Shared divider line for dropdowns
 * 
 * Used to visually separate sections within dropdowns
 */

import { useTheme } from '../../../hooks/useTheme';
import { spacing } from '../../../tokens/spacing';

export const DropdownSeparator = () => {
  const { colors } = useTheme();

  return (
    <div
      style={{
        width: '100%',
        height: '1px',
        backgroundColor: colors.border.divider,
        margin: `${spacing['4']} 0`,
      }}
    />
  );
};


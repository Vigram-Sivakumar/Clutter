/**
 * AutocompleteDropdown - Dropdown for autocomplete/suggestions (typing-triggered)
 * 
 * Used for editor suggestions like @ mentions, / commands, # tags
 * Uses shared dropdown primitives for consistent styling
 */

import { ReactNode } from 'react';
import { DropdownContainer, DropdownItem, DropdownHeader } from './dropdown';

interface AutocompleteDropdownProps {
  isOpen: boolean;
  position: { top?: number; bottom?: number; left: number } | null;
  onClose: () => void;
  header?: string;
  children?: ReactNode;
}

export const AutocompleteDropdown = ({
  isOpen,
  position,
  onClose,
  header,
  children,
}: AutocompleteDropdownProps) => {
  if (!position) return null;
  
  return (
    <DropdownContainer
      isOpen={isOpen}
      position={position}
      onClose={onClose}
      minWidth="220px"
      maxWidth="220px"
      maxHeight="300px"
    >
      {/* Optional header */}
      {header && <DropdownHeader label={header} />}
      
      {/* Children (DropdownItems) or skeleton */}
      {children || (
        <DropdownItem
          label="Dropdown Skeleton - Ready to build!"
          onClick={() => console.log('Skeleton clicked')}
        />
      )}
    </DropdownContainer>
  );
};

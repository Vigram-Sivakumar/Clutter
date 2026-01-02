import { useState, useEffect } from 'react';
import { DescriptionInput } from './DescriptionInput';
import { TertiaryButton } from '../../../../ui-buttons';
import { getFadeGradient } from '../../../../../tokens/interactions';
import { useTheme } from '../../../../../hooks/useTheme';

interface DescriptionProps {
  description?: string;
  showDescriptionInput?: boolean;
  descriptionVisible?: boolean;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onToggleVisibility?: () => void;
  backgroundColor?: string;
  staticDescription?: string; // Read-only description (no hide button)
}

export const Description = ({
  description,
  showDescriptionInput,
  descriptionVisible,
  onChange,
  onBlur,
  onToggleVisibility,
  backgroundColor,
  staticDescription,
}: NoteDescriptionProps) => {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  // Reset hover state when description becomes visible
  useEffect(() => {
    if (descriptionVisible) {
      setIsHovered(false);
    }
  }, [descriptionVisible]);

  // Static description - always visible, read-only
  if (staticDescription) {
    return (
      <div className="layout-description">
        <DescriptionInput
          placeholder=""
          value={staticDescription}
          autoFocus={false}
          readOnly={true}
        />
      </div>
    );
  }

  // Regular description - editable
  if ((!description && !showDescriptionInput) || !descriptionVisible) {
    return null;
  }

  return (
    <div 
      className="layout-description"
      style={{
        position: 'relative',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <DescriptionInput
        placeholder="Add description..."
        value={description}
        autoFocus={showDescriptionInput && !description}
        onChange={onChange}
        onBlur={onBlur}
      />
      {description && isHovered && onToggleVisibility && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: getFadeGradient(backgroundColor || colors.background.default).padding,
          background: getFadeGradient(backgroundColor || colors.background.default).background,
        }}>
          <TertiaryButton
            onClick={onToggleVisibility}
            size="xs"
            subtle
          >
            Hide
          </TertiaryButton>
        </div>
      )}
    </div>
  );
};


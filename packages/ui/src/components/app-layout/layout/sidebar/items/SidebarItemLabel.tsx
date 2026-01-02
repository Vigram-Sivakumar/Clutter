import { useState, useEffect, useRef, memo } from 'react';
import { useTheme } from '../../../../../hooks/useTheme';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { Tag } from '../../../shared/content-header/tags/Tag';

/**
 * SidebarItemLabel
 * Handles text rendering and inline editing
 * 
 * Responsibilities:
 * - Render label text with proper styling
 * - Handle inline editing input
 * - Text truncation
 * - Variant-specific styling (header, tag, note, folder)
 * 
 * NOT responsible for:
 * - Edit state management (passed through props)
 * - Validation (passed through onComplete)
 */

interface SidebarItemLabelProps {
  // Core
  label: string;
  variant: 'note' | 'folder' | 'tag' | 'header';
  isSelected?: boolean;
  
  // Inline editing
  isEditing?: boolean;
  onRenameComplete?: (id: string, newValue: string) => void;
  onRenameCancel?: () => void;
  id: string;
}

export const SidebarItemLabel = memo(({
  label,
  variant,
  isSelected = false,
  isEditing = false,
  onRenameComplete,
  onRenameCancel,
  id,
}: SidebarItemLabelProps) => {
  const { colors } = useTheme();
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const length = inputRef.current.value.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);
  
  // Reset edit value when label changes
  useEffect(() => {
    setEditValue(label);
  }, [label]);
  
  const handleRenameComplete = () => {
    if (editValue.trim() !== '' && onRenameComplete) {
      onRenameComplete(id, editValue.trim());
    } else if (onRenameCancel) {
      onRenameCancel();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameComplete();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (onRenameCancel) {
        onRenameCancel();
      }
    }
  };
  
  // Inline editing
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleRenameComplete}
        onKeyDown={handleKeyDown}
        style={{
          flex: '1 1 0',
          minWidth: 0,
          fontSize: sidebarLayout.itemFontSize,
          fontWeight: sidebarLayout.itemFontWeight,
          color: isSelected ? colors.text.default : colors.text.secondary,
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  
  // Header variant - smaller font, special styling
  if (variant === 'header') {
    return (
      <span
        style={{
          fontSize: sidebarLayout.headerFontSize,
          fontWeight: sidebarLayout.headerFontWeight,
          letterSpacing: sidebarLayout.headerLetterSpacing,
          color: colors.text.default,
          flex: '1 1 0',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: 'pointer',
        } as any}
      >
        {label}
      </span>
    );
  }
  
  // Tag variant - use global Tag component (colored pill)
  if (variant === 'tag') {
    return (
      <div
        style={{
          flex: '1 1 0',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Tag label={label} />
      </div>
    );
  }
  
  // Note and folder variants - plain text
  return (
    <span
      style={{
        fontSize: sidebarLayout.itemFontSize,
        fontWeight: sidebarLayout.itemFontWeight,
        color: isSelected ? colors.text.default : colors.text.secondary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: '1 1 0',
        minWidth: 0,
        pointerEvents: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      } as any}
    >
      {label}
    </span>
  );
});

SidebarItemLabel.displayName = 'SidebarItemLabel';


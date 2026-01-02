/**
 * SearchInput Component
 * 
 * Fully tertiary-style expandable search (24px/28px square → 200px)
 * Built on top of Input component with variant="tertiary"
 * 
 * - Collapsed: Transparent background (subtleHover on hover), no border, centered icon
 * - Expanded: Transparent background, no border, left-aligned icon with text input
 */

import { useState, useRef } from 'react';
import { Search, X } from '../../icons';
import { useTheme } from '../../hooks/useTheme';
import { Input } from '../ui-primitives';
import { sizing } from '../../tokens/sizing';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: 'xs' | 'small' | 'medium';
  onFocus?: () => void;
  onBlur?: () => void;
}

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search...',
  size = 'medium',
  onFocus,
  onBlur,
}: SearchInputProps) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only collapse if there's no text
    if (!value) {
      setIsFocused(false);
    }
    onBlur?.();
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  // Expand when there's text even if not focused
  const isExpanded = isFocused || value.length > 0;
  
  // Get the height based on size
  const inputHeight = sizing.input[size];
  
  // Calculate icon position (centered when collapsed, left-aligned when expanded)
  const collapsedIconLeft = size === 'xs' ? '2px' : size === 'small' ? '4px' : '6px';

  return (
    <div
      style={{
        position: 'relative',
        height: inputHeight,
        width: isExpanded ? '200px' : inputHeight,
        transition: 'width 200ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Search Icon */}
      <div
        style={{
          position: 'absolute',
          left: isExpanded ? '10px' : collapsedIconLeft,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 1,
          transition: 'left 200ms ease',
        }}
      >
        <Search size={sizing.icon.sm} style={{ color: colors.text.secondary }} />
      </div>

      {/* Input Component with Tertiary Variant */}
      <Input
        ref={inputRef}
        variant="tertiary"
        size={size}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={isExpanded ? placeholder : ''}
        style={{
          width: '100%',
          height: '100%',
          paddingLeft: isExpanded ? '32px' : '0',
          paddingRight: value ? '32px' : (isExpanded ? '10px' : '0'),
          cursor: isExpanded ? 'text' : 'pointer',
          transition: 'padding 200ms ease',
        }}
      />

      {/* Clear Button */}
      {value && (
        <button
          onClick={handleClear}
          onMouseDown={(e) => e.preventDefault()} // Prevent input blur
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: sizing.radius.sm,
            cursor: 'pointer',
            color: colors.text.secondary,
            transition: 'background-color 100ms ease, color 100ms ease',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.background.hover;
            e.currentTarget.style.color = colors.text.default;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = colors.text.secondary;
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};


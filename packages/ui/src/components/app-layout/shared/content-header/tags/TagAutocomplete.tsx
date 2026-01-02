import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../../hooks/useTheme';

interface TagAutocompleteProps {
  suggestions: string[];
  onSelect: (tag: string) => void;
  selectedIndex: number;
}

export const TagAutocomplete = ({
  suggestions,
  onSelect,
  selectedIndex,
}: NoteTagAutocompleteProps) => {
  const { colors } = useTheme();
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (suggestions.length === 0) return null;

  return createPortal(
    <div
      ref={listRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: '4px',
        backgroundColor: colors.background.default,
        border: `1px solid ${colors.border.default}`,
        borderRadius: '6px',
        boxShadow: `0 4px 12px ${colors.shadow.md}`,
        maxHeight: '200px',
        overflowY: 'auto',
        zIndex: 1000,
        minWidth: '150px',
      }}
    >
      {suggestions.map((tag, index) => (
        <div
          key={tag}
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent input blur
            onSelect(tag);
          }}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor:
              index === selectedIndex
                ? colors.background.tertiary
                : 'transparent',
            color: colors.text.secondary,
            transition: 'background-color 100ms ease',
          }}
          onMouseEnter={(e) => {
            if (index !== selectedIndex) {
              e.currentTarget.style.backgroundColor = colors.background.secondary;
            }
          }}
          onMouseLeave={(e) => {
            if (index !== selectedIndex) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {tag}
        </div>
      ))}
    </div>,
    document.body
  );
};


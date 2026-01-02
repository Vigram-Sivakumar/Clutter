import { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { useTagSuggestions, useAllTags } from '@clutter/shared';
import { useTheme } from '../../../../../hooks/useTheme';
import { TagAutocomplete } from './TagAutocomplete';

interface TagInputProps {
  onAddTag: (tag: string) => void;
  existingTags: string[];
  placeholder?: string;
  onCancel?: () => void;
  initialValue?: string;
}

export const TagInput = ({ onAddTag, existingTags, placeholder = 'Add tag...', onCancel, initialValue = '' }: TagInputProps) => {
  const [value, setValue] = useState(initialValue);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [inputWidth, setInputWidth] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const clickingSuggestionRef = useRef(false);
  const submittedRef = useRef(false);
  const { colors } = useTheme();

  const isEditing = !!initialValue;
  
  // Get all tags from all notes (for capitalization matching)
  const allTags = useAllTags();
  
  // Get tag suggestions derived from notes (but not when editing)
  const suggestions = isEditing ? [] : useTagSuggestions(value, existingTags);

  // Measure text width and update input width dynamically
  useEffect(() => {
    if (measureRef.current) {
      const textToMeasure = value || placeholder;
      measureRef.current.textContent = textToMeasure;
      const textWidth = measureRef.current.offsetWidth;
      // Add horizontal padding (8px * 2 = 16px) + caret buffer (2px)
      const totalWidth = textWidth + 16 + 2;
      setInputWidth(Math.max(totalWidth, 40));
    }
  }, [value, placeholder]);

  useEffect(() => {
    inputRef.current?.focus();
    // Place cursor at the end when editing an existing tag
    if (initialValue && inputRef.current) {
      const len = initialValue.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [initialValue]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [value]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        // Select from suggestions
        const selectedTag = suggestions[selectedIndex];
        if (selectedTag && !existingTags.includes(selectedTag)) {
          submittedRef.current = true;
          onAddTag(selectedTag);
          setValue('');
        }
      } else if (value.trim()) {
        // Add/update tag
        const trimmedTag = value.trim();
        
        // Check if this matches an existing tag from ALL notes (case-insensitive)
        const existingMatch = allTags.find(t => t.toLowerCase() === trimmedTag.toLowerCase());
        const tagToUse = existingMatch || trimmedTag; // Use existing capitalization if found
        
        if (!existingTags.some(t => t.toLowerCase() === tagToUse.toLowerCase())) {
          submittedRef.current = true;
          onAddTag(tagToUse);
          setValue('');
        }
      }
    } else if (e.key === 'Escape') {
      submittedRef.current = true;
      setValue('');
      onCancel?.();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    }
  }, [selectedIndex, suggestions.length, value, existingTags, allTags, onAddTag, onCancel]);

  const handleSelectSuggestion = useCallback((tag: string) => {
    clickingSuggestionRef.current = true;
    submittedRef.current = true;
    if (!existingTags.includes(tag)) {
      onAddTag(tag);
      setValue('');
    }
    // Reset flag after a short delay
    setTimeout(() => {
      clickingSuggestionRef.current = false;
    }, 100);
  }, [existingTags, onAddTag]);

  const handleBlur = useCallback(() => {
    // Skip blur handler if already submitted via Enter/Escape or clicking suggestion
    if (clickingSuggestionRef.current || submittedRef.current) {
      return;
    }
    
    // Delay to allow click on suggestion
    setTimeout(() => {
      // Double-check flags in case they were set during the timeout
      if (clickingSuggestionRef.current || submittedRef.current) {
        return;
      }
      
      if (value.trim()) {
        const trimmedTag = value.trim();
        
        // Check if this matches an existing tag from ALL notes (case-insensitive)
        const existingMatch = allTags.find(t => t.toLowerCase() === trimmedTag.toLowerCase());
        const tagToUse = existingMatch || trimmedTag; // Use existing capitalization if found
        
        if (!existingTags.some(t => t.toLowerCase() === tagToUse.toLowerCase())) {
          onAddTag(tagToUse);
        }
      }
      setValue('');
      onCancel?.();
    }, 200);
  }, [value, existingTags, allTags, onAddTag, onCancel]);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Hidden span to measure text width */}
      <span
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'pre',
          fontSize: '14px',
          fontWeight: 400,
          fontFamily: 'inherit',
        }}
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        style={{
          padding: '0px 4px',
          fontSize: '14px',
          fontWeight: 400,
          fontFamily: 'inherit',
          color: colors.text.secondary,
          caretColor: colors.text.default,
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: isEditing ? '3px' : 0,
          outline: 'none',
          width: inputWidth ? `${inputWidth}px` : 'auto',
          minWidth: isEditing ? '40px' : '120px',
          margin: 0,
          height: '20px',
          minHeight: '20px',
          lineHeight: '20px',
          display: 'inline-block',
          boxSizing: 'border-box',
        }}
      />
      {suggestions.length > 0 && (
        <TagAutocomplete
          suggestions={suggestions}
          onSelect={handleSelectSuggestion}
          selectedIndex={selectedIndex}
        />
      )}
    </div>
  );
};


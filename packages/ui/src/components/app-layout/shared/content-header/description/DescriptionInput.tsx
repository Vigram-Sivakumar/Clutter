import { useRef, useEffect } from 'react';
import { useTheme } from '../../../../../hooks/useTheme';
import { typography } from '../../../../../tokens/typography';

interface DescriptionInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  readOnly?: boolean;
}

export const DescriptionInput = ({ placeholder = 'Add description...', value, onChange, onBlur, autoFocus = false, readOnly = false }: DescriptionInputProps) => {
  const { colors } = useTheme();
  const descriptionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && descriptionRef.current && !readOnly) {
      descriptionRef.current.focus();
    }
  }, [autoFocus, readOnly]);

  useEffect(() => {
    if (descriptionRef.current && value !== undefined && descriptionRef.current.textContent !== value) {
      descriptionRef.current.textContent = value;
    }
  }, [value]);

  return (
    <div
      ref={descriptionRef}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      style={{
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.normal,
        color: colors.text.tertiary,
        caretColor: readOnly ? 'transparent' : colors.text.default,
        margin: 0,
        padding: '2px 0',
        outline: 'none',
        minHeight: '24px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: typography.lineHeightPx.sm,
        cursor: readOnly ? 'default' : 'text',
      }}
      onInput={readOnly ? undefined : (e) => {
        const content = e.currentTarget.textContent || '';
        // Show placeholder immediately when all text is erased
        if (!content.trim()) {
          e.currentTarget.textContent = '';
        }
        onChange?.(content);
      }}
      onBlur={readOnly ? undefined : (e) => {
        const content = e.currentTarget.textContent || '';
        // Remove empty content to show placeholder
        if (!content.trim()) {
          e.currentTarget.textContent = '';
          onBlur?.();
        }
      }}
    />
  );
};


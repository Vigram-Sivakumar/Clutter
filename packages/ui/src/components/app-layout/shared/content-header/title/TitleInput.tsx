import { useTheme } from '../../../../../hooks/useTheme';
import { typography } from '../../../../../tokens/typography';
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface TitleInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onEnter?: () => void;
  readOnly?: boolean;
}

export interface TitleInputHandle {
  focus: () => void;
}

export const TitleInput = forwardRef<TitleInputHandle, TitleInputProps>(({ placeholder = 'Untitled Clutter', value, onChange, onEnter, readOnly = false }, ref) => {
  const { colors } = useTheme();
  const divRef = useRef<HTMLDivElement>(null);
  
  // Expose focus method to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (divRef.current) {
        divRef.current.focus();
        // Place cursor at the end
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(divRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    },
  }));

  useEffect(() => {
    if (!divRef.current || value === undefined) return;
    
    if (divRef.current.textContent !== value) {
      divRef.current.textContent = value;
    }
  }, [value]);

  return (
    <div
      ref={divRef}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      style={{
        fontSize: '32px',
        fontWeight: 700,
        fontFamily: typography.fontFamily.sans,
        color: colors.text.default,
        caretColor: readOnly ? 'transparent' : colors.text.default,
        margin: 0,
        padding: 0,
        outline: 'none',
        minHeight: '32px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: '32px',
        cursor: readOnly ? 'default' : 'text',
        userSelect: readOnly ? 'none' : 'auto',
      }}
      onInput={(e) => {
        if (readOnly) return;
        const content = e.currentTarget.textContent || '';
        // Show placeholder immediately when all text is erased
        if (!content.trim()) {
          e.currentTarget.textContent = '';
        }
        onChange?.(content);
      }}
      onBlur={(e) => {
        if (readOnly) return;
        // Remove empty content to show placeholder
        if (!e.currentTarget.textContent?.trim()) {
          e.currentTarget.textContent = '';
        }
      }}
      onKeyDown={(e) => {
        if (readOnly) {
          e.preventDefault();
          return;
        }
        // Enter moves focus to editor (no multi-line titles)
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter?.();
        }
      }}
    />
  );
});


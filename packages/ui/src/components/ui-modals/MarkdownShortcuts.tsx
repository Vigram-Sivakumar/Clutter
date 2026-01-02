import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../tokens/spacing';
import { sizing } from '../../tokens/sizing';
import { typography } from '../../tokens/typography';
import { Button } from '../ui-buttons';
import { X } from '../../icons';
import { useEffect, useRef } from 'react';

interface MarkdownShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLDivElement>;
}

interface Shortcut {
  pattern: string;
  description: string;
  category: 'block' | 'inline' | 'list';
}

const shortcuts: Shortcut[] = [
  // Headings
  { pattern: '# ', description: 'Heading 1', category: 'block' },
  { pattern: '## ', description: 'Heading 2', category: 'block' },
  { pattern: '### ', description: 'Heading 3', category: 'block' },
  
  // Lists
  { pattern: '- ', description: 'Bullet list', category: 'list' },
  { pattern: '1. ', description: 'Numbered list', category: 'list' },
  
  // Blocks
  { pattern: '> ', description: 'Blockquote', category: 'block' },
  { pattern: '``` ', description: 'Code block', category: 'block' },
  { pattern: '---', description: 'Horizontal rule', category: 'block' },
  
  // Inline
  { pattern: '**text**', description: 'Bold', category: 'inline' },
  { pattern: '*text*', description: 'Italic', category: 'inline' },
  { pattern: '~~text~~', description: 'Strikethrough', category: 'inline' },
  { pattern: '`code`', description: 'Inline code', category: 'inline' },
  { pattern: '[text](url)', description: 'Link', category: 'inline' },
  { pattern: '![alt](url)', description: 'Image', category: 'inline' },
];

export const MarkdownShortcuts = ({ isOpen, onClose, buttonRef }: MarkdownShortcutsProps) => {
  const { colors } = useTheme();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef?.current && popoverRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const popover = popoverRef.current;

      requestAnimationFrame(() => {
        const popoverHeight = popover.offsetHeight;
        const popoverWidth = popover.offsetWidth;
        const viewportWidth = window.innerWidth;

        let top = buttonRect.top - popoverHeight - 8; // Position above button with 8px gap
        let left = buttonRect.left;

        if (top < 8) { // If not enough space above, position below
          top = buttonRect.bottom + 8;
        }
        if (left + popoverWidth > viewportWidth - 8) { // Adjust if off right edge
          left = viewportWidth - popoverWidth - 8;
        }
        if (left < 8) { // Adjust if off left edge
          left = 8;
        }

        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
      });
    }
  }, [isOpen, buttonRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        popoverRef.current &&
        buttonRef?.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  const categories: Array<{ name: string; category: 'block' | 'inline' | 'list' }> = [
    { name: 'Blocks', category: 'block' },
    { name: 'Lists', category: 'list' },
    { name: 'Inline', category: 'inline' },
  ];

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border.default}`,
        borderRadius: sizing.radius.lg,
        padding: spacing['12'],
        maxWidth: '320px',
        maxHeight: '60vh',
        overflow: 'auto',
        boxShadow: `0 ${spacing['4']} ${spacing['16']} ${colors.shadow.md}`,
        zIndex: sizing.zIndex.tooltip,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing['16'],
        }}
      >
        <h2
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.default,
            margin: 0,
            letterSpacing: typography.letterSpacing.wide,
          }}
        >
          Markdown
        </h2>
        <Button
          variant="tertiary"
          size="small"
          icon={<X size={parseInt(sizing.icon.xs)} />}
          onClick={onClose}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'px' }}>
        {categories.map(({ name, category }) => {
          const categoryShortcuts = shortcuts.filter(s => s.category === category);
          
          return (
            <div key={category}>
              <h3
                style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.default,
                  margin: `0 0 ${spacing['6']} 0`,
                  textTransform: 'uppercase',
                  letterSpacing: typography.letterSpacing.wide,
                }}
              >
                {name}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: spacing['5xl'],
                      padding: `${spacing['4']} 0`,
                      borderRadius: sizing.radius.sm,
                    }}
                  >
                    <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                      {shortcut.description}
                    </span>
                    <code
                      style={{
                        fontSize: typography.fontSize.xs,
                        fontFamily: typography.fontFamily.mono,
                        color: colors.text.tertiary,
                      }}
                    >
                      {shortcut.pattern}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

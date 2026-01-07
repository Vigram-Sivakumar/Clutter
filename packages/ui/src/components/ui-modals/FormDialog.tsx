import { useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useFormDialogStore } from '@clutter/state';
import { radius } from '../../tokens/radius';
import { spacing } from '../../tokens/spacing';
import { typography } from '../../tokens/typography';
import { TertiaryButton } from '../ui-buttons';
import { X } from '../../icons';

export const FormDialog = () => {
  const { colors } = useTheme();
  const isOpen = useFormDialogStore((state) => state.isOpen);
  const content = useFormDialogStore((state) => state.content);
  const title = useFormDialogStore((state) => state.title);
  const close = useFormDialogStore((state) => state.close);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: colors.overlay.backdrop,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        {/* Dialog */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.background.default,
            borderRadius: radius['12'],
            padding: spacing['16'],
            width: '320px',
            boxShadow: `0 20px 25px -5px ${colors.shadow.md}, 0 10px 10px -5px ${colors.shadow.sm}`,
            border: `1px solid ${colors.border.default}`,
          }}
        >
          {/* Title and Close Button Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: title ? spacing['20'] : spacing['0'] }}>
            {/* Title (optional) */}
            {title && (
              <div
                style={{
                  fontSize: typography.fontSize['14'],
                  fontWeight: 800,
                  color: colors.text.default,
                  flex: 1,
                }}
              >
                {title}
              </div>
            )}
            
            {/* Close Button */}
            <TertiaryButton
              icon={<X size={16} />}
              onClick={close}
              size="small"
            />
          </div>

          {/* Dynamic Content */}
          {content}
        </div>
      </div>
    </>
  );
};


import { useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useConfirmationStore } from '@clutter/shared';
import { radius } from '../../tokens/radius';
import { spacing } from '../../tokens/spacing';
import { typography } from '../../tokens/typography';
import { SecondaryButton, PrimaryButton } from '../ui-buttons';

export const ConfirmationDialog = () => {
  const { colors } = useTheme();
  const isOpen = useConfirmationStore((state) => state.isOpen);
  const title = useConfirmationStore((state) => state.title);
  const description = useConfirmationStore((state) => state.description);
  const isDangerous = useConfirmationStore((state) => state.isDangerous);
  const onConfirm = useConfirmationStore((state) => state.onConfirm);
  const close = useConfirmationStore((state) => state.close);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    close();
  };

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
            width: '256px',
            minWidth: '220px',
            maxWidth: '256px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: `1px solid ${colors.border.default}`,
          }}
        >
          {title && (
            <div
              style={{
                fontSize: typography.fontSize['14'],
                fontWeight: 800,
                color: colors.text.default,
                marginBottom: spacing['12'],
              }}
            >
              {title}
            </div>
          )}
          {description && (
            <div
              style={{
                fontSize: typography.fontSize['12'],
                color: colors.text.secondary,
                lineHeight: typography.lineHeight.normal,
                marginBottom: spacing['16'],
              }}
            >
              {description}
            </div>
          )}

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              gap: spacing['8'],
              justifyContent: 'flex-end',
            }}
          >
            <SecondaryButton size="medium" fullWidth onClick={close}>
              Cancel
            </SecondaryButton>
            <PrimaryButton size="medium" fullWidth danger={isDangerous} onClick={handleConfirm}>
              {isDangerous ? 'Delete' : 'Confirm'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </>
  );
};


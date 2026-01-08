import { useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useConfirmationStore } from '@clutter/state';
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
  const confirmLabel = useConfirmationStore((state) => state.confirmLabel);
  const actions = useConfirmationStore((state) => state.actions);
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
            minWidth: '256px',
            maxWidth: '320px',
            boxShadow: `0 20px 25px -5px ${colors.shadow.md}, 0 10px 10px -5px ${colors.shadow.sm}`,
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
                whiteSpace: 'pre-line',
              }}
            >
              {description}
            </div>
          )}

          {/* Multi-action buttons (3+) */}
          {actions && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing['8'],
              }}
            >
              {actions.map((action, index) => {
                const Button =
                  action.variant === 'secondary'
                    ? SecondaryButton
                    : PrimaryButton;
                return (
                  <Button
                    key={index}
                    size="medium"
                    fullWidth
                    danger={action.variant === 'danger'}
                    onClick={() => {
                      action.onClick();
                      close();
                    }}
                  >
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Standard two-button layout */}
          {!actions && (
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
              <PrimaryButton
                size="medium"
                fullWidth
                danger={isDangerous}
                onClick={handleConfirm}
              >
                {confirmLabel || (isDangerous ? 'Delete' : 'Confirm')}
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

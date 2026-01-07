import { ReactNode, useEffect } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { X } from '../../../../icons';
import { TertiaryButton } from '../../../ui-buttons';

interface NoteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const NoteDrawer = ({ isOpen, onClose, children }: NoteDrawerProps) => {
  const { colors } = useTheme();

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: colors.overlay.default,
          zIndex: 1000,
          animation: 'fadeIn 200ms ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '600px',
          maxWidth: '90vw',
          backgroundColor: colors.background.default,
          borderLeft: `1px solid ${colors.border.default}`,
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: `-4px 0 24px ${colors.shadow.lg}`,
          animation: 'slideInRight 250ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: `1px solid ${colors.border.divider}`,
            flexShrink: 0,
          }}
        >
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: colors.text.default,
            margin: 0,
          }}>
            New Note
          </h3>
          <TertiaryButton
            icon={<X size={16} />}
            onClick={onClose}
            size="medium"
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};




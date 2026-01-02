import { useRef, useEffect } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { useTheme } from '../../../../hooks/useTheme';

interface EmojiTrayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  /** Position for the tray */
  position?: { top: number; left: number };
}

export const EmojiTray = ({ isOpen, onClose, onSelect, position }: EmojiTrayProps) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const { mode } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      // Delay adding listener to prevent immediate close
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  const handleEmojiSelect = (emoji: any) => {
    onSelect(emoji.native);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'fixed',
        top: position?.top ?? 100,
        left: position?.left ?? 100,
        zIndex: 1000,
      }}
    >
      <Picker
        data={data}
        onEmojiSelect={handleEmojiSelect}
        theme={mode === 'light' ? 'light' : 'dark'}
      />
    </div>
  );
};


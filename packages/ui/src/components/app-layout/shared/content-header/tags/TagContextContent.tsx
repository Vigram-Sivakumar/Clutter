import { useState } from 'react';

import { useTheme } from '../../../../../hooks/useTheme';
import { ColorTray } from './ColorTray';
import { spacing } from '../../../../../tokens/spacing';

interface TagContextContentProps {
  tag: string;
  currentColor: string;
  onFilter: (tag: string) => void;
  onRename: (oldTag: string, newTag: string) => void;
  onColorChange: (tag: string, color: string) => void;
}

export const TagContextContent = ({
  tag,
  currentColor,
  onFilter,
  onRename,
  onColorChange,
}: TagContextContentProps) => {
  const { colors } = useTheme();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(tag);
  const [showColorTray, setShowColorTray] = useState(false);
  const [colorButtonPos, setColorButtonPos] = useState({ top: 0, left: 0 });

  const handleRenameSubmit = () => {
    if (newName.trim() && newName !== tag) {
      onRename(tag, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleColorClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setColorButtonPos({ top: rect.bottom, left: rect.left });
    setShowColorTray(!showColorTray);
  };

  if (isRenaming) {
    return (
      <div style={{ padding: spacing['4'] }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleRenameSubmit();
            } else if (e.key === 'Escape') {
              setIsRenaming(false);
              setNewName(tag);
            }
          }}
          onBlur={handleRenameSubmit}
          autoFocus
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '14px',
            border: `1px solid ${colors.border.default}`,
            borderRadius: '4px',
            backgroundColor: colors.background.secondary,
            color: colors.text.default,
            outline: 'none',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['4'] }}>
      <button
        onClick={() => onFilter(tag)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing['8'],
          padding: '6px 8px',
          fontSize: '14px',
          color: colors.text.secondary,
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.background.tertiary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Filter by tag
      </button>
      <button
        onClick={() => setIsRenaming(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing['8'],
          padding: '6px 8px',
          fontSize: '14px',
          color: colors.text.secondary,
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.background.tertiary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Rename tag
      </button>
      <button
        onClick={handleColorClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing['8'],
          padding: '6px 8px',
          fontSize: '14px',
          color: colors.text.secondary,
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.background.tertiary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Change color
      </button>
      <ColorTray
        isOpen={showColorTray}
        onClose={() => setShowColorTray(false)}
        onSelect={(color) => {
          onColorChange(tag, color);
          setShowColorTray(false);
        }}
        selectedColor={currentColor}
        position={colorButtonPos}
      />
    </div>
  );
};


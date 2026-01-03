import { useState } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { MoreVertical, Folder } from '../../../../icons';
import { spacing } from '../../../../tokens/spacing';
import { NoteCard } from '../../shared/note-card';

export const FolderCard4 = () => {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  
  // Sample note for preview
  const sampleNote = {
    id: '1',
    title: 'Meeting Notes',
    emoji: '📝',
    contentSnippet: 'Discussed project timeline and key deliverables for Q1...',
  };
  
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '160px',
        // minWidth: '180px',
        // maxWidth: '180px',
        height: '180px',
        flexShrink: 0,
        backgroundColor: colors.background.secondary,
        borderRadius: '12px',
        position: 'relative',
        overflow: 'hidden',
        border: `.5px solid ${colors.border.subtle}`,
      }}
    >
      {/* Peeking Note Card */}
      <div
        className= "card-3"

        style={{
          position: 'absolute',
          width: '80%',
          height: '87%',
          bottom: '0px',
          right: '20px',
          zIndex: 1,
          rotate: '-5deg',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02)',
        }}
      >
        <NoteCard note={sampleNote} fontSize="9px" />
      </div>
      <div
        className= "card-2"

        style={{
          position: 'absolute',
          width: '80%',
          height: '85%',
          bottom: '9px',
          right: '20px',
          zIndex: 2,
          rotate: '10deg',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05), 0 1px 5px rgba(0, 0, 0, 0.03)',
        }}
      >
        <NoteCard note={sampleNote} fontSize="9px" />
      </div>
      <div
        className= "card-1"
        style={{
          position: 'absolute',
          width: '80%',
          height: '85%',
          bottom: '0px',
          right: '20px',
          zIndex: 3,
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.06), 0 1px 6px rgba(0, 0, 0, 0.04)',
        }}
      >
        <NoteCard note={sampleNote} fontSize="9px" />
      </div>

      <div
        className="folder-card-info"
        style={{
          width: '80%',
          height: '60%',
          position: 'absolute',
          bottom: 0,
          left: 0,
          backgroundColor: colors.background.tertiary,
          borderRadius: '0px 12px 0px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          zIndex: 5,
          boxShadow: '4px -4px 24px 8px rgba(0, 0, 0, 0.03), 2px -2px 12px 4px rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* Context Menu Button */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.15s ease',
            cursor: 'pointer',
            color: colors.text.tertiary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
          }}
          onClick={(e) => {
            e.stopPropagation();
            // Handle context menu
          }}
        >
          <MoreVertical size={16} />
        </div>

        {/* Folder Info Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: spacing['4'],
            padding: spacing['12'],
          }}
        >
          <Folder size={20} color={colors.text.secondary} />
          <div
            style={{
              fontSize: '13px',
              fontWeight: 400,
              color: colors.text.default,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Folder Name
          </div>
        </div>
      </div>
    </div>
  );
};


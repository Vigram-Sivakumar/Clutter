import { useState } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { NoteCard } from '../../shared/note-card';
import { Folder, MoreVertical } from '../../../../icons';
import { spacing } from '../../../../tokens/spacing';

// Stacked note cards component - using same transform logic as FolderCard
const StackedNoteCards = ({ isHovered }: { isHovered: boolean }) => {
  // Sample notes for preview
  const sampleNotes = [
    {
      id: '1',
      title: 'Meeting Notes',
      emoji: '🍎',
      contentSnippet: 'Discussed project timeline and deliverables for Q1...',
    },
    {
      id: '2',
      title: 'Ideas',
      emoji: '🍊',
      contentSnippet: 'New feature concepts for the upcoming release...',
    },
    {
      id: '3',
      title: 'Todo List',
      emoji: '🍇',
      contentSnippet: 'Complete design review, update documentation...',
    },
  ];
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Card 1 - left document */}
      <div
        style={{
          position: 'absolute',
          width: '70%',
          aspectRatio: '0.75', // Document proportions
          transform: isHovered 
            ? 'translate(-50%, 0%) translateX(-10%) translateY(-6%) rotate(-10deg)'
            : 'translate(-50%, 0%) translateX(-5%) translateY(0%) rotate(-8deg)',
          left: '50%',
          top: '24px',
          zIndex: 1,
          filter: isHovered 
            ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.04)) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.05))' 
            : 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.03)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.02))',
          transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div style={{ width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
          <NoteCard note={sampleNotes[0]!} fontSize="10px" />
        </div>
      </div>
      
      {/* Card 2 - center document */}
      <div
        style={{
          position: 'absolute',
          width: '70%',
          aspectRatio: '0.75', // Document proportions
          transform: isHovered 
            ? 'translate(-50%, 0%) translateX(0%) translateY(-10%) rotate(0deg)'
            : 'translate(-50%, 0%) translateX(0%) translateY(0%) rotate(0deg)',
          left: '50%',
          top: '24px',
          zIndex: 2,
          filter: isHovered 
            ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.04)) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.05))' 
            : 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.03)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.02))',
          transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div style={{ width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
          <NoteCard note={sampleNotes[1]!} fontSize="10px" />
        </div>
      </div>
      
      {/* Card 3 - right document */}
      <div
        style={{
          position: 'absolute',
          width: '70%',
          aspectRatio: '0.75', // Document proportions
          transform: isHovered 
            ? 'translate(-50%, 0%) translateX(10%) translateY(-6%) rotate(10deg)'
            : 'translate(-50%, 0%) translateX(5%) translateY(0%) rotate(8deg)',
          left: '50%',
          top: '24px',
          zIndex: 3,
          filter: isHovered 
            ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.04)) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.05))' 
            : 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.03)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.02))',
          transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div style={{ width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
          <NoteCard note={sampleNotes[2]!} fontSize="10px" />
        </div>
      </div>
    </div>
  );
};

export const FolderCardType3 = () => {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '150px',
        height: '150px',
        // aspectRatio: '1 / 1',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        backgroundColor: colors.background.secondary,
        overflow: 'hidden',
      }}
    >
      {/* Cards wrapper - 70% height */}
      <div
        style={{
          position: 'relative',
          height: '70%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <StackedNoteCards isHovered={isHovered} />
      </div>
      
      {/* Title section at bottom - 30% height */}
      <div
        style={{
          height: '30%',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: `1px solid ${colors.border.subtle}`,
          backgroundColor: colors.background.secondary,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing['4'],
            width: '100%',
            minWidth: 0,
            position: 'relative',
          }}
        >
          {/* Emoji or Folder Icon */}
          <div
            style={{
              fontSize: '14px',
              lineHeight: 1,
              flexShrink: 0,
              color: colors.text.tertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Change to emoji: '📁' or use Folder icon */}
            <Folder size={16} />
          </div>
          
          {/* Title */}
          <div
            style={{
              fontSize: '14px',
              fontWeight: 400,
              color: colors.text.default,
              flex: 1,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            Folder Name
          </div>

          {/* More Context Icon (shown on hover) */}
          <div
            style={{
              flexShrink: 0,
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.15s ease',
              cursor: 'pointer',
              color: colors.text.tertiary,
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Handle context menu
            }}
          >
            <MoreVertical size={16} />
          </div>
        </div>
      </div>
    </div>
  );
};


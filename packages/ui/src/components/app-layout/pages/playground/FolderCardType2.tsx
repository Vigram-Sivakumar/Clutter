import { useState } from 'react';
import { NoteCard } from '../../shared/note-card';

// Stacked note cards component - using NoteCard from FolderCard
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
    <div
      style={{
        position: 'relative',
        height: '100%',
        aspectRatio: '6 / 7', // Maintain note card ratio (portrait)
      }}
    >
      {/* Card 1 - bottom - landed tilted right slightly */}
      <div
        style={{
          position: 'absolute',
          top: '-1px',
          left: 0,
          width: '100%',
          height: '100%',
          transform: isHovered ? 'rotate(4deg) translate(4px, 0px)' : 'rotate(.5deg) translate(4px, 0px)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.03)',
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          borderRadius: '6px',
        }}
      >
        <NoteCard note={sampleNotes[0]!} fontSize="10px" />
      </div>
      
      {/* Card 2 - middle - landed almost straight */}
      <div
        style={{
          position: 'absolute',
          top: '-2px',
          width: '100%',
          height: '100%',
          transform: isHovered ? 'rotate(-10deg) translate(-8px, 2px)' : 'rotate(-9deg) translate(-1px, 0px)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.03)',
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          borderRadius: '6px',
        }}
      >
        <NoteCard note={sampleNotes[1]!} fontSize="10px" />
      </div>
      
      {/* Card 3 - top - landed tilted right, slightly offset */}
      <div
        style={{
          position: 'absolute',
          top: '-2px',
          left: 0,
          width: '100%',
          height: '100%',
          transform: isHovered ? 'rotate(5deg) translate(8px, -3px)' : 'rotate(2deg) translate(3px, -1px)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.03)',
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          borderRadius: '6px',
        }}
      >
        <NoteCard note={sampleNotes[2]!} fontSize="10px" />
      </div>
    </div>
  );
};

export const FolderCardType2 = () => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      style={{
        width: '180px',
        height: '180px',
        borderRadius: '12px',
        padding: '16px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <StackedNoteCards isHovered={isHovered} />
    </div>
  );
};


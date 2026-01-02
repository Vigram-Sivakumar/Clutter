import { ReactNode } from 'react';
import { FolderCard, FolderCardData } from './FolderCard';
import { spacing } from '../../../../tokens/spacing';
import { useTheme } from '../../../../hooks/useTheme';


export interface FolderGridProps {
  folders: FolderCardData[];
  onClick: (folderId: string) => void;
  onNoteClick?: (noteId: string) => void;
  onCreateNote?: (folderId: string) => void;
  onContextMenu?: (folderId: string) => void;
  cardSize?: string;
  gap?: string;
  emptyState?: ReactNode;
}

export const FolderGrid = ({
  folders,
  onClick,
  onNoteClick,
  onCreateNote,
  onContextMenu,
  cardSize = '180px',
  gap = spacing['16'],
  emptyState,
}: FolderGridProps) => {
  const { colors } = useTheme();
  
  // Show empty state if no folders and emptyState is provided
  if (folders.length === 0 && emptyState) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          padding: spacing['20'],
          color: colors.text.tertiary,
          fontSize: '14px',
          textAlign: 'center',
        }}
      >
        {emptyState}
      </div>
    );
  }
  
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '32px',
        width: '100%',
      }}
    >
      {folders.map((folder) => (
        <div
          key={folder.id}
          style={{
            width: cardSize,
            flex: '0 0 auto',
          }}
        >
          <FolderCard
            folder={folder}
            onClick={onClick}
            onNoteClick={onNoteClick}
            onCreateNote={onCreateNote}
            onContextMenu={onContextMenu}
          />
        </div>
      ))}
    </div>
  );
};


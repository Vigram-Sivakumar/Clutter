import { useState } from 'react';
import { MoreVertical, Plus, Folder } from '../../../../icons';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing } from '../../../../tokens/spacing';
import { CountBadge } from '../../../ui-primitives';
import { sizing } from '../../../../tokens/sizing';
import { typography } from '../../../../tokens/typography';
import { Button } from '../../../ui-buttons';

/**
 * FolderCard Design Specification
 * Single source of truth for all design tokens used in this component
 */
const DESIGN = {
  sizing: {
    cardMinHeight: '220px',                     // Minimum height of the entire card
    previewHeight: '90px',                      // Height of each note preview in the grid
    borderRadius: sizing.radius.lg,             // Corner radius for cards and previews
  },
  spacing: {
    cardPadding: spacing['12'],                    // Padding inside the main card container
    headerGap: spacing['8'],             // Gap between header items (icon, title, actions)
    metadataGap: spacing['8'],           // Gap between metadata badges
    previewGridGap: spacing['8'],        // Gap between note preview cards in grid
    previewPadding: '0.8em',                    // Padding inside note preview (relative to fontSize)
    previewInnerGap: '0.4em',                   // Gap between elements inside preview (relative to fontSize)
  },
  typography: {
    folderNameSize: typography.fontSize.base,   // Font size for folder name
    folderNameWeight: typography.fontWeight.semibold, // Font weight for folder name
    subtitleSize: typography.fontSize.xs,       // Font size for subtitle
    previewBaseSize: '12px',                    // Base font size for note previews (everything scales from this)
    previewTitleSize: '1.1em',                  // Title size in preview (relative to base)
    previewContentSize: '0.9em',                // Content snippet size (relative to base)
    previewEmojiSize: '1.6em',                  // Emoji size in preview (relative to base)
    emptyStateSize: typography.fontSize.sm,     // Font size for empty state text
  },
  transitions: {
    hover: '150ms ease',                        // Hover transition timing
  },
} as const;

export interface NotePreview {
  id: string;
  title: string;
  emoji: string | null;
  contentSnippet?: string;
}

export interface FolderCardData {
  id: string;
  name: string;
  emoji?: string | null;
  subtitle?: string;
  noteCount: number;
  folderCount?: number; // Number of subfolders
  color?: string | null;
  previewNotes?: NotePreview[]; // Top 3 notes for preview
}

export interface FolderCardProps {
  folder: FolderCardData;
  onClick: (folderId: string) => void;
  onNoteClick?: (noteId: string) => void; // Click individual note to open it
  onCreateNote?: (folderId: string) => void; // Click empty state to create note
  onContextMenu?: (folderId: string) => void;
}

// Mini Note Preview Component
const MiniNotePreview = ({ note }: { note: NotePreview }) => {
  const { colors } = useTheme();
  
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: colors.background.default,
        border: `1px solid ${colors.border.divider}`,
        borderRadius: DESIGN.sizing.borderRadius,
        fontSize: DESIGN.typography.previewBaseSize,
        padding: DESIGN.spacing.previewPadding,
        display: 'flex',
        flexDirection: 'column',
        gap: DESIGN.spacing.previewInnerGap,
        overflow: 'hidden',
      }}
    >
      {/* Emoji */}
      {note.emoji && (
        <div
          style={{
            fontSize: DESIGN.typography.previewEmojiSize,
            lineHeight: 1,
          }}
        >
          {note.emoji}
        </div>
      )}
      
      {/* Title */}
      <div
        style={{
          fontSize: DESIGN.typography.previewTitleSize,
          fontWeight: 600,
          color: note.title ? colors.text.secondary : colors.text.placeholder,
          lineHeight: typography.lineHeight.tight,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {note.title || 'Untitled'}
      </div>
      
      {/* Content Snippet */}
      {note.contentSnippet && (
        <div
          style={{
            fontSize: DESIGN.typography.previewContentSize,
            color: colors.text.tertiary,
            lineHeight: typography.lineHeight.tight,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {note.contentSnippet}
        </div>
      )}
    </div>
  );
};

export const FolderCard = ({ folder, onClick, onNoteClick, onCreateNote, onContextMenu }: FolderCardProps) => {
  const { colors, mode } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isTitleHovered, setIsTitleHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1 / 1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: sizing.radius.md,
        // border: `1px solid ${colors.border.divider}`,
        // backgroundColor: colors.background.secondary,
      }}
      >
      {/* Document Icons */}
      <DocumentIcons 
        count={folder.noteCount} 
        isHovered={isHovered}
        previewNotes={folder.previewNotes}
        onNoteClick={onNoteClick}
        onCreateNote={() => onCreateNote?.(folder.id)}
      />
      
      {/* Folder Info - Bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          background: colors.background.default,

          // boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.12)',
        }}
        >
        {/* Pocket shadow (ellipse behind Folder Info) */}
        <div
          style={{
            position: 'absolute',
            top: -16,
            left: '50%',
            transform: 'translateX(-50%) scaleY(0.4)',
            width: '100%',
            height: 32,
            pointerEvents: 'none',
            background:
              mode === 'dark'
                ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.18) 30%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.06) 70%, rgba(0,0,0,0) 85%)'
                : 'radial-gradient(ellipse at center, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.02) 70%, rgba(0,0,0,0) 85%)',
            filter: 'blur(12px)',
          }}
        />

        <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          textAlign: 'center',
          gap: DESIGN.spacing.headerGap,
          width: '100%',
          padding: DESIGN.spacing.cardPadding,
          zIndex: 1,
          background: colors.background.default,
          borderTop: `1px solid ${colors.border.SubtleDivider}`,
          }}
          >
          {/* Folder Name with optional emoji */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: DESIGN.spacing.headerGap,
              width: '100%',
              minWidth: 0,
            }}
          >
            {/* Emoji - only shown if exists */}
            {folder.emoji && (
              <div
                style={{
                  fontSize: '16px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {folder.emoji}
              </div>
            )}
            
            <div
              onClick={() => onClick(folder.id)}
              onMouseEnter={() => setIsTitleHovered(true)}
              onMouseLeave={() => setIsTitleHovered(false)}
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: colors.text.default,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                textDecoration: isTitleHovered ? 'underline' : 'none',
                transition: 'text-decoration 0.15s ease',
                cursor: 'pointer',
              }}
            >
              {folder.name}
            </div>
          </div>
          <div
            style={{
              fontSize: '12px',
              color: colors.text.secondary,
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: spacing['8'],
            }}
          >
            {folder.noteCount === 0 && (folder.folderCount ?? 0) === 0 ? (
              'Empty'
            ) : (
              <>
                {/* Notes count */}
                <CountBadge count={folder.noteCount} type="notes" size="sm" />
                
                {/* Folders count */}
                <CountBadge count={folder.folderCount ?? 0} type="folders" size="sm" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Document icons based on count
interface DocumentIconsProps {
  count: number;
  isHovered: boolean;
  previewNotes?: NotePreview[];
  onNoteClick?: (noteId: string) => void;
  onCreateNote?: () => void;
}

const DocumentIcons = ({ count, isHovered, previewNotes, onNoteClick, onCreateNote }: DocumentIconsProps) => {
  if (count === 0) {
    return <OneDocument isHovered={isHovered} isEmpty={true} onCreateNote={onCreateNote} />;
  } else if (count === 1) {
    return <OneDocument isHovered={isHovered} note={previewNotes?.[0]} onNoteClick={onNoteClick} />;
  } else if (count === 2) {
    return <TwoDocuments isHovered={isHovered} notes={previewNotes?.slice(0, 2)} onNoteClick={onNoteClick} />;
  } else {
    return <ThreeDocuments isHovered={isHovered} notes={previewNotes?.slice(0, 3)} onNoteClick={onNoteClick} />;
  }
};

// Single Document Icon - shows note preview or empty state
const DocumentIcon = ({ 
  rotation = 0, 
  offsetX = '0%', 
  offsetY = '0%', 
  zIndex = 1, 
  isHovered = false, 
  hoverRotation = 0, 
  hoverOffsetX = '0%', 
  hoverOffsetY = '0%', 
  enableIndividualHover = true,
  note,
  onNoteClick,
  isEmpty = false,
  onCreateNote,
}: {
  rotation?: number;
  offsetX?: string;
  offsetY?: string;
  zIndex?: number;
  isHovered?: boolean;
  hoverRotation?: number;
  hoverOffsetX?: string;
  hoverOffsetY?: string;
  enableIndividualHover?: boolean;
  note?: NotePreview;
  onNoteClick?: (noteId: string) => void;
  isEmpty?: boolean;
  onCreateNote?: () => void;
}) => {
  const { colors } = useTheme();
  const [isIndividualHover, setIsIndividualHover] = useState(false);
  
  const finalRotation = isHovered ? hoverRotation : rotation;
  const finalOffsetX = isHovered ? hoverOffsetX : offsetX;
  const finalOffsetY = isHovered ? hoverOffsetY : offsetY;
  
  // Additional lift when individually hovered (only if enabled)
  const individualLiftY = (enableIndividualHover && isIndividualHover) ? '-8%' : '0%';
  const combinedOffsetY = `calc(${finalOffsetY} + ${individualLiftY})`;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEmpty && onCreateNote) {
      onCreateNote();
    } else if (note && onNoteClick) {
      onNoteClick(note.id);
    }
  };
  // Note card component
  return (
    <div
      onClick={handleClick}
      onMouseEnter={enableIndividualHover ? (e) => {
        e.stopPropagation();
        setIsIndividualHover(true);
      } : undefined}
      onMouseLeave={enableIndividualHover ? () => {
        setIsIndividualHover(false);
      } : undefined}
      style={{
        position: 'absolute',
        width: '70%',
        aspectRatio: '0.75', // Document proportions
        transform: `translate(-50%, -50%) translateX(${finalOffsetX}) translateY(${combinedOffsetY}) rotate(${finalRotation}deg)`,
        left: '50%',
        bottom: '-60%',
        zIndex,
        filter: isEmpty 
          ? 'none' 
          : isHovered 
            ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.04)) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.05))' 
            : 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.03)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.02))',
        transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease',
        opacity: isEmpty ? (isHovered ? 0.6 : 0.4) : 1,
        cursor: ((note && onNoteClick) || (isEmpty && onCreateNote)) ? 'pointer' : 'default',
      }}
    >
      {isEmpty ? (
        // Empty state - dashed border with icon
        <div
          style={{
            width: '100%',
            height: '100%',
            border: `1px dashed ${colors.border.divider}`,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: '16px',
          }}
        >
          <Plus 
            size={32} 
            style={{ 
              color: colors.text.placeholder,
              opacity: 0.5,
            }} 
          />
        </div>
      ) : (
        // Note preview
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          <MiniNotePreview 
            note={note || { 
              id: '', 
              title: '', 
              emoji: null, 
              contentSnippet: '...' 
            }} 
          />
        </div>
      )}
    </div>
  );
};

// One document - centered
const OneDocument = ({ isHovered, note, onNoteClick, isEmpty = false, onCreateNote }: { isHovered: boolean; note?: NotePreview; onNoteClick?: (noteId: string) => void; isEmpty?: boolean; onCreateNote?: () => void }) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DocumentIcon 
        rotation={0} 
        offsetX="0%" 
        offsetY="0%" 
        zIndex={1}
        isHovered={isHovered}
        hoverRotation={0}
        hoverOffsetX="0%"
        hoverOffsetY="-8%"
        enableIndividualHover={false}
        note={note}
        onNoteClick={onNoteClick}
        isEmpty={isEmpty}
        onCreateNote={onCreateNote}
      />
    </div>
  );
};

// Two documents - slight overlap
const TwoDocuments = ({ isHovered, notes, onNoteClick }: { isHovered: boolean; notes?: NotePreview[]; onNoteClick?: (noteId: string) => void }) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DocumentIcon 
        rotation={-5} 
        offsetX="-5%" 
        offsetY="0%" 
        zIndex={1}
        isHovered={isHovered}
        hoverRotation={-8}
        hoverOffsetX="-8%"
        hoverOffsetY="-8%"
        note={notes?.[0]}
        onNoteClick={onNoteClick}
      />
      <DocumentIcon 
        rotation={5} 
        offsetX="5%" 
        offsetY="0%" 
        zIndex={2}
        isHovered={isHovered}
        hoverRotation={8}
        hoverOffsetX="8%"
        hoverOffsetY="-8%"
        note={notes?.[1]}
        onNoteClick={onNoteClick}
      />
    </div>
  );
};

// Three documents - stacked
const ThreeDocuments = ({ isHovered, notes, onNoteClick }: { isHovered: boolean; notes?: NotePreview[]; onNoteClick?: (noteId: string) => void }) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DocumentIcon 
        rotation={-8} 
        offsetX="-5%" 
        offsetY="0%" 
        zIndex={1}
        isHovered={isHovered}
        hoverRotation={-10}
        hoverOffsetX="-10%"
        hoverOffsetY="-6%"
        note={notes?.[0]}
        onNoteClick={onNoteClick}
      />
      <DocumentIcon 
        rotation={0} 
        offsetX="0%" 
        offsetY="0%" 
        zIndex={2}
        isHovered={isHovered}
        hoverRotation={0}
        hoverOffsetX="0%"
        hoverOffsetY="-10%"
        note={notes?.[1]}
        onNoteClick={onNoteClick}
      />
      <DocumentIcon 
        rotation={8} 
        offsetX="5%" 
        offsetY="0%" 
        zIndex={3}
        isHovered={isHovered}
        hoverRotation={10}
        hoverOffsetX="10%"
        hoverOffsetY="-6%"
        note={notes?.[2]}
        onNoteClick={onNoteClick}
      />
    </div>
  );
};

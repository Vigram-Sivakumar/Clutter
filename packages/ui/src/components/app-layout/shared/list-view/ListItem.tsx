import { ReactNode, useState } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { useTagsStore } from '@clutter/state';
import { spacing } from '../../../../tokens/spacing';
import { sizing } from '../../../../tokens/sizing';
import { radius } from '../../../../tokens/radius';
import { getTagColor } from '../../../../utils/tagColors';
import { CountBadge } from '../../../ui-primitives';
import { TagPill } from '../content-header/tags';
import { TertiaryButton } from '../../../ui-buttons';
import { HashStraight as TagIcon, Folder as FolderIcon } from '../../../../icons';
import { getNoteIcon, getFolderIcon } from '../../../../utils/itemIcons';
import { Checkbox } from '../../../ui-checkbox';

/**
 * ListItem Design Specification
 * Single source of truth for all design tokens used in this component
 */
const DESIGN = {
  spacing: {
    iconToLabel: spacing['4'],        // Gap between icon/emoji and label text
    labelToMetadata: spacing['6'],             // Gap between label and metadata group (right side)
    metadataGap: spacing['8'],                 // Gap between metadata items (badges, tags)
    tagsGap: spacing['4'],                     // Gap between individual tag pills
    actionsGap: spacing['4'],                  // Gap between action buttons
    containerPadding: `${spacing['4']} ${spacing['2']}`,   // Padding inside the list item container (vertical horizontal)
  },
  sizing: {
    noteHeight: '28px',                      // Height of note variant items
    defaultHeight: '32px',                   // Height of tag/task/folder variant items
    borderRadius: radius['6'],               // Corner radius of the item container
    checkboxSize: 16,                        // Size of task checkbox
  },
  typography: {
    noteTitleSize: '16px',                   // Font size for note titles
    folderNameSize: '14px',                  // Font size for folder names
    taskTextSize: '14px',                    // Font size for task text
    tagPillSize: '14px',                     // Font size for tag pill text
    metadataSize: '12px',                    // Font size for metadata text
    emojiSize: '16px',                       // Font size for emoji icons (matches sizing.icon.sm)
  },
  transitions: {
    background: '100ms ease',                // Background color transition
    opacity: '100ms ease',                   // Opacity transition for hover states
  },
} as const;

type ListItemVariant = 'note' | 'tag' | 'task' | 'folder';

// Base props for all variants
interface BaseListItemProps {
  variant: ListItemVariant;
  isSelected?: boolean;
  isHovered?: boolean;
}

// Note variant props
export interface NoteListItemData {
  id: string;
  title: string;
  emoji?: string | null;
  tags: string[];
  taskCount: number;
  dailyNoteDate?: string | null; // ISO date string for daily notes
  hasContent?: boolean; // Whether note has editor content (for Note/NoteBlank icon switching)
  isToday?: boolean; // Whether this is today's daily note (for highlighting)
}

interface NoteListItemProps extends BaseListItemProps {
  variant: 'note';
  data: NoteListItemData;
  onTagClick?: (tag: string) => void;
  onRemoveTag?: (noteId: string, tag: string) => void;
  onEmojiClick?: (noteId: string, buttonElement: HTMLButtonElement) => void;
}

// Tag variant props
export interface TagListItemData {
  id: string;
  tag: string;
  noteCount: number;
  folderCount: number;
}

interface TagListItemProps extends BaseListItemProps {
  variant: 'tag';
  data: TagListItemData;
  actions?: ReactNode[];
  onColorClick?: (tag: string, buttonElement: HTMLButtonElement) => void;
}

// Task variant props
export interface TaskListItemData {
  id: string;
  text: string;
  checked: boolean;
  noteId: string;
  noteTitle: string;
  noteEmoji: string | null;
}

interface TaskListItemProps extends BaseListItemProps {
  variant: 'task';
  data: TaskListItemData;
  onToggle?: (taskId: string) => void;
}

// Folder variant props
export interface FolderListItemData {
  id: string;
  name: string;
  emoji?: string | null;
  noteCount: number;
  folderCount?: number;
}

interface FolderListItemProps extends BaseListItemProps {
  variant: 'folder';
  data: FolderListItemData;
  onEmojiClick?: (folderId: string, buttonElement: HTMLButtonElement) => void;
}

type ListItemProps = NoteListItemProps | TagListItemProps | TaskListItemProps | FolderListItemProps;

export const ListItem = (props: ListItemProps) => {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const { variant, isSelected = false } = props;

  // Base container styles
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: DESIGN.spacing.iconToLabel,
    height: variant === 'note' ? DESIGN.sizing.noteHeight : DESIGN.sizing.defaultHeight,
    padding: DESIGN.spacing.containerPadding,
    width: '100%',
    backgroundColor: isSelected 
      ? colors.background.tertiary 
      : isHovered 
      ? colors.background.subtleHover 
      : 'transparent',
    borderRadius: DESIGN.sizing.borderRadius,
    transition: `background-color ${DESIGN.transitions.background}`,
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={containerStyle}
    >
      {variant === 'note' && <NoteContent {...(props as NoteListItemProps)} isHovered={isHovered} />}
      {variant === 'tag' && <TagContent {...(props as TagListItemProps)} isHovered={isHovered} />}
      {variant === 'task' && <TaskContent {...(props as TaskListItemProps)} isHovered={isHovered} />}
      {variant === 'folder' && <FolderContent {...(props as FolderListItemProps)} isHovered={isHovered} />}
    </div>
  );
};

// Note variant content
const NoteContent = ({ data, onTagClick, onRemoveTag, onEmojiClick, isHovered }: NoteListItemProps & { isHovered: boolean }) => {
  const { colors } = useTheme();

  // Use centralized icon system - don't use accent color on icon, only on label
  const noteIcon = getNoteIcon({
    emoji: data.emoji || undefined,
    dailyNoteDate: data.dailyNoteDate,
    hasContent: data.hasContent,
    size: 16,
    color: colors.text.secondary,
  });

  return (
    <>
      {/* Icon/Emoji - Using TertiaryButton with dot indicator */}
      <div style={{ position: 'relative' }}>
        {/* Dot indicator for today's daily note */}
        {data.isToday && (
          <div
            style={{
              position: 'absolute',
              left: '-6px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: colors.semantic.calendarAccent,
              pointerEvents: 'none',
            }}
          />
        )}
        
        <TertiaryButton
          icon={noteIcon}
          onClick={(e) => {
            e.stopPropagation();
            if (onEmojiClick) {
              onEmojiClick(data.id, e.currentTarget as HTMLButtonElement);
            }
          }}
          size="small"
        />
      </div>

      {/* Title */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginRight: DESIGN.spacing.labelToMetadata,
          fontSize: DESIGN.typography.noteTitleSize,
          color: colors.text.secondary,
        }}
      >
        {data.title || 'Untitled'}
      </div>

      {/* Metadata Group */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN.spacing.metadataGap,
          flexShrink: 0,
        }}
      >
        {/* Task Count */}
        <CountBadge count={data.taskCount} type="tasks" size="md" />

        {/* Tags */}
        {data.tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: DESIGN.spacing.tagsGap,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {data.tags.slice(0, 3).map((tag) => (
              <Tag
                key={tag}
                label={tag}
                onClick={onTagClick ? () => onTagClick(tag) : undefined}
                onRemove={onRemoveTag ? () => onRemoveTag(data.id, tag) : undefined}
              />
            ))}
            {data.tags.length > 3 && (
              <span
                style={{
                  fontSize: DESIGN.typography.metadataSize,
                  color: colors.text.tertiary,
                }}
              >
                +{data.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// Tag variant content
const TagContent = ({ data, actions, onColorClick, isHovered }: TagListItemProps & { isHovered: boolean }) => {
  const { colors } = useTheme();
  const getTagMetadata = useTagsStore((state) => state.getTagMetadata);
  
  // Get tag color
  const tagMetadata = getTagMetadata(data.tag);
  const colorName = tagMetadata?.color || getTagColor(data.tag);
  const accentColor = colors.accent[colorName as keyof typeof colors.accent];
  const tagColor = (accentColor && 'bg' in accentColor && 'text' in accentColor ? accentColor : colors.accent.default) as { bg: string; text: string };

  return (
    <>
      {/* Tag Icon - Using TertiaryButton to match sidebar */}
      <TertiaryButton
        icon={<TagIcon size={16} style={{ color: tagColor.text }} />}
        onClick={(e) => {
          e.stopPropagation();
          if (onColorClick) {
            onColorClick(data.tag, e.currentTarget as HTMLButtonElement);
          }
        }}
        size="small"
      />

      {/* Tag Name (colored pill) */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 6px',
            minHeight: '22px',
            maxWidth: '100%',
            borderRadius: radius['3'],
            fontSize: DESIGN.typography.tagPillSize,
            lineHeight: '18px',
            fontWeight: 400,
            backgroundColor: tagColor.bg,
            color: tagColor.text,
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.tag}
          </span>
        </span>
      </div>

      {/* Metadata Group */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN.spacing.metadataGap,
          flexShrink: 0,
        }}
      >
        {/* Folder Count */}
        {(data.folderCount ?? 0) > 0 && (
          <CountBadge count={data.folderCount ?? 0} type="folders" size="md" />
        )}
        
        {/* Note Count */}
        <CountBadge count={data.noteCount} type="notes" size="md" />

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: DESIGN.spacing.actionsGap,
              opacity: isHovered ? 1 : 0,
              transition: `opacity ${DESIGN.transitions.opacity}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((action, idx) => (
              <div key={idx}>{action}</div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// Task variant content
const TaskContent = ({ data, onToggle, isHovered }: TaskListItemProps & { isHovered: boolean }) => {
  const { colors } = useTheme();

  return (
    <>
      {/* Checkbox */}
      <Checkbox
        checked={data.checked}
        onChange={(checked) => {
          onToggle?.(data.id);
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        size={DESIGN.sizing.checkboxSize}
      />
      
      {/* Task text */}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: DESIGN.typography.taskTextSize,
          color: data.checked ? colors.text.tertiary : colors.text.secondary,
          textDecoration: data.checked ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {data.text}
      </span>

      {/* Note info */}
      {data.noteEmoji && (
        <span style={{ fontSize: DESIGN.typography.emojiSize, flexShrink: 0 }}>
          {data.noteEmoji}
        </span>
      )}
      <span
        style={{
          fontSize: DESIGN.typography.metadataSize,
          color: colors.text.tertiary,
          flexShrink: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '150px',
        }}
      >
        {data.noteTitle || 'Untitled'}
      </span>
    </>
  );
};

// Folder variant content
const FolderContent = ({ data, onEmojiClick, isHovered }: FolderListItemProps & { isHovered: boolean }) => {
  const { colors } = useTheme();

  // Render emoji or folder icon
  const folderIcon = data.emoji ? (
    <span style={{ fontSize: DESIGN.typography.emojiSize, lineHeight: 1 }}>{data.emoji}</span>
  ) : (
    <FolderIcon size={16} style={{ color: colors.text.tertiary }} />
  );

  return (
    <>
      {/* Icon/Emoji - Using TertiaryButton */}
      <TertiaryButton
        icon={folderIcon}
        onClick={(e) => {
          e.stopPropagation();
          if (onEmojiClick) {
            onEmojiClick(data.id, e.currentTarget as HTMLButtonElement);
          }
        }}
        size="small"
      />

      {/* Folder Name */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginRight: DESIGN.spacing.labelToMetadata,
          fontSize: DESIGN.typography.folderNameSize,
          color: colors.text.secondary,
        }}
      >
        {data.name || 'Untitled'}
      </div>

      {/* Metadata Group */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: DESIGN.spacing.metadataGap,
          flexShrink: 0,
        }}
      >
        {/* Note Count */}
        <CountBadge count={data.noteCount} type="notes" size="md" />
        
        {/* Folder Count */}
        {(data.folderCount ?? 0) > 0 && (
          <CountBadge count={data.folderCount ?? 0} type="folders" size="md" />
        )}
      </div>
    </>
  );
};


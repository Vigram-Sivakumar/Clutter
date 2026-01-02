import { RefObject, ReactNode, useState, useEffect } from 'react';
import { Plus, EyeOff, Note, NoteBlank, Folder, Tag as TagIcon, AlignLeft, Smile } from '../../../../icons';
import { TertiaryButton, DismissButton } from '../../../ui-buttons';
import { spacing } from '../../../../tokens/spacing';
import { sizing } from '../../../../tokens/sizing';
import { useTheme } from '../../../../hooks/useTheme';
import { EmojiPicker } from '../emoji/EmojiPicker';
import { Tag } from './tags/Tag';

// Helper component to show slash overlay on hidden icons
const IconWithSlash = ({ children }: { children: ReactNode }) => (
  <div style={{ position: 'relative', display: 'inline-flex' }}>
    {children}
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '120%',
        height: '1.5px',
        backgroundColor: 'currentColor',
        transform: 'translate(-50%, -50%) rotate(-45deg)',
        pointerEvents: 'none',
      }}
    />
  </div>
);

interface MetadataActionsProps {
  variant?: 'note' | 'tag' | 'folder';
  hasEmoji: boolean;
  hasContent?: boolean; // Whether the note has editor content (for Note/NoteBlank icon switching)
  selectedEmoji?: string | null;
  emojiButtonRef?: RefObject<HTMLButtonElement>;
  onRemoveEmoji?: () => void;
  staticIcon?: ReactNode;
  staticIconButtonRef?: RefObject<HTMLButtonElement>;
  onStaticIconClick?: () => void;
  staticEmoji?: string;
  staticIconBackgroundColor?: string; // Optional background color for static icon
  dailyNoteDate?: string | null; // ISO date for daily note metadata
  hasDescription: boolean;
  showDescriptionInput?: boolean;
  descriptionVisible?: boolean;
  tagsCount: number;
  showTagInput?: boolean;
  tagsVisible?: boolean;
  isTitleHovered: boolean;
  isMetaControlsHovered: boolean;
  isEmojiTrayOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onAddEmoji?: () => void;
  onShowDescriptionInput?: () => void;
  onToggleDescriptionVisibility?: () => void;
  onShowTagInput?: (e: React.MouseEvent) => void;
  onToggleTagsVisibility?: () => void;
  onMoodClick?: () => void; // Daily note mood selector
  addEmojiButtonRef: RefObject<HTMLButtonElement>;
}

export const MetadataActions = ({
  variant = 'note',
  hasEmoji,
  hasContent = false,
  selectedEmoji,
  emojiButtonRef,
  onRemoveEmoji,
  staticIcon,
  staticIconButtonRef,
  onStaticIconClick,
  staticEmoji,
  staticIconBackgroundColor,
  dailyNoteDate,
  hasDescription,
  showDescriptionInput,
  descriptionVisible,
  tagsCount,
  showTagInput,
  tagsVisible,
  isTitleHovered,
  isMetaControlsHovered,
  isEmojiTrayOpen,
  onMouseEnter,
  onMouseLeave,
  onAddEmoji,
  onShowDescriptionInput,
  onToggleDescriptionVisibility,
  onShowTagInput,
  onToggleTagsVisibility,
  onMoodClick,
  addEmojiButtonRef,
}: MetadataActionsProps) => {
  const { colors } = useTheme();
  const [isEmojiContainerHovered, setIsEmojiContainerHovered] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });
  
  // Reset emoji container hover state when emoji tray closes
  // This prevents the dismiss button from getting "stuck" visible
  useEffect(() => {
    if (!isEmojiTrayOpen) {
      setIsEmojiContainerHovered(false);
    }
  }, [isEmojiTrayOpen]);
  
  // 🕐 AUTO-UPDATE: Detect day change at exactly 00:00:00 to update "Today" badge
  useEffect(() => {
    const scheduleNextDayCheck = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      const timeoutId = setTimeout(() => {
        const newDate = new Date();
        const normalizedDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
        
        console.log('📅 Day changed! Updating "Today" badge');
        setCurrentDate(normalizedDate);
        
        // Schedule next day check
        scheduleNextDayCheck();
      }, msUntilMidnight);
      
      return timeoutId;
    };
    
    const timeoutId = scheduleNextDayCheck();
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  const showControls = isTitleHovered || isMetaControlsHovered || isEmojiTrayOpen;
  
  return (
    <div
      className="layout-meta-controls"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing['6'],
        alignItems: 'center',
        minHeight: '32px',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Emoji/Icon - Works exactly the same for notes and folders */}
      {(variant === 'note' || variant === 'folder') && onAddEmoji && (
        <div 
          style={{ position: 'relative' }}
          onMouseEnter={() => setIsEmojiContainerHovered(true)}
          onMouseLeave={() => setIsEmojiContainerHovered(false)}
        >
          <EmojiPicker
            selectedEmoji={selectedEmoji || null}
            onClick={() => onAddEmoji?.()}
            isHovered={isEmojiContainerHovered || isEmojiTrayOpen}
            buttonRef={hasEmoji ? emojiButtonRef : addEmojiButtonRef}
            defaultIcon={variant === 'note' ? (
              hasContent ? <Note size={sizing.icon.pageTitleIcon} /> : <NoteBlank size={sizing.icon.pageTitleIcon} />
            ) : (
              <Folder size={sizing.icon.pageTitleIcon} />
            )}
            disabled={false}
          />
          {hasEmoji && (isEmojiContainerHovered || isEmojiTrayOpen) && onRemoveEmoji && (
            <DismissButton onClick={onRemoveEmoji} />
          )}
        </div>
      )}
      
      {/* Disabled/Static icon for system folders (Cluttered), tags, and section headers */}
      {((variant === 'folder' && !onAddEmoji) || (variant === 'tag')) && (
        <EmojiPicker
          selectedEmoji={staticEmoji || null}
          defaultIcon={staticIcon || (variant === 'folder' ? <Folder size={sizing.icon.pageTitleIcon} /> : undefined)}
          onClick={variant === 'tag' ? onStaticIconClick : undefined}
          buttonRef={variant === 'tag' ? staticIconButtonRef : undefined}
          disabled={variant === 'tag' ? false : true}
          backgroundColor={staticIconBackgroundColor}
        />
      )}
      
      {/* Happy New Year badge - shows ONLY on January 1st when it's actually January 1st */}
      {dailyNoteDate && (() => {
        const [year, month, day] = dailyNoteDate.split('-').map(Number);
        const isNoteNewYearsDay = month === 1 && day === 1;
        
        // Check if TODAY is also January 1st
        const isTodayNewYearsDay = currentDate.getMonth() === 0 && currentDate.getDate() === 1;
        
        // Only show if BOTH the note is Jan 1 AND today is Jan 1
        if (!isNoteNewYearsDay || !isTodayNewYearsDay) return null;
        
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0px 4px',
              minHeight: '20px',
              borderRadius: '3px',
              fontSize: '14px',
              lineHeight: '20px',
              fontWeight: 400,
              backgroundColor: colors.accent.purple.bg,
              color: colors.accent.purple.text,
              userSelect: 'none',
              WebkitUserSelect: 'none',
            } as any}
          >
            🎉 Happy New Year
          </span>
        );
      })()}
      
      {/* Daily note "Today" badge - hidden on New Year's Day */}
      {dailyNoteDate && (() => {
        const [year, month, day] = dailyNoteDate.split('-').map(Number);
        const isToday = currentDate.getFullYear() === year &&
                       currentDate.getMonth() === month - 1 &&
                       currentDate.getDate() === day;
        
        // Don't show "Today" badge on New Year's Day (redundant with "Happy New Year" badge)
        const isTodayNewYearsDay = currentDate.getMonth() === 0 && currentDate.getDate() === 1;
        
        return (isToday && !isTodayNewYearsDay) ? <Tag label="Today" /> : null;
      })()}
      
      {/* Action buttons - shown on hover */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing['6'],
          alignItems: 'center',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transition: 'opacity 150ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        {/* Note: "Add emoji" button removed - default Note/NoteBlank icon is now clickable */}
        
        {/* Mood button - shown only for daily notes */}
        {dailyNoteDate && onMoodClick && (
          <TertiaryButton
            icon={<Smile size={sizing.icon.sm} />}
            onClick={onMoodClick}
            size="small"
            subtle
          >
            Mood
          </TertiaryButton>
        )}
        
        {/* Add tag button - shown when no tags exist and handler is provided */}
        {tagsCount === 0 && !showTagInput && onShowTagInput && (
          <TertiaryButton
            icon={<TagIcon size={sizing.icon.sm} />}
            onMouseDown={onShowTagInput}
            size="small"
            subtle
          >
            Tag
          </TertiaryButton>
        )}
        
        {/* Show tags button - shown when tags are hidden and handler is provided */}
        {tagsCount > 0 && !tagsVisible && onToggleTagsVisibility && (
          <TertiaryButton
            icon={
              <IconWithSlash>
                <TagIcon size={sizing.icon.sm} />
              </IconWithSlash>
            }
            onClick={onToggleTagsVisibility}
            size="small"
            subtle
          >
            Tag
          </TertiaryButton>
        )}
        
        {/* Add description button - shown when no description exists */}
        {!hasDescription && !showDescriptionInput && (
          <TertiaryButton
            icon={<AlignLeft size={sizing.icon.sm} />}
            onClick={onShowDescriptionInput}
            size="small"
            subtle
          >
            Description
          </TertiaryButton>
        )}
        
        {/* Show description button - shown when description is hidden */}
        {hasDescription && !descriptionVisible && (
          <TertiaryButton
            icon={
              <IconWithSlash>
                <AlignLeft size={sizing.icon.sm} />
              </IconWithSlash>
            }
            onClick={onToggleDescriptionVisibility}
            size="small"
            subtle
          >
            Description
          </TertiaryButton>
        )}
      </div>
    </div>
  );
};


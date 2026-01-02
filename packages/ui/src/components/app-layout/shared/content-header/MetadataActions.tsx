import { RefObject, ReactNode, useState, useEffect } from 'react';
import { Folder, Tag as TagIcon, AlignLeft, Smile } from '../../../../icons';
import { TertiaryButton, DismissButton } from '../../../ui-buttons';
import { spacing } from '../../../../tokens/spacing';
import { sizing } from '../../../../tokens/sizing';
import { EmojiPicker } from '../emoji/EmojiPicker';
import { getNoteIcon } from '../../../../utils/itemIcons';

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
  isEmojiTrayOpen: boolean;
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
  isEmojiTrayOpen,
  onAddEmoji,
  onShowDescriptionInput,
  onToggleDescriptionVisibility,
  onShowTagInput,
  onToggleTagsVisibility,
  onMoodClick,
  addEmojiButtonRef,
}: MetadataActionsProps) => {
  const [isEmojiContainerHovered, setIsEmojiContainerHovered] = useState(false);
  
  // Reset emoji container hover state when emoji tray closes
  // This prevents the dismiss button from getting "stuck" visible
  useEffect(() => {
    if (!isEmojiTrayOpen) {
      setIsEmojiContainerHovered(false);
    }
  }, [isEmojiTrayOpen]);
  
  const showControls = isTitleHovered || isEmojiTrayOpen;
  
  return (
    <div
      className="layout-meta-controls"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing['6'],
        alignItems: 'center',
        minHeight: '40px',
      }}
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
            defaultIcon={variant === 'note' ? getNoteIcon({
              hasContent,
              size: sizing.icon.pageTitleIcon,
            }) : (
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
      
      {/* Action buttons - shown on hover */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing['6'],
          alignItems: 'center',
          maxHeight: showControls ? '40px' : '0px',
          opacity: showControls ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 150ms cubic-bezier(0.2, 0, 0, 1), opacity 120ms cubic-bezier(0.2, 0, 0, 1)',
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
            disabled={!showControls}
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
            disabled={!showControls}
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
            disabled={!showControls}
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
            disabled={!showControls}
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
            disabled={!showControls}
          >
            Description
          </TertiaryButton>
        )}
      </div>
    </div>
  );
};
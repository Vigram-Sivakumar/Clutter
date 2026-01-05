import { ReactNode, RefObject, forwardRef, useState, useRef, useEffect } from 'react';
import { TitleInput, TitleInputHandle } from './title/TitleInput';
import { MetadataActions } from './MetadataActions';
import { Description } from './description/Description';
import { Tags } from './tags/Tags';
import { TagPill } from './tags/Tag';
import { ColorTray } from './tags/ColorTray';
import { Folder, Note, HashStraight, ArrowUpDown, Filter, ChevronDown } from '../../../../icons';
import { Button } from '../../../ui-buttons';
import { SearchInput } from '../../../ui-inputs';
import { ContextMenu } from '../../../ui-primitives';
import { spacing } from '../../../../tokens/spacing';
import { typography } from '../../../../tokens/typography';
import { sizing } from '../../../../tokens/sizing';
import { useTheme } from '../../../../hooks/useTheme';
import { getTagColor } from '../../../../utils/tagColors';
import { useTagsStore } from '@clutter/state';
import { getNoteIcon, getFolderIcon } from '../../../../utils/itemIcons';

// Global page title margin - change once to affect all variants
const PAGE_TITLE_MARGIN_TOP = '94px';

// Action controls available for all page title sections
interface ActionControls {
  // New button with dropdown
  onNewNote?: () => void;
  onNewFolder?: () => void;
  newNoteLabel?: string; // Default: "New note"
  newFolderLabel?: string; // Default: "New folder"
  
  // Sort
  onSort?: () => void;
  sortActive?: boolean;
  
  // Filter
  onFilter?: () => void;
  filterActive?: boolean;
  filterCount?: number; // Badge count when filters applied
  
  // Search
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  
  // Custom actions - additional action buttons
  customActions?: ReactNode;
  
  // Static description (read-only, always visible) - for system views like Cluttered, All Folders, etc.
  staticDescription?: string;
}

// Note view - editable title with emoji and tags
interface NoteHeaderProps extends Partial<ActionControls> {
  variant: 'note';
  title: string;
  onTitleChange: (value: string) => void;
  onTitleEnter: () => void;
  
  // Daily note support
  dailyNoteDate?: string | null; // ISO date string (YYYY-MM-DD) for daily notes
  readOnlyTitle?: boolean; // Make title read-only (for daily notes)
  
  // Emoji
  selectedEmoji: string | null;
  isEmojiTrayOpen: boolean;
  onEmojiClick: () => void;
  onRemoveEmoji: () => void;
  emojiButtonRef: RefObject<HTMLButtonElement>;
  
  // Favorite - context menu moved to TopBar
  isFavorite: boolean;
  
  // Description
  description: string;
  showDescriptionInput: boolean;
  descriptionVisible: boolean;
  onDescriptionChange: (value: string) => void;
  onDescriptionBlur: () => void;
  onShowDescriptionInput: () => void;
  onToggleDescriptionVisibility: () => void;
  
  // Tags
  tags: string[];
  showTagInput: boolean;
  tagsVisible: boolean;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onEditTag: (oldTag: string, newTag: string) => void;
  onColorChange?: (tag: string, color: string) => void;
  onShowTagInput: () => void;
  onCancelTagInput: () => void;
  onToggleTagsVisibility: () => void;
  onTagClick?: (tag: string) => void;
  
  // Metadata actions
  onAddEmoji?: () => void;
  addEmojiButtonRef?: RefObject<HTMLButtonElement>;
  hasContent?: boolean; // Whether the note has editor content (for Note/NoteBlank icon switching)
  
  // Daily note mood selector
  onMoodClick?: () => void;
  
  backgroundColor: string;
}

// Tag view - static tag title
interface TagHeaderProps extends Partial<ActionControls> {
  variant: 'tag';
  tag: string;
  onTagRename?: (oldTag: string, newTag: string) => void;
  onColorChange?: (tag: string, color: string) => void;
  onNewFolder?: () => void;
  staticIcon?: ReactNode; // Optional static icon (e.g., for "All Tags" view)
  
  // Description
  description?: string;
  showDescriptionInput?: boolean;
  descriptionVisible?: boolean;
  onDescriptionChange?: (value: string) => void;
  onDescriptionBlur?: () => void;
  onShowDescriptionInput?: () => void;
  onToggleDescriptionVisibility?: () => void;
  
  backgroundColor?: string;
}

// Folder view - editable folder name title with folder icon
interface FolderHeaderProps extends Partial<ActionControls> {
  variant: 'folder';
  folderName: string;
  onFolderNameChange?: (value: string) => void;
  onNewFolder?: () => void;
  staticIcon?: ReactNode; // For "All Folders" view (non-editable)
  staticEmoji?: string; // For views with static emoji (e.g., Favourites with ⭐️)
  
  // Emoji (for folders)
  selectedEmoji?: string | null;
  onAddEmoji?: () => void;
  onRemoveEmoji?: () => void;
  emojiButtonRef?: RefObject<HTMLButtonElement>;
  isEmojiTrayOpen?: boolean;
  addEmojiButtonRef?: RefObject<HTMLButtonElement>;
  
  // Description
  description?: string;
  showDescriptionInput?: boolean;
  descriptionVisible?: boolean;
  onDescriptionChange?: (value: string) => void;
  onDescriptionBlur?: () => void;
  onShowDescriptionInput?: () => void;
  onToggleDescriptionVisibility?: () => void;
  
  // Tags
  tags?: string[];
  showTagInput?: boolean;
  tagsVisible?: boolean;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  onEditTag?: (oldTag: string, newTag: string) => void;
  onColorChange?: (tag: string, color: string) => void;
  onShowTagInput?: () => void;
  onCancelTagInput?: () => void;
  onToggleTagsVisibility?: () => void;
  onTagClick?: (tag: string) => void;
  
  backgroundColor?: string;
}

export type PageTitleSectionProps = NoteHeaderProps | TagHeaderProps | FolderHeaderProps;

// Helper component to render action controls
const ActionControlsBar = ({ controls }: { controls: Partial<ActionControls> }) => {
  const { colors } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Check if we have both note and folder creation options
  const hasDropdown = controls.onNewNote && controls.onNewFolder;
  
  // Check if any controls are provided
  const hasControls = controls.onNewNote || controls.onNewFolder || controls.onSort || controls.onFilter || controls.onSearchChange || controls.customActions;
  
  if (!hasControls) return null;
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing['4'],
      }}
    >
      {/* Search input */}
      {controls.onSearchChange && (
        <SearchInput
          value={controls.searchQuery || ''}
          onChange={controls.onSearchChange}
          placeholder={controls.searchPlaceholder}
          size="small"
        />
      )}
      
      {/* Sort button */}
      {controls.onSort && (
        <Button
          variant="tertiary"
          size="small"
          icon={<ArrowUpDown size={sizing.icon.sm} />}
          onClick={controls.onSort}
          active={controls.sortActive}
        />
      )}
      
      {/* Filter button */}
      {controls.onFilter && (
        <Button
          variant="tertiary"
          size="small"
          icon={<Filter size={sizing.icon.sm} />}
          onClick={controls.onFilter}
          active={controls.filterActive}
        />
      )}
      
      {/* Custom actions */}
      {controls.customActions}
      
      {/* NOTE: Favorite button and context menu removed from here - now only in TopBar to avoid duplication */}
      
      {/* New button - with dropdown if both options available */}
      {hasDropdown ? (
        <ContextMenu
          items={[
            {
              icon: <Note size={16} />,
              label: controls.newNoteLabel || 'New note',
              onClick: () => {
                controls.onNewNote?.();
                setIsDropdownOpen(false);
              },
            },
            {
              icon: <Folder size={16} />,
              label: controls.newFolderLabel || 'New folder',
              onClick: () => {
                controls.onNewFolder?.();
                setIsDropdownOpen(false);
              },
            },
          ]}
          onOpenChange={setIsDropdownOpen}
        >
          <Button
            variant="primary"
            size="small"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: spacing['4'] }}>
              New
              <ChevronDown 
                size={12} 
                style={{ 
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
                }} 
              />
            </span>
          </Button>
        </ContextMenu>
      ) : controls.onNewNote ? (
        // Fallback: Just new note button (for note editor view)
        <Button
          variant="primary"
          size="small"
          onClick={controls.onNewNote}
        >
          {controls.newNoteLabel || 'New note'}
        </Button>
      ) : null}
    </div>
  );
};

export const PageTitleSection = forwardRef<TitleInputHandle, PageTitleSectionProps>((props, ref) => {
  const { colors } = useTheme();
  const getTagMetadata = useTagsStore((state) => state.getTagMetadata);
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  
  // Ref for editable folder name
  const folderNameRef = useRef<HTMLDivElement>(null);
  
  // Ref for editable tag name
  const tagNameRef = useRef<HTMLSpanElement>(null);
  
  // Color tray state (for tag variant)
  const [isColorTrayOpen, setIsColorTrayOpen] = useState(false);
  const [colorTrayPosition, setColorTrayPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const tagIconButtonRef = useRef<HTMLButtonElement>(null);
  
  // Folder variant
  if (props.variant === 'folder') {
    // Update folder name when it changes externally (not from user input)
    useEffect(() => {
      if (folderNameRef.current && props.folderName !== undefined) {
        // Always update if different, or if ref is empty and we have a name
        const currentText = folderNameRef.current.textContent || '';
        if (currentText !== props.folderName) {
          folderNameRef.current.textContent = props.folderName;
        }
      }
    }, [props.folderName]);
    return (
      <div
        className="layout-title"
        data-title-section
        onMouseEnter={() => setIsTitleHovered(true)}
        onMouseLeave={() => setIsTitleHovered(false)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing['6'],
          marginTop: PAGE_TITLE_MARGIN_TOP,
        }}
      >
        {/* Metadata controls and title wrapper */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing['6'],
          }}
        >
          {/* Metadata controls */}
          <MetadataActions
            variant="folder"
            hasEmoji={!!props.selectedEmoji}
            selectedEmoji={props.selectedEmoji}
            emojiButtonRef={props.emojiButtonRef}
            onRemoveEmoji={props.onRemoveEmoji}
            staticIcon={props.staticIcon || <Folder size={sizing.icon.pageTitleIcon} />}
            staticEmoji={props.staticEmoji}
            hasDescription={!!props.staticDescription || !!props.description}
            showDescriptionInput={props.showDescriptionInput}
            descriptionVisible={props.staticDescription ? true : props.descriptionVisible}
            tagsCount={props.tags?.length || 0}
            showTagInput={props.showTagInput ?? false}
            tagsVisible={props.tagsVisible ?? true}
            isTitleHovered={isTitleHovered}
            isEmojiTrayOpen={props.isEmojiTrayOpen || false}
            onAddEmoji={props.onAddEmoji}
            onShowDescriptionInput={props.staticDescription ? undefined : props.onShowDescriptionInput}
            onShowTagInput={props.onShowTagInput}
            onToggleDescriptionVisibility={props.staticDescription ? undefined : props.onToggleDescriptionVisibility}
            onToggleTagsVisibility={props.onToggleTagsVisibility}
            addEmojiButtonRef={props.addEmojiButtonRef || { current: null }}
          />

          {/* Title row - Folder name + Action controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing['12'],
            }}
          >
            {/* Editable folder name (or static text if no onChange provided) */}
            {props.onFolderNameChange ? (
              <div
                ref={folderNameRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Untitled Folder"
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  fontFamily: typography.fontFamily.sans,
                  lineHeight: '32px',
                  minHeight: '32px',
                  color: colors.text.default,
                  caretColor: colors.text.default,
                  outline: 'none',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
                onInput={(e) => {
                  const content = e.currentTarget.textContent || '';
                  // Clear content immediately when all text is erased to show placeholder
                  if (!content.trim()) {
                    e.currentTarget.textContent = '';
                  }
                  props.onFolderNameChange?.(content);
                }}
                onBlur={(e) => {
                  // Remove empty content to show placeholder (don't force a default name)
                  if (!e.currentTarget.textContent?.trim()) {
                    e.currentTarget.textContent = '';
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  fontFamily: typography.fontFamily.sans,
                  lineHeight: '32px',
                  minHeight: '32px',
                  color: colors.text.default,
                }}
              >
                {props.folderName}
              </div>
            )}
            
            <ActionControlsBar controls={props} />
          </div>
        </div>

        {/* Description (editable or static) */}
        <Description
          description={props.description}
          showDescriptionInput={props.showDescriptionInput}
          descriptionVisible={props.descriptionVisible}
          onChange={props.onDescriptionChange}
          onBlur={props.onDescriptionBlur}
          onToggleVisibility={props.onToggleDescriptionVisibility}
          backgroundColor={props.backgroundColor}
          staticDescription={props.staticDescription}
        />

        {/* Tags - Folder metadata tags */}
        <Tags
          tags={props.tags || []}
          showTagInput={props.showTagInput ?? false}
          tagsVisible={props.tagsVisible ?? true}
          onAddTag={props.onAddTag}
          onRemoveTag={props.onRemoveTag}
          onEditTag={props.onEditTag}
          onColorChange={props.onColorChange}
          onShowTagInput={props.onShowTagInput}
          onCancelTagInput={props.onCancelTagInput}
          onToggleVisibility={props.onToggleTagsVisibility}
          onTagClick={props.onTagClick}
          backgroundColor={props.backgroundColor}
        />
      </div>
    );
  }
  
  // Tag variant
  if (props.variant === 'tag') {
    // Get tag metadata for color
    const tagMetadata = getTagMetadata(props.tag);
    const colorName = tagMetadata?.color || getTagColor(props.tag);
    const accentColor = colors.accent[colorName as keyof typeof colors.accent];
    const tagColor = (accentColor && 'bg' in accentColor && 'text' in accentColor ? accentColor : colors.accent.default) as { bg: string; text: string };
    
    // Handle color icon click
    const handleColorIconClick = () => {
      if (tagIconButtonRef.current) {
        const rect = tagIconButtonRef.current.getBoundingClientRect();
        setColorTrayPosition({ top: rect.bottom + 8, left: rect.left });
        setIsColorTrayOpen(true);
      }
    };
    
    // Handle color selection
    const handleColorSelect = (color: string) => {
      if (props.onColorChange) {
        props.onColorChange(props.tag, color);
      }
      setIsColorTrayOpen(false);
    };
    
    // Handle tag name edit
    const handleTagNameBlur = () => {
      if (tagNameRef.current && props.onTagRename) {
        const newTagName = tagNameRef.current.textContent?.trim() || '';
        if (newTagName && newTagName !== props.tag) {
          props.onTagRename(props.tag, newTagName);
        }
      }
    };
    
    // Handle Enter key to blur
    const handleTagNameKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        tagNameRef.current?.blur();
      }
    };
    
    // Update tag name when it changes externally
    useEffect(() => {
      if (tagNameRef.current && props.tag) {
        const currentText = tagNameRef.current.textContent || '';
        if (currentText !== props.tag) {
          tagNameRef.current.textContent = props.tag;
        }
      }
    }, [props.tag]);
    
    return (
      <div
        className="layout-title"
        data-title-section
        onMouseEnter={() => setIsTitleHovered(true)}
        onMouseLeave={() => setIsTitleHovered(false)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing['6'],
          marginTop: PAGE_TITLE_MARGIN_TOP,
        }}
      >
        {/* Metadata controls and title wrapper */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing['6'],
          }}
        >
          {/* Metadata controls */}
          <MetadataActions
            variant="tag"
            hasEmoji={false}
            staticIcon={props.staticIcon || <HashStraight size={sizing.icon.pageTitleIcon} style={{ color: tagColor.text }} />}
            staticIconButtonRef={props.staticIcon ? undefined : tagIconButtonRef}
            onStaticIconClick={props.staticIcon ? undefined : handleColorIconClick}
            staticIconBackgroundColor={props.staticIcon ? undefined : tagColor.bg}
            hasDescription={!!props.staticDescription || !!props.description}
            showDescriptionInput={props.showDescriptionInput}
            descriptionVisible={props.staticDescription ? true : props.descriptionVisible}
            tagsCount={0}
            showTagInput={false}
            tagsVisible={true}
            isTitleHovered={isTitleHovered}
            isEmojiTrayOpen={false}
            onShowDescriptionInput={props.staticDescription ? undefined : props.onShowDescriptionInput}
            onToggleDescriptionVisibility={props.staticDescription ? undefined : props.onToggleDescriptionVisibility}
            addEmojiButtonRef={{ current: null }}
          />

          {/* Title row - tag name + Action controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing['12'],
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                fontFamily: typography.fontFamily.sans,
                lineHeight: '32px',
                minHeight: '32px',
              }}
            >
              <span 
                ref={tagNameRef}
                contentEditable={!!props.onTagRename}
                suppressContentEditableWarning
                onBlur={handleTagNameBlur}
                onKeyDown={handleTagNameKeyDown}
                style={{ 
                  color: colors.text.default,
                  outline: 'none',
                  cursor: props.onTagRename ? 'text' : 'default',
                }}
              >{props.tag}</span>
            </div>
            
            <ActionControlsBar controls={props} />
          </div>
        </div>

        {/* Description (editable or static) */}
        <Description
          description={props.description}
          showDescriptionInput={props.showDescriptionInput}
          descriptionVisible={props.descriptionVisible}
          onChange={props.onDescriptionChange}
          onBlur={props.onDescriptionBlur}
          onToggleVisibility={props.onToggleDescriptionVisibility}
          backgroundColor={props.backgroundColor}
          staticDescription={props.staticDescription}
        />
        
        {/* Color Tray */}
        <ColorTray
          isOpen={isColorTrayOpen}
          onClose={() => setIsColorTrayOpen(false)}
          onSelect={handleColorSelect}
          position={colorTrayPosition}
          currentColor={colorName}
        />
      </div>
    );
  }

  // Note variant
  return (
    <div
      className="layout-title"
      data-title-section
        onMouseEnter={() => setIsTitleHovered(true)}
        onMouseLeave={() => setIsTitleHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing['6'],
        marginTop: PAGE_TITLE_MARGIN_TOP,
      }}
    >
      {/* Title section with hover */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing['12'],
        }}
      >
        {/* Metadata controls */}
        <MetadataActions
          variant={props.dailyNoteDate ? 'tag' : 'note'} // Use 'tag' variant for static icon behavior
          hasEmoji={props.dailyNoteDate ? false : !!props.selectedEmoji}
          hasContent={props.hasContent}
          selectedEmoji={props.dailyNoteDate ? undefined : props.selectedEmoji}
          emojiButtonRef={props.dailyNoteDate ? undefined : props.emojiButtonRef}
          onRemoveEmoji={props.dailyNoteDate ? undefined : props.onRemoveEmoji}
          staticIcon={props.dailyNoteDate ? getNoteIcon({
            dailyNoteDate: props.dailyNoteDate,
            hasContent: props.hasContent,
            size: sizing.icon.pageTitleIcon,
          }) : undefined}
          dailyNoteDate={props.dailyNoteDate}
          hasDescription={!!props.description}
          showDescriptionInput={props.showDescriptionInput}
          descriptionVisible={props.descriptionVisible}
          tagsCount={props.tags?.length || 0}
          showTagInput={props.showTagInput}
          tagsVisible={props.tagsVisible}
          isTitleHovered={isTitleHovered}
          isEmojiTrayOpen={props.isEmojiTrayOpen}
          onAddEmoji={props.dailyNoteDate ? undefined : props.onAddEmoji}
          onShowDescriptionInput={props.onShowDescriptionInput}
          onShowTagInput={props.onShowTagInput}
          onToggleDescriptionVisibility={props.onToggleDescriptionVisibility}
          onToggleTagsVisibility={props.onToggleTagsVisibility}
          onMoodClick={props.onMoodClick}
          addEmojiButtonRef={props.addEmojiButtonRef || { current: null }}
        />

        {/* Title row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing['12'],
            }}
          >
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: spacing['6'] }}>
              <TitleInput 
                ref={ref}
                placeholder="Untitled" 
                value={props.title} 
                onChange={props.onTitleChange}
                onEnter={props.onTitleEnter}
                readOnly={props.readOnlyTitle}
              />
            </div>
            
            <ActionControlsBar controls={props} />
        </div>
      </div>

      {/* Description (editable or static) */}
      <Description
        description={props.description}
        showDescriptionInput={props.showDescriptionInput}
        descriptionVisible={props.descriptionVisible}
        onChange={props.onDescriptionChange}
        onBlur={props.onDescriptionBlur}
        onToggleVisibility={props.onToggleDescriptionVisibility}
        backgroundColor={props.backgroundColor}
        staticDescription={props.staticDescription}
      />

      {/* Tags - Synced from block-level tags in editor */}
      {props.variant === 'note' && (
        <Tags
          tags={props.tags || []}
          showTagInput={props.showTagInput ?? false}
          tagsVisible={props.tagsVisible ?? true}
          onAddTag={props.onAddTag}
          onRemoveTag={props.onRemoveTag}
          onEditTag={props.onEditTag}
          onColorChange={props.onColorChange}
          onShowTagInput={props.onShowTagInput}
          onCancelTagInput={props.onCancelTagInput}
          onToggleVisibility={props.onToggleTagsVisibility}
          onTagClick={props.onTagClick}
        />
      )}
    </div>
  );
});

PageTitleSection.displayName = 'PageTitleSection';


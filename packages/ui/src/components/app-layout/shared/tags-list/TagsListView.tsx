import { ReactNode, useState } from 'react';
import { useTagsStore } from '@clutter/state';
import { ListView, ListItem, TagListItemData } from '../list-view';
import { ColorTray } from '../content-header/tags/ColorTray';
import { getTagColor } from '../../../../utils/tagColors';

export interface TagListItem {
  id: string;
  tag: string;
  noteCount: number;
  folderCount: number;
}

export interface TagsListViewProps {
  tags: TagListItem[];
  selectedTag?: string | null;
  onTagClick: (tag: string) => void;
  emptyState?: ReactNode;
  /** Optional section title (e.g., "Tags") to display above the list */
  title?: string;
  /** Optional actions for each tag (e.g., context menu) */
  getTagActions?: (tag: string) => React.ReactNode[];
}

export const TagsListView = ({
  tags,
  selectedTag,
  onTagClick,
  emptyState,
  title,
  getTagActions,
}: TagsListViewProps) => {
  const [isColorTrayOpen, setIsColorTrayOpen] = useState(false);
  const [colorTrayPosition, setColorTrayPosition] = useState<{ top: number; left: number }>({ top: 100, left: 100 });
  const [editingColorTag, setEditingColorTag] = useState<string | null>(null);
  
  const getTagMetadata = useTagsStore((state) => state.getTagMetadata);
  const updateTagMetadata = useTagsStore((state) => state.updateTagMetadata);
  const upsertTagMetadata = useTagsStore((state) => state.upsertTagMetadata);

  const handleOpenColorTray = (tag: string, buttonElement: HTMLButtonElement) => {
    const rect = buttonElement.getBoundingClientRect();
    setColorTrayPosition({ top: rect.bottom + 8, left: rect.left });
    setEditingColorTag(tag);
    setIsColorTrayOpen(true);
  };

  const handleColorSelect = (color: string) => {
    if (editingColorTag) {
      const existing = getTagMetadata(editingColorTag);
      if (existing) {
        updateTagMetadata(editingColorTag, { color });
      } else {
        // Create metadata with the color for tags that don't have metadata yet
        upsertTagMetadata(editingColorTag, '', true, false, color);
      }
    }
    setIsColorTrayOpen(false);
    setEditingColorTag(null);
  };

  // Get current color for the selected tag
  const currentColor = editingColorTag 
    ? (getTagMetadata(editingColorTag)?.color || getTagColor(editingColorTag))
    : undefined;

  return (
    <>
      <ListView<TagListItemData>
        items={tags}
        selectedId={selectedTag}
        onItemClick={onTagClick}
        renderItem={(tagItem, isSelected) => (
          <ListItem
            variant="tag"
            data={tagItem}
            isSelected={isSelected}
            actions={getTagActions ? getTagActions(tagItem.tag) : undefined}
            onColorClick={handleOpenColorTray}
          />
        )}
        emptyState={emptyState}
        title={title}
      />
      
      {/* Color Tray */}
      <ColorTray
        isOpen={isColorTrayOpen}
        onClose={() => {
          setIsColorTrayOpen(false);
          setEditingColorTag(null);
        }}
        onSelect={handleColorSelect}
        selectedColor={currentColor}
        position={colorTrayPosition}
      />
    </>
  );
};


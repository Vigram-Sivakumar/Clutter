import { useMemo, ReactNode } from 'react';
import { SidebarSection } from '../sections/Section';
import { SidebarItemTag } from '../items/TagItem';
import { SidebarEmptyState } from '../sections/EmptyState';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { useTagsStore, useFoldersStore } from '@clutter/state';
import { useAllTags } from '@clutter/shared';
import { useNotesStore } from '@clutter/state';
import { GlobalSelection } from '../types';

interface SidebarTagsViewProps {
  selection: GlobalSelection;
  openContextMenuId?: string | null; // ID of item with open context menu (for highlighting)
  onClearSelection?: () => void; // Clear selection when clicking empty space
  isAllTagsCollapsed: boolean;
  onAllTagsToggle: () => void;
  onAllTagsHeaderClick?: () => void;
  isFavouritesCollapsed: boolean;
  onFavouritesToggle: () => void;
  onFavouritesHeaderClick?: () => void;
  allTagsHeaderActions?: ReactNode[];
  getTagActions?: (tag: string) => ReactNode[];
  // Inline editing
  editingTag?: string | null;
  onTagRenameComplete?: (oldTag: string, newTag: string) => void;
  onTagRenameCancel?: () => void;
  // Multi-select
  selectedTagIds?: Set<string>;
  onTagMultiSelect?: (tagId: string, event?: React.MouseEvent, context?: string) => void;
}

export const TagsView = ({
  selection,
  openContextMenuId,
  onClearSelection,
  isAllTagsCollapsed,
  onAllTagsToggle,
  onAllTagsHeaderClick,
  isFavouritesCollapsed = false,
  onFavouritesToggle,
  onFavouritesHeaderClick,
  allTagsHeaderActions,
  getTagActions,
  editingTag,
  onTagRenameComplete,
  onTagRenameCancel,
  selectedTagIds,
  onTagMultiSelect,
}: SidebarTagsViewProps) => {
  // Get all unique tags
  const allTags = useAllTags();
  const notes = useNotesStore((state) => state.notes);
  const folders = useFoldersStore((state) => state.folders);
  const getTagMetadata = useTagsStore((state) => state.getTagMetadata);

  // Calculate note + folder count for each tag
  const tagsWithCounts = useMemo(() => {
    return allTags.map((tag) => {
      const noteCount = notes.filter(
        (note) =>
          !note.deletedAt &&
          note.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      ).length;
      
      const folderCount = folders.filter(
        (folder) =>
          !folder.deletedAt &&
          folder.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      ).length;
      
      const count = noteCount + folderCount;
      return { tag, count };
    });
  }, [allTags, notes, folders]);

  // Filter favorite tags
  const favouriteTags = useMemo(() => {
    return tagsWithCounts.filter(({ tag }) => {
      const metadata = getTagMetadata(tag);
      return metadata?.isFavorite;
    });
  }, [tagsWithCounts, getTagMetadata]);

  return (
    <div
      onClick={(e) => {
        // Clear selection when clicking on empty space (not on child elements)
        if (e.target === e.currentTarget && onClearSelection) {
          onClearSelection();
        }
      }}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: sidebarLayout.sectionGap,
      }}
    >
      {/* Favourites Section - Always visible */}
      <SidebarSection
        title="Favourites"
        isCollapsed={isFavouritesCollapsed}
        onToggle={onFavouritesToggle}
        onHeaderClick={onFavouritesHeaderClick}
        badge={String(favouriteTags.length)}
      >
        {favouriteTags.length === 0 ? (
          <SidebarEmptyState message="No favorite tags yet" />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: sidebarLayout.itemGap,
              paddingTop: '2px',
              paddingBottom: '2px',
            }}
          >
            {favouriteTags.map(({ tag, count }) => (
              <SidebarItemTag
                key={tag}
                tag={tag}
                count={count}
                isSelected={
                  selection.type === 'tag' && 
                  (selectedTagIds?.has(tag) || selection.itemId === tag) &&
                  selection.context === 'favorites'
                }
                hasOpenContextMenu={openContextMenuId === tag}
                onClick={(e) => onTagMultiSelect?.(tag, e, 'favorites')}
                actions={getTagActions ? getTagActions(tag) : undefined}
                isEditing={editingTag === tag}
                onRenameComplete={onTagRenameComplete}
                onRenameCancel={onTagRenameCancel}
              />
            ))}
          </div>
        )}
      </SidebarSection>

      {/* All Tags Section */}
      <SidebarSection
        title="All Tags"
        isCollapsed={isAllTagsCollapsed}
        onToggle={onAllTagsToggle}
        onHeaderClick={onAllTagsHeaderClick}
        badge={String(allTags.length)}
        actions={allTagsHeaderActions}
      >
        {tagsWithCounts.length === 0 ? (
          <SidebarEmptyState message="No tags yet. Add tags to your notes." />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: sidebarLayout.itemGap,
              paddingTop: '2px',
              paddingBottom: '2px',
            }}
          >
            {tagsWithCounts.map(({ tag, count }) => (
              <SidebarItemTag
                key={tag}
                tag={tag}
                count={count}
                isSelected={
                  selection.type === 'tag' && 
                  (selectedTagIds?.has(tag) || selection.itemId === tag) &&
                  selection.context === 'all'
                }
                hasOpenContextMenu={openContextMenuId === tag}
                onClick={(e) => onTagMultiSelect?.(tag, e, 'all')}
                actions={getTagActions ? getTagActions(tag) : undefined}
                isEditing={editingTag === tag}
                onRenameComplete={onTagRenameComplete}
                onRenameCancel={onTagRenameCancel}
              />
            ))}
          </div>
        )}
      </SidebarSection>
    </div>
  );
};



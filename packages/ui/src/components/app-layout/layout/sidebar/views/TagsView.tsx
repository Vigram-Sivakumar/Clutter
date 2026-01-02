import { useMemo } from 'react';
import { SidebarSection } from '../sections/Section';
import { SidebarItemTag } from '../items/TagItem';
import { SidebarEmptyState } from '../sections/EmptyState';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { useAllTags, useTagsStore } from '@clutter/shared';
import { useNotesStore } from '@clutter/shared';

interface SidebarTagsViewProps {
  selectedTag: string | null;
  onTagClick: (tag: string, source: 'all' | 'favorites') => void;
  isAllTagsCollapsed: boolean;
  onAllTagsToggle: () => void;
  onAllTagsHeaderClick?: () => void;
  isFavouritesCollapsed: boolean;
  onFavouritesToggle: () => void;
  onFavouritesHeaderClick?: () => void;
  // Inline editing
  editingTag?: string | null;
  onTagRenameComplete?: (oldTag: string, newTag: string) => void;
  onTagRenameCancel?: () => void;
}

export const TagsView = ({
  selectedTag,
  onTagClick,
  isAllTagsCollapsed,
  onAllTagsToggle,
  onAllTagsHeaderClick,
  isFavouritesCollapsed = false,
  onFavouritesToggle,
  onFavouritesHeaderClick,
  editingTag,
  onTagRenameComplete,
  onTagRenameCancel,
}: SidebarTagsViewProps) => {
  // Get all unique tags
  const allTags = useAllTags();
  const notes = useNotesStore((state) => state.notes);
  const getTagMetadata = useTagsStore((state) => state.getTagMetadata);

  // Calculate note count for each tag
  const tagsWithCounts = useMemo(() => {
    return allTags.map((tag) => {
      const count = notes.filter(
        (note) =>
          !note.deletedAt &&
          note.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      ).length;
      return { tag, count };
    });
  }, [allTags, notes]);

  // Filter favorite tags
  const favouriteTags = useMemo(() => {
    return tagsWithCounts.filter(({ tag }) => {
      const metadata = getTagMetadata(tag);
      return metadata?.isFavorite;
    });
  }, [tagsWithCounts, getTagMetadata]);

  return (
    <div
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
                isSelected={selectedTag === tag}
                onClick={() => onTagClick(tag, 'favorites')}
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
                isSelected={selectedTag === tag}
                onClick={() => onTagClick(tag, 'all')}
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



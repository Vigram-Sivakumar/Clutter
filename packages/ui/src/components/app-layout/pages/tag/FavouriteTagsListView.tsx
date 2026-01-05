import { useMemo, useState } from 'react';
import { useNotesStore, useFoldersStore, useTagsStore } from '@clutter/state';
import { useAllTags } from '@clutter/shared';
import { PageTitleSection } from '../../shared/content-header';
import { ListViewLayout } from '../../shared/list-view-layout';
import { TagsListView } from '../../shared/tags-list';
import { Tag } from '../../../../icons';
import { sizing } from '../../../../tokens/sizing';

interface FavouriteTagsListViewProps {
  onTagClick: (tag: string, source: 'all' | 'favorites') => void;
}

export const FavouriteTagsListView = ({ 
  onTagClick,
}: FavouriteTagsListViewProps) => {
  const notes = useNotesStore((state) => state.notes);
  const folders = useFoldersStore((state) => state.folders);
  const getTagMetadata = useTagsStore((state) => state.getTagMetadata);
  const allTags = useAllTags();
  
  // Action controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortActive, setSortActive] = useState(false);
  const [filterActive, setFilterActive] = useState(false);

  // Calculate count for each tag (notes + folders)
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
      
      return { id: tag, tag, noteCount, folderCount };
    });
  }, [allTags, notes, folders]);

  // Filter favorite tags
  const favouriteTags = useMemo(() => {
    return tagsWithCounts.filter(({ tag }) => {
      const metadata = getTagMetadata(tag);
      return metadata?.isFavorite;
    });
  }, [tagsWithCounts, getTagMetadata]);

  // Sort tags by total count (descending)
  const sortedTags = useMemo(() => {
    return [...favouriteTags].sort((a, b) => 
      (b.noteCount + b.folderCount) - (a.noteCount + a.folderCount)
    );
  }, [favouriteTags]);

  return (
    <>
        {/* Page Title Section */}
        <PageTitleSection
          variant="tag"
          tag="Favourite Tags"
          staticIcon={<Tag size={sizing.icon.lg} />}
          staticDescription="Your most-used tags for quick access"
          // Action controls
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSort={() => setSortActive(!sortActive)}
          sortActive={sortActive}
          onFilter={() => setFilterActive(!filterActive)}
          filterActive={filterActive}
        />

        {/* Content Section */}
        <ListViewLayout
          sections={[
            {
              id: 'tags',
              title: '', // No title for single-section view
              show: sortedTags.length > 0,
              content: (
                <TagsListView
                  tags={sortedTags}
                  selectedTag={null}
                  onTagClick={(tag) => onTagClick(tag, 'favorites')}
                  emptyState="No favourite tags yet."
                />
              ),
            },
          ]}
          emptyState="No favourite tags yet."
        />
    </>
  );
};


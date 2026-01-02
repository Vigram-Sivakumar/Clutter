import { useMemo, useState } from 'react';
import { useNotesStore, useFoldersStore, useTagsStore, useAllTags } from '@clutter/shared';
import { PageTitleSection } from '../../shared/content-header';
import { PageContent } from '../../shared/page-content/PageContent';
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
      
      const count = noteCount + folderCount;
      return { id: tag, tag, count };
    });
  }, [allTags, notes, folders]);

  // Filter favorite tags
  const favouriteTags = useMemo(() => {
    return tagsWithCounts.filter(({ tag }) => {
      const metadata = getTagMetadata(tag);
      return metadata?.isFavorite;
    });
  }, [tagsWithCounts, getTagMetadata]);

  // Sort tags by count (descending)
  const sortedTags = useMemo(() => {
    return [...favouriteTags].sort((a, b) => b.count - a.count);
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
        <PageContent>
          <TagsListView
            tags={sortedTags}
            selectedTag={null}
            onTagClick={(tag) => onTagClick(tag, 'favorites')}
            emptyState="No favourite tags yet."
                />
        </PageContent>
    </>
  );
};


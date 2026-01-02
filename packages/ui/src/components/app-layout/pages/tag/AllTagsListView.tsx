import { useMemo, useState } from 'react';
import { useNotesStore, useFoldersStore, useAllTags } from '@clutter/shared';
import { PageTitleSection } from '../../shared/content-header';
import { PageContent } from '../../shared/page-content/PageContent';
import { TagsListView } from '../../shared/tags-list';
import { Tag } from '../../../../icons';
import { sizing } from '../../../../tokens/sizing';

interface AllTagsListViewProps {
  onTagClick: (tag: string, source: 'all' | 'favorites') => void;
  getTagActions?: (tag: string) => React.ReactNode[];
}

export const AllTagsListView = ({ 
  onTagClick,
  getTagActions,
}: AllTagsListViewProps) => {
  const notes = useNotesStore((state) => state.notes);
  const folders = useFoldersStore((state) => state.folders);
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

  // Sort tags by count (descending)
  const sortedTags = useMemo(() => {
    return [...tagsWithCounts].sort((a, b) => b.count - a.count);
  }, [tagsWithCounts]);

  return (
    <>
        {/* Page Title Section */}
        <PageTitleSection
          variant="tag"
          tag="All Tags"
          staticIcon={<Tag size={sizing.icon.lg} />}
          staticDescription="Browse and manage all your tags"
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
            onTagClick={(tag) => onTagClick(tag, 'all')}
            getTagActions={getTagActions}
            emptyState="No tags yet."
          />
        </PageContent>
    </>
  );
};


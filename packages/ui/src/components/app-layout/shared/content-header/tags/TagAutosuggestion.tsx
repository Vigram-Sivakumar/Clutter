/**
 * TagAutosuggestion - Dropdown for tag suggestions
 * 
 * Shows tag suggestions as user types in TagInput
 */

import { useMemo } from 'react';
import { useNotesStore, useAllTags } from '@clutter/shared';
import { AutocompleteDropdown } from '../../../../ui-primitives/AutocompleteDropdown';
import { DropdownItem } from '../../../../ui-primitives/dropdown';
import { Tag } from './Tag';
import { Hash } from '../../../../../icons';
import { getTagColor } from '../../../../../utils/tagColors';
import { useTheme } from '../../../../../hooks/useTheme';

interface TagAutosuggestionProps {
  isOpen: boolean;
  position: { top?: number; bottom?: number; left: number } | null;
  onClose: () => void;
  suggestions: string[]; // Filtered suggestions based on user input
  selectedIndex: number;
  onSelectTag: (tag: string) => void;
  query: string; // Current input value
  existingTags: string[]; // Tags already added to the note
}

export const TagAutosuggestion = ({
  isOpen,
  position,
  onClose,
  suggestions,
  selectedIndex,
  onSelectTag,
  query,
  existingTags,
}: TagAutosuggestionProps) => {
  const notes = useNotesStore((state) => state.notes);
  const allTags = useAllTags();
  const { colors } = useTheme();
  
  // Filter to exclude already-added tags
  const existingTagsLower = useMemo(() => 
    existingTags.map(t => t.toLowerCase()), 
    [existingTags]
  );

  // Calculate tag counts
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

  // When no query, show all tags sorted by count (most used first)
  // When there's a query, show filtered suggestions
  // Always exclude tags already added to the note
  const displayTags = useMemo(() => {
    if (!query.trim()) {
      // No input - show all tags sorted by usage, excluding existing ones
      return [...tagsWithCounts]
        .filter(({ tag }) => !existingTagsLower.includes(tag.toLowerCase()))
        .sort((a, b) => b.count - a.count);
    } else {
      // Has input - show filtered suggestions with their counts, excluding existing ones
      return suggestions
        .filter((tag) => !existingTagsLower.includes(tag.toLowerCase()))
        .map((tag) => {
          const tagData = tagsWithCounts.find(
            (t) => t.tag.toLowerCase() === tag.toLowerCase()
          );
          return { tag, count: tagData?.count || 0 };
        });
    }
  }, [query, tagsWithCounts, suggestions, existingTagsLower]);

  // No matches but has query - show "Create" option (unless tag already exists on note)
  if (displayTags.length === 0 && query.trim()) {
    const trimmedQuery = query.trim();
    
    // Don't show "Create" if tag already exists on the note
    if (existingTagsLower.includes(trimmedQuery.toLowerCase())) {
      return null;
    }
    
    const colorName = getTagColor(trimmedQuery);
    const tagColor = colors.accent[colorName as keyof typeof colors.accent];
    const iconColor = (tagColor && 'text' in tagColor ? tagColor.text : colors.text.secondary);

    return (
      <AutocompleteDropdown
        isOpen={isOpen}
        position={position}
        onClose={onClose}
        selectedIndex={0}
      >
        <DropdownItem
          icon={<Hash size={16} style={{ color: iconColor }} />}
          label={`Create "${trimmedQuery}"`}
          isSelected={selectedIndex === 0}
          onClick={() => onSelectTag(trimmedQuery)}
        />
      </AutocompleteDropdown>
    );
  }

  // No items to show at all
  if (displayTags.length === 0) {
    return null;
  }

  // Show regular tag suggestions
  return (
    <AutocompleteDropdown
      isOpen={isOpen}
      position={position}
      onClose={onClose}
      selectedIndex={selectedIndex}
    >
      {displayTags.map(({ tag, count }, index) => (
        <DropdownItem
          key={tag}
          isSelected={index === selectedIndex}
          onClick={() => onSelectTag(tag)}
          compact={true}
          count={count}
        >
          <Tag label={tag} />
        </DropdownItem>
      ))}
    </AutocompleteDropdown>
  );
};


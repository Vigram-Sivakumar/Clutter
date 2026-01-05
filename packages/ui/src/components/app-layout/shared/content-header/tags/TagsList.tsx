import { useState, useCallback, useRef, useEffect } from 'react';
import { TagPill } from './Tag';
import { FloatingContextMenu } from './FloatingContextMenu';
import { TagContextContent } from './TagContextContent';
import { useTagsStore } from '@clutter/state';
import { getTagColor } from '../../../../../utils/tagColors';

interface TagsListProps {
  tags: string[];
  onRemoveTag: (tag: string) => void;
  onEditTag?: (oldTag: string, newTag: string) => void;
  onTagClick?: (tag: string) => void;
  onColorChange?: (tag: string, color: string) => void;
}

export const TagsList = ({ 
  tags, 
  onRemoveTag, 
  onEditTag, 
  onTagClick,
  onColorChange,
}: NoteTagsListProps) => {
  const { getTagMetadata } = useTagsStore();
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const tagRefs = useRef<Map<string, HTMLElement>>(new Map());
  const scheduleCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleOpenEditor = useCallback((tag: string, event: { clientX: number; clientY: number; currentTarget: HTMLElement }) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuHeight = 40;
    
    setDropdownPosition({
      top: rect.top - menuHeight,
      left: rect.left,
    });
    setEditingTag(tag);
  }, []);

  const handleRenameTag = useCallback((oldTag: string, newTag: string) => {
    if (onEditTag) {
      onEditTag(oldTag, newTag);
    }
    setEditingTag(null);
  }, [onEditTag]);

  const handleColorChange = useCallback((tag: string, color: string) => {
    if (onColorChange) {
      onColorChange(tag, color);
    }
  }, [onColorChange]);

  const handleCloseEditor = useCallback(() => {
    setEditingTag(null);
    if (scheduleCloseTimeoutRef.current) {
      clearTimeout(scheduleCloseTimeoutRef.current);
      scheduleCloseTimeoutRef.current = null;
    }
  }, []);

  const handleScheduleClose = useCallback(() => {
    scheduleCloseTimeoutRef.current = setTimeout(() => {
      handleCloseEditor();
    }, 300);
  }, [handleCloseEditor]);

  const handleCancelClose = useCallback(() => {
    if (scheduleCloseTimeoutRef.current) {
      clearTimeout(scheduleCloseTimeoutRef.current);
      scheduleCloseTimeoutRef.current = null;
    }
  }, []);

  const handleRemoveTag = useCallback(() => {
    if (editingTag) {
      onRemoveTag(editingTag);
      setEditingTag(null);
    }
  }, [editingTag, onRemoveTag]);

  const handleFilterTag = useCallback((tag: string) => {
    if (onTagClick) {
      onTagClick(tag);
    }
    setEditingTag(null); // Close the menu after filtering
  }, [onTagClick]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scheduleCloseTimeoutRef.current) {
        clearTimeout(scheduleCloseTimeoutRef.current);
      }
    };
  }, []);

  if (tags.length === 0) return null;

  return (
    <>
      {tags.map((tag) => (
        <TagPill
          key={tag}
          label={tag}
          onRemove={() => onRemoveTag(tag)}
          onClick={onTagClick}
        />
      ))}
      
      {editingTag && (
        <FloatingContextMenu
          isOpen={!!editingTag}
          position={dropdownPosition}
          onClose={handleCloseEditor}
          onRemove={handleRemoveTag}
          onCancelScheduledClose={handleCancelClose}
        >
          <TagContextContent
            tag={editingTag}
            currentColor={getTagMetadata(editingTag)?.color || getTagColor(editingTag)}
            onFilter={handleFilterTag}
            onRename={handleRenameTag}
            onColorChange={handleColorChange}
          />
        </FloatingContextMenu>
      )}
    </>
  );
};


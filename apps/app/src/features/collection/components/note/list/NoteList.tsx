import { forwardRef, type HTMLAttributes } from 'react';
import { CollectionEntry } from '@features/collection/CollectionEntry';
import './NoteList.css';

export interface NoteListProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  emoji?: string;

  isSelected?: boolean;
  isSelectable?: boolean;
  onSelectedChange?: (selected: boolean) => void;

  lastOpened?: string;
  created?: string;
  updated?: string;
}

export const NoteList = forwardRef<HTMLDivElement, NoteListProps>(
  function NoteList(
    {
      title,
      description,
      emoji,

      isSelected = false,
      isSelectable = false,
      onSelectedChange,

      lastOpened,
      created,
      updated,

      className,
      ...props
    },
    ref
  ) {
    return (
      <CollectionEntry
        {...props}
        ref={ref}
        className={['note-list', className].filter(Boolean).join(' ')}

        icon="note"
        emoji={emoji}
        title={title}
        description={description}
        metadata={
          <>
            <span>{lastOpened}</span>
            <span>{created}</span>
            <span>{updated}</span>
          </>
        }
        isSelectable={isSelectable}
        isSelected={isSelected}
        onSelectedChange={onSelectedChange}
      />
    );
  }
);

NoteList.displayName = 'NoteList';

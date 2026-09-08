import { forwardRef, type HTMLAttributes } from 'react';
import './NoteTableRow.css';
import { CollectionEntry } from '@features/collection/CollectionEntry';

export interface NoteTableRowProps extends HTMLAttributes<HTMLDivElement> {
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

export const NoteTableRow = forwardRef<HTMLDivElement, NoteTableRowProps>(
  function NoteTableRow(
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
      <div
        {...props}
        ref={ref}
        className={['note-table-row', className].filter(Boolean).join(' ')}
      >
        <CollectionEntry
          className="note-table-row__entry"
          icon="note"
          emoji={emoji}
          title={title}
          description={description || 'No description...'}
          isSelectable={isSelectable}
          isSelected={isSelected}
          onSelectedChange={onSelectedChange}
        />

        <CollectionEntry
          className="note-table-row__last-opened"
          metadata={lastOpened}
        />

        <CollectionEntry
          className="note-table-row__created"
          metadata={created}
        />

        <CollectionEntry
          className="note-table-row__updated"
          metadata={updated}
        />
      </div>
    );
  }
);

NoteTableRow.displayName = 'NoteTableRow';

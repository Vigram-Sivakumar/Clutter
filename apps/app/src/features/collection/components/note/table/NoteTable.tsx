import type { HTMLAttributes, ReactNode } from 'react';
import { CollectionEntry } from '@features/collection/CollectionEntry';
import './NoteTable.css';

export interface NoteTableProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function NoteTable({ children, className, ...props }: NoteTableProps) {
  return (
    <div
      {...props}
      className={['note-table', className].filter(Boolean).join(' ')}
    >
      <div className="note-table__header">
        <div className="note-table__header-cell note-table__header-cell--name">
          Name
        </div>

        <div className="note-table__header-cell note-table__header-cell--last-opened">
          Last opened
        </div>

        <div className="note-table__header-cell note-table__header-cell--created">
          Date created
        </div>

        <div className="note-table__header-cell note-table__header-cell--updated">
          Date updated
        </div>
      </div>

      <div className="note-table__body">
        {children}{' '}
        <CollectionEntry
          className="note-table__new-note"
          icon="plus"
          title="New Note"
        />
      </div>
    </div>
  );
}

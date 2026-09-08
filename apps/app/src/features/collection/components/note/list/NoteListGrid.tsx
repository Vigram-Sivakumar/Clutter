import type { HTMLAttributes, ReactNode } from 'react';
import './NoteListGrid.css';

export interface NoteListGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function NoteListGrid({
  children,
  className,
  ...props
}: NoteListGridProps) {
  return (
    <div
      {...props}
      className={['note-list-grid', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

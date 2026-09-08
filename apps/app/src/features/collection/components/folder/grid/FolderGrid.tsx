import type { HTMLAttributes, ReactNode } from 'react';
import './FolderGrid.css';

export interface FolderGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function FolderGrid({ children, className, ...props }: FolderGridProps) {
  return (
    <div
      {...props}
      className={['folder-grid', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

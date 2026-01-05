/**
 * Generic form dialog store using Zustand
 * Can be used for any form/content: tags, folders, etc.
 */

import { create } from 'zustand';
import { ReactNode } from 'react';

interface FormDialogStore {
  isOpen: boolean;
  content: ReactNode | null;
  title?: string;
  open: (content: ReactNode, title?: string) => void;
  close: () => void;
}

export const useFormDialogStore = create<FormDialogStore>((set) => ({
  isOpen: false,
  content: null,
  title: undefined,
  open: (content, title) => set({ isOpen: true, content, title }),
  close: () => set({ isOpen: false, content: null, title: undefined }),
}));


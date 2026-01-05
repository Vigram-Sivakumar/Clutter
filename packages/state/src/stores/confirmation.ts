/**
 * Confirmation dialog store using Zustand
 * Manages global confirmation dialog state
 */

import { create } from 'zustand';

interface ConfirmationStore {
  isOpen: boolean;
  title: string;
  description: string;
  isDangerous: boolean; // If true, primary button becomes danger button
  onConfirm?: () => void;
  open: (title?: string, description?: string, isDangerous?: boolean, onConfirm?: () => void) => void;
  close: () => void;
}

export const useConfirmationStore = create<ConfirmationStore>((set) => ({
  isOpen: false,
  title: '',
  description: '',
  isDangerous: false,
  onConfirm: undefined,
  open: (title = '', description = '', isDangerous = false, onConfirm = undefined) => 
    set({ isOpen: true, title, description, isDangerous, onConfirm }),
  close: () => set({ isOpen: false, title: '', description: '', isDangerous: false, onConfirm: undefined }),
}));


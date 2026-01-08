/**
 * Confirmation dialog store using Zustand
 * Manages global confirmation dialog state
 */

import { create } from 'zustand';

interface ConfirmationAction {
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
}

interface ConfirmationStore {
  isOpen: boolean;
  title: string;
  description: string;
  isDangerous: boolean; // If true, primary button becomes danger button
  confirmLabel?: string; // Custom label for confirm button
  actions?: ConfirmationAction[]; // For multi-action dialogs
  onConfirm?: () => void; // For simple dialogs
  open: (
    _title?: string,
    _description?: string,
    _isDangerous?: boolean,
    _onConfirm?: () => void,
    _confirmLabel?: string
  ) => void;
  openMultiAction: (
    _title: string,
    _description: string,
    _actions: ConfirmationAction[]
  ) => void;
  close: () => void;
}

export const useConfirmationStore = create<ConfirmationStore>((set) => ({
  isOpen: false,
  title: '',
  description: '',
  isDangerous: false,
  confirmLabel: undefined,
  actions: undefined,
  onConfirm: undefined,

  // Simple two-button confirmation
  open: (
    _title = '',
    _description = '',
    _isDangerous = false,
    _onConfirm = undefined,
    _confirmLabel = undefined
  ) =>
    set({
      isOpen: true,
      title: _title,
      description: _description,
      isDangerous: _isDangerous,
      onConfirm: _onConfirm,
      confirmLabel: _confirmLabel,
      actions: undefined,
    }),

  // Multi-action confirmation (3+ buttons)
  openMultiAction: (_title, _description, _actions) =>
    set({
      isOpen: true,
      title: _title,
      description: _description,
      actions: _actions,
      isDangerous: false,
      onConfirm: undefined,
      confirmLabel: undefined,
    }),

  close: () =>
    set({
      isOpen: false,
      title: '',
      description: '',
      isDangerous: false,
      onConfirm: undefined,
      confirmLabel: undefined,
      actions: undefined,
    }),
}));

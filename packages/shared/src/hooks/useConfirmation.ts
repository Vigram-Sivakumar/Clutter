/**
 * Hook to control the global confirmation dialog
 */

import { useConfirmationStore } from '../stores/confirmation';

export const useConfirmation = () => {
  const open = useConfirmationStore((state) => state.open);
  const close = useConfirmationStore((state) => state.close);

  return {
    openConfirmation: open,
    closeConfirmation: close,
  };
};


/**
 * Hook to control the global confirmation dialog
 */

import { useConfirmationStore } from '@clutter/state';

export const useConfirmation = () => {
  const open = useConfirmationStore((state) => state.open);
  const openMultiAction = useConfirmationStore(
    (state) => state.openMultiAction
  );
  const close = useConfirmationStore((state) => state.close);

  return {
    openConfirmation: open,
    openMultiActionConfirmation: openMultiAction,
    closeConfirmation: close,
  };
};

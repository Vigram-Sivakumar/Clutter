/**
 * @clutter/shared - Shared Utilities & Hooks
 * 
 * Pure utilities and React hooks that are reusable across platforms.
 * Dependencies: @clutter/domain, @clutter/state
 * 
 * Public API: Only exports what is consumed by >1 package.
 */

// Utils: Date formatting (used by UI components)
export {
  getTodayDateString,
  formatTaskDateLabel,
  compareDates,
} from './utils/dateFormatting';

// Utils: Sorting (used by UI components)
export { sortByOrder } from './utils/sorting';

// Hooks (used by UI components)
export { useTheme } from './hooks/useTheme';
export { useConfirmation } from './hooks/useConfirmation';


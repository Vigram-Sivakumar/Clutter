/**
 * @clutter/shared - Shared Utilities & Hooks
 * 
 * Pure utilities and React hooks that are reusable across platforms.
 * Dependencies: @clutter/domain, @clutter/state
 * 
 * Public API: All utilities and hooks are public.
 */

// Utils: ID generation
export { generateId } from './utils';

// Utils: Theme
export { getThemeColors } from './utils';

// Utils: Date formatting
export { formatDate } from './utils';
export {
  getTodayDateString,
  getTomorrowDateString,
  dateToYYYYMMDD,
  formatTaskDateLabel,
  compareDates,
  isSameDay,
  addDays,
  groupByDate,
  DAY_NAMES,
  MONTH_NAMES,
  MONTH_NAMES_FULL,
} from './utils/dateFormatting';

// Utils: Sorting
export { sortByOrder } from './utils/sorting';

// Hooks
export { useTheme } from './hooks/useTheme';
export { useConfirmation } from './hooks/useConfirmation';


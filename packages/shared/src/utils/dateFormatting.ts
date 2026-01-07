/**
 * Date formatting utilities for consistent date handling across the app
 * 
 * Date Formats Used:
 * - YYYY-MM-DD: Storage format for dates (e.g., "2026-01-03")
 * - ISO 8601: Full timestamps for createdAt/updatedAt (e.g., "2026-01-03T14:30:00.000Z")
 * - Display formats: Various human-readable formats for UI
 */

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTH_NAMES_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Get today's date in YYYY-MM-DD format (local time)
 * @returns Date string in YYYY-MM-DD format
 */
export const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get tomorrow's date in YYYY-MM-DD format (local time)
 * @returns Date string in YYYY-MM-DD format
 */
export const getTomorrowDateString = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convert a Date object to YYYY-MM-DD format (local time)
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export const dateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a date string for display in task groups
 * Shows date with special suffixes for Today, Yesterday, Tomorrow
 * Shows year only if different from current year
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @param todayDateString - Today's date in YYYY-MM-DD format (optional, will calculate if not provided)
 * @returns Formatted date string (e.g., "Today, 06 Jan", "Yesterday, 05 Jan", "Tomorrow, 07 Jan", "01 Jan 2027")
 */
export const formatTaskDateLabel = (
  dateString: string,
  todayDateString?: string
): string => {
  const today = todayDateString
    ? new Date(todayDateString + 'T00:00:00')
    : new Date();
  const date = new Date(dateString + 'T00:00:00');
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const day = String(date.getDate());
  const monthName = MONTH_NAMES[date.getMonth()]!;
  const currentYear = today.getFullYear();
  const dateYear = date.getFullYear();
  
  // Base date format
  const yearSuffix = dateYear !== currentYear ? ` ${dateYear}` : '';
  const baseDate = `${day} ${monthName}${yearSuffix}`;
  
  // Check if it's today
  const todayStr = todayDateString || dateToYYYYMMDD(today);
  if (dateString === todayStr) {
    return `Today, ${baseDate}`;
  }
  
  // Check if it's yesterday
  const yesterdayStr = dateToYYYYMMDD(yesterday);
  if (dateString === yesterdayStr) {
    return `Yesterday, ${baseDate}`;
  }
  
  // Check if it's tomorrow
  const tomorrowStr = dateToYYYYMMDD(tomorrow);
  if (dateString === tomorrowStr) {
    return `Tomorrow, ${baseDate}`;
  }
  
  // Otherwise show date only
  return baseDate;
};

/**
 * Compare two date strings (YYYY-MM-DD format)
 * @param dateA - First date string
 * @param dateB - Second date string
 * @returns negative if dateA < dateB, 0 if equal, positive if dateA > dateB
 */
export const compareDates = (dateA: string, dateB: string): number => {
  return dateA.localeCompare(dateB);
};

/**
 * Check if two dates are the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if same day, false otherwise
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Add days to a date
 * @param date - Base date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Group items by date
 * @param items - Items with a date property
 * @param getDate - Function to extract date string from item
 * @returns Map of date strings to arrays of items
 */
export const groupByDate = <T>(
  items: T[],
  getDate: (_item: T) => string
): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  
  items.forEach((item) => {
    const date = getDate(item);
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(item);
  });
  
  return groups;
};

// Export constants for use in other modules
export { DAY_NAMES, MONTH_NAMES, MONTH_NAMES_FULL };

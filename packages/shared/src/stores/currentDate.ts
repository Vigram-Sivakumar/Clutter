import { create } from 'zustand';

interface CurrentDateState {
  year: number;
  month: number; // 0-11 (January = 0)
  monthName: string; // 'January', 'February', etc.
  date: number;  // 1-31
  dateString: string; // YYYY-MM-DD format
  _updateCurrentDate: () => void; // Internal updater
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Global store for current date
 * Automatically updates at midnight (00:00:00)
 * Single source of truth for the entire app
 */
export const useCurrentDateStore = create<CurrentDateState>((set) => {
  // Initialize with current date
  const now = new Date();
  const initialState = {
    year: now.getFullYear(),
    month: now.getMonth(),
    monthName: MONTH_NAMES[now.getMonth()]!,
    date: now.getDate(),
    dateString: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    _updateCurrentDate: () => {
      const newDate = new Date();
      set({
        year: newDate.getFullYear(),
        month: newDate.getMonth(),
        monthName: MONTH_NAMES[newDate.getMonth()]!,
        date: newDate.getDate(),
        dateString: `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`,
      });
    },
  };

  return initialState;
});

// Initialize the midnight updater (only runs once globally)
let midnightTimerId: NodeJS.Timeout | null = null;

/**
 * Starts the global midnight updater
 * Should be called once at app initialization
 */
export function initializeMidnightUpdater() {
  // Prevent multiple initializations
  if (midnightTimerId !== null) {
    console.warn('Midnight updater already initialized');
    return;
  }

  const scheduleNextUpdate = () => {
    // Calculate milliseconds until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    console.log(`⏰ Next date update scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes (at midnight)`);

    midnightTimerId = setTimeout(() => {
      console.log('🌅 Midnight reached! Updating current date...');
      
      // Update the store
      useCurrentDateStore.getState()._updateCurrentDate();
      
      // Schedule next update
      scheduleNextUpdate();
    }, msUntilMidnight);
  };

  scheduleNextUpdate();
}

/**
 * Cleanup function (useful for hot module replacement in development)
 */
export function cleanupMidnightUpdater() {
  if (midnightTimerId !== null) {
    clearTimeout(midnightTimerId);
    midnightTimerId = null;
    console.log('🛑 Midnight updater stopped');
  }
}


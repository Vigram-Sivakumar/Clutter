/**
 * Hydration state tracker
 * Prevents saves during database boot to avoid race conditions
 */

let isHydrating = true;
let isInitialized = false;

export const getHydrationState = () => ({
  isHydrating,
  isInitialized,
});

export const setHydrating = (hydrating: boolean) => {
  isHydrating = hydrating;
};

export const setInitialized = (initialized: boolean) => {
  isInitialized = initialized;
};

/**
 * Dev-mode invariant: Crash if attempting to save during hydration
 * This catches bugs where UI interactions during boot corrupt state
 */
export const assertNotHydrating = (operation: string) => {
  if (process.env.NODE_ENV === 'development' && isHydrating) {
    throw new Error(
      `❌ INVARIANT VIOLATION: ${operation} attempted during hydration!\n` +
      `This will corrupt database state. Wait for hydration to complete.\n` +
      `Current state: isHydrating=${isHydrating}, isInitialized=${isInitialized}`
    );
  }
};

/**
 * Production-safe guard: Log warning instead of crashing
 * Returns true if save should proceed
 */
export const shouldAllowSave = (operation: string): boolean => {
  if (isHydrating) {
    if (process.env.NODE_ENV === 'development') {
      // Dev: crash early to catch bugs
      assertNotHydrating(operation);
      return false;
    } else {
      // Production: log and skip
      console.warn(`⚠️ Skipping ${operation} during hydration (race condition prevented)`);
      return false;
    }
  }
  
  if (!isInitialized) {
    console.warn(`⚠️ Skipping ${operation} - database not initialized`);
    return false;
  }
  
  return true;
};


/**
 * Transition Tokens (Legacy)
 * 
 * @deprecated This file is deprecated. Import from './animations' instead.
 * This file is kept for backward compatibility and re-exports from animations.ts
 * 
 * Migration guide:
 * - `transitions.collapse` → `animations.presets.collapse`
 * - `transitions.standard` → `animations.presets.standard`
 * - `transitions.fast` → `animations.presets.fast`
 * - `transitions.slow` → `animations.presets.slow`
 */

import { animations } from './animations';

/**
 * Re-export transition presets from animations
 * @deprecated Use animations.presets instead
 */
export const transitions = animations.presets;

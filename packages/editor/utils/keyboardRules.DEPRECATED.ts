/**
 * ⚠️ DEPRECATED - DO NOT USE IN NEW CODE
 * 
 * This file contains the old keyboard detection rules.
 * It is kept temporarily for backward compatibility with existing node extensions.
 * 
 * **Migration Path:**
 * - New code should use `packages/editor/plugins/keyboard` instead
 * - Use `handleBackspace()` and `handleEnter()` from keymaps
 * - See MIGRATION_MAP.md for details
 * 
 * **TODO:** Update all node extensions to use new keyboard plugin, then delete this file.
 * 
 * @deprecated Use `packages/editor/plugins/keyboard` instead
 */

// Re-export from old location for backward compatibility
export { EnterRules, BackspaceRules } from './keyboardRules';


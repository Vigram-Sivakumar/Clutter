/**
 * KeyboardEngine - Rule executor
 *
 * Takes a set of rules and evaluates them in priority order.
 * First rule that matches and executes successfully wins.
 *
 * This is the only place where rules are actually run.
 */

import type { Editor } from '@tiptap/core';
import type { KeyboardRule } from '../types/KeyboardRule';
import type { KeyboardContext } from '../types/KeyboardContext';
import { createKeyboardContext } from '../types/KeyboardContext';

/**
 * KeyboardEngine - Evaluates rules in order
 */
export class KeyboardEngine {
  private rules: KeyboardRule[] = [];

  constructor(rules: KeyboardRule[] = []) {
    this.setRules(rules);
  }

  /**
   * Set rules (automatically sorts by priority)
   */
  setRules(rules: KeyboardRule[]): void {
    this.rules = [...rules].sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA; // Higher priority first
    });
  }

  /**
   * Add a rule
   */
  addRule(rule: KeyboardRule): void {
    this.setRules([...this.rules, rule]);
  }

  /**
   * Handle a key press
   *
   * Returns true if a rule handled it, false if no rule matched
   */
  handle(editor: Editor, key: KeyboardContext['key']): boolean {
    const ctx = createKeyboardContext(editor, key);

    console.log(
      `🔧 [KeyboardEngine] Checking ${this.rules.length} rules for ${key}`
    );

    for (const rule of this.rules) {
      // Check if rule applies
      console.log(
        `🔍 [KeyboardEngine] Evaluating rule: ${rule.id} (priority: ${rule.priority})`
      );

      if (!rule.when(ctx)) {
        console.log(`   ⏭️  Skipped - condition not met`);
        continue;
      }

      console.log(`   ✓ Condition met - executing rule`);
      // Execute rule
      const handled = rule.execute(ctx);

      if (handled) {
        console.log(`   ✅ Rule succeeded: ${rule.id}`);
        // Rule succeeded
        if (rule.stopPropagation !== false) {
          // Stop checking more rules (default behavior)
          console.log(`   🛑 Stopping propagation`);
          return true;
        }
        console.log(`   ⏩ Continuing to next rule (fallthrough)`);
        // Continue to next rule (fallthrough)
      } else {
        console.log(`   ❌ Rule failed: ${rule.id}`);
      }
    }

    console.log(`❌ [KeyboardEngine] No rule handled ${key}`);
    // No rule handled it
    return false;
  }

  /**
   * Get all registered rules (for debugging)
   */
  getRules(): ReadonlyArray<KeyboardRule> {
    return this.rules;
  }
}

/**
 * Create a keyboard engine with rules
 */
export function createKeyboardEngine(rules: KeyboardRule[]): KeyboardEngine {
  return new KeyboardEngine(rules);
}

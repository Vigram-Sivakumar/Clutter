/**
 * KeyboardEngine - Rule executor and intent router
 *
 * Takes a set of rules and evaluates them in priority order.
 * Rules emit intents, which are routed through IntentResolver.
 *
 * This is the only place where rules are actually evaluated.
 */

import type { Editor } from '@tiptap/core';
import type { KeyboardRule } from '../types/KeyboardRule';
import type { KeyboardContext } from '../types/KeyboardContext';
import { createKeyboardContext } from '../types/KeyboardContext';
import type { IntentResolver } from '../../../core/engine';

/**
 * KeyboardEngine - Evaluates rules and routes intents
 */
export class KeyboardEngine {
  private rules: KeyboardRule[] = [];
  private resolver: IntentResolver | null = null;

  constructor(rules: KeyboardRule[] = [], resolver?: IntentResolver) {
    this.setRules(rules);
    this.resolver = resolver || null;
  }

  /**
   * Set the intent resolver
   */
  setResolver(resolver: IntentResolver): void {
    this.resolver = resolver;
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

      // Execute rule - can return intent(s) or boolean (legacy)
      const result = rule.execute(ctx);

      // Handle legacy boolean return (for backwards compatibility during transition)
      if (typeof result === 'boolean') {
        if (result) {
          console.log(`   ✅ Rule succeeded (legacy boolean): ${rule.id}`);
          if (rule.stopPropagation !== false) {
            console.log(`   🛑 Stopping propagation`);
            return true;
          }
          console.log(`   ⏩ Continuing to next rule (fallthrough)`);
        } else {
          console.log(`   ❌ Rule failed (legacy boolean): ${rule.id}`);
        }
        continue;
      }

      // Handle intent-based return
      if (!result) {
        console.log(`   ❌ Rule returned null: ${rule.id}`);
        continue;
      }

      // Normalize to array of intents
      const intents = Array.isArray(result) ? result : [result];

      console.log(`   🎯 Rule emitted ${intents.length} intent(s): ${rule.id}`);

      // Route intents through resolver
      let allSucceeded = true;
      for (const intent of intents) {
        console.log(`      → Intent: ${intent.type}`);

        if (this.resolver) {
          // NEW: Route through IntentResolver
          const intentResult = this.resolver.resolve(intent);

          if (intentResult.success) {
            console.log(`      ✅ Intent resolved: ${intent.type}`);
          } else {
            console.log(
              `      ❌ Intent failed: ${intent.type}`,
              intentResult.reason
            );
            allSucceeded = false;
          }
        } else {
          // NO RESOLVER: Log warning but continue
          console.warn(
            `      ⚠️  No resolver set - intent not executed: ${intent.type}`
          );
          allSucceeded = false;
        }
      }

      if (allSucceeded && intents.length > 0) {
        console.log(`   ✅ All intents succeeded: ${rule.id}`);
        if (rule.stopPropagation !== false) {
          console.log(`   🛑 Stopping propagation`);
          return true;
        }
        console.log(`   ⏩ Continuing to next rule (fallthrough)`);
      }
    }

    console.log(`❌ [KeyboardEngine] No rule handled ${key}`);
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
 * Create a keyboard engine with rules (and optional resolver)
 */
export function createKeyboardEngine(
  rules: KeyboardRule[],
  resolver?: IntentResolver
): KeyboardEngine {
  return new KeyboardEngine(rules, resolver);
}

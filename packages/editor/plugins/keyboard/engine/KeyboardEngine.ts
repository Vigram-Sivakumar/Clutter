/**
 * KeyboardEngine - Rule executor and intent router
 *
 * Takes a set of rules and evaluates them in priority order.
 * Rules emit intents, which are routed through IntentResolver.
 *
 * This is the only place where rules are actually evaluated.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔒 SELECTION INVARIANT (ARCHITECTURAL LAW)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ProseMirror:
 *   - TextSelection ONLY
 *   - NEVER NodeSelection
 *
 * Block selection:
 *   - Represented by blockId(s) in the Engine
 *   - Keyboard rules operate on Engine block selection
 *   - PM selection remains TextSelection at all times
 *
 * Keyboard rules MUST NOT:
 *   - Check for NodeSelection
 *   - Rely on NodeSelection state
 *   - Mutate PM selection to NodeSelection
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Editor } from '@tiptap/core';
import type { KeyboardRule } from '../types/KeyboardRule';
import type { KeyboardContext } from '../types/KeyboardContext';
import { createKeyboardContext } from '../types/KeyboardContext';
import type { IntentResolver } from '../../../core/engine';
import type { KeyHandlingResult } from '../types/KeyHandlingResult';
import { handled, notHandled } from '../types/KeyHandlingResult';

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
   * OWNERSHIP CONTRACT:
   * - If handled: true → preventDefault + stopPropagation MUST be called by caller
   * - If handled: false → let ProseMirror/browser handle it
   *
   * CRITICAL: If an intent is emitted (even if it fails), key is ALWAYS handled.
   * This prevents state corruption from double-handling.
   */
  handle(editor: Editor, key: KeyboardContext['key']): KeyHandlingResult {
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
            return handled(undefined, `Legacy rule: ${rule.id}`);
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
      let failureReason: string | undefined;

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
            failureReason = intentResult.reason;
          }
        } else {
          // NO RESOLVER: Log warning but continue
          console.warn(
            `      ⚠️  No resolver set - intent not executed: ${intent.type}`
          );
          allSucceeded = false;
          failureReason = 'No resolver available';
        }
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔑 INTENT RESULT HANDLING (CRITICAL FOR UX)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //
      // If intent SUCCEEDED → consume key (preventDefault)
      // If intent FAILED:
      //   - Structural intents → STILL consume key (no fallback)
      //   - Text intents → allow fallback (let browser/PM handle key)
      //
      // 🔒 STRUCTURAL INTENT LAW (Apple-level behavior):
      // Structural keys (Tab, Shift+Tab, structural Enter/Backspace)
      // must NEVER fall back to browser/PM, even when intent fails.
      //
      // Why: PM fallback on Tab causes:
      //   - Focus to leave editor
      //   - Cursor to disappear
      //   - Selection to drift
      //
      // This matches Apple Notes, Craft, Notion, Workflowy.
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (intents.length > 0) {
        if (allSucceeded) {
          console.log(`   ✅ All intents succeeded: ${rule.id}`);
          if (rule.stopPropagation !== false) {
            console.log(`   🛑 Stopping propagation`);
            return handled(intents[0].type, 'Success');
          }
        } else {
          // 🔒 Check if this is a structural intent
          const firstIntent = intents[0];
          const isStructuralIntent = [
            'indent-block',
            'outdent-block',
            'delete-block',
            'merge-blocks',
            'split-block',
            'convert-block',
            'move-block',
            'toggle-collapse',
          ].includes(firstIntent.type);

          if (isStructuralIntent) {
            // 🔒 STRUCTURAL INTENT: Consume key even on failure
            console.log(
              `   🛡️  Structural intent failed: ${rule.id} - consuming key (no fallback)`
            );
            return handled(
              firstIntent.type,
              `Structural intent blocked: ${failureReason || 'Intent failed'}`
            );
          } else {
            // 🔁 TEXT INTENT: Allow fallback
            console.log(
              `   ⚠️  Intent emitted but failed: ${rule.id} - allowing fallback`
            );
            return notHandled(failureReason || 'Intent failed');
          }
        }
        console.log(`   ⏩ Continuing to next rule (fallthrough)`);
      }
    }

    console.log(`❌ [KeyboardEngine] No rule handled ${key}`);
    return notHandled('No matching rule');
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

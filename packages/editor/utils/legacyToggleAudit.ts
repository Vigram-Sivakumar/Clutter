/**
 * Legacy Toggle Audit Utility
 *
 * STEP 5A: Dry-run migration audit (READ-ONLY)
 *
 * Purpose: Answer "How much legacy toggle data exists?"
 * before making any deletions or migrations.
 *
 * CRITICAL: This utility performs NO mutations.
 * - No transactions
 * - No saves
 * - No UI changes
 * - Only reporting
 */

import type { Node as PMNode } from '@tiptap/pm/model';

/**
 * Legacy toggle audit report
 */
export interface LegacyToggleReport {
  /** Total blocks with parentToggleId */
  total: number;

  /** Breakdown by block type */
  byType: Record<string, number>;

  /** Blocks with parentToggleId but NO parentBlockId (need repair) */
  orphaned: number;

  /** Blocks with BOTH parentToggleId AND parentBlockId (auto-convertible) */
  convertible: number;

  /** Blocks with parentToggleId that reference non-existent toggles */
  dangling: number;

  /** All unique parentToggleId values found */
  toggleIds: Set<string>;
}

/**
 * Audit legacy toggle usage in a document
 *
 * Walks the entire document and reports on blocks using the
 * deprecated parentToggleId attribute system.
 *
 * @param doc - ProseMirror document to audit
 * @returns Read-only report of legacy toggle usage
 */
export function auditLegacyToggles(doc: PMNode): LegacyToggleReport {
  const report: LegacyToggleReport = {
    total: 0,
    byType: {},
    orphaned: 0,
    convertible: 0,
    dangling: 0,
    toggleIds: new Set<string>(),
  };

  // First pass: collect all valid toggle IDs
  const validToggleIds = new Set<string>();
  doc.descendants((node) => {
    if (
      node.type.name === 'listBlock' &&
      node.attrs?.listType === 'toggle' &&
      node.attrs?.blockId
    ) {
      validToggleIds.add(node.attrs.blockId);
    }
    // Also check legacy structural toggles (if any exist)
    if (node.type.name === 'toggleBlock' && node.attrs?.blockId) {
      validToggleIds.add(node.attrs.blockId);
    }
    return true;
  });

  // Second pass: audit all blocks with parentToggleId
  doc.descendants((node) => {
    const parentToggleId = node.attrs?.parentToggleId;
    if (!parentToggleId) return true;

    // This block uses legacy system
    report.total++;
    report.toggleIds.add(parentToggleId);

    // Count by type
    const typeName = node.type.name;
    report.byType[typeName] = (report.byType[typeName] ?? 0) + 1;

    // Check if convertible (has both systems)
    if (node.attrs.parentBlockId) {
      report.convertible++;
    } else {
      report.orphaned++;
    }

    // Check if dangling (references non-existent toggle)
    if (!validToggleIds.has(parentToggleId)) {
      report.dangling++;
    }

    return true;
  });

  return report;
}

/**
 * Format audit report for console logging
 *
 * @param report - Audit report to format
 * @returns Formatted string for console.log
 */
export function formatAuditReport(report: LegacyToggleReport): string {
  const lines = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '📊 LEGACY TOGGLE AUDIT REPORT',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `Total blocks with parentToggleId: ${report.total}`,
    '',
    'Breakdown by type:',
    ...Object.entries(report.byType).map(
      ([type, count]) => `  - ${type}: ${count}`
    ),
    '',
    `Convertible (have both parentToggleId + parentBlockId): ${report.convertible}`,
    `Orphaned (only parentToggleId, no parentBlockId): ${report.orphaned}`,
    `Dangling (reference non-existent toggle): ${report.dangling}`,
    '',
    `Unique toggle IDs referenced: ${report.toggleIds.size}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ];

  return lines.join('\n');
}

/**
 * Quick audit helper for console use
 *
 * Usage in browser console:
 * ```
 * import { quickAudit } from '@clutter/editor';
 * quickAudit(editor);
 * ```
 */
export function quickAudit(editor: any): void {
  const report = auditLegacyToggles(editor.state.doc);
  console.log(formatAuditReport(report));

  // Also log as table for easy inspection
  console.table({
    Total: report.total,
    Convertible: report.convertible,
    Orphaned: report.orphaned,
    Dangling: report.dangling,
    'Toggle IDs': report.toggleIds.size,
  });
}

/**
 * Decision helper based on audit results
 *
 * @param report - Audit report
 * @returns Recommended next action
 */
export function getRecommendedAction(
  report: LegacyToggleReport
): 'delete' | 'migrate' | 'repair' | 'investigate' {
  // No legacy usage - safe to delete immediately
  if (report.total === 0) {
    return 'delete';
  }

  // Dangling references - need investigation
  if (report.dangling > 0) {
    return 'investigate';
  }

  // Orphaned blocks - need repair before migration
  if (report.orphaned > 0) {
    return 'repair';
  }

  // All blocks have both systems - safe to migrate
  if (report.convertible === report.total) {
    return 'migrate';
  }

  // Edge case - investigate
  return 'investigate';
}

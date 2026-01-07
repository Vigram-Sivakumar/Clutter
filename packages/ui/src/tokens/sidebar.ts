/**
 * Sidebar Layout Tokens
 * Single source of truth for all sidebar spacing, sizing, and layout
 */

export const sidebarLayout = {
  // --- Vertical Spacing (top to bottom hierarchy) ---
  sectionToSectionGap: '4px', // Between major sections (Inbox → Today → Upcoming → Completed)
  sectionHeaderToContentGroups: '0px', // Between section header and its first item (e.g., "Today" → "Overdue")
  groupTitleToItemsGap: '0px', // Between group title and its first item (e.g., "Overdue" → first task)
  itemToItemGap: '0px', // Between individual items within a section (task → task, note → note)
  sectionContentPaddingBottom: '0px', // Bottom padding inside section content (before next section starts)

  // --- Item Sizing ---
  itemHeight: '28px', // Universal height for all items (notes, folders, tasks, headers, groups)
  itemPaddingX: '4px', // Horizontal padding inside each item (left & right)
  itemBorderRadius: '6px', // Corner radius for item backgrounds

  // --- Empty State ---
  emptyStatePaddingTop: '4px', // Top padding for empty state message
  emptyStatePaddingRight: '4px', // Right padding for empty state message
  emptyStatePaddingBottom: '4px', // Bottom padding for empty state message
  emptyStatePaddingLeft: '4px', // Left padding for empty state message (base, before indent)
  emptyStateFontSize: '12px', // Font size for empty state message
  emptyStateLineHeight: '1.5', // Line height for empty state message
  emptyStateTextColor: 'tertiary', // Text color key for empty state (maps to colors.text[key])

  // --- Horizontal Spacing (inside each item, left to right) ---
  itemContentGap: '4px', // Between icon/emoji and label text
  itemRightSideGap: '2px', // Between label and right-side elements (quick add → badge → chevron)
  itemActionsGap: '2px', // Between multiple action buttons (if present)

  // Indentation
  indentPerLevel: '24px', // Each nesting level adds 24px
  maxVisualIndent: 3, // Cap indent at 3 levels (72px max)

  // Icon/Button sizes
  iconButtonSize: '20px', // All icon buttons (emoji, folder, chevron)
  iconSize: '16px', // Phosphor icon size (calendar, folder icons, etc.)
  emojiSize: '14px', // Emoji font size (notes, folders)
  checkboxSize: '14px', // Checkbox size (task items)
  badgeMinSize: '20px', // Badge/count container

  // Typography
  itemFontSize: '14px', // Note/folder/tag label font size
  itemFontWeight: 500, // Note/folder/tag label font weight
  headerFontSize: '12px', // Section header font size
  headerFontWeight: 600, // Section header font weight
  headerLetterSpacing: '0.5px', // Section header letter spacing
  badgeFontSize: '12px', // Badge/count font size

  // Tag-specific (colored pills)
  tagPillPadding: '0px 4px', // Inner padding of colored pill
  tagPillRadius: '3px', // Smaller radius for pills
  tagPillMinHeight: '20px', // Minimum height for tag pill
  tagPillFontSize: '14px', // Tag pill font size
  tagPillLineHeight: '20px', // Tag pill line height

  // Calendar-specific (Tasks tab)
  calendarGridGap: '0px', // Gap between calendar date cells (weekday headers & dates)
  calendarCellHeight: '24px', // Height of weekday headers and date buttons
  calendarPadding: '4px', // Padding inside calendar date grid wrapper
  calendarBorderRadius: '6px', // Border radius for calendar wrapper and date buttons
} as const;

export type SidebarLayout = typeof sidebarLayout;

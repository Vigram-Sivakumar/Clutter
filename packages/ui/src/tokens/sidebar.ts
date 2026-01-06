/**
 * Sidebar Layout Tokens
 * Single source of truth for all sidebar spacing, sizing, and layout
 */

export const sidebarLayout = {
  // Section spacing
  sectionGap: '4px', // Gap between FAVOURITES, FOLDERS, TAGS sections
  headerToItemsGap: '0px', // Gap between section header and first item (e.g., "FAVOURITES" → items)
  sectionContentPaddingBottom: '8px', // Bottom padding for section content wrapper

  // Item spacing
  itemGap: '2px', // Gap between individual items (notes, folders, tags, headers)
  itemHeight: '28px', // All items same height
  groupTitleHeight: '32px', // Group title height (date groups, category headers)
  itemPaddingX: '4px', // Left & right padding inside item (items)
  itemBorderRadius: '6px', // Item corner radius

  // Header-specific (slight variations from items)
  headerPaddingX: '8px', // Headers have more padding

  // Item internal spacing
  itemContentGap: '4px', // Gap between icon → label
  itemActionsGap: '2px', // Gap between action buttons
  itemRightSideGap: '2px', // Gap between label → actions → badge → chevron

  // Indentation
  indentPerLevel: '24px', // Each nesting level adds 24px
  maxVisualIndent: 3, // Cap indent at 3 levels (72px max)

  // Icon/Button sizes
  iconButtonSize: '20px', // All icon buttons (emoji, folder, chevron)
  iconSize: '16px', // Icon inside button
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

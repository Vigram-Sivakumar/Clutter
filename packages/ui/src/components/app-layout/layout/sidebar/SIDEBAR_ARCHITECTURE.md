# Sidebar Architecture

## Component Hierarchy

```
AppSidebar (packages/ui/src/components/app-layout/layout/sidebar/AppSidebar.tsx)
└── SidebarContainer (packages/ui/src/components/app-layout/layout/sidebar/SidebarContainer.tsx)
    ├── Window Controls (macOS traffic lights)
    ├── Tabs (Notes, Calendar, Tasks, Tags)
    ├── Action Bar (Tab-specific, non-scrollable) ← IMPORTANT
    ├── Mini Calendar (Tasks tab only)
    └── View Components (Scrollable content)
        ├── NotesView
        ├── CalendarView
        ├── TaskView
        └── TagsView
```

## Critical Pattern: Action Bars Must Stay in SidebarContainer

### ✅ CORRECT Pattern (Current)

Action bars are rendered in **SidebarContainer.tsx**, outside the scrollable view:

```tsx
// SidebarContainer.tsx
{
  contentType === 'notes' && (
    <div style={{ paddingLeft: '16px', paddingRight: '16px', flexShrink: 0 }}>
      <SidebarActionBar
        onPrimaryAction={onCreateNote}
        onSecondaryAction={onSearch}
        primaryLabel="Create Note"
        primaryShortcut={createButtonShortcut}
      />
    </div>
  );
}

{
  contentType === 'task' && (
    <div style={{ paddingLeft: '16px', paddingRight: '16px', flexShrink: 0 }}>
      <SidebarActionBar
        onPrimaryAction={onCreateTask}
        onSecondaryAction={onOpenCalendar}
        primaryLabel="Create Task"
        primaryShortcut="⌘T"
      />
    </div>
  );
}

{
  contentType === 'tags' && (
    <div style={{ paddingLeft: '16px', paddingRight: '16px', flexShrink: 0 }}>
      <SidebarActionBar
        onPrimaryAction={onCreateTag}
        onSecondaryAction={() => {}}
        primaryLabel="Create Tag"
        primaryShortcut="⌘⇧T"
      />
    </div>
  );
}
```

### ❌ INCORRECT Pattern (DO NOT DO THIS)

**Never** render action bars inside view components:

```tsx
// ❌ BAD - TaskView.tsx
return (
  <div style={{ gap: '4px' }}>
    <SidebarActionBar ... /> {/* ❌ Scrolls away, only 4px gap */}
    <SidebarSection ... />
  </div>
);
```

## Why This Pattern Matters

### Benefits of SidebarContainer approach:

1. **Always Visible** 👁️
   - Action bars stay fixed when scrolling through long lists
   - Primary actions always accessible

2. **Consistent Spacing** 📏
   - Automatic 16px padding via `DESIGN.spacing.paddingBase`
   - No need to remember margins in every view

3. **Clear Hierarchy** 🏗️
   - Chrome (tabs, action bars) vs Content (scrollable views)
   - Matches mental model: tabs → actions → content

4. **Single Source of Truth** 🎯
   - All action bars in one file (`SidebarContainer.tsx`)
   - Easy to see all tab actions at a glance

### Problems with inline action bars:

1. **Scrolls Away** 😞
   - User scrolls down → can't create new item without scrolling back up

2. **Inconsistent Gaps** 📐
   - Must remember to add bottom margin in each view
   - Different developers = different spacing

3. **Fragmented Logic** 🧩
   - Action bar code scattered across multiple view files

## Action Bar Configuration

Each tab can have:

- **Primary Action** (left, full width) - Main CTA like "Create Note"
- **Secondary Action** (right, icon only) - Supporting action like Search

### Examples:

| Tab      | Primary Action | Shortcut | Secondary Action |
| -------- | -------------- | -------- | ---------------- |
| Notes    | Create Note    | ⌘N       | Search (🔍)      |
| Tasks    | Create Task    | ⌘T       | Calendar (📅)    |
| Tags     | Create Tag     | ⌘⇧T      | Hash (#)         |
| Calendar | (Calendar UI)  | -        | -                |

## Component Responsibilities

### SidebarContainer

- Manages layout and chrome
- Renders tabs
- Renders action bars (✅ IMPORTANT)
- Renders mini calendar (tasks tab)
- Wraps scrollable area

### View Components (NotesView, TaskView, etc.)

- Render scrollable content ONLY
- Use `SidebarSection` for major sections
- Use `SidebarListGroup` for sub-groups
- NO action bars (let SidebarContainer handle it)

## Spacing Tokens

```typescript
// packages/ui/src/tokens/sidebar.ts
export const sidebarLayout = {
  sectionToSectionGap: '4px', // Between sections
  sectionHeaderToContentGroups: '0px', // Header → content
  groupTitleToItemsGap: '0px', // Group title → items
  itemToItemGap: '0px', // Item → item
  // ...
};
```

Action bars get **16px padding** from `spacing['16']` in SidebarContainer, not from these tokens.

## Future Additions

When adding a new tab:

1. ✅ Add tab config to `SIDEBAR_TABS` (packages/ui/src/config/sidebarConfig.ts)
2. ✅ Create view component in `views/` folder
3. ✅ Add action bar in `SidebarContainer.tsx` (if needed)
4. ✅ Pass handlers from `AppSidebar.tsx` → `SidebarContainer.tsx` → action bar
5. ❌ DO NOT add action bar inside view component

## Related Files

- `SidebarContainer.tsx` - Main container, handles action bars
- `sections/ActionBar.tsx` - Reusable action bar component
- `sections/Section.tsx` - Collapsible sections (Inbox, Today, etc.)
- `sections/ListGroup.tsx` - Sub-groups with date labels
- `views/` - Individual tab view components (scrollable content only)
- `items/` - Individual item components (notes, tasks, folders, etc.)
- `../../../tokens/sidebar.ts` - Spacing and sizing tokens

## Summary

**Remember:** Action bars are part of the chrome, not the content. Keep them in `SidebarContainer.tsx` for a consistent, accessible, and maintainable sidebar architecture.

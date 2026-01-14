/**
 * Slash Command Registry
 *
 * Phase 3 - Step 3A: Command definitions and filtering
 *
 * IMPORTANT:
 * - This is pure data (no editor coupling)
 * - Commands are deterministic and ordered
 * - Filtering is case-insensitive substring match
 */

export type SlashCommand = {
  id: string;
  label: string;
  description: string;
  aliases: string[]; // Alternative search terms
  icon?: string; // Optional icon/emoji
  action:
    | 'paragraph'
    | 'heading1'
    | 'heading2'
    | 'heading3'
    | 'bulletList'
    | 'orderedList'; // Node type to insert
};

/**
 * Available slash commands
 * Order matters: this is the default display order
 */
export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'paragraph',
    label: 'Text',
    description: 'Plain text paragraph',
    aliases: ['text', 'paragraph', 'p'],
    icon: '¶',
    action: 'paragraph',
  },
  {
    id: 'heading1',
    label: 'Heading 1',
    description: 'Large section heading',
    aliases: ['heading', 'h1', 'title'],
    icon: 'H1',
    action: 'heading1',
  },
  {
    id: 'heading2',
    label: 'Heading 2',
    description: 'Medium section heading',
    aliases: ['heading', 'h2', 'subtitle'],
    icon: 'H2',
    action: 'heading2',
  },
  {
    id: 'heading3',
    label: 'Heading 3',
    description: 'Small section heading',
    aliases: ['heading', 'h3'],
    icon: 'H3',
    action: 'heading3',
  },
  {
    id: 'bulletList',
    label: 'Bullet List',
    description: 'Unordered list',
    aliases: ['bullet', 'list', 'ul', '-'],
    icon: '•',
    action: 'bulletList',
  },
  {
    id: 'orderedList',
    label: 'Numbered List',
    description: 'Ordered list',
    aliases: ['numbered', 'list', 'ol', '1'],
    icon: '1.',
    action: 'orderedList',
  },
];

/**
 * Filter commands by query
 *
 * Matching logic:
 * - Case-insensitive
 * - Matches label or aliases
 * - Substring match (not prefix-only)
 * - Preserves original order
 *
 * @param query - User input after "/"
 * @returns Filtered commands in original order
 */
export function filterCommands(query: string): SlashCommand[] {
  if (!query || query.trim() === '') {
    return SLASH_COMMANDS; // Show all if empty
  }

  const normalizedQuery = query.toLowerCase().trim();

  return SLASH_COMMANDS.filter((cmd) => {
    // Check label
    if (cmd.label.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // Check aliases
    return cmd.aliases.some((alias) =>
      alias.toLowerCase().includes(normalizedQuery)
    );
  });
}

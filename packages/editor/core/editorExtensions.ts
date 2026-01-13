/**
 * Shared Editor Extensions
 *
 * ⚠️ CRITICAL: This must be a SINGLE, CANONICAL extension list
 *
 * Used by:
 * - EditorCore (main editor instance)
 * - TipTapWrapper (for generateJSON HTML parsing)
 *
 * WHY THIS MATTERS:
 * ProseMirror schemas must be self-contained. If you create multiple schemas
 * from different subsets of extensions, they will be incompatible and cause
 * "Schema is missing its top node type ('doc')" errors.
 *
 * RULES:
 * 1. Never create partial extension lists
 * 2. Never use different subsets for different purposes
 * 3. Always use THIS list for any schema creation
 */

// Core nodes
import { Document } from '../extensions/nodes/Document';
import { Text } from '../extensions/nodes/Text';
import { Paragraph } from '../extensions/nodes/Paragraph';
import { Heading } from '../extensions/nodes/Heading';
import { ListBlock } from '../extensions/nodes/ListBlock';
import { Blockquote } from '../extensions/nodes/Blockquote';
import { CodeBlock } from '../extensions/nodes/CodeBlock';
import { HorizontalRule } from '../extensions/nodes/HorizontalRule';
import { Link } from '../extensions/marks/Link';
import { Callout } from '../extensions/nodes/Callout';
import { DateMention as DateMentionNode } from '../extensions/nodes/DateMention';
import { NoteLink } from '../extensions/nodes/NoteLink';

// Marks
import { Bold } from '../extensions/marks/Bold';
import { Italic } from '../extensions/marks/Italic';
import { Underline } from '../extensions/marks/Underline';
import { Strike } from '../extensions/marks/Strike';
import { Code } from '../extensions/marks/Code';
import { WavyUnderline } from '../extensions/marks/WavyUnderline';
import { CustomHighlight } from '../extensions/marks/Highlight';
import { TextColor } from '../extensions/marks/TextColor';

// TipTap built-in extensions
import Gapcursor from '@tiptap/extension-gapcursor';
import History from '@tiptap/extension-history';
import HardBreak from '@tiptap/extension-hard-break';

// Plugins
import { MarkdownShortcuts } from '../plugins/MarkdownShortcuts';
import { SlashCommands } from '../plugins/SlashCommands';
import { TaskPriority } from '../plugins/TaskPriority';
import { BackspaceHandler } from '../plugins/BackspaceHandler';
import { TabHandler } from '../plugins/TabHandler';
import { KeyboardShortcuts } from '../plugins/KeyboardShortcuts';
import { EscapeMarks } from '../plugins/EscapeMarks';
import { DoubleSpaceEscape } from '../plugins/DoubleSpaceEscape';
import { HashtagDetection } from '../plugins/HashtagDetection';
import { HashtagAutocomplete } from '../plugins/HashtagAutocomplete';
import { AtMention } from '../plugins/AtMention';
import { BlockIdGenerator } from '../extensions/BlockIdGenerator';
import { SelectAll } from '../plugins/SelectAll';
import { BlockDeletion } from '../plugins/BlockDeletion';
import { UndoRedo } from '../plugins/UndoRedo';

/**
 * Base extensions for schema creation
 *
 * Use this for:
 * - generateJSON() (HTML parsing)
 * - Editor initialization (when plugins don't need runtime config)
 */
export const BASE_EXTENSIONS = [
  // Core nodes - ORDER MATTERS: Document must be first
  Document,
  Text,
  Paragraph,
  Heading,
  ListBlock,
  Blockquote,
  CodeBlock,
  HorizontalRule,
  HardBreak,
  Link,
  Callout,
  DateMentionNode,
  NoteLink,

  // TipTap built-ins
  Gapcursor,
  History,

  // Marks
  Bold,
  Italic,
  Underline,
  Strike,
  Code,
  WavyUnderline,
  TextColor,
  CustomHighlight,
] as const;

/**
 * Create full editor extensions with runtime configuration
 *
 * @param config - Runtime configuration for plugins that need callbacks
 */
export function createEditorExtensions(config: {
  colors: any;
  availableTags: string[];
  onNavigate?: (_linkType: 'note' | 'folder', _targetId: string) => void;
}) {
  return [
    // All base extensions
    ...BASE_EXTENSIONS.map((ext) => {
      // Configure NoteLink with onNavigate callback
      if (ext === NoteLink) {
        return NoteLink.configure({
          onNavigate: (_linkType, _targetId) => {
            config.onNavigate?.(_linkType, _targetId);
          },
        });
      }
      // Configure HardBreak
      if (ext === HardBreak) {
        return HardBreak.configure({
          keepMarks: true,
        });
      }
      return ext;
    }),

    // Plugins (require runtime configuration)
    BlockIdGenerator,
    MarkdownShortcuts,
    SlashCommands,
    TaskPriority,
    BackspaceHandler,
    KeyboardShortcuts,
    TabHandler,
    EscapeMarks,
    DoubleSpaceEscape,
    SelectAll,
    BlockDeletion,
    UndoRedo,
    HashtagDetection,
    HashtagAutocomplete.configure({
      getColors: () => config.colors,
      getTags: () => config.availableTags,
    }),
    AtMention.configure({
      getColors: () => config.colors,
    }),
  ] as any[];
}

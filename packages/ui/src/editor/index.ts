/**
 * Main Editor - Clean Architecture Editor System
 * 
 * The primary editor implementation with consistent patterns and comprehensive support.
 */

// Tokens
export * from './tokens';

// Types
export * from './types';

// Nodes
export { Document } from './extensions/nodes/Document';
export { Text } from './extensions/nodes/Text';
export { Paragraph } from './extensions/nodes/Paragraph';
export { Heading } from './extensions/nodes/Heading';
export { ListBlock } from './extensions/nodes/ListBlock';
export { Blockquote } from './extensions/nodes/Blockquote';
export { CodeBlock } from './extensions/nodes/CodeBlock';
export { HorizontalRule } from './extensions/nodes/HorizontalRule';
export { ToggleBlock } from './extensions/nodes/ToggleBlock';

// Marks
export { Bold } from './extensions/marks/Bold';
export { Italic } from './extensions/marks/Italic';
export { Underline } from './extensions/marks/Underline';
export { Strike } from './extensions/marks/Strike';
export { Code } from './extensions/marks/Code';
export { WavyUnderline } from './extensions/marks/WavyUnderline';
export { Link } from './extensions/marks/Link';

// Plugins
export { MarkdownShortcuts } from './plugins/MarkdownShortcuts';
export { SlashCommands, SLASH_COMMANDS, SLASH_PLUGIN_KEY, filterSlashCommands } from './plugins/SlashCommands';
export type { SlashCommand } from './plugins/SlashCommands';
export { BackspaceHandler } from './plugins/BackspaceHandler';
export { EscapeMarks } from './plugins/EscapeMarks';
export { DoubleSpaceEscape } from './plugins/DoubleSpaceEscape';

// Components
export { SlashCommandMenu } from './components/SlashCommandMenu';
export { EditorCore } from './components/EditorCore';
export type { EditorCoreHandle } from './components/EditorCore';
export { BlockWrapper, MarkerContainer, blockStyles, getBlockContainerStyle, getMarkerStyle, getContentStyle } from './components/BlockWrapper';
export { Paragraph } from './components/Paragraph';
export { Heading } from './components/Heading';
export { ListBlock } from './components/ListBlock';
export { Blockquote } from './components/Blockquote';
export { CodeBlock } from './components/CodeBlock';
export { HorizontalRule } from './components/HorizontalRule';
export { Callout } from './components/Callout';
export { Date } from './components/Date';
export { ToggleBlock as ToggleBlockComponent } from './components/ToggleBlock';

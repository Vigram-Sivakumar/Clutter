/**
 * CodeBlock Node - Multi-line code block
 * 
 * Block element for code with syntax highlighting.
 * - Language attribute for highlighting
 * - Monospace font
 * - Dark background
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { CodeBlock as CodeBlockComponent } from '../../components/CodeBlock';
// NOTE: Structural keyboard logic is handled via keyboard rules (indent/outdent intents)

// NOTE: indentBlock/outdentBlock removed - now handled via keyboard rules

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    codeBlock: {
      /**
       * Set a code block node
       */
      setCodeBlock: (attributes?: { language?: string }) => ReturnType;
      /**
       * Toggle a code block node
       */
      toggleCodeBlock: (attributes?: { language?: string }) => ReturnType;
    };
  }
}

export const CodeBlock = Node.create({
  name: 'codeBlock',

  // Higher priority so Enter handler runs before defaults
  priority: 1000,

  // Block-level content
  group: 'block',

  // Contains text directly (no inline marks)
  content: 'text*',

  // Marks are not allowed inside code blocks
  marks: '',

  // Code blocks are their own entity
  code: true,
  defining: true,

  // Attributes
  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-block-id') || crypto.randomUUID(),
        renderHTML: (attributes) => {
          const blockId = attributes.blockId || crypto.randomUUID();
          return { 'data-block-id': blockId };
        },
      },
      language: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-language'),
        renderHTML: (attributes) => {
          if (!attributes.language) return {};
          return { 'data-language': attributes.language };
        },
      },
      // 🔥 FLAT MODEL: indent is the ONLY structural attribute
      indent: {
        default: 0,
        parseHTML: (element) =>
          parseInt(element.getAttribute('data-indent') || '0', 10),
        renderHTML: (attributes) => ({
          'data-indent': attributes.indent || 0,
        }),
      },
      // 🔒 COLLAPSE CONTRACT: All structural blocks must have collapsed attribute
      collapsed: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attributes) => ({
          'data-collapsed': attributes.collapsed || false,
        }),
      },
    };
  },

  // Parse from HTML
  parseHTML() {
    return [
      {
        tag: 'pre',
        preserveWhitespace: 'full',
      },
    ];
  },

  // Render to HTML (fallback)
  renderHTML({ node, HTMLAttributes }) {
    return [
      'pre',
      mergeAttributes(HTMLAttributes, {
        'data-language': node.attrs.language,
      }),
      ['code', {}, 0],
    ];
  },

  // Use React component for rendering
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },

  // Commands
  addCommands() {
    return {
      setCodeBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.setNode(this.name, attributes);
        },
      toggleCodeBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph', attributes);
        },
    };
  },

  // Keyboard shortcuts
  addKeyboardShortcuts() {
    return {
      'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),
      
      // NOTE: Tab inside code blocks has special behavior (inserts literal tab).
      // This is preserved as it's content editing, not structural.
      // Structural indent/outdent via keyboard rules (indent-block/outdent-block intents).
      Tab: ({ editor }) => {
        if (!editor.isActive('codeBlock')) return false;
        return editor.commands.insertContent('\t');
      },

      // Shift+Enter: Insert newline (same as Enter for code blocks)
      'Shift-Enter': ({ editor }) => {
        // Check if we're inside a codeBlock
        const { state } = editor;
        const { $from } = state.selection;
        
        if ($from.parent.type.name === this.name) {
          return editor.commands.insertContent('\n');
        }
        
        return false;
      },

      // Exit on double Enter (empty line at end)
      Enter: ({ editor }) => {
        if (!editor.isActive('codeBlock')) return false;
        
        const { state } = editor;
        const { $from } = state.selection;
        
        // Get the code block node and position
        const codeBlockDepth = $from.depth;
        const codeBlockPos = $from.before(codeBlockDepth);
        const codeBlockNode = state.doc.nodeAt(codeBlockPos);
        
        if (!codeBlockNode) return false;
        
        const attrs = codeBlockNode.attrs;
        
        // Get the code block bounds
        const codeBlockStart = $from.start();
        const codeBlockEnd = $from.end();
        const fullText = state.doc.textBetween(codeBlockStart, codeBlockEnd);
        
        // Handle empty code block - delegate to keyboard rules
        if (fullText === '' || fullText === '\n') {
          return false; // Let keyboard rules handle empty block Enter
        }
        
        // Check if we're at the end of the code block
        const isAtEnd = $from.pos === codeBlockEnd;
        
        // Check if the last character is a newline (meaning we're on an empty line)
        const endsWithNewline = fullText.endsWith('\n');
        
        // Double-enter: if at end and previous char is newline, exit the code block
        if (isAtEnd && endsWithNewline) {
          const { tr } = state;
          const paragraphType = state.schema.nodes.paragraph;
          
          if (!paragraphType) return false;
          
          // Remove the trailing newline
          tr.delete(codeBlockEnd - 1, codeBlockEnd);
          
          // Insert new paragraph after code block (FLAT MODEL)
          const afterCodeBlock = codeBlockPos + codeBlockNode.nodeSize - 1;
          const newParagraph = paragraphType.create({
            blockId: crypto.randomUUID(),
            indent: attrs.indent || 0,  // FLAT MODEL: same indent
          });
          tr.insert(afterCodeBlock, newParagraph);
          
          // Move cursor to new paragraph
          tr.setSelection(TextSelection.create(tr.doc, afterCodeBlock + 1));
          
          editor.view.dispatch(tr);
          return true;
        }
        
        // Normal Enter: insert newline
        return editor.commands.insertContent('\n');
      },
    };
  },
});

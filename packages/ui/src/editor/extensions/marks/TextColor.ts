/**
 * TextColor Extension
 * 
 * Allows changing the text/foreground color of selected text.
 */

import { Mark, mergeAttributes } from '@tiptap/core';

export interface TextColorOptions {
  HTMLAttributes: Record<string, string>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textColor: {
      setTextColor: (color: string) => ReturnType;
      unsetTextColor: () => ReturnType;
    };
  }
}

export const TextColor = Mark.create<TextColorOptions>({
  name: 'textColor',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: element => element.getAttribute('data-text-color') || element.style.color,
        renderHTML: attributes => {
          if (!attributes.color) {
            return {};
          }
          return {
            'data-text-color': attributes.color,
            style: `color: ${attributes.color}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-text-color]',
      },
      {
        style: 'color',
        getAttrs: value => {
          if (typeof value !== 'string' || !value) {
            return false;
          }
          return { color: value };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setTextColor: color => ({ commands }) => {
        return commands.setMark(this.name, { color });
      },
      unsetTextColor: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});


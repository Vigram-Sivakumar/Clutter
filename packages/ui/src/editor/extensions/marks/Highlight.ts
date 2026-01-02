/**
 * Custom Highlight Extension
 * 
 * Extends TipTap's Highlight to support both background and text colors
 * for WCAG accessibility compliance.
 */

import { Mark, mergeAttributes } from '@tiptap/core';

export const CustomHighlight = Mark.create({
  name: 'highlight',

  addOptions() {
    return {
      multicolor: true,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: element => element.getAttribute('data-color') || element.style.backgroundColor,
        renderHTML: attributes => {
          if (!attributes.color) {
            return {};
          }
          return {
            'data-color': attributes.color,
            style: `background-color: ${attributes.color}`,
          };
        },
      },
      textColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-text-color') || element.style.color,
        renderHTML: attributes => {
          if (!attributes.textColor) {
            return {};
          }
          return {
            'data-text-color': attributes.textColor,
            style: `color: ${attributes.textColor}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'mark' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Merge styles from both attributes
    const bgStyle = HTMLAttributes['data-color'] ? `background-color: ${HTMLAttributes['data-color']}` : '';
    const textStyle = HTMLAttributes['data-text-color'] ? `color: ${HTMLAttributes['data-text-color']}` : '';
    const combinedStyle = [bgStyle, textStyle].filter(Boolean).join('; ');

    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style: combinedStyle || null,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setHighlight: attributes => ({ commands }) => {
        return commands.setMark(this.name, attributes);
      },
      toggleHighlight: attributes => ({ commands }) => {
        return commands.toggleMark(this.name, attributes);
      },
      unsetHighlight: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});




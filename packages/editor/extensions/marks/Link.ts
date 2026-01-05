/**
 * Link Mark - Simple hyperlinks
 * 
 * Renders as <a> tag with href attribute.
 * Uses same styling as date (tertiary color + wavy underline)
 * - Cmd/Ctrl+Click to open link in new tab
 */

import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { getWaveStyles, patterns } from '../../tokens';
import { colors } from '@clutter/ui';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    link: {
      setLink: (attributes: { href: string }) => ReturnType;
      toggleLink: (attributes: { href: string }) => ReturnType;
      unsetLink: () => ReturnType;
    };
  }
}

// Use same color as date (tertiary)
const LINK_COLOR = colors.dark.text.tertiary;

export const Link = Mark.create({
  name: 'link',

  priority: 1000,

  inclusive: false,

  addAttributes() {
    return {
      href: {
        default: null,
      },
      target: {
        default: '_blank',
      },
      rel: {
        default: 'noopener noreferrer nofollow',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[href]',
        getAttrs: (element) => {
          const el = element as HTMLAnchorElement;
          return {
            href: el.getAttribute('href'),
            target: el.getAttribute('target'),
            rel: el.getAttribute('rel'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const waveStyles = getWaveStyles(LINK_COLOR);
    
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        style: `
          color: ${LINK_COLOR};
          text-decoration: none;
          cursor: pointer;
          background-image: ${waveStyles.backgroundImage};
          background-repeat: ${waveStyles.backgroundRepeat};
          background-position: ${waveStyles.backgroundPosition};
          background-size: ${waveStyles.backgroundSize};
          padding-bottom: ${patterns.wave.height - 1}px;
        `.replace(/\s+/g, ' ').trim(),
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setLink:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleLink:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetLink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  // Cmd/Ctrl+Click to open links
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('linkClickHandler'),
        props: {
          handleClick: (view, pos, event) => {
            if (!event.metaKey && !event.ctrlKey) {
              return false;
            }

            const { state } = view;
            const { doc } = state;
            const $pos = doc.resolve(pos);
            const marks = $pos.marks();
            const linkMark = marks.find(mark => mark.type.name === 'link');
            
            if (linkMark && linkMark.attrs.href) {
              window.open(linkMark.attrs.href, '_blank', 'noopener,noreferrer');
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});



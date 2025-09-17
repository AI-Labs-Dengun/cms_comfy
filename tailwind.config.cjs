const plugin = require('tailwindcss/plugin');

/**
 * Tailwind config: adds base utilities to ensure content wraps and preserves newlines
 */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {},
  },
  plugins: [
    plugin(function({ addBase }) {
      addBase({
        '.html-content': {
          'white-space': 'pre-wrap',
          'word-wrap': 'break-word',
          'overflow-wrap': 'anywhere',
          'word-break': 'break-word',
          'hyphens': 'auto'
        },
        '.markdown-content': {
          'white-space': 'pre-wrap',
          'word-wrap': 'break-word',
          'overflow-wrap': 'anywhere',
          'word-break': 'break-word',
          'hyphens': 'auto'
        },
        '.tiptap-editor': {
          'white-space': 'pre-wrap',
          'word-wrap': 'break-word',
          'overflow-wrap': 'anywhere',
          'word-break': 'break-word',
          'hyphens': 'auto'
        },
        '.message-content': {
          'white-space': 'pre-wrap',
          'word-wrap': 'break-word',
          'overflow-wrap': 'anywhere',
          'word-break': 'break-word',
          'hyphens': 'auto'
        },
        '.html-content a, .markdown-content a, .html-content code, .markdown-content code': {
          'word-break': 'break-word',
          'overflow-wrap': 'anywhere'
        }
      });
    })
  ]
};

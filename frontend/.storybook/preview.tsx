import type { Preview } from '@storybook/react';
import React from 'react';
import '../src/app/globals.css';

const preview: Preview = {
  globalTypes: {
    direction: {
      name: 'Direction',
      description: 'Text direction (LTR / RTL)',
      defaultValue: 'ltr',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'ltr', title: 'LTR — English', right: '🇬🇧' },
          { value: 'rtl', title: 'RTL — Arabic', right: '🇸🇦' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const dir = context.globals['direction'] as 'ltr' | 'rtl';

      // Update document direction so Tailwind logical property variants (ms-*, ps-*, etc.) work globally
      if (typeof document !== 'undefined') {
        document.documentElement.dir = dir;
      }

      return React.createElement(
        'div',
        { dir, style: { fontFamily: 'var(--font-family, system-ui)' } },
        React.createElement(Story),
      );
    },
  ],
  parameters: {
    backgrounds: {
      default: 'page',
      values: [
        { name: 'page',  value: '#F1F5F9' },
        { name: 'card',  value: '#FFFFFF' },
        { name: 'dark',  value: '#0F172A' },
      ],
    },
    viewport: {
      viewports: {
        mobile:  { name: 'Mobile',  styles: { width: '375px',  height: '812px' } },
        tablet:  { name: 'Tablet',  styles: { width: '768px',  height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
      },
      defaultViewport: 'desktop',
    },
    layout: 'padded',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
  },
};

export default preview;

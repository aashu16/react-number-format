/// <reference types="vitest" />
/// <reference types="vite/client" />

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    browser: {
      enabled: true,
      provider: 'webdriverio',
      name: 'chrome',
    },
    setupFiles: 'test/test_util.js',
  },
});

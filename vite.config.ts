/// <reference types="vitest" />
/// <reference types="vite/client" />

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['**/*.spec.{jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/*.{spec,test}.{js,ts}',
    ],
    globals: true,
    environment: 'jsdom',
    // browser: {
    // enabled: true,
    // provider: 'webdriverio',
    // name: 'chrome',
    // },
    setupFiles: 'test/test_util.js',
  },
});

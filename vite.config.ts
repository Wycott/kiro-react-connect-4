import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// CSS Modules are enabled by default in Vite for files matching `*.module.css`.
export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});

import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  base: process.env.GITHUB_PAGES_BASE || '/',
  preview: {
    headers: {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; frame-src 'self' about:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  },
  plugins: [vue()],
  worker: { format: 'es' },
  test: { include: ['tests/**/*.test.ts'] },
  build: { chunkSizeWarningLimit: 1500 },
});

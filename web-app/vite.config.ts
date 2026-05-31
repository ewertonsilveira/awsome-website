import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
      },
      // Explicit pages pinned here; extend as new routes are added (T9, T11, T12).
      // /about and /contact are added in T9/T11; /404 added in T12 when $.tsx exists.
      pages: [{ path: '/' }],
    }),
    viteReact(),
    tailwindcss(),
  ],
});

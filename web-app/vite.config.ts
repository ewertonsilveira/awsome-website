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
        // crawlLinks disabled until T9/T11 add /about and /contact routes.
        // Re-enable in T9 once those route files exist (crawling non-existent
        // routes hard-fails prerender — T2 design note).
        crawlLinks: false,
      },
      // Explicit pages pinned here; extend as new routes are added (T9, T11, T12).
      // /about and /contact are added in T9/T11; /404 added in T12 when $.tsx exists.
      pages: [
        { path: '/' },
        { path: '/about' },
        { path: '/contact' },
        { path: '/404' },
      ],
    }),
    viteReact(),
    tailwindcss(),
  ],
});

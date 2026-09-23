// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Absolute base for canonical and link-preview URLs.
  site: 'https://observatory-azure.vercel.app',
  // Keep Astro's floating toolbar from covering the workspace dock in previews.
  devToolbar: { enabled: false },
  server: {
    port: 4399,
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});

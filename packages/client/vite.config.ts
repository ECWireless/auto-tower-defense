import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { mud } from 'vite-plugin-mud';

export default defineConfig({
  plugins: [
    react(),
    mud({ worldsFile: '../contracts/worlds.json' }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2022',
    minify: true,
    sourcemap: true,
  },
});

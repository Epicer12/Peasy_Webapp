import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // keep tailwindcss plugin from HEAD
  ],

  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
<<<<<<< HEAD
    react()
  ],

=======
    react(),
    tailwindcss(),
  ],
>>>>>>> origin/main
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // For Electron local load
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html'
    }
  }
});
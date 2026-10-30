import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        // Juego Phaser (principal) y versión clásica React (Bürgeramt por diálogos).
        main: resolve(__dirname, 'index.html'),
        classic: resolve(__dirname, 'classic.html'),
        // entorno de pruebas de sprites (no forma parte del juego)
        spriteTest: resolve(__dirname, 'sprite-test.html'),
      },
    },
    chunkSizeWarningLimit: 2000,
  },
});

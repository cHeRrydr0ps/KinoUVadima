import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// ✅ Clean Vite config — no JSX here!
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    hmr: { overlay: true },
    // If you run BFF locally outside Docker, uncomment and set correct target:
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:8088',
    //     changeOrigin: true,
    //   },
    // },
  },
  build: {
    sourcemap: true,
    target: 'esnext',
  },
});

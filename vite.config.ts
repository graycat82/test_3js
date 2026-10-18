import { defineConfig } from 'vite';

export default defineConfig({
  base: '/test_3js/',
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    target: 'safari16.4',
    rolldownOptions: {
      output: { manualChunks: id => id.includes('/node_modules/three/') ? 'three' : undefined },
    },
  },
});

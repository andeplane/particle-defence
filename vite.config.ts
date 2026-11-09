import { defineConfig } from 'vite';

export default defineConfig({
  base: '/particle-defence/',
  define: {
    // Expose signaling server URL; override with VITE_SIGNALING_URL env var at build time
    'import.meta.env.VITE_SIGNALING_URL': JSON.stringify(
      process.env.VITE_SIGNALING_URL ?? 'ws://localhost:8080'
    ),
  },
});

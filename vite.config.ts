import { defineConfig } from '@lovable.dev/vite-tanstack-config';
export default defineConfig({ vite: { resolve: { dedupe: ['react', 'react-dom'] } } });
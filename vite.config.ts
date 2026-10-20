import { defineConfig } from '@lovable.dev/vite-tanstack-config';
export default defineConfig({ vite: { publicDir: 'frontend/public', resolve: { dedupe: ['react', 'react-dom'] } } });
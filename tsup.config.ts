import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/main/index.ts'],
    format: ['cjs', 'esm'],
    outDir: 'dist/main',
    dts: true,
    platform: 'node', 
  },
  {
    entry: ['src/renderer/index.ts'],
    format: ['esm', 'cjs'],
    outDir: 'dist/renderer',
    dts: true,
    platform: 'browser',
    external: ['electron'], 
  },
]);
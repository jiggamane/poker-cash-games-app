/**
 * Bundles `engine.ts` (which reads `packages/core`) with esbuild: as a module
 * for the build, and as a script for the live phone on the page.
 */
import { buildSync } from 'esbuild';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('./engine.ts', import.meta.url));
const bundle = (format) =>
  buildSync({ entryPoints: [entry], bundle: true, write: false, format, platform: 'neutral', target: 'es2020', globalName: format === 'iife' ? 'ENGINE' : undefined })
    .outputFiles[0].text;

export const E = await import(`data:text/javascript;base64,${Buffer.from(bundle('esm')).toString('base64')}`);
export const engineScript = () => bundle('iife');

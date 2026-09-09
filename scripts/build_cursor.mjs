import { build } from 'esbuild';

// Commit this self-hosted module for GitHub Pages' native Jekyll deployment.
await build({
  entryPoints: ['scripts/cursor/target-cursor.js'],
  outfile: 'assets/target-cursor.js',
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2020'],
  legalComments: 'inline'
});

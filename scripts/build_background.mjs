import { build } from "esbuild";

// Commit the bundle so GitHub Pages' native Jekyll build needs no Node step.
await build({
  entryPoints: ["scripts/background/faulty-terminal.js"],
  outfile: "assets/faulty-terminal.js",
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  legalComments: "inline"
});

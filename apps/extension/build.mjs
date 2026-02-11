import { build, context } from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');
const srcDir = path.join(__dirname, 'src');
const publicDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist');

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function buildExtension({ watch } = {}) {
  await fs.rm(distDir, { recursive: true, force: true });
  await copyDir(publicDir, distDir);

  const options = {
    entryPoints: {
      popup: path.join(srcDir, 'popup.js'),
      content: path.join(srcDir, 'content.js'),
      options: path.join(srcDir, 'options.js')
    },
    bundle: true,
    outdir: distDir,
    platform: 'browser',
    format: 'iife',
    target: ['chrome110', 'firefox115'],
    sourcemap: watch ? 'inline' : false,
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  };

  if (watch) {
    const ctx = await context(options);
    await ctx.watch();
    return ctx;
  }

  await build(options);
  return null;
}

const watch = process.argv.includes('--watch');
await buildExtension({ watch });

if (watch) {
  // Keep the process alive
  console.log('Watching extension files...');
}

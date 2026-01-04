// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import esbuild from 'esbuild';

// Custom plugin to copy manifest and popup HTML after build
const copyManifestPlugin = () => {
  return {
    name: 'copy-manifest',
    writeBundle() {
      fs.copyFileSync('manifest.json', 'dist/manifest.json');
      const popupSrc = path.resolve(__dirname, 'dist/src/pages/popup/index.html');
      if (fs.existsSync(popupSrc)) {
        fs.copyFileSync(popupSrc, 'dist/popup.html');
      }
      console.log('Copied manifest.json and popup.html to dist');
    }
  };
};

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/pages/popup/index.html'),
        content: path.resolve(__dirname, 'src/pages/content/index.tsx'),
        background: path.resolve(__dirname, 'src/pages/background/index.ts')
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',
        chunkFileNames: '[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  },
  plugins: [
    react(),
    copyManifestPlugin(),
    {
      name: 'bundle-content-as-iife',
      // After Vite builds everything else, overwrite dist/content.js and dist/mainWorld.js with IIFE bundles
      async writeBundle() {
        await esbuild.build({
          entryPoints: ['src/pages/content/index.tsx'],
          bundle: true,
          format: 'iife',
          target: ['es2017'],
          outfile: 'dist/content.js',
          sourcemap: false,
          define: { 'process.env.NODE_ENV': '"production"' },
          loader: { '.ts': 'ts', '.tsx': 'tsx' }
        });
        await esbuild.build({
          entryPoints: ['src/pages/content/mainWorld.ts'],
          bundle: true,
          format: 'iife',
          target: ['es2017'],
          outfile: 'dist/mainWorld.js',
          sourcemap: false,
          define: { 'process.env.NODE_ENV': '"production"' },
          loader: { '.ts': 'ts' }
        });
      }
    }
  ]
});

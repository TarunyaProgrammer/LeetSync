import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const projectRoot = process.cwd();

const buildExtensionScript = async (entry, fileName, globalName) => {
  await build({
    configFile: false,
    root: projectRoot,
    plugins: [react()],
    build: {
      outDir: resolve(projectRoot, 'build/static/scripts'),
      emptyOutDir: false,
      rollupOptions: {
        input: resolve(projectRoot, entry),
        output: {
          format: 'iife',
          entryFileNames: fileName,
          name: globalName,
        },
      },
    },
  });
};

await buildExtensionScript(
  'src/scripts/leetcode.ts',
  'leetcode.js',
  'TarunyaLeetSyncContentScript',
);
await buildExtensionScript('src/background.ts', 'background.js', 'TarunyaLeetSyncBackground');

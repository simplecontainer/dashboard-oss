import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vitest/config"
import {viteStaticCopy} from 'vite-plugin-static-copy';
import path from "path";

export default defineConfig({
  plugins: [
    sveltekit(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.ttf',
          dest: 'assets/fonts',
        },
      ],
    }),
  ],
  build: {
    ssr: false,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.ttf')) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.ttf': 'file',
      },
    },
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    globals: true, /// allows to skip import of test functions like `describe`, `it`, `expect`, etc.
  },
  resolve: {
    alias: {
      'monaco-editor': path.resolve(__dirname, 'node_modules/monaco-editor'),
    },
  },
})

import fs from "node:fs";
import { resolve } from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

const BASE_URL = process.env.BASE_URL || "/";

/**
 * vite-plugin-monaco-editor@1.1.0 clears its cache with `fs.rmdirSync(dir, { recursive: true })`,
 * which Node removed (dev server crashes on start). Give it the equivalent `fs.rmSync` while its
 * dev-server hook runs.
 */
function withRecursiveRmdir<T extends { configureServer?: (...args: any[]) => any }>(plugin: T): T {
  const configureServer = plugin.configureServer;
  if (typeof configureServer === "function") {
    plugin.configureServer = function (this: unknown, ...args: any[]) {
      const original = fs.rmdirSync;
      (fs as any).rmdirSync = (path: fs.PathLike, options?: any) =>
        options?.recursive ? fs.rmSync(path, { recursive: true, force: true }) : original(path, options);
      try {
        return configureServer.apply(this, args);
      } finally {
        (fs as any).rmdirSync = original;
      }
    };
  }
  return plugin;
}

export default defineConfig({
  json: {
    stringify: true,
  },
  base: BASE_URL,
  server: {
    port: Number(process.env.PORT || 3001),
    proxy: {
      "/api": process.env.VUE_APP_MAIN_APP_URL || "http://127.0.0.1:3000",
    },
  },
  define: {
    BASE_URL: `"${BASE_URL}"`,
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
        }
      }
    }),
    withRecursiveRmdir(monacoEditorPlugin({})),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "vue": 'vue/dist/vue.esm-bundler',
      "vue$": 'vue/dist/vue.esm-bundler',
    },
  },
});

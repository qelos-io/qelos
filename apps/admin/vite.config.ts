import { resolve } from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

const BASE_URL = process.env.BASE_URL || "/";

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
          isCustomElement: (tag) => ['view-builder'].includes(tag)
        }
      }
    }),
    monacoEditorPlugin({}),
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

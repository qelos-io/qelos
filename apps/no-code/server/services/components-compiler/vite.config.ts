import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/nothing', import.meta.url)),
      '../': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    // Force Vue and Element Plus to be treated as globals
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL(`src/components/${process.env.COMPONENT_HASH}.js`, import.meta.url)),
      name: process.env.COMPONENT_HASH,
      fileName: process.env.COMPONENT_HASH,
      formats: ['umd'],
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      external: ['vue', 'vue-router', 'element-plus', 'vue-i18n'],
      output: {
        // Provide global variables to use in the UMD build
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter',
          'element-plus': 'ElementPlus',
          'vue-i18n': 'VueI18n',
          '@sdk': 'QelosSDK',
        },
      },
    },
  },
})

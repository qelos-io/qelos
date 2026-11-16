import { fileURLToPath, URL } from 'node:url'
import { createHash } from 'node:crypto'

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
      // `qelos-script:*` are published scripts, bridged in via globals set by the served module's import prelude
      external: (id: string) => ['vue', 'vue-router', 'element-plus', 'vue-i18n', '@sdk'].includes(id) || id.startsWith('qelos-script:'),
      output: {
        // Provide global variables to use in the UMD build
        globals: (id: string) => {
          if (id.startsWith('qelos-script:')) {
            return 'qs_' + createHash('sha1').update(id.slice('qelos-script:'.length)).digest('hex').substring(0, 12)
          }
          return ({
            vue: 'Vue',
            'vue-router': 'VueRouter',
            'element-plus': 'ElementPlus',
            'vue-i18n': 'VueI18n',
            '@sdk': 'QelosSDK',
          } as Record<string, string>)[id]
        },
      },
    },
  },
})

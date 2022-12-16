import {defineConfig} from 'vite';
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [mkcert()],
  build: {
    outDir: '../public'
  },
  server: {
    port: 1091,
    https: true,
    proxy: {
      '/api': {
        target: 'https://0.0.0.0:1090',
        secure: false,
      }
    }
  }
})
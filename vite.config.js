import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 80,
    host: '0.0.0.0', // 允许外部访问
    cors: true, // 允许跨域
    allowedHosts: ['www.pigstrong.cn'], // 允许的主机名
  },
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  define: {
    global: 'globalThis',
  },
})

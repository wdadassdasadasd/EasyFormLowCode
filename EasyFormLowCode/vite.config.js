import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  test: {
    environment: 'happy-dom',
    exclude: ['test/e2e/**', '**/node_modules/**'],
  },
  build: {
    // ECharts is loaded only by the lazy designer/preview routes; retain a small
    // vendor-specific budget instead of warning on its isolated runtime chunk.
    chunkSizeWarningLimit: 550,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/echarts')) return 'echarts'
          if (id.includes('node_modules/zrender')) return 'zrender'
          if (id.includes('node_modules/vue-echarts')) return 'vue-echarts'
          if (id.includes('node_modules/element-plus/es/components/table')) return 'element-table'
          if (id.includes('node_modules/element-plus/es/components/form')) return 'element-form'
          if (id.includes('node_modules/@element-plus/icons-vue')) return 'element-icons'
          if (id.includes('node_modules/element-plus')) return 'element-plus'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})

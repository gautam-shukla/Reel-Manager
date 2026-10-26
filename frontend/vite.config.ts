import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load env from project root or frontend directory
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '')
  const backendPort = env.BACKEND_PORT || 5000

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    envDir: path.resolve(__dirname, '..'),
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    resolve: {
      alias: {
        src: path.resolve(__dirname, './src'),
        assets: path.resolve(__dirname, './src/assets'),
        components: path.resolve(__dirname, './src/components'),
        contexts: path.resolve(__dirname, './src/contexts'),
        hooks: path.resolve(__dirname, './src/hooks'),
        integrations: path.resolve(__dirname, './src/integrations'),
        lib: path.resolve(__dirname, './src/lib'),
        pages: path.resolve(__dirname, './src/pages'),
        types: path.resolve(__dirname, './src/types'),
        utils: path.resolve(__dirname, './src/utils'),
        constants: path.resolve(__dirname, './src/constants')
      }
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:5000',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/api/, ''),
  },
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react()  
  ],
  server: {
    // Listen on the LAN as well as localhost. API requests are still proxied
    // from this machine to the local Express server below.
    host: '0.0.0.0',
    proxy: apiProxy,
  },
  preview: {
    host: '0.0.0.0',
    proxy: apiProxy,
  },
})

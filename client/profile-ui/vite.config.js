import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {resolve} from 'path'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/profile/',
  build: {
    outDir: '../../public/profile',
    emptyOutDir:true
  },
  resolve:{
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})

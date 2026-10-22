import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // './' keeps the build portable — works on GitHub Pages project URLs and Vercel alike.
  base: './',
  plugins: [react(), tailwindcss()],
})

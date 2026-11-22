import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// WAGLI_BASE: subcaminho da publicação (ex.: /mapa-sp-mvp/ no GitHub Pages). VITE_STATIC=1: versão sem servidor.
export default defineConfig({ base: process.env.WAGLI_BASE || '/', plugins: [react()], build: { outDir: process.env.WAGLI_OUT || 'dist', emptyOutDir: true } })

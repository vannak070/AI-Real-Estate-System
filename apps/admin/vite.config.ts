import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Resolves `figma:asset/<file>` imports (left over from the Figma export) to src/assets.
function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        return path.resolve(__dirname, 'src/assets', id.replace('figma:asset/', ''))
      }
    },
  }
}

export default defineConfig({
  plugins: [figmaAssetResolver(), react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // host: true binds 0.0.0.0 so other devices on the LAN can reach it — Vite
  // prints the Network URL to use from them.
  server: { port: 5174, strictPort: true, host: true },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})

import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
    base: '/SAE-402/',  // Chemin de base pour GitHub Pages
    plugins: [basicSsl()],
    server: {
        host: true,
        https: true
    }
})

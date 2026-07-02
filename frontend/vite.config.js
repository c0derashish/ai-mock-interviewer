import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/parse-resume': 'http://localhost:5000',
      '/resume': 'http://localhost:5000',
      '/session': 'http://localhost:5000',
      '/generate-question': 'http://localhost:5000',
      '/score-answer': 'http://localhost:5000',
      '/reeval-answer': 'http://localhost:5000',
      '/generate-summary': 'http://localhost:5000',
    }
  }
})
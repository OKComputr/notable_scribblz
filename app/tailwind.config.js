/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      colors: {
        sidebar:    { light: '#202a2f', dark: '#0f0f0f' },
        middlebar:  { light: '#ffffff', dark: '#1a1a1a' },
        mainbar:    { light: '#f7f7f7', dark: '#0f0f0f' },
        border:     { light: '#dedede', dark: '#000000' }
      }
    }
  },
  plugins: []
};

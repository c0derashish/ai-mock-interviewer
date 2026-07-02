/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0D0D0F',
        surface: '#141418',
        border: '#1E1E26',
        accent: '#A78BFA',
        'accent-light': '#A855F7',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        muted: '#6B7280',
        text: '#E5E7EB',
        'text-dim': '#9CA3AF',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-border': 'pulseBorder 2s ease-in-out infinite',
        'fill-bar': 'fillBar 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'shake': 'shake 0.4s ease-in-out',
      },
      keyframes: {
        pulseBorder: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(109,40,217,0)' },
          '50%': { boxShadow: '0 0 0 3px rgba(109,40,217,0.4)' },
        },
        fillBar: {
          from: { width: '0%' },
          to: { width: 'var(--bar-width)' },
        },
        slideUp: {
          from: { transform: 'translateY(16px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
}
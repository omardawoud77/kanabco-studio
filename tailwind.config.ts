import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAF7',
        'bg-card': '#FFFFFF',
        'bg-soft': '#F2F0EB',
        text: '#1A1A1A',
        'text-muted': '#6B6B6B',
        'text-faint': '#9A9A9A',
        border: '#E5E3DE',
        'border-strong': '#C8C5BE',
        orange: '#DC6837',
        'orange-dark': '#C45A2C',
        navy: '#202D3D',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;

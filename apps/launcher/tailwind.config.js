/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shinsei: {
          bg: '#0a0a0f',
          'bg-light': '#0f0f1a',
          'bg-card': '#12121e',
          violet: '#7c3aed',
          'violet-light': '#9d5ff5',
          'violet-dim': '#4c1d95',
          cyan: '#06b6d4',
          'cyan-light': '#22d3ee',
        },
        grade: {
          d: '#ffffff',
          c: '#57ff6e',
          b: '#4da6ff',
          a: '#b94dff',
          s: '#ffaa00',
          ss: '#ff2222',
          eveille: '#888888',
        },
      },
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

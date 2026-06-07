import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'pixel': ["'Press Start 2P'", 'cursive'],
        'retro': ["'VT323'", 'monospace'],
        'arcade': ["'Orbitron'", 'sans-serif'],
      },
      colors: {
        minecraft: {
          grass: '#7fb069',
          dirt: '#a0714f',
          sand: '#c9b88d',
          water: '#4fa3d1',
          stone: '#7a7a7a',
          wood: '#8b6914',
          leaf: '#8fbc8f',
          red: '#d94d4d',
          orange: '#d4a574',
          gold: '#f0c040',
          darkgray: '#2a2a2a',
          black: '#1a1a1a',
          light: '#e8e8e8',
        }
      }
    },
  },
  plugins: [],
} satisfies Config

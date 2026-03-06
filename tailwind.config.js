/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'purple': {
          900: '#1a0b2e',
          800: '#2d1b4e',
          700: '#4c2a85',
          600: '#6b46c1',
          500: '#8b5cf6',
          400: '#a78bfa',
        },
        'cyan': {
          500: '#06b6d4',
          400: '#22d3ee',
        },
        'emerald': {
          500: '#10b981',
          400: '#34d399',
        }
      },
      backgroundImage: {
        'gradient-purple-cyan': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-purple-pink': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-blue-purple': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'gradient-green-blue': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'gradient-orange-pink': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'gradient-dark': 'linear-gradient(135deg, #000000 0%, #1a0a2e 25%, #3d1f47 50%, #6b1f3d 75%, #000000 100%)',
      }
    },
  },
  plugins: [],
}

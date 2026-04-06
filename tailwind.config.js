export default {
  content:[
    "./index.html","./src/**/*.{js,ts,jsx,tsx}",
  ],
  purge: [],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors:{
        orbit: {
          canvas: '#09090E',     // The deep background
          canvasGlow: '#1E2B4D', // The lighter background gradient
          glass: '#161824',      // The frosted UI cards
        },
        neon: {
          purple: '#8A2BE2',     // The sharp cyber accent
          pink: '#E2B0FF',       // Gradient start
          blue: '#90CEFF',       // Gradient end
        }
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}

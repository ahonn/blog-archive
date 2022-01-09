module.exports = {
  important: true,
  purge: ['./**/*.css', './**/*.njk'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color)',
      },
      textColor: {
        body: 'var(--text-primary-color)',
      },
      backgroundColor: {
        primary: 'var(--background-primary-color)',
      },
      fontSize: {
        tiny: '.95rem',
      },
      opacity: {
        image: 'var(--image-opacity)',
      },
      maxWidth: {
        'screen-sm': '576px',
        'screen-md': '768px',
        'screen-lg': '992px',
        'screen-xl': '1280px',
      },
      maxHeight: {
        '350px': '350px',
        '500px': '500px',
      },
      margin: {
        '1/2': '0.125rem',
      },
      padding: {
        '1/2': '0.125rem',
      },
      inset: {
        8: '2rem',
        '-8': '-2rem',
        10: '2.5rem',
        '-10': '-2.5rem',
      },
    },
  },
  variants: {},
  plugins: [],
};

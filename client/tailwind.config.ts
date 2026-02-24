import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        orion: {
          dark:           'var(--orion-dark)',
          darker:         'var(--orion-darker)',
          card:           'var(--orion-card)',
          border:         'var(--orion-border)',
          accent:         'var(--orion-accent)',
          'accent-hover': 'var(--orion-accent-hover)',
          text:           'var(--orion-text)',
          muted:          'var(--orion-muted)',
          success:        'var(--orion-success)',
          warning:        'var(--orion-warning)',
          danger:         'var(--orion-danger)',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
export default config

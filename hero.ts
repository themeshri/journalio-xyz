// HeroUI Tailwind v4 plugin config (loaded via @plugin in app/globals.css).
// Brand-matched to Journalio: primary = emerald (the app's --primary is
// oklch(0.527 0.154 163.225) ≈ Tailwind emerald-600), radius matched to
// --radius: 0.375rem, and dark mode driven by the same `.dark` class
// next-themes sets. This keeps HeroUI-migrated pages on-brand with the
// remaining shadcn pages during the migration.
import { heroui } from '@heroui/react'

// Tailwind emerald scale — matches the app's emerald brand.
const emerald = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  300: '#6ee7b7',
  400: '#34d399',
  500: '#10b981',
  600: '#059669',
  700: '#047857',
  800: '#065f46',
  900: '#064e3b',
  DEFAULT: '#059669', // emerald-600, ≈ the app's --primary
  foreground: '#ffffff',
}

export default heroui({
  themes: {
    light: {
      colors: {
        primary: emerald,
        focus: emerald.DEFAULT,
      },
    },
    dark: {
      colors: {
        primary: emerald,
        focus: emerald.DEFAULT,
      },
    },
  },
  layout: {
    radius: {
      small: '0.25rem',
      medium: '0.375rem', // matches --radius
      large: '0.5rem',
    },
  },
})

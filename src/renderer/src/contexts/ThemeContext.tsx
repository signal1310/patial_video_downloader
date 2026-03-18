import { createContext, useContext } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}

// ─── Provider Component (moved to separate file to avoid Vite Fast Refresh warning) ───
// This file will now only export types, context, and hooks (non-component exports).

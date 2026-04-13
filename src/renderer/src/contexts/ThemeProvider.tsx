import React, { useEffect, useState, useCallback } from 'react'
import { Theme, ThemeContext, ThemeContextValue } from './ThemeContext'

const THEME_STORAGE_KEY = 'patial_video_downloader_theme'

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY)
      if (saved === 'dark' || saved === 'light' || saved === 'system') return saved as Theme
    } catch {
      /* ignore */
    }
    return 'system'
  })

  // Apply theme attribute to <html> element
  useEffect(() => {
    const root = document.documentElement

    // - 실제 적용할 테마 결정 헬퍼
    const applyTheme = (t: Theme): void => {
      let actualTheme = t
      if (t === 'system') {
        actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      root.setAttribute('data-theme', actualTheme)
    }

    applyTheme(theme)

    // - 시스템 테마 변경 감지 리스너
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (): void => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
  }, [])

  const value: ThemeContextValue = {
    theme,
    setTheme
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

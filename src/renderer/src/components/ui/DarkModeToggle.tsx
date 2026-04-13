import React from 'react'
import styles from './DarkModeToggle.module.css'
import { useTheme } from '../../contexts/ThemeContext'

const SunIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', shapeRendering: 'geometricPrecision' }}
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const MoonIcon: React.FC = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', shapeRendering: 'geometricPrecision' }}
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

const MonitorIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', shapeRendering: 'geometricPrecision' }}
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

export const DarkModeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme()

  // - 순환 로직: Light -> Dark -> System
  const cycleTheme = (): void => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const getStatusInfo = (): { icon: React.ReactNode; label: string; className: string } => {
    switch (theme) {
      case 'dark':
        return {
          icon: <MoonIcon />,
          label: '다크 모드 (클릭하여 시스템 설정으로)',
          className: styles.dark
        }
      case 'system':
        return {
          icon: <MonitorIcon />,
          label: '시스템 설정 (클릭하여 라이트 모드로)',
          className: styles.system
        }
      default:
        return { icon: <SunIcon />, label: '라이트 모드 (클릭하여 다크 모드로)', className: '' }
    }
  }

  const { icon, label, className } = getStatusInfo()

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={`${styles.toggle} ${className}`}
      title={label}
      aria-label={label}
    >
      <span className={styles.thumb}>
        <span className={styles.icon}>{icon}</span>
      </span>
    </button>
  )
}

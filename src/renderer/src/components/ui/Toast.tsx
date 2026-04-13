import React from 'react'
import styles from './Toast.module.css'

interface ToastProps {
  message: string
  isVisible: boolean
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible }) => {
  return <div className={`${styles.toast} ${isVisible ? styles.show : ''}`}>{message}</div>
}

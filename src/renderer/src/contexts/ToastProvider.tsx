import React, { useState, useCallback, ReactNode, useRef } from 'react'
import { Toast } from '@renderer/components/ui/Toast'
import { ToastContext } from './ToastContext'

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; isVisible: boolean }>({
    message: '',
    isVisible: false
  })
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const showToast = useCallback((message: string, duration = 2000) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    setToast({ message, isVisible: true })

    timerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }))
      timerRef.current = null
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast message={toast.message} isVisible={toast.isVisible} />
    </ToastContext.Provider>
  )
}

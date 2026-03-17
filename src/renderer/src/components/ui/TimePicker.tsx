import React, { useRef, useEffect } from 'react'
import styles from './TimePicker.module.css'
import { formatTime, getSegmentValues } from '../../utils/time'

interface TimePickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const ChevronUp: React.FC = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ shapeRendering: 'geometricPrecision', display: 'block' }}
  >
    <path d="m18 15-6-6-6 6" />
  </svg>
)

const ChevronDown: React.FC = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ shapeRendering: 'geometricPrecision', display: 'block' }}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

interface TimeSegmentProps {
  value: number
  segment: 'h' | 'm' | 's'
  onChange: (val: string) => void
  onStep: (delta: number) => void
  placeholder: string
  title: string
  max?: number
  disabled?: boolean
}

const TimeSegment: React.FC<TimeSegmentProps> = ({
  value,
  onChange,
  onStep,
  placeholder,
  title,
  max,
  disabled
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const onStepRef = useRef(onStep)

  useEffect(() => {
    onStepRef.current = onStep
  }, [onStep])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY > 0 ? -1 : 1
      onStepRef.current(delta)
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0 || disabled) return // Only left click and if not disabled

    const target = e.target as HTMLElement
    const isInput = target.tagName.toLowerCase() === 'input'
    const action = target.closest('[data-action]')?.getAttribute('data-action')

    if (isInput) {
      target.focus()
    } else {
      e.preventDefault() // prevent text selection
    }

    // Step immediately if clicking a button
    if (action === 'up') {
      onStepRef.current(1)
    } else if (action === 'down') {
      onStepRef.current(-1)
    }

    // We must use the native event and capture pointer to track dragging outside the element
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)

    const startY = e.clientY
    let accumulatedDelta = 0
    const dragThreshold = 15 // Pixels per step

    const onPointerMove = (moveEvent: PointerEvent): void => {
      const currentY = moveEvent.clientY
      const diff = startY - currentY - accumulatedDelta // positive mapping to "up" (+1)

      if (Math.abs(diff) >= dragThreshold) {
        const steps = Math.trunc(diff / dragThreshold)
        accumulatedDelta += steps * dragThreshold
        onStepRef.current(steps)
      }
    }

    const onPointerUp = (upEvent: PointerEvent): void => {
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.releasePointerCapture(upEvent.pointerId)
    }

    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.segmentWrapper} ${disabled ? styles.disabled : ''}`}
      onPointerDown={handlePointerDown}
    >
      <div className={styles.spinnerBtn} data-action="up">
        <ChevronUp />
      </div>
      <input
        type="number"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.segmentInput}
        placeholder={placeholder}
        title={title}
        disabled={disabled}
      />
      <div className={styles.spinnerBtn} data-action="down">
        <ChevronDown />
      </div>
    </div>
  )
}

export const TimePicker: React.FC<TimePickerProps> = ({ label, value, onChange, disabled }) => {
  const segments = getSegmentValues(value)

  const handleSegmentChange = (segment: 'h' | 'm' | 's', valStr: string): void => {
    let newSeconds = 0
    const val = Number(valStr) || 0

    if (segment === 'h') newSeconds = val * 3600 + segments.m * 60 + segments.s
    if (segment === 'm') newSeconds = segments.h * 3600 + val * 60 + segments.s
    if (segment === 's') newSeconds = segments.h * 3600 + segments.m * 60 + val

    onChange(formatTime(newSeconds))
  }

  const stepValue = (segment: 'h' | 'm' | 's', delta: number): void => {
    const current = segment === 'h' ? segments.h : segment === 'm' ? segments.m : segments.s
    let next = current + delta

    // Looping logic for minutes and seconds
    if (segment !== 'h') {
      if (next > 59) next = 0
      if (next < 0) next = 59
    } else {
      if (next < 0) next = 0
    }

    handleSegmentChange(segment, next.toString())
  }
  const handleReset = (): void => {
    if (!disabled) onChange('00:00:00')
  }

  return (
    <div className={`${styles.container} ${disabled ? styles.disabledContainer : ''}`}>
      <label className={styles.label}>{label}</label>
      <div className={styles.inputBox}>
        <div className={styles.segments}>
          <TimeSegment
            value={segments.h}
            segment="h"
            onChange={(val) => handleSegmentChange('h', val)}
            onStep={(delta) => stepValue('h', delta)}
            placeholder="시"
            title="H (시)"
            disabled={disabled}
          />
          <span className={styles.separator}>:</span>
          <TimeSegment
            value={segments.m}
            segment="m"
            onChange={(val) => handleSegmentChange('m', val)}
            onStep={(delta) => stepValue('m', delta)}
            placeholder="분"
            title="M (분)"
            max={59}
            disabled={disabled}
          />
          <span className={styles.separator}>:</span>
          <TimeSegment
            value={segments.s}
            segment="s"
            onChange={(val) => handleSegmentChange('s', val)}
            onStep={(delta) => stepValue('s', delta)}
            placeholder="초"
            title="S (초)"
            max={59}
            disabled={disabled}
          />
        </div>

        <button
          type="button"
          onClick={handleReset}
          className={`${styles.resetBtnPill} ${disabled ? styles.resetBtnDisabled : ''}`}
          title={disabled ? '' : '00:00:00으로 초기화'}
          disabled={disabled}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.resetIcon}
            style={{ shapeRendering: 'geometricPrecision', display: 'block' }}
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
    </div>
  )
}

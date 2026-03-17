// 유틸리티: 초를 HH:MM:SS 형식으로 변환
export const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 유틸리티: HH:MM:SS 문자열을 초로 변환
export const parseTimeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 1) return parts[0]
  return 0
}

export const getSegmentValues = (timeStr: string): { h: number; m: number; s: number } => {
  const sec = parseTimeToSeconds(timeStr)
  return {
    h: Math.floor(sec / 3600),
    m: Math.floor((sec % 3600) / 60),
    s: sec % 60
  }
}

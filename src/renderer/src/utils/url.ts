/**
 * 유효한 영상 다운로드용 URL인지 검사함
 * 주요 플랫폼(YouTube 등) 및 일반적인 http/https 링크 형식 확인
 */
export const isValidUrl = (url: string): boolean => {
  if (!url) return false
  const trimmed = url.trim()
  if (!trimmed) return false

  // 일반 http/https URL용 기본 정규식
  // 도메인 구조 및 http 시작 문자열 매칭
  const urlRegex =
    /^(https?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)$/

  // http 또는 www로 시작하는 경우 추가 확인 (사용자 편의용)
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('www.')
  ) {
    // 올바른 형식이면 정규식보다 유연하게 허용
    return true
  }

  return urlRegex.test(trimmed)
}

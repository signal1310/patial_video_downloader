/**
 * 주어진 문자열이 유효한 영상 다운로드용 URL인지 검사합니다.
 * 주요 영상 플랫폼(YouTube 등) 또는 일반적인 http/https 링크 형식을 확인합니다.
 */
export const isValidUrl = (url: string): boolean => {
  if (!url) return false
  const trimmed = url.trim()
  if (!trimmed) return false

  // 일반적인 http/https URL을 위한 기본 정규식
  // 도메인 구조와 http로 시작하는 문자열을 매칭합니다.
  const urlRegex =
    /^(https?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)$/

  // 사용자가 http 또는 www로 시작하는 문자열을 붙여넣었을 때를 위한 추가 확인
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('www.')
  ) {
    // 올바르게 시작한다면 정규식보다 조금 더 유연하게 허용합니다.
    return true
  }

  return urlRegex.test(trimmed)
}

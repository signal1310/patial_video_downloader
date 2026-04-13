export interface YtdlpCommandArgs {
  url: string
  savePath: string
  startStr: string
  endStr: string
  isFullVideo?: boolean
  baseTitle?: string
}

/**
 * - 다운로드 파일명 템플릿 (영상 ID 접미사 제외)
 * - 메인 프로세스에서 중복 방지 처리를 마친 이름을 받아 사용
 */
export const FILENAME_TEMPLATE = '%(title)s.%(ext)s'

/**
 * - yt-dlp 실행 인자 배열 생성 유틸리티
 */
export function getYtdlpArgs(
  req: YtdlpCommandArgs,
  mode: 'info' | 'download' = 'download'
): string[] {
  const { url, savePath, startStr, endStr, isFullVideo, baseTitle } = req
  const common = ['--no-playlist', '--flat-playlist']

  // - 정보 추출 모드: 재생 시간 및 제목 추출용 인자 반환
  if (mode === 'info') {
    return [...common, '--print', '%(duration)s|%(title)s', url]
  }

  // - 다운로드 모드: 실제 영상 저장용 인자 반환
  const fileNameTemplate = baseTitle ? `${baseTitle}.%(ext)s` : FILENAME_TEMPLATE
  const outputPath = `${savePath}/${fileNameTemplate}`
  const downloadArgs = ['-o', outputPath]

  if (isFullVideo) {
    return [...common, ...downloadArgs, url]
  }

  return [...common, '--download-sections', `*${startStr}-${endStr}`, ...downloadArgs, url]
}

/**
 * - UI 로그용 전체 커맨드 문자열 생성 유틸리티
 */
export function getYtdlpDisplayCommand(req: YtdlpCommandArgs): string {
  const args = getYtdlpArgs(req)
  // - 공백 포함 인자들을 따옴표로 묶어 처리
  const escapedArgs = args.map((arg) => (arg.includes(' ') ? `"${arg}"` : arg))
  return `yt-dlp ${escapedArgs.join(' ')}`
}

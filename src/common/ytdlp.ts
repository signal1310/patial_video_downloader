export interface YtdlpCommandArgs {
  url: string
  savePath: string
  startStr: string
  endStr: string
  isFullVideo?: boolean
}

/**
 * - 다운로드 파일명 템플릿 (영상 ID 접미사 제외)
 */
export const FILENAME_TEMPLATE = '%(title)s.%(ext)s'

/**
 * - yt-dlp 실행 인자 배열 생성 유틸리티
 */
export function getYtdlpArgs(req: YtdlpCommandArgs): string[] {
  const { url, savePath, startStr, endStr, isFullVideo } = req
  const outputPath = `${savePath}/${FILENAME_TEMPLATE}`

  if (isFullVideo) {
    return ['-o', outputPath, url]
  }

  return ['--download-sections', `*${startStr}-${endStr}`, '-o', outputPath, url]
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

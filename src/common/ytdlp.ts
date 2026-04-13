export interface YtdlpCommandArgs {
  url: string
  savePath: string
  startStr: string
  endStr: string
  isFullVideo?: boolean
}

/**
 * yt-dlp 실행 시 사용할 파일명 템플릿 (ID 접미사 제거 버전)
 */
export const FILENAME_TEMPLATE = '%(title)s.%(ext)s'

/**
 * yt-dlp 실행을 위한 인자 배열 생성
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
 * UI에 표시할 용도의 전체 커맨드 문자열 생성
 */
export function getYtdlpDisplayCommand(req: YtdlpCommandArgs): string {
  const args = getYtdlpArgs(req)
  // 인자들 중 공백이 포함된 경우 따옴표로 감싸서 표현
  const escapedArgs = args.map((arg) => (arg.includes(' ') ? `"${arg}"` : arg))
  return `yt-dlp ${escapedArgs.join(' ')}`
}

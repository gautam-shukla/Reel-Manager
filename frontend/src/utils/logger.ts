export const logger = {
  info: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log('[INFO]', ...args)
    }
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args)
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
  }
}

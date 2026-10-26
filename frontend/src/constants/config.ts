export const CONFIG = {
  SESSION_EXPIRY_MS: 21600000, // 6 hours in milliseconds (6 * 60 * 60 * 1000)
  SESSION_CHECK_INTERVAL_MS: 30000, // 30 seconds
  RECYCLE_BIN_EXPIRY_MS: 604800000, // 7 days in milliseconds (7 * 24 * 60 * 60 * 1000)
  PLACEHOLDERS: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1618005198143-e528346d9a59?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=600&auto=format&fit=crop'
  ],
  THEMES: {
    DARK: 'dark',
    LIGHT: 'light'
  },
  PORT: 3000,
  MENU_WIDTH: 170,
  MENU_ITEM_HEIGHT: 32,
  MENU_PADDING_AND_SEPARATORS_HEIGHT: 8
} as const

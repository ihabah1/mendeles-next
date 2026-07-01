export type AccessibilityPreferences = {
  fontScale: number;
  highContrast: boolean;
  highlightLinks: boolean;
  readableFont: boolean;
  reduceMotion: boolean;
  underlineLinks: boolean;
};

export const DEFAULT_A11Y_PREFERENCES: AccessibilityPreferences = {
  fontScale: 1,
  highContrast: false,
  highlightLinks: false,
  readableFont: false,
  reduceMotion: false,
  underlineLinks: false,
};

export const FONT_SCALE_STEPS = [1, 1.1, 1.2, 1.3, 1.4] as const;

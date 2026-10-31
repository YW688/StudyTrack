export type ThemeId = "dawn" | "sprout" | "sunset";

export const THEME_KEY = "studytrack:landing-theme";

export const THEMES = [
  {
    id: "dawn",
    name: "霞光",
    swatch: "linear-gradient(135deg,#ccfbff,#ef96c5)",
  },
  {
    id: "sprout",
    name: "新芽",
    swatch: "linear-gradient(135deg,#f8fff5,#c6e6b3 45%,#688f40)",
  },
  {
    id: "sunset",
    name: "落日",
    swatch: "linear-gradient(135deg,#ea6113,#fbb931 55%,#ffe3b3)",
  },
] as const;

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((item) => item.id === value);
}

export function readStoredTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (isThemeId(saved)) return saved;
  } catch {
    /* 主题读不到时按默认霞光处理 */
  }
  return "dawn";
}

export function nextTheme(current: ThemeId): ThemeId {
  const index = THEMES.findIndex((item) => item.id === current);
  return THEMES[(index + 1) % THEMES.length]?.id ?? "dawn";
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.appTheme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* 主题偏好只是锦上添花 存不了也不影响使用 */
  }
}

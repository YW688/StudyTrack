export type ThemeId = "dawn" | "night";

export const THEME_KEY = "studytrack:landing-theme";

export const THEMES = [
  {
    id: "dawn",
    name: "霞光",
    swatch: "linear-gradient(135deg,#ccfbff,#ef96c5)",
  },
  {
    id: "night",
    name: "夜间",
    swatch: "linear-gradient(135deg,#1b2330,#7d84b8 52%,#ef96c5)",
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
  document.documentElement.style.colorScheme = theme === "night" ? "dark" : "light";
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* 主题偏好只是锦上添花 存不了也不影响使用 */
  }
}

export type ThemeId = "dawn" | "night" | "manor";

export const THEME_KEY = "studytrack:landing-theme";

export const CURSOR_KEY = "studytrack:cursor-theme";

export const THEMES = [
  {
    id: "dawn",
    name: "霞光",
    swatch: "linear-gradient(135deg,#f6f8f9,#bfeff3 46%,#ef96c5)",
  },
  {
    id: "night",
    name: "夜间",
    swatch: "linear-gradient(135deg,#0d131a,#8ea9d9 48%,#e295be 72%,#c9a45e)",
  },
  {
    id: "manor",
    name: "庄园",
    swatch: "linear-gradient(135deg,#241811,#9c8758 52%,#f1dcc7)",
  },
] as const;

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((item) => item.id === value);
}

/** 主题光标默认开启 关闭后 cursor 回落系统指针 */
export function readStoredCursor(): boolean {
  try {
    return localStorage.getItem(CURSOR_KEY) !== "off";
  } catch {
    return true;
  }
}

export function applyCursor(on: boolean): void {
  if (on) document.documentElement.removeAttribute("data-app-cursor");
  else document.documentElement.dataset.appCursor = "off";
  try {
    localStorage.setItem(CURSOR_KEY, on ? "on" : "off");
  } catch {
    /* 光标偏好只是锦上添花 存不了也不影响使用 */
  }
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
  document.documentElement.style.colorScheme =
    theme === "dawn" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* 主题偏好只是锦上添花 存不了也不影响使用 */
  }
}

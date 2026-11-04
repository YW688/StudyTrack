import { flushSync } from "react-dom";

export type ThemeId = "dawn" | "night" | "manor";

export const THEME_KEY = "studytrack:landing-theme";

interface ThemeViewTransition {
  ready: Promise<void>;
  finished: Promise<void>;
}

type StartViewTransition = (
  callback: () => void | Promise<void>,
) => ThemeViewTransition;

let themeSwitchId = 0;

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

/**
 * 换色用一张软边圆形蒙版接新旧两帧：
 * 去霞光是中心一点向外推开如水波，去夜间与庄园是边界从外缘收向中心。
 */
export function switchTheme(theme: ThemeId, commit: () => void): void {
  const root = document.documentElement;
  const doc = document as Document & {
    startViewTransition?: StartViewTransition;
  };
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let applied = false;
  const applyNow = () => {
    if (applied) return;
    applied = true;
    flushSync(commit);
  };

  if (
    !doc.startViewTransition ||
    reduceMotion ||
    document.visibilityState !== "visible"
  ) {
    applyNow();
    return;
  }

  const dark = theme !== "dawn";
  const dot = "0% 0%";
  const spread = "175% 175%";

  root.dataset.themeFlow = dark ? "in" : "out";

  const switchId = ++themeSwitchId;

  // 兜底先挂上 过渡没起来也要把配色切过去
  window.setTimeout(applyNow, 160);
  window.setTimeout(() => {
    if (switchId === themeSwitchId) root.removeAttribute("data-theme-flow");
  }, 1400);

  let transition: ThemeViewTransition;
  try {
    transition = doc.startViewTransition(applyNow);
  } catch {
    root.removeAttribute("data-theme-flow");
    applyNow();
    return;
  }

  transition.ready
    .then(() => {
      root.animate(
        { maskSize: dark ? [spread, dot] : [dot, spread] },
        {
          duration: dark ? 560 : 620,
          easing: dark
            ? "cubic-bezier(0.55, 0, 0.3, 1)"
            : "cubic-bezier(0.16, 1, 0.3, 1)",
          pseudoElement: dark
            ? "::view-transition-old(root)"
            : "::view-transition-new(root)",
          fill: "both",
        },
      );
    })
    .catch(() => {
      /* 过渡被跳过时直接呈现最终配色 */
    });
}

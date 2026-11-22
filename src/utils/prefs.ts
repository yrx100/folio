import { AccentTone, DensityMode, ThemeMode, UiPreferences, ViewMode } from '../types';
import { rpc } from '../bridge';

const STORAGE_KEY = 'folio.ui.prefs.v4';
const LEGACY_KEYS = ['folio.ui.prefs.v3', 'folio.ui.prefs.v2'];

const DEFAULT_PREFS: UiPreferences = {
  theme: 'light',
  accent: 'blue',
  density: 'comfortable',
  view: 'list',
  inspectorOpen: true,
  recentRoots: [],
};

function parseAccent(value: unknown): AccentTone {
  if (
    value === 'blue' ||
    value === 'ink' ||
    value === 'vermilion' ||
    value === 'terracotta' ||
    value === 'crimson'
  ) {
    return value;
  }
  return 'blue';
}

export function loadPreferences(): UiPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const theme: ThemeMode =
        parsed.theme === 'dark' || parsed.theme === 'system' || parsed.theme === 'light' ? parsed.theme : 'light';
      const accent = parseAccent(parsed.accent);
      const density: DensityMode = parsed.density === 'compact' ? 'compact' : 'comfortable';
      const view: ViewMode = parsed.view === 'cards' ? 'cards' : 'list';
      const inspectorOpen = typeof parsed.inspectorOpen === 'boolean' ? parsed.inspectorOpen : true;
      const recentRoots = Array.isArray(parsed.recentRoots)
        ? parsed.recentRoots.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 6)
        : [];
      return { theme, accent, density, view, inspectorOpen, recentRoots };
    }

    for (const key of LEGACY_KEYS) {
      const legacyRaw = localStorage.getItem(key);
      if (!legacyRaw) continue;
      const legacy = JSON.parse(legacyRaw);
      return {
        ...DEFAULT_PREFS,
        theme: legacy.theme === 'dark' || legacy.theme === 'system' || legacy.theme === 'light' ? legacy.theme : 'light',
        density: legacy.density === 'compact' ? 'compact' : 'comfortable',
        view: legacy.view === 'cards' ? 'cards' : 'list',
        inspectorOpen: typeof legacy.inspectorOpen === 'boolean' ? legacy.inspectorOpen : true,
        recentRoots: Array.isArray(legacy.recentRoots)
          ? legacy.recentRoots.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 6)
          : [],
      };
    }

    return { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePreferences(prefs: UiPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors in restricted WebView profiles.
  }
}

export function resolveDarkTheme(theme: ThemeMode): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function applyThemeToDocument(theme: ThemeMode, accent: AccentTone, density: DensityMode): boolean {
  const isDark = resolveDarkTheme(theme);
  const root = document.documentElement;
  root.dataset.theme = isDark ? 'dark' : 'light';
  root.dataset.accent = accent;
  root.dataset.density = density;
  rpc('theme', { value: isDark ? 'dark' : 'light' }).catch(() => {});
  return isDark;
}

export function pushRecentRoot(existing: string[], nextPath: string): string[] {
  const normalized = nextPath.trim();
  if (!normalized) return existing;
  const filtered = existing.filter((p) => p.toLowerCase() !== normalized.toLowerCase());
  return [normalized, ...filtered].slice(0, 6);
}

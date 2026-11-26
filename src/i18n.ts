import { create } from 'zustand';
import { AR } from './i18n-ar';

export type Lang = 'en' | 'ar';
const KEY = 'motionstudio.lang';

function initial(): Lang {
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'en' || s === 'ar') return s;
  } catch { /* ignore */ }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

function applyDocument(lang: Lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>((set) => ({
  lang: initial(),
  setLang: (lang) => {
    try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
    applyDocument(lang);
    set({ lang });
  },
}));
applyDocument(useLang.getState().lang);

/**
 * Translate a UI string. English text is the key; `{name}` placeholders are filled from `vars`.
 * Falls back to English when no translation exists.
 */
export function tr(en: string, vars?: Record<string, string | number>) {
  let s = useLang.getState().lang === 'ar' ? (AR[en] ?? en) : en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Hook: re-renders the component when the interface language changes. */
export function useT() {
  useLang((s) => s.lang);
  return tr;
}

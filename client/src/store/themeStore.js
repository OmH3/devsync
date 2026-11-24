import { create } from 'zustand';

const STORAGE_KEY = 'devsync-theme';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === 'dark' ? 'dark' : 'light';
};

const applyThemeToDom = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
};

const initialTheme = getInitialTheme();
applyThemeToDom(initialTheme);

export const useThemeStore = create((set) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    const next = theme === 'dark' ? 'dark' : 'light';
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    applyThemeToDom(next);
    set({ theme: next });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
      applyThemeToDom(next);
      return { theme: next };
    }),
}));

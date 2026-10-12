export const THEME_KEY = 'patientkeeper-retorno-theme';
export function resolveTheme(preference, systemDark = false) {
  return preference === 'light' || preference === 'dark' ? preference : systemDark ? 'dark' : 'light';
}
export function readTheme(storage, systemDark = false) {
  try { return resolveTheme(storage?.getItem(THEME_KEY), systemDark); }
  catch { return resolveTheme(null, systemDark); }
}
export function saveTheme(theme, storage) {
  const valid = resolveTheme(theme);
  try { storage?.setItem(THEME_KEY, valid); } catch { /* A denied preference write must not prevent navigation. */ }
  return valid;
}
const copy = {
  en:{light:'Light',dark:'Dark',toLight:'Switch to light mode',toDark:'Switch to dark mode'},
  pt:{light:'Claro',dark:'Escuro',toLight:'Ativar modo claro',toDark:'Ativar modo noturno'},
  es:{light:'Claro',dark:'Oscuro',toLight:'Activar modo claro',toDark:'Activar modo oscuro'},
};
export function mountTheme(button, language) {
  const root = document.documentElement;
  let storage;
  try { storage = window.localStorage; } catch { /* Private mode may deny access to the property itself. */ }
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let explicit = false;
  try { explicit = ['light','dark'].includes(storage?.getItem(THEME_KEY)); } catch { /* System appearance is the initial fallback. */ }
  function refresh() {
    const dark = root.dataset.theme === 'dark', words = copy[language()] || copy.en;
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? words.toLight : words.toDark);
    button.title = dark ? words.toLight : words.toDark;
    button.querySelector('[data-theme-label]').textContent = dark ? words.dark : words.light;
    button.querySelector('[data-theme-icon]').innerHTML = dark
      ? '<path d="M20 15.2A8 8 0 0 1 8.8 4a8 8 0 1 0 11.2 11.2Z"/>'
      : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  }
  function apply(theme) { root.dataset.theme = theme; root.style.colorScheme = theme; refresh(); }
  button.addEventListener('click', () => {
    explicit = true;
    apply(saveTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', storage));
  });
  system.addEventListener('change', event => { if (!explicit) apply(resolveTheme(null,event.matches)); });
  window.addEventListener('storage', event => {
    if (event.key !== THEME_KEY) return;
    explicit = ['light','dark'].includes(event.newValue);
    apply(resolveTheme(event.newValue,system.matches));
  });
  apply(readTheme(storage,system.matches));
  return refresh;
}

// Apply the appearance preference before the stylesheet loads. No case data is read.
(() => {
  let preference;
  try { preference = localStorage.getItem('patientkeeper-retorno-theme'); } catch { /* Session-only appearance remains available. */ }
  const dark = preference === 'dark' || preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();

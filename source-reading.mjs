import { getLanguage } from './i18n.mjs';
import { translationForFictionalSource } from './source-translations.mjs';

// Presentation only. The PT excerpt is still the citation, receipt and matching input.
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const copy = Object.freeze({
  en: Object.freeze({
    reading:'Reading translation · English', original:'Original source · Portuguese',
    limit:'For reading only. Citations and saved receipts use the Portuguese original.',
    unavailable:'No reviewed reading translation is available for this record.',
  }),
  pt: Object.freeze({ original:'Fonte original · Português' }),
  es: Object.freeze({
    reading:'Traducción de lectura · Español', original:'Fuente original · Portugués',
    limit:'Solo para la lectura. Las citas y los recibos guardados usan el original en portugués.',
    unavailable:'No hay una traducción de lectura revisada para este registro.',
  }),
});

export function sourceReadingView(source, { language = getLanguage(), originalTag = 'p' } = {}) {
  const lang = Object.hasOwn(copy, language) ? language : 'en';
  const id = typeof source?.id === 'string' ? source.id : source?.sourceId;
  const trecho = typeof source?.trecho === 'string' ? source.trecho : source?.quote;
  const literal = typeof trecho === 'string' ? trecho : '';
  const strings = copy[lang];
  const tag = originalTag === 'blockquote' ? 'blockquote' : 'p';
  const original = `<${tag} class="source-original-text" data-original lang="pt-BR">${esc(literal)}</${tag}>`;
  const translated = lang === 'pt' ? null : translationForFictionalSource({ id, trecho:literal }, lang);
  if (!translated) return `<div class="source-reading" data-source-reading><p class="caption original-label" lang="${lang}">${strings.original}</p>${original}${lang === 'pt' ? '' : `<p class="caption reading-unavailable" lang="${lang}">${strings.unavailable}</p>`}</div>`;
  return `<div class="source-reading" data-source-reading><p class="caption reading-label" lang="${lang}">${strings.reading}</p><p class="reading-text" lang="${lang}">${esc(translated)}</p><p class="caption reading-limit" lang="${lang}">${strings.limit}</p><details class="source-original"><summary lang="${lang}">${strings.original}</summary>${original}</details></div>`;
}

// @ts-check
"use strict";

const buttons = document.querySelectorAll('.lang-toggle button');
const sections = document.querySelectorAll('.lang-section');
buttons.forEach(b => b.addEventListener('click', () => {
  const lang = /** @type {HTMLElement} */ (b).dataset.lang;
  buttons.forEach(x => x.classList.toggle('active', /** @type {HTMLElement} */ (x).dataset.lang === lang));
  sections.forEach(s => s.classList.toggle('active', /** @type {HTMLElement} */ (s).dataset.lang === lang));
  document.documentElement.lang = lang || 'fr';
  history.replaceState(null, '', '?lang=' + lang);
}));
const initial = new URLSearchParams(location.search).get('lang');
if (initial === 'en') /** @type {HTMLElement|null} */ (document.querySelector('.lang-toggle button[data-lang="en"]'))?.click();

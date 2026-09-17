// welcome.js — first-install consent screen with EN/FR auto-detection.
// Sets a versioned consent flag in chrome.storage.local that gates
// any data leaving the browser (HWID upload, last_ip recording).
// Re-prompt is triggered by bumping CONSENT_VERSION.

const CONSENT_VERSION = '1.0';

const I18N = {
  fr: {
    title: 'Bienvenue sur Volt Extension',
    lead: "Avant de commencer, nous avons besoin de votre consentement pour traiter certaines données.",
    collectTitle: 'Ce que nous collectons',
    collect1: '<strong>Email Google</strong> — uniquement si vous vous connectez (Google OAuth)',
    collect2: '<strong>Pseudo et activité de jeu</strong> — scores, runs, duels, achievements',
    collect3: "<strong>Adresse IP publique</strong> — pour la modération et la prévention des abus (les bans IP)",
    collect4: "<strong>Identifiant matériel (HWID)</strong> — empreinte SHA-256 anonyme (navigateur + langue + résolution + CPU + RAM) pour l'anti-triche",
    collect5: '<strong>Messages de chat</strong> — global, équipe, privés (modération + communauté)',
    dontTitle: 'Ce que nous NE faisons PAS',
    dont1: 'Aucune publicité, aucun tracker tiers',
    dont2: 'Aucune revente de vos données',
    dont3: 'Aucun accès aux autres sites que vous visitez (extension limitée à 4 sites de jeu déclarés)',
    dont4: 'Aucun mot de passe stocké (auth via Google OAuth uniquement)',
    rightsTitle: 'Vos droits',
    rights1: 'Supprimer votre compte à tout moment (suppression différée 30j, annulable)',
    rights2: 'Exporter toutes vos données en JSON',
    rights3: 'Rectifier, vous opposer, limiter — contact <a href="mailto:privacy@webtvmedia.net" style="color:var(--accent);">privacy@webtvmedia.net</a>',
    rights4: 'Plainte CNIL si nécessaire',
    policyLink: '📄 Lire la politique de confidentialité complète',
    consentLabel: "J'ai lu la <a href=\"https://glistening-entremet-9886d0.netlify.app/\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:var(--accent);\">politique de confidentialité</a> et j'accepte la collecte de mon adresse IP, de mon identifiant matériel (HWID) et de mon activité de jeu pour le bon fonctionnement de l'extension (anti-triche, modération, classements).",
    decline: 'Refuser',
    accept: 'Accepter et continuer',
    footnote: 'Vous pouvez retirer votre consentement à tout moment en désinstallant l\'extension ou en supprimant votre compte depuis la section <em>Mes données (RGPD)</em>.',
    declined: 'Vous avez refusé. L\'extension ne collectera aucune donnée. Vous pouvez la désinstaller depuis <code>chrome://extensions</code>. Si vous changez d\'avis, rouvrez cette page depuis l\'icône Volt dans la barre d\'outils.',
    reconsider: 'Changer d\'avis'
  },
  en: {
    title: 'Welcome to Volt Extension',
    lead: 'Before we begin, we need your consent to process certain data.',
    collectTitle: 'What we collect',
    collect1: '<strong>Google email</strong> — only if you sign in (Google OAuth)',
    collect2: '<strong>Username and game activity</strong> — scores, runs, duels, achievements',
    collect3: '<strong>Public IP address</strong> — for moderation and abuse prevention (IP bans)',
    collect4: '<strong>Hardware identifier (HWID)</strong> — anonymous SHA-256 fingerprint (browser + language + resolution + CPU + RAM) for anti-cheat',
    collect5: '<strong>Chat messages</strong> — global, team, private (moderation + community)',
    dontTitle: 'What we DO NOT do',
    dont1: 'No advertising, no third-party trackers',
    dont2: 'No resale of your data',
    dont3: 'No access to other sites you visit (extension restricted to 4 declared game sites)',
    dont4: 'No password stored (auth via Google OAuth only)',
    rightsTitle: 'Your rights',
    rights1: 'Delete your account at any time (30-day deferred deletion, cancellable)',
    rights2: 'Export all your data in JSON',
    rights3: 'Rectify, object, restrict — contact <a href="mailto:privacy@webtvmedia.net" style="color:var(--accent);">privacy@webtvmedia.net</a>',
    rights4: 'File a complaint with your data protection authority if needed',
    policyLink: '📄 Read the full privacy policy',
    consentLabel: 'I have read the <a href="https://glistening-entremet-9886d0.netlify.app/" target="_blank" rel="noopener noreferrer" style="color:var(--accent);">privacy policy</a> and I consent to the collection of my IP address, hardware identifier (HWID) and game activity for the extension to work properly (anti-cheat, moderation, leaderboards).',
    decline: 'Decline',
    accept: 'Accept and continue',
    footnote: 'You can withdraw your consent at any time by uninstalling the extension or deleting your account from the <em>My data (GDPR)</em> section.',
    declined: 'You declined. The extension will not collect any data. You can uninstall it from <code>chrome://extensions</code>. If you change your mind, reopen this page from the Volt icon in the toolbar.',
    reconsider: 'Change my mind'
  }
};

async function pickLang() {
  // 1. Prefer the user's saved popup language if they set one previously.
  try {
    const { preferredLanguage } = await chrome.storage.local.get(['preferredLanguage']);
    if (preferredLanguage) {
      const p = String(preferredLanguage).toLowerCase();
      if (p.startsWith('fr')) return 'fr';
      if (p.startsWith('en')) return 'en';
    }
  } catch (_) {}
  // 2. Fall back to browser locale.
  const raw = (navigator.language || 'en').toLowerCase();
  if (raw.startsWith('fr')) return 'fr';
  return 'en';
}

// Top-level await unsupported here — wrap with then() that mutates module state.
let lang = 'en';
let t = I18N.en;
pickLang().then((picked) => {
  lang = picked;
  t = I18N[picked];
  // Re-apply UI now that language is known. _applyI18n is defined below
  // and reads `lang`/`t` from module scope.
  try { if (typeof _applyI18n === 'function') _applyI18n(); } catch (_) {}
});

// ID-based queries (stable across HTML refactors — replaces positional
// h2[]/ul[] indexing that broke whenever a section was added/removed).
const byId = (id) => document.getElementById(id);
const setText = (id, html) => { const el = byId(id); if (el) el.innerHTML = html; };
const setTextContent = (id, text) => { const el = byId(id); if (el) el.textContent = text; };

function _applyI18n() {
  document.documentElement.lang = lang;
  document.title = lang === 'fr'
    ? 'Bienvenue sur Volt — Consentement'
    : 'Welcome to Volt — Consent';
  setText('welcome-title', t.title);
  setText('welcome-lead', t.lead);
  setTextContent('sec-collect-title', t.collectTitle);
  setTextContent('sec-dont-title', t.dontTitle);
  setTextContent('sec-rights-title', t.rightsTitle);
  setText('sec-collect-list', `<li>${t.collect1}</li><li>${t.collect2}</li><li>${t.collect3}</li><li>${t.collect4}</li><li>${t.collect5}</li>`);
  setText('sec-dont-list', `<li>${t.dont1}</li><li>${t.dont2}</li><li>${t.dont3}</li><li>${t.dont4}</li>`);
  setText('sec-rights-list', `<li>${t.rights1}</li><li>${t.rights2}</li><li>${t.rights3}</li><li>${t.rights4}</li>`);
  setTextContent('legal-link', t.policyLink);
  setText('consent-label', t.consentLabel);
  if (btnAccept) btnAccept.textContent = t.accept;
  if (btnDecline) btnDecline.textContent = t.decline;
  setText('welcome-footnote', t.footnote);
  if (declinedMsg) declinedMsg.innerHTML = t.declined + ` <button id="btn-reconsider" style="display:block;margin:12px auto 0;padding:8px 16px;background:var(--accent);color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:700;">${t.reconsider}</button>`;
}

const btnAccept = byId('btn-accept');
const btnDecline = byId('btn-decline');
const declinedMsg = byId('declined-msg');

// Apply now with default (en) — will be re-applied by pickLang().then(...)
_applyI18n();

// Wire interactions (guard each — DOM may differ if HTML mid-refactor)
const cb = byId('consent-checkbox');
if (cb && btnAccept) {
  cb.addEventListener('change', () => {
    btnAccept.disabled = !cb.checked;
    btnAccept.style.opacity = cb.checked ? '1' : '0.5';
    btnAccept.style.cursor  = cb.checked ? 'pointer' : 'not-allowed';
  });
}

btnAccept && btnAccept.addEventListener('click', async () => {
  if (!cb.checked) return;
  try {
    await chrome.storage.local.set({
      gdpr_consent: {
        accepted: true,
        version: CONSENT_VERSION,
        accepted_at: new Date().toISOString(),
        ua: navigator.userAgent,
        lang
      }
    });
  } catch (e) {
    console.error('[Volt welcome] consent write failed', e);
  }
  try {
    if (chrome?.action?.openPopup) await chrome.action.openPopup();
  } catch {}
  // Fallback: keep tab open with success message rather than closing on browsers <127
  window.close();
});

const onDecline = async () => {
  try {
    await chrome.storage.local.set({
      gdpr_consent: {
        accepted: false,
        version: CONSENT_VERSION,
        declined_at: new Date().toISOString(),
        lang
      }
    });
  } catch {}
  declinedMsg.classList.add('show');
  btnAccept.style.display = 'none';
  btnDecline.style.display = 'none';
  // Wire reconsider after DOM mutation
  setTimeout(() => {
    const reconsider = document.getElementById('btn-reconsider');
    if (reconsider) reconsider.addEventListener('click', () => {
      declinedMsg.classList.remove('show');
      btnAccept.style.display = '';
      btnDecline.style.display = '';
      cb.checked = false;
      btnAccept.disabled = true;
      btnAccept.style.opacity = '0.5';
      btnAccept.style.cursor  = 'not-allowed';
    });
  }, 50);
};
btnDecline && btnDecline.addEventListener('click', onDecline);

// @ts-check
// ============================================================
// VOLT EXTENSION — Teams, Credits & Challenges UI Handler v3.0
// popup_team_handler.js  (premium ultra-minimaliste)
//
// FIXES v2.0 conservés :
//  - Variables CSS corrigées (--bg-card, --bg-input, --bg-app)
//  - acceptTeamInvite / declineTeamInvite : payload camelCase (inviteId)
//  - Double rendu des invitations supprimé
//  - confirm() remplacé par modales custom (extensions Chrome)
//  - MutationObserver : flag _initialized pour éviter les ré-initialisations
//  - _teamChatSub : nettoyage propre du listener onMessage
//  - UI : kick, setRole, transferOwnership ajoutés au panneau Membres
//  - Recherche team : état vide initial, pas de requête vide automatique
//  - section-header préservé (pas d'écrasement)
//
// v3.0 : Refonte UI premium ultra-minimaliste
//  - Système de classes CSS injecté une seule fois
//  - Typographie hiérarchique affinée
//  - Pill tabs cohérents sur toutes les sections
//  - Boutons unifiés (primary / ghost / danger / sm / xs / icon)
//  - Cards sans ombres lourdes, borders ultra-fines
//  - Progress bars 3px, transitions fluides
//  - Chat bulles modernes, avatars initiaux
//  - Modales bottom-split (iOS-style)
//  - Empty states minimaux
// ============================================================

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // VARIABLES CSS — mappage vers le design system Volt
  // ══════════════════════════════════════════════════════════
  const V = {
    bg0: 'var(--bg-app)',
    bg1: 'var(--bg-card)',
    bg2: 'var(--bg-input)',
    t1: 'var(--t1)',
    t2: 'var(--t2)',
    t3: 'var(--t3)',
    brand: 'var(--brand)',
    border: 'var(--border)',
    danger: 'var(--danger)',
    r: 'var(--radius)',
    rl: 'var(--radius-lg)',
    green: '#4a8c6f',
    amber: '#c4965c',
    red: '#c45c5c',
    purple: '#8b7cf6',
  };

  const PAYPAL_URL = 'https://www.paypal.com/qrcodes/p2pqrc/X9GLU9F6C5VL4';

  function _voltGetUid() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(['id', 'volt_profile_cache', 'pseudo'], (r) => {
          resolve({
            uid: r?.id || r?.volt_profile_cache?.id || '',
            pseudo: r?.pseudo || r?.volt_profile_cache?.pseudo || ''
          });
        });
      } catch (_) { resolve({ uid: '', pseudo: '' }); }
    });
  }

  function _voltShowPaypalModal(productLabel, noteHint) {
    const existing = document.getElementById('volt-paypal-modal');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'volt-paypal-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'volt-paypal-title');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,18,0.78);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
    overlay.innerHTML = `
      <div style="background:linear-gradient(160deg,rgba(30,41,59,0.96),rgba(15,23,42,0.98));border:1px solid rgba(226,232,240,0.45);border-radius:22px;padding:28px;max-width:420px;width:90%;color:#f8fafc;box-shadow:0 24px 60px rgba(8,10,18,0.65),0 0 40px rgba(139,92,246,0.18);">
        <div id="volt-paypal-title" style="font-size:22px;font-weight:800;margin-bottom:6px;background:linear-gradient(135deg,#8b5cf6,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Paiement PayPal</div>
        <div style="font-size:13px;color:#94a3b8;margin-bottom:18px;">${esc(productLabel || '')}</div>
        <div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:14px;padding:14px;margin-bottom:16px;">
          <div style="font-size:11px;color:#22d3ee;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px;">⚠️ Important</div>
          <div style="font-size:13px;line-height:1.5;color:#f8fafc;">Ajoute en <strong>note du paiement</strong> :</div>
          <div id="vth-paypal-note" style="margin-top:10px;padding:10px;background:rgba(8,10,18,0.6);border-radius:10px;font-family:monospace;font-size:12px;color:#22d3ee;word-break:break-all;user-select:all;cursor:pointer;border:1px dashed rgba(34,211,238,0.4);">${esc(noteHint || '')}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:6px;">Clique pour copier · Activation manuelle après validation admin</div>
        </div>
        <div style="display:flex;gap:10px;">
          <button id="vth-paypal-cancel" style="flex:1;padding:12px;border:1px solid rgba(148,163,184,0.18);background:rgba(148,163,184,0.12);color:#f8fafc;border-radius:12px;cursor:pointer;font-weight:600;font-size:13px;font-family:inherit;">Annuler</button>
          <button id="vth-paypal-go" style="flex:2;padding:12px;border:none;background:linear-gradient(135deg,#8b5cf6,#22d3ee);color:#fff;border-radius:12px;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 12px 24px rgba(139,92,246,0.32);font-family:inherit;">
            <i class="fa-brands fa-paypal" style="margin-right:6px;"></i>Ouvrir PayPal
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const noteEl = /** @type {HTMLElement | null} */ (overlay.querySelector('#vth-paypal-note'));
    if (noteEl) noteEl.addEventListener('click', () => {
      try { navigator.clipboard.writeText(noteEl.textContent || ''); noteEl.style.background = 'rgba(34,211,238,0.18)'; setTimeout(() => { noteEl.style.background = 'rgba(8,10,18,0.6)'; }, 600); } catch (_) {}
    });
    overlay.querySelector('#vth-paypal-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#vth-paypal-go')?.addEventListener('click', async () => {
      try { if (chrome?.tabs?.create) await chrome.tabs.create({ url: PAYPAL_URL }); else window.open(PAYPAL_URL, '_blank', 'noopener'); }
      catch (_) { window.open(PAYPAL_URL, '_blank', 'noopener'); }
      overlay.remove();
    });
  }

  // ══════════════════════════════════════════════════════════
  // INJECTION STYLES PREMIUM (une seule fois au chargement)
  // ══════════════════════════════════════════════════════════
  (function injectPremiumStyles() {
    if (document.getElementById('_vth_premium_styles')) return;
    const s = document.createElement('style');
    s.id = '_vth_premium_styles';
    s.textContent = `
      @keyframes vth-spin   { to { transform: rotate(360deg); } }
      @keyframes vth-fadein { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
      @keyframes vth-toast  { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }

      .vth { animation: vth-fadein .22s ease both; }

      /* ── Cards ─────────────────────────────── */
      .vth-card {
        background: var(--bg-card);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border);
      }

      /* ── Typography ────────────────────────── */
      .vth-label {
        font-size: 10px; font-weight: 700; color: var(--t3);
        text-transform: uppercase; letter-spacing: 1.4px;
      }
      .vth-meta { font-size: 11px; color: var(--t3); line-height: 1.5; }

      /* ── Buttons ───────────────────────────── */
      .vth-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        border: none; border-radius: var(--radius); font-weight: 700; cursor: pointer;
        transition: opacity .15s; font-size: 12px; padding: 9px 16px; white-space: nowrap;
        font-family: inherit; line-height: 1;
      }
      .vth-btn:hover   { opacity: .82; }
      .vth-btn:disabled { opacity: .35; cursor: not-allowed; }

      .vth-btn-primary { background: var(--brand); color: #fff; }
      .vth-btn-ghost   {
        background: transparent; color: var(--t2);
        border: 1px solid var(--border);
      }
      .vth-btn-ghost:hover  { border-color: var(--border-hover); color: var(--t1); }
      .vth-btn-danger {
        background: transparent; color: var(--danger);
        border: 1px solid rgba(196,92,92,.22);
      }
      .vth-btn-abandon {
        background: rgba(196,92,92,.06); color: var(--danger);
        border: 1px solid rgba(196,92,92,.24);
      }
      .vth-btn-abandon:hover { background: rgba(196,92,92,.10); }
      .vth-btn-sm   { padding: 6px 12px; font-size: 11px; }
      .vth-btn-xs   { padding: 5px 9px;  font-size: 10px; border-radius: var(--radius-sm); }
      .vth-btn-icon { width: 30px; height: 30px; padding: 0; border-radius: 8px; flex-shrink: 0; }

      /* ── Inputs ────────────────────────────── */
      .vth-input {
        background: var(--bg-input); color: var(--t1);
        border: 1px solid var(--border); border-radius: var(--radius);
        font-size: 13px; padding: 9px 12px; outline: none;
        transition: border-color .15s; box-sizing: border-box; font-family: inherit;
      }
      .vth-input:focus       { border-color: var(--brand); }
      .vth-input::placeholder { color: var(--t3); }

      /* ── Pill tabs ─────────────────────────── */
      .vth-tabs {
        display: flex; gap: 3px;
        background: var(--bg-input);
        border-radius: calc(var(--radius) + 2px);
        padding: 3px;
      }
      .vth-tab {
        flex: 1; padding: 7px 6px; border: none;
        border-radius: var(--radius-sm);
        background: transparent; color: var(--t3);
        font-size: 11px; font-weight: 700; cursor: pointer;
        transition: all .15s; display: flex; align-items: center;
        justify-content: center; gap: 5px; font-family: inherit;
      }
      .vth-tab.active {
        background: var(--bg-card);
        color: var(--brand);
        box-shadow: var(--shadow-sm);
      }

      /* ── List rows ─────────────────────────── */
      .vth-row {
        display: flex; align-items: center; gap: 10px; padding: 12px 16px;
      }
      .vth-row + .vth-row { border-top: 1px solid var(--border); }

      /* ── Avatars ───────────────────────────── */
      .vth-av {
        border-radius: 11px; background: linear-gradient(145deg, rgba(196,150,92,.18), var(--bg-input)); flex-shrink: 0;
        display: flex; align-items: center; justify-content: center; overflow: hidden;
        border: 1px solid rgba(196,150,92,.18);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 1px 0 rgba(0,0,0,.12);
      }
      .vth-team-icon {
        position: relative;
        border-radius: 12px;
        background:
          radial-gradient(circle at 30% 18%, rgba(255,255,255,.14), transparent 28%),
          linear-gradient(145deg, rgba(196,150,92,.20), rgba(74,140,111,.10)),
          var(--bg-input);
        flex-shrink: 0;
        display: flex; align-items: center; justify-content: center; overflow: hidden;
        border: 1px solid rgba(196,150,92,.22);
        color: var(--brand);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 1px 0 rgba(0,0,0,.14);
      }
      .vth-team-icon::after {
        content: ""; position: absolute; inset: 5px;
        border: 1px solid rgba(255,255,255,.07); border-radius: 8px;
        pointer-events: none;
      }
      .vth-team-icon img,
      .vth-av img {
        width: 100%; height: 100%; object-fit: cover; border-radius: inherit;
      }
      .vth-emblem-mark {
        position: relative; z-index: 1;
        width: 72%; height: 72%; display: flex; align-items: center; justify-content: center;
        border-radius: 9px;
        background: rgba(0,0,0,.12);
        color: var(--brand); font-size: 12px; font-weight: 950;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.05);
      }
      .vth-role-chip {
        position:absolute;bottom:-3px;right:-3px;
        width: 15px; height: 15px; border-radius: 5px;
        background:var(--bg-card); border:1px solid var(--border);
        display:flex; align-items:center; justify-content:center;
        color:var(--brand); box-shadow:0 1px 3px rgba(0,0,0,.18);
      }
      .vth-role-chip i { font-size: 8px; }

      /* ── Badges ────────────────────────────── */
      .vth-tag {
        display: inline-block; background: var(--bg-input); color: var(--t3);
        border-radius: 4px; font-size: 9px; font-weight: 700;
        padding: 1px 5px; letter-spacing: .4px;
      }
      .vth-badge {
        display: inline-block; border-radius: 5px;
        font-size: 9px; font-weight: 800; padding: 2px 6px; letter-spacing: .4px;
      }
      .vth-badge-brand { background: var(--brand-dim, rgba(193,127,89,.12)); color: var(--brand); }
      .vth-badge-green { background: rgba(74,140,111,.14); color: #4a8c6f; }
      .vth-badge-amber { background: rgba(196,150,92,.14); color: #c4965c; }
      .vth-badge-danger { background: rgba(190,88,88,.14); color: #be5858; }

      /* ── Progress ──────────────────────────── */
      .vth-bar { height: 3px; background: var(--bg-input); border-radius: 99px; overflow: hidden; }
      .vth-bar-fill  { height: 100%; border-radius: 99px; transition: width .5s ease; }
      .vth-bar-brand { background: var(--brand); }
      .vth-bar-green { background: #4a8c6f; }
      .vth-bar-red   { background: var(--danger); }

      /* ── Separator ─────────────────────────── */
      .vth-sep { height: 1px; background: var(--border); }

      /* ── Empty states ──────────────────────── */
      .vth-empty { padding: 32px 20px; text-align: center; color: var(--t3); font-size: 12px; line-height: 1.6; }
      .vth-empty i { font-size: 22px; opacity: .2; display: block; margin-bottom: 10px; }

      /* ── Credit amounts ────────────────────── */
      .vth-pos { color: #4a8c6f; font-weight: 800; }
      .vth-neg { color: var(--danger); font-weight: 800; }

      /* ── Spinner ───────────────────────────── */
      .vth-spinner {
        width: 20px; height: 20px;
        border: 2px solid var(--border); border-top-color: var(--brand);
        border-radius: 50%; animation: vth-spin .65s linear infinite; margin: 0 auto;
      }

      /* ── Chat bubbles ──────────────────────── */
      .vth-bubble {
        display: inline-block; padding: 8px 12px; border-radius: 12px;
        font-size: 12px; line-height: 1.5; word-break: break-word; max-width: 85%;
      }
      .vth-bubble-me    { background: var(--brand); color: #fff; border-radius: 10px 3px 10px 10px; }
      .vth-bubble-other {
        background: var(--bg-input); color: var(--t1);
        border: 1px solid var(--border); border-radius: 3px 10px 10px 10px;
      }

      /* ── Rank numbers ──────────────────────── */
      .vth-rank-gold   { color: #c4965c; }
      .vth-rank-silver { color: #9ca3af; }
      .vth-rank-bronze { color: #a07a5a; }

      /* ── Context menu ──────────────────────── */
      .vth-ctx {
        position: fixed; z-index: 99000;
        background: var(--bg-card); border: 1px solid var(--border);
        border-radius: var(--radius); box-shadow: var(--shadow-lg);
        min-width: 172px; overflow: hidden;
        animation: vth-fadein .15s ease;
      }
      .vth-ctx-item {
        display: flex; align-items: center; gap: 9px; width: 100%;
        padding: 10px 14px; border: none; background: transparent;
        cursor: pointer; font-size: 12px; font-weight: 600; text-align: left;
        font-family: inherit; transition: background .1s;
      }
      .vth-ctx-item:hover { background: var(--bg-input); }
      .vth-ctx-item i { width: 13px; text-align: center; flex-shrink: 0; }
      .vth-ctx-sep    { height: 1px; background: var(--border); margin: 2px 0; }

      /* ── Modal split-bottom ────────────────── */
      .vth-modal-action {
        flex: 1; padding: 13px; border: none; background: transparent;
        font-size: 13px; cursor: pointer; font-weight: 700; font-family: inherit;
        transition: background .12s;
      }
      .vth-modal-action:hover { background: var(--bg-input); }

      /* ── Team member details modal ─────────── */
      .vth-info-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
      }
      .vth-info-cell {
        background: var(--bg-input); border: 1px solid var(--border);
        border-radius: var(--radius); padding: 10px; min-width: 0;
      }
      .vth-info-value {
        margin-top: 4px; font-size: 12px; font-weight: 800;
        color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      /* ── Duel details modal ────────────────── */
      .vth-duel-info-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
      }
      .vth-duel-info-cell {
        background: var(--bg-input); border: 1px solid var(--border);
        border-radius: var(--radius); padding: 10px; min-width: 0;
      }
      .vth-duel-info-value {
        margin-top: 4px; font-size: 12px; font-weight: 800;
        color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .vth-duel-status-line {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        padding: 9px 10px; border-radius: var(--radius);
        background: var(--bg-input); border: 1px solid var(--border);
      }
      .vth-duel-result-hero {
        text-align: center; padding: 14px 12px; border-radius: var(--radius);
        border: 1px solid var(--border); background: var(--bg-input);
      }
      .vth-duel-result-title { font-size: 18px; font-weight: 950; color: var(--t1); margin-top: 8px; }
      .vth-duel-result-score { font-size: 21px; font-weight: 950; color: var(--brand); margin-top: 4px; }

      /* ── Duel board redesign ───────────────── */
      .vth-duel-hero {
        position: relative; overflow: hidden; padding: 12px; margin-bottom: 10px;
        background: var(--bg-card);
      }
      .vth-duel-hero::after {
        content: ''; position: absolute; inset: 0; pointer-events: none;
        border-radius: inherit; border: 1px solid var(--border);
      }
      .vth-duel-hero-title { font-size: 14px; font-weight: 900; color: var(--t1); letter-spacing: 0; }
      .vth-duel-form { display: grid; grid-template-columns: minmax(0, 1fr) 76px 76px auto auto; gap: 8px; align-items: center; }
      .vth-pay-grid { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:8px; }
      .vth-pay-pack { padding:10px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-input); display:flex; flex-direction:column; gap:7px; min-width:0; }
      .vth-elo-line { margin-top:3px; font-size:9px; color:var(--brand); font-weight:900; text-transform:uppercase; letter-spacing:.55px; }
      .vth-elo-chip { padding:5px 8px; border-radius:999px; background:rgba(196,150,92,.12); border:1px solid rgba(196,150,92,.25); color:var(--brand); font-size:10px; font-weight:900; white-space:nowrap; }
      .vth-duel-list-card { padding: 10px; margin-bottom: 8px; overflow: hidden; }
      .vth-duel-topline { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
      .vth-duel-board { display:grid; grid-template-columns: minmax(0,1fr) 28px minmax(0,1fr); gap:6px; align-items:stretch; }
      .vth-duel-vs-pill {
        align-self: center; justify-self: center; width: 26px; height: 26px; border-radius: 999px;
        display:flex; align-items:center; justify-content:center;
        background: transparent; border:1px solid var(--border); color: var(--t3);
        font-size: 8px; font-weight: 900; letter-spacing: .5px;
      }
      .vth-duel-player {
        min-width: 0; padding: 9px; border-radius: var(--radius);
        background: var(--bg-input);
        border: 1px solid var(--border); position: relative; overflow:hidden;
      }
      .vth-duel-player.is-me { border-color: rgba(196,150,92,.38); }
      .vth-duel-player.is-running { border-color: rgba(196,150,92,.48); box-shadow: inset 0 0 0 1px rgba(196,150,92,.08); }
      .vth-duel-player.is-dead { border-color: rgba(180,93,93,.48); box-shadow: inset 0 0 0 1px rgba(180,93,93,.08); }
      .vth-duel-score-sub.is-red { color: #b45d5d; }
      .vth-duel-player.is-done { border-color: rgba(74,140,111,.32); }
      .vth-duel-player.is-winner {
        border-color: rgba(74,140,111,.55);
        background: linear-gradient(180deg, rgba(74,140,111,.13), rgba(74,140,111,.045)), var(--bg-input);
      }
      .vth-duel-player-top { display:flex; align-items:center; gap:8px; min-width:0; }
      .vth-sticker-row { display:flex; gap:4px; margin-top:6px; justify-content:center; }
      .vth-sticker-btn { background:rgba(193,127,89,0.1); border:1px solid rgba(193,127,89,0.2); border-radius:8px; padding:3px 6px; font-size:14px; cursor:pointer; transition:transform .1s; line-height:1; }
      .vth-sticker-btn:hover { transform:scale(1.25); background:rgba(193,127,89,0.2); }
      @keyframes vth-sticker-float {
        0%   { opacity:1; transform:translateY(0) scale(1); }
        80%  { opacity:.8; transform:translateY(-40px) scale(1.3); }
        100% { opacity:0; transform:translateY(-60px) scale(.8); }
      }
      .vth-sticker-float { position:absolute; pointer-events:none; font-size:28px; animation:vth-sticker-float 1.4s ease-out forwards; z-index:99; }
      .vth-duel-avatar {
        width: 32px; height: 32px; border-radius: 12px; flex-shrink: 0;
        display:flex; align-items:center; justify-content:center; overflow:hidden;
        background:
          radial-gradient(circle at 28% 18%, rgba(255,255,255,.16), transparent 30%),
          linear-gradient(145deg, rgba(196,150,92,.20), rgba(139,124,246,.10)),
          var(--bg-card);
        border:1px solid rgba(196,150,92,.24);
        font-size: 12px; font-weight: 950; color: var(--brand);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 1px 0 rgba(0,0,0,.16);
      }
      .vth-duel-avatar img { width:100%; height:100%; object-fit:cover; border-radius:inherit; }
      .vth-duel-name { min-width:0; flex:1; }
      .vth-duel-name-main { display:flex; align-items:center; gap:5px; min-width:0; font-size:12px; font-weight:900; color:var(--t1); }
      .vth-duel-name-main span:last-child { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .vth-duel-role { margin-top:2px; font-size:9px; color:var(--t3); font-weight:800; text-transform:uppercase; letter-spacing:.6px; }
      .vth-duel-big-score {
        margin-top: 8px; font-size: 18px; line-height:1; font-weight: 950; letter-spacing: -.2px;
        color: var(--t1); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .vth-duel-big-score.is-live { color:#c4965c; }
      .vth-duel-score-sub { margin-top:5px; display:flex; align-items:center; gap:5px; color:var(--t3); font-size:10px; font-weight:800; min-height:14px; }
      .vth-duel-score-sub.is-green { color:#4a8c6f; }
      .vth-duel-score-sub.is-amber { color:#c4965c; }
      .vth-duel-progress-box {
        margin-top:8px; padding:9px; border-radius:var(--radius);
        background: var(--bg-input); border:1px solid var(--border);
        color: var(--t2); font-size: 11px; line-height: 1.5;
      }
      .vth-duel-result-box {
        margin-top:8px; padding:9px; border-radius:var(--radius);
        background: rgba(74,140,111,.08); border:1px solid rgba(74,140,111,.18);
        color:#4a8c6f; font-weight:900; line-height:1.45; font-size:11px;
      }
      @media (max-width: 420px) {
        .vth-duel-form { grid-template-columns: 1fr 70px; }
        .vth-duel-form #duel-create-btn, .vth-duel-form #duel-random-btn { width:100%; }
        .vth-duel-board { grid-template-columns: 1fr; }
        .vth-pay-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .vth-duel-vs-pill { width:auto; height:auto; padding:4px 9px; }
      }
    `;
    document.head.appendChild(s);
  })();

  // ══════════════════════════════════════════════════════════
  // UTILITAIRES
  // ══════════════════════════════════════════════════════════

  // Delegate to the canonical voltEscapeHtml (window.volt-helpers.js, loaded before
  // this lazy script). Avoids the duplicate implementation and picks up the
  // additional single-quote escape (&#039;) that the local version was missing.
  const esc = window.voltEscapeHtml;

  function tr(key, fallback, vars = {}) {
    let value = '';
    try {
      value = typeof window.VOLT_TRANSLATE === 'function' ? window.VOLT_TRANSLATE(key) : '';
    } catch (_) {}
    if (!value || value === key) value = fallback || key;
    return String(value).replace(/\{(\w+)\}/g, (_, name) => Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`);
  }

  function trEsc(key, fallback, vars = {}) {
    return esc(tr(key, fallback, vars));
  }

  function currentLocale() {
    try {
      const lang = window.VOLT_CURRENT_LANGUAGE || localStorage.getItem('volt_lang') || localStorage.getItem('voltLanguage') || navigator.language || 'fr';
      if (lang === 'pt-BR') return 'pt-BR';
      if (String(lang).startsWith('zh')) return 'zh-CN';
      if (String(lang).startsWith('en')) return 'en-US';
      return 'fr-FR';
    } catch (_) {
      return 'fr-FR';
    }
  }

  function isSafeMediaUrl(value) {
    const url = String(value || '').trim();
    if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(url)) return url.length <= 700000;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:'
        && parsed.hostname === 'api.webtvmedia.net'
        && parsed.pathname.startsWith('/storage/v1/object/public/');
    } catch (_) {
      return false;
    }
  }
  const MAX_TEAM_ICON_BYTES = 2 * 1024 * 1024;
  function isValidTeamIconFile(file) {
    return !!file && file.type.startsWith('image/') && file.size <= MAX_TEAM_ICON_BYTES;
  }

  function fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return tr('time.justNow', 'À l’instant');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(currentLocale(), { day: '2-digit', month: '2-digit' });
  }

  function fmtDeadline(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(currentLocale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function fmtDuration(sec) {
    if (!sec) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
    if (m > 0) return `${m}m${String(s).padStart(2, '0')}s`;
    return `${s}s`;
  }

  // Cache mémoire courte pour éviter de refetch si l'utilisateur navigue
  // entre les sections (1v1, teams, members, leaderboard) en boucle.
  // TTL conservatif : 8s — assez pour batcher mais pas pour stale data.
  const _bgCache = new Map();
  const _bgInflight = new Map();
  const BG_CACHE_TTL_MS = 8000;
  // PERF FIX: cap entries to avoid unbounded growth across long sessions.
  const BG_CACHE_MAX = 100;
  function _bgCacheTrim() {
    if (_bgCache.size <= BG_CACHE_MAX) return;
    const cutoff = Date.now() - BG_CACHE_TTL_MS;
    for (const [k, v] of _bgCache) {
      if (v.t < cutoff) _bgCache.delete(k);
      if (_bgCache.size <= BG_CACHE_MAX) return;
    }
    // Still too big after pruning expired? evict oldest insertion order.
    while (_bgCache.size > BG_CACHE_MAX) {
      const oldestKey = _bgCache.keys().next().value;
      if (oldestKey === undefined) break;
      _bgCache.delete(oldestKey);
    }
  }
  const BG_CACHEABLE_ACTIONS = new Set([
    'getMyTeam', 'getTeamMembers', 'getTeamRequests', 'getTeamLeaderboard',
    'getTeamInternalRanking', 'getDailyChallenges', 'getVoltCredits',
    'getVoltTokens', 'getVoltCreditHistory', 'getVoltTokenHistory'
  ]);

  function _bgCacheKey(action, payload) {
    try { return action + ':' + JSON.stringify(payload || {}); } catch (_) { return action; }
  }

  function bg(action, payload = {}) {
    const cacheable = BG_CACHEABLE_ACTIONS.has(action);
    const key = cacheable ? _bgCacheKey(action, payload) : null;
    if (key) {
      const cached = _bgCache.get(key);
      if (cached && (Date.now() - cached.t) < BG_CACHE_TTL_MS) {
        return Promise.resolve(cached.v);
      }
      const inflight = _bgInflight.get(key);
      if (inflight) return inflight;
    }
    const promise = new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action, ...payload }, (res) => {
          if (chrome.runtime?.lastError) { resolve({ success: false, error: chrome.runtime.lastError?.message }); return; }
          resolve(res || {});
        });
      } catch (e) {
        resolve({ success: false, error: e?.message || String(e) });
      }
    });
    if (key) {
      _bgInflight.set(key, promise);
      promise.then((v) => {
        _bgInflight.delete(key);
        if (v?.success === true) {
          _bgCache.set(key, { t: Date.now(), v });
          _bgCacheTrim();
        }
      });
    }
    return promise;
  }

  // Invalide le cache après mutations (join, leave, accept, etc.)
  window._voltBgCacheInvalidate = function (actionPrefix) {
    if (!actionPrefix) { _bgCache.clear(); return; }
    for (const k of _bgCache.keys()) {
      if (k.startsWith(actionPrefix)) _bgCache.delete(k);
    }
  };

  function storageLocalGetSafe(keys, fallback = {}) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(keys, (res) => {
          if (chrome.runtime?.lastError) { resolve(fallback); return; }
          resolve(res || fallback);
        });
      } catch (_) {
        resolve(fallback);
      }
    });
  }

  function storageLocalSetSafe(values) {
    try {
      chrome.storage.local.set(values, () => {
        void chrome.runtime?.lastError;
      });
    } catch (_) {}
  }

  function safeAttrSelectorValue(value) {
    const raw = String(value || '');
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(raw);
    return raw.replace(/["\\\]\[]/g, '\\$&');
  }

  function getActiveGameLocalRunState() {
    return new Promise((resolve) => {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime?.lastError) { resolve(null); return; }
          const tab = tabs?.[0];
          if (!tab?.id) { resolve(null); return; }
          const host = (() => { try { return new URL(tab.url || '').hostname; } catch (_) { return ''; } })();
          const supported = host === 'ss.randomkzn.com' || host === 'yell0wsuit.page' || host === 'surfmap-run.vercel.app' || host === 'localhost:3007' || host === 'localhost';
          if (!supported) { resolve(null); return; }
          chrome.tabs.sendMessage(tab.id, { action: 'getVoltLocalRunState' }, (res) => {
            if (chrome.runtime?.lastError || !res?.success) { resolve(null); return; }
            resolve(res.state || null);
          });
        });
      } catch (_) { resolve(null); }
    });
  }

  async function blockDuelActionIfLocalRunActive(label = '1v1') {
    let snap = await getActiveGameLocalRunState();
    if (!snap || typeof snap.active === 'undefined') {
      try {
        const bgSnap = await bg('getRunSessionState');
        if (bgSnap?.success) snap = bgSnap;
      } catch (_) {}
    }
    const active = !!(snap && snap.active);
    if (!active) return false;
    const elapsed = Math.max(0, Math.floor(Number(snap.elapsedMs || snap.manualElapsedMs || 0)));
    const elapsedText = elapsed > 1000 ? ` (${fmtDuration(elapsed / 1000)})` : '';
    toast(`${label} bloqué : une run est déjà en cours${elapsedText}. Termine/reset la run puis relance le 1v1.`);
    return true;
  }

  function toast(msg, duration = 3500) {
    if (typeof showToast === 'function') { showToast(msg, duration); return; }
    const old = document.getElementById('_vth_toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = '_vth_toast';
    el.textContent = msg;
    el.style.cssText = `
      position:fixed;bottom:22px;left:50%;transform:translateX(-50%);
      background:var(--bg-card);color:var(--t1);
      padding:9px 18px;border-radius:var(--radius-lg);
      font-size:12px;font-weight:700;letter-spacing:.1px;
      box-shadow:var(--shadow-lg);z-index:99999;
      border:1px solid var(--border);max-width:280px;text-align:center;
      animation:vth-toast .2s ease;pointer-events:none;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  // ── Modale de confirmation custom ──────────────────────────
  function confirmModal(title, message, confirmLabel = tr('common.confirm', 'Confirmer'), dangerMode = false) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99990;
        display:flex;align-items:center;justify-content:center;padding:20px;
        animation:vth-fadein .15s ease;
      `;

      const accentColor = dangerMode ? 'var(--danger)' : 'var(--brand)';
      overlay.innerHTML = `
        <div class="vth-card" style="width:100%;max-width:290px;overflow:hidden;box-shadow:var(--shadow-lg);">
          <div style="padding:22px 22px 18px;">
            <div style="font-size:15px;font-weight:800;color:var(--t1);margin-bottom:6px;">${esc(title)}</div>
            <div class="vth-meta" style="color:var(--t2);line-height:1.6;">${esc(message)}</div>
          </div>
          <div class="vth-sep"></div>
          <div style="display:flex;">
            <button id="_conf_cancel" class="vth-modal-action"
              style="color:var(--t3);border-right:1px solid var(--border);">${trEsc('common.cancel', 'Annuler')}</button>
            <button id="_conf_ok" class="vth-modal-action"
              style="color:${accentColor};">${esc(confirmLabel)}</button>
          </div>
        </div>
      `;

      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      document.body.appendChild(overlay);
      if (typeof voltTrapFocus === 'function') voltTrapFocus(overlay);
      const cancelBtn = overlay.querySelector('#_conf_cancel');
      const okBtn = overlay.querySelector('#_conf_ok');
      if (!cancelBtn || !okBtn) {
        overlay.remove();
        resolve(false);
        return;
      }
      cancelBtn.addEventListener('click', () => { overlay.remove(); resolve(false); });
      okBtn.addEventListener('click', () => { overlay.remove(); resolve(true); });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
    });
  }

  // ── Role helpers ───────────────────────────────────────────
  function roleIcon(role) {
    if (role === 'owner') return `<i class="fa-solid fa-crown"         style="color:${V.amber};font-size:10px;"></i>`;
    if (role === 'officer') return `<i class="fa-solid fa-shield-halved" style="color:#5b96f5;font-size:10px;"></i>`;
    return `<i class="fa-solid fa-user"          style="color:var(--t3);font-size:10px;"></i>`;
  }

  function roleLabel(role) {
    if (role === 'owner') return tr('team.role.owner', 'Capitaine');
    if (role === 'officer') return tr('team.role.officer', 'Officier');
    return tr('team.role.member', 'Membre');
  }

  function renderIcon(icon, size = '20px') {
    const n = Number.parseFloat(size);
    const emblemFont = Number.isFinite(n) ? `${Math.max(9, Math.round(n * 0.62))}px` : size;
    const textFont = Number.isFinite(n) ? `${Math.max(9, Math.round(n * 0.48))}px` : size;
    if (!icon) return `<span class="vth-emblem-mark" style="font-size:${emblemFont};"><i class="fa-solid fa-shield-halved"></i></span>`;
    const isUrl = isSafeMediaUrl(icon);
    if (isUrl) return `<img src="${esc(icon)}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;vertical-align:middle;">`;
    if (icon.includes('fa-')) return `<span class="vth-emblem-mark" style="font-size:${emblemFont};"><i class="${esc(icon)}"></i></span>`;
    const label = String(icon || '').trim().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || 'V';
    return `<span class="vth-emblem-mark" style="font-size:${textFont};">${esc(label)}</span>`;
  }

  // Préserve le section-header existant, injecte le contenu dans un wrapper
  function getSectionWrapper(section) {
    let wrapper = section.querySelector('._vth_wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = '_vth_wrapper';
      wrapper.style.cssText = 'padding:0 16px 16px 16px;';
      section.appendChild(wrapper);
    }
    return wrapper;
  }

  // Spinner minimal
  function spinnerHTML(msg = '') {
    return `<div style="padding:28px 20px;text-align:center;">
      <div class="vth-spinner"></div>
      ${msg ? `<div class="vth-meta" style="margin-top:10px;">${esc(msg)}</div>` : ''}
    </div>`;
  }

  // ══════════════════════════════════════════════════════════
  // SECTION CRÉDITS & DÉFIS
  // ══════════════════════════════════════════════════════════

  let _creditsInitialized = false;
  let _challengesInitialized = false;
  let _activeSubTab = 'credits';

  window.initChallengesCreditsSection = async function (force = false) {
    const section = document.getElementById('section-challenges-credits');
    if (!section) return;
    if (_creditsInitialized && _challengesInitialized && !force) return;
    _creditsInitialized = true;
    _challengesInitialized = true;

    if (!section.querySelector('._vth_wrapper')) {
      section.innerHTML = '';
    }

    const wrapper = getSectionWrapper(section);
    wrapper.innerHTML = `
      <div class="vth-tabs" style="margin-bottom: 20px; padding: 4px; background: rgba(255,255,255,0.03); border-radius: 12px; display: flex; gap: 4px;">
        <div class="vth-tab sub-tab ${(_activeSubTab === 'challenges') ? 'active' : ''}" data-tab="challenges" style="flex: 1; text-align: center; font-size: 11px; padding: 8px 0;">${trEsc('team.tabs.challenges', 'Défis').toUpperCase()}</div>
        <div class="vth-tab sub-tab ${(_activeSubTab === 'credits') ? 'active' : ''}" data-tab="credits" style="flex: 1; text-align: center; font-size: 11px; padding: 8px 0;">${trEsc('team.tabs.wallet', 'Portefeuille').toUpperCase()}</div>
      </div>
      <div id="sub-tab-content"></div>
    `;

    const contentArea = wrapper.querySelector('#sub-tab-content');

    const subTabs = wrapper.querySelectorAll('.sub-tab');
    subTabs.forEach(tab => {
      tab.addEventListener('click', async () => {
        subTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        _activeSubTab = tab.dataset.tab;
        await _renderCurrentSubTab(contentArea);
      });
    });

    await _renderCurrentSubTab(contentArea);
  };

  async function _renderCurrentSubTab(container) {
    container.innerHTML = `<div style="padding: 20px 0;">${spinnerHTML(tr('common.loading', 'Chargement…'))}</div>`;
    if (_activeSubTab === 'challenges') {
      await _renderChallengesUI(container);
    } else {
      await _renderCredits(container);
    }
  }

  window.initChallengesSection = window.initChallengesCreditsSection;
  window.initCreditsSection = window.initChallengesCreditsSection;

  async function _renderCredits(wrapper) {
    wrapper.innerHTML = `
      <div class="vth">
        <!-- ── Balance hero ──────────────────── -->
        <div class="vth-card" style="margin-bottom:12px;overflow:hidden;">
          <div style="padding:20px 20px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
            <div>
              <div class="vth-label" style="margin-bottom:8px;">${trEsc('team.balance', 'Solde')}</div>
              <div id="cred-balance"
                style="font-size:38px;font-weight:900;color:var(--t1);line-height:1;letter-spacing:-1.5px;">
                <span style="opacity:.2;">—</span>
              </div>
              <div class="vth-meta" style="margin-top:6px;">${trEsc('team.classicCredits', 'Crédits classiques')}</div>
            </div>
            <div style="min-width:112px;padding:10px 12px;border-radius:14px;background:var(--bg-input);border:1px solid var(--border);text-align:right;">
              <div class="vth-label" style="margin-bottom:5px;">${trEsc('team.tokens', 'Tokens')}</div>
              <div id="token-balance" style="font-size:24px;font-weight:900;color:var(--brand);line-height:1;"><span style="opacity:.2;">—</span></div>
              <div class="vth-meta" style="font-size:10px;margin-top:5px;">${trEsc('team.adminSupabase', 'Admin/Supabase')}</div>
            </div>
          </div>

          <div class="vth-sep"></div>

          <div id="cred-monthly-container" style="padding:14px 20px;">
            <div id="cred-monthly-info">${spinnerHTML(tr('team.monthlyChecking', 'Vérification…'))}</div>
            <button id="cred-claim-btn" class="vth-btn vth-btn-primary"
              style="margin-top:10px;width:100%;display:none;">${trEsc('team.claimAllocation', 'Réclamer l’allocation')}</button>
          </div>
        </div>

        <div class="vth-card" id="token-shop" style="margin-bottom:12px;padding:14px 14px 12px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;">
            <div>
              <div class="vth-label">${trEsc('payments.tokens.title', 'Tokens via Discord')}</div>
              <div class="vth-meta" style="margin-top:4px;">${trEsc('payments.tokens.subtitle', 'Achats automatiques désactivés. Pour acheter des tokens, ouvrez un ticket dans #📩・ticket.')}</div>
            </div>
            <button id="token-ticket-main-btn" class="vth-btn vth-btn-primary vth-btn-xs" title="${trEsc('payments.discordTitle', 'Ouvrir Discord')}">
              <i class="fa-brands fa-discord" style="font-size:12px;"></i> ${trEsc('payments.openTicket', 'Ouvrir ticket')}
            </button>
          </div>
          <div class="vth-pay-grid">
            ${['tokens_5:5:5 €','tokens_10:10:10 €','tokens_25:25:25 €','tokens_50:50:50 €'].map(raw => {
              const [id, count, price] = raw.split(':');
              return `<div class="vth-pay-pack">
                <div style="font-size:15px;font-weight:950;color:var(--t1);">${esc(count)} tokens</div>
                <div class="vth-meta" style="font-weight:800;color:var(--brand);">${esc(price)}</div>
                <button class="token-ticket-btn vth-btn vth-btn-primary vth-btn-xs" data-product="${esc(id)}" data-count="${esc(count)}">${trEsc('payments.openTicket', 'Ouvrir ticket')}</button>
              </div>`;
            }).join('')}
          </div>
          <div id="payment-status-line" class="vth-meta" style="margin-top:10px;line-height:1.5;">${trEsc('payments.safeHint', 'Les tokens sont ajoutés manuellement après validation dans le ticket Discord.')}</div>
        </div>
        <div id="cred-history" style="display:flex;flex-direction:column;"></div>
      </div>
    `;

    await _refreshCreditsData();
    _bindTokenShop(wrapper);
  }

  async function _refreshCreditsData() {
    const balEl = document.getElementById('cred-balance');
    const monthEl = document.getElementById('cred-monthly-info');
    const claimBtn = document.getElementById('cred-claim-btn');
    const histEl = document.getElementById('cred-history');
    const tokenBalEl = document.getElementById('token-balance');

    // H8: allSettled so one bad RPC doesn't blank the whole wallet UI.
    const _settled = await Promise.allSettled([
      bg('getVoltCredits'),
      bg('getVoltTokens'),
      bg('checkMonthlyClaimStatus'),
      bg('getVoltCreditHistory'),
      bg('getVoltTokenHistory'),
    ]);
    const _pick = (i) => _settled[i].status === 'fulfilled' ? _settled[i].value : { success: false, error: String(_settled[i].reason?.message || _settled[i].reason || 'rejected') };
    const credRes = _pick(0), tokenRes = _pick(1), monthRes = _pick(2), histRes = _pick(3), tokenHistRes = _pick(4);

    // ── Solde ──
    if (balEl) {
      balEl.innerHTML = credRes.success
        ? `${credRes.balance ?? 0}<span style="font-size:12px;color:var(--t3);font-weight:700;margin-left:6px;text-transform:uppercase;letter-spacing:1px;">${trEsc('team.walletCredits', 'crédits')}</span>`
        : `<span style="opacity:.2;">—</span>`;
    }

    if (tokenBalEl) {
      tokenBalEl.innerHTML = tokenRes.success
        ? `${tokenRes.balance ?? 0}<span style="font-size:10px;color:var(--t3);font-weight:800;margin-left:4px;text-transform:uppercase;letter-spacing:.8px;">${trEsc('team.walletTokens', 'tokens')}</span>`
        : `<span style="opacity:.2;">—</span>`;
    }

    // ── Allocation mensuelle ──
    if (monthEl) {
      const gradeCredits = { star: 50, elite: 100, legend: 200 };
      const profileCache = await new Promise(r => chrome.storage.local.get(['volt_profile_cache'], r));
      const grade = profileCache?.volt_profile_cache?.grade || null;

      if (!grade) {
        monthEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;opacity:.5;">
            <i class="fa-solid fa-lock" style="font-size:12px;color:var(--t3);"></i>
            <span class="vth-meta">${trEsc('team.subscriptionRequired', 'Abonnement requis pour l’allocation mensuelle.')}</span>
          </div>`;
        if (claimBtn) claimBtn.style.display = 'none';

      } else if (monthRes.success && monthRes.claimed) {
        const g = monthRes.grant;
        monthEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="fa-solid fa-calendar-check" style="font-size:12px;color:${V.green};"></i>
            <span class="vth-meta" style="color:${V.green};font-weight:600;">
              ${trEsc('team.monthlyClaimed', 'Réclamé ce mois · +{credits} crédit', { credits: g?.credits ?? 0 })}
              ${g?.grade ? `<span class="vth-badge vth-badge-brand" style="margin-left:4px;">${g.grade.toUpperCase()}</span>` : ''}
            </span>
          </div>`;
        if (claimBtn) claimBtn.style.display = 'none';

      } else {
        const credits = gradeCredits[grade] || 0;
        monthEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="fa-solid fa-gift" style="font-size:12px;color:${V.amber};"></i>
            <span class="vth-meta" style="font-weight:600;">
              ${trEsc('team.monthlyAvailable', 'Allocation disponible · +{credits} crédit', { credits })}
            </span>
          </div>`;
        if (claimBtn) {
          claimBtn.style.display = 'block';
          claimBtn.textContent = tr('team.claimPlus', 'Réclamer +{credits} crédit', { credits });
          const newBtn = /** @type {HTMLButtonElement} */ (claimBtn.cloneNode(true));
          claimBtn.parentNode.replaceChild(newBtn, claimBtn);
          newBtn.style.display = 'block';
          newBtn.addEventListener('click', async () => {
            newBtn.disabled = true;
            newBtn.textContent = tr('common.loading', 'Chargement…');
            const res = await bg('claimMonthlyCredits');
            if (res.success) {
              toast(tr('team.creditAdded', '+{credits} crédit ajouté !', { credits: res.credits }), 4000);
              _creditsInitialized = false;
              await /** @type {any} */(window.initChallengesCreditsSection)(true);
            } else {
              const msgs = {
                already_claimed: tr('team.alreadyClaimed', 'Déjà réclamé ce mois.'),
                no_grade: tr('team.noGrade', 'Abonnement requis.'),
                banned: tr('team.banned', 'Compte banni.'),
              };
              toast(`${msgs[res.error] || res.error}`);
              newBtn.disabled = false;
              newBtn.textContent = tr('team.claimPlus', 'Réclamer +{credits} crédit', { credits });
            }
          });
        }
      }
    }

    // ── Historique ──
    if (histEl) {
      if ((!histRes.success || !histRes.transactions?.length) && (!tokenHistRes?.success || !tokenHistRes.transactions?.length)) {
        histEl.innerHTML = `
          <div class="vth-empty"><i class="fa-solid fa-receipt"></i>${trEsc('team.noTransactions', 'Aucune transaction pour le moment.')}</div>`;
      } else {
        const typeLabel = {
          monthly_grant: 'Allocation mensuelle',
          daily_challenge: 'Défi quotidien',
          challenge_reward: 'Défi accompli',
          admin_grant: 'Don administrateur',
          team_slot_purchase: 'Achat places team',
          gift: 'Cadeau',
          refund: 'Remboursement',
          run_bonus: 'Bonus run',
        };
        const tokenTypeLabel = {
          admin_grant: 'Tokens ajoutés par admin',
          admin_revoke: 'Tokens retirés par admin',
          duel_escrow: 'Mise 1v1',
          duel_win: 'Gain 1v1',
          duel_refund: 'Remboursement 1v1',
          purchase: 'Achat tokens',
          payment_refund: 'Remboursement paiement',
          payment_chargeback: 'Paiement contesté',
        };
        const allTx = [
          ...(histRes.transactions || []).map(tx => ({ ...tx, wallet: tr('team.walletCredits', 'crédits') })),
          ...((tokenHistRes?.success ? tokenHistRes.transactions : []) || []).map(tx => ({ ...tx, wallet: tr('team.walletTokens', 'tokens'), tokenLabel: tokenTypeLabel[tx.type] || tx.type })),
        ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 40);
        histEl.innerHTML = allTx.map((tx, i) => {
          const isPos = tx.amount > 0;
          const isLast = i === allTx.length - 1;
          return `
            <div class="vth-row" style="${isLast ? '' : 'border-bottom:1px solid var(--border);'}">
              <div style="flex:1;min-width:0;">
                <div style="font-size:12px;color:var(--t1);font-weight:600;margin-bottom:2px;">
                  ${esc(tx.tokenLabel || typeLabel[tx.type] || tx.type)}
                </div>
                ${tx.description ? `<div class="vth-meta">${esc(tx.description)}</div>` : ''}
                <div class="vth-meta" style="margin-top:1px;">${fmtTime(tx.created_at)}</div>
              </div>
              <div class="${isPos ? 'vth-pos' : 'vth-neg'}" style="font-size:14px;flex-shrink:0;">
                ${isPos ? '+' : ''}${tx.amount}<span style="font-size:10px;opacity:.45;margin-left:3px;font-weight:700;">${esc(tx.wallet || tr('team.walletCredits', 'crédits'))}</span>
              </div>
            </div>`;
        }).join('');
      }
    }
  }

  async function _openDiscordTicket(productId = '', _button = null) {
    // Conservé sous ce nom pour compat: redirige maintenant vers PayPal QR + note
    try {
      const { uid, pseudo } = await _voltGetUid();
      const productLabel = productId ? `Tokens · ${productId.replace('tokens_', '')}` : 'Achat Volt';
      const noteHint = `${productId || 'volt'} · UID:${uid || '???'} · ${pseudo || '?'}`;
      _voltShowPaypalModal(productLabel, noteHint);
    } catch (e) {
      toast(`Erreur ouverture paiement : ${e?.message || e}`, 5500);
    }
  }

  function _bindTokenShop(scope = document) {
    scope.querySelectorAll('.token-ticket-btn').forEach(/** @param {Element} _btn */ (_btn) => {
      const btn = /** @type {HTMLElement} */ (_btn);
      if (btn.dataset.listener) return;
      btn.dataset.listener = '1';
      btn.addEventListener('click', () => _openDiscordTicket(btn.dataset.product, btn));
    });
    const mainBtn = /** @type {HTMLElement | null} */ (scope.querySelector('#token-ticket-main-btn'));
    if (mainBtn && !mainBtn.dataset.listener) {
      mainBtn.dataset.listener = '1';
      mainBtn.addEventListener('click', () => _openDiscordTicket('', mainBtn));
    }
  }

  // ══════════════════════════════════════════════════════════
  // SECTION DÉFIS QUOTIDIENS
  // ══════════════════════════════════════════════════════════


  async function _renderChallengesUI(wrapper) {
    const today = new Date().toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
    const todayFmt = today.charAt(0).toUpperCase() + today.slice(1);

    wrapper.innerHTML = `
      <div class="vth">
        <!-- ── Résumé journalier (Style Header, pas une Card) ──────────────── -->
        <div style="padding:4px 4px 16px 4px; border-bottom:1px solid var(--border); margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;">
            <div>
              <div class="vth-label" style="margin-bottom:4px; opacity:0.6;">${trEsc('challenges.today', 'Défis du jour')}</div>
              <div style="font-size:16px;font-weight:800;color:var(--t1);letter-spacing:-0.2px;">${todayFmt}</div>
            </div>
            <div id="ch-progress-text" class="vth-meta" style="font-weight:800;font-size:12px;color:var(--t1);">—</div>
          </div>
          <div class="vth-bar" style="height:6px; background:var(--bg-input); border:none;">
            <div id="ch-progress-fill" class="vth-bar-fill vth-bar-brand" style="width:0%; border-radius:10px;"></div>
          </div>
        </div>

        <!-- ── Liste des défis ─────────────────── -->
        <div id="ch-list" style="display:flex;flex-direction:column;gap:6px;">${spinnerHTML()}</div>

        <!-- ── Note ──────────────────────────────── -->
        <div class="vth-meta" style="
          margin-top:14px;padding:12px 14px;text-align:center;
          background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);
        ">
          ${trEsc('challenges.note', 'Les défis se réinitialisent chaque jour à minuit · Complète-les pour gagner des crédits')}
        </div>
      </div>
    `;

    await _loadChallenges();
  }

  async function _loadChallenges() {
    const listEl = document.getElementById('ch-list');
    const progressFill = document.getElementById('ch-progress-fill');
    const progressText = document.getElementById('ch-progress-text');
    if (!listEl) return;

    listEl.innerHTML = spinnerHTML();
    const res = await bg('getDailyChallenges');

    if (!res.success || !res.challenges?.length) {
      const isNotLogged = res.error === 'not_logged_in';
      listEl.innerHTML = `
        <div class="vth-empty">
          <i class="fa-solid fa-${isNotLogged ? 'user-slash' : 'triangle-exclamation'}"></i>
          ${isNotLogged ? trEsc('challenges.loginRequired', 'Connecte-toi pour voir tes défis.') : trEsc('challenges.loadFailed', 'Impossible de charger les défis.')}
        </div>`;
      return;
    }

    const total = res.challenges.length;
    const done = res.challenges.filter(c => c.completed).length;
    const earned = res.challenges.filter(c => c.completed).reduce((s, c) => s + (c.credits_reward || 0), 0);

    const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
    if (progressFill) progressFill.style.width = `${progressPct}%`;
    if (progressText) progressText.innerHTML =
      `<span style="font-weight:800;">${done}/${total}</span>&thinsp;&middot;&thinsp;<span style="color:${V.amber};font-weight:800;">+${earned}&thinsp;credits</span>`;

    const active = res.challenges.filter(c => !c.completed);
    const finished = res.challenges.filter(c => c.completed);

    const all = [...active, ...finished];
    listEl.innerHTML = all.map(c => _challengeCard(c)).join('');
  }

  function _challengeCard(c) {
    const pct = c.target_value > 0
      ? Math.min(100, Math.round((c.progress / c.target_value) * 100))
      : c.completed ? 100 : 0;

    const formatVal = (val, type) => {
      if (type === 'run_duration' || type === 'total_run_time') {
        const h = Math.floor(val / 3600);
        const m = Math.floor((val % 3600) / 60);
        const s = val % 60;
        if (h > 0) return m > 0 ? `${h}h${m}m` : `${h}h`;
        if (m > 0) return s > 0 ? `${m}m${s}s` : `${m}min`;
        return `${s}s`;
      }
      return val;
    };
    
    const pText = formatVal(c.progress, c.type);
    const tText = formatVal(c.target_value, c.type);

    return `
      <div class="vth-card" style="padding:14px 16px;${c.completed ? 'opacity:.55;' : ''}">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;
              margin-bottom:${c.completed ? '0' : '8px'};">
              <span style="font-size:12px;font-weight:700;color:var(--t1);
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${esc(c.title)}
              </span>
              ${c.completed
        ? `<span class="vth-badge vth-badge-green" style="flex-shrink:0;">${trEsc('challenges.completed', 'Terminé').toUpperCase()}</span>`
        : `<span style="flex-shrink:0;font-size:10px;font-weight:800;color:${V.amber};">+${c.credits_reward}&thinsp;${trEsc('team.walletCredits', 'crédits')}</span>`
      }
            </div>
            <div style="font-size:10px;color:var(--t3);margin-bottom:8px;line-height:1.2;">
              ${esc(c.description)}
            </div>
            ${!c.completed ? `
              <div style="display:flex;align-items:center;gap:8px;">
                <div class="vth-bar" style="flex:1;">
                  <div class="vth-bar-fill vth-bar-brand" style="width:${pct}%;"></div>
                </div>
                <span class="vth-meta" style="font-weight:700;font-size:10px;">${pText}/${tText}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════════════════════
  //  SECTION TEAM
  // ══════════════════════════════════════════════════════════

  let _myId = null;
  let _myTeamData = null;
  let _myTeamRole = null;
  let _teamsInitialized = false;
  let _teamChatListener = null;
  let _teamChatPollingTimer = null;
  function _stopTeamChatPolling() {
    if (_teamChatPollingTimer) {
      clearInterval(_teamChatPollingTimer);
      _teamChatPollingTimer = null;
    }
  }
  function _startTeamChatPolling(intervalMs = 4500) {
    _stopTeamChatPolling();
    _teamChatPollingTimer = setInterval(() => {
      try {
        const pane = document.getElementById('team-chat-messages');
        if (!pane || document.visibilityState === 'hidden') return;
        _loadTeamChatHistory({ preserveScroll: true, silent: true });
      } catch (_) {}
    }, Math.max(3000, Number(intervalMs) || 4500));
  }

  // Cache persistant entre ouvertures du popup: empêche le même résultat 1v1
  // de réapparaître à chaque clic sur l'extension.
  const _DUEL_SEEN_STORE = 'voltDuelSeenPopupV2';
  const _DUEL_POPUP_FRESH_MS = 2 * 60 * 1000;
  let _duelSeenStoreReady = false;
  const _duelSeenMem = new Set();

  (function _initDuelSeenStore() {
    storageLocalGetSafe([_DUEL_SEEN_STORE]).then((res) => {
      const data = res && res[_DUEL_SEEN_STORE];
      if (data && typeof data === 'object') {
        Object.keys(data).forEach((k) => { if (data[k]) _duelSeenMem.add(k); });
      }
      _duelSeenStoreReady = true;
    }).catch(() => {
      _duelSeenStoreReady = true;
    });
  })();

  window.initTeamsSection = async function (force = false) {
    const section = document.getElementById('section-team');
    if (!section) return;
    if (_teamsInitialized && !force) return;
    _teamsInitialized = true;

    const wrapper = getSectionWrapper(section);
    wrapper.innerHTML = spinnerHTML();

    // H8: allSettled to keep section loading even if one source fails.
    const _s = await Promise.allSettled([
      bg('getMyTeam'),
      storageLocalGetSafe(['id'])
    ]);
    const res = _s[0].status === 'fulfilled' ? _s[0].value : { success: false, error: String(_s[0].reason?.message || 'rejected') };
    const storageRes = _s[1].status === 'fulfilled' ? _s[1].value : {};
    _myId = storageRes.id || null;

    if (res.success && res.team) {
      _myTeamData = res.team;
      _myTeamRole = res.myRole;
      storageLocalSetSafe({ myTeamId: res.team.id });
      _renderTeamView(wrapper, res.team, res.myRole);
    } else {
      _myTeamData = null;
      _myTeamRole = null;
      try { chrome.storage.local.remove('myTeamId', () => void chrome.runtime?.lastError); } catch (_) {}
      _renderNoTeamView(wrapper, res);
    }
  };

  // ─── Pas encore dans une team ──────────────────────────────

  function _renderNoTeamView(wrapper, res = {}) {
    const invites = res.invites || [];

    wrapper.innerHTML = `
      <div class="vth">
        <!-- Invitations en attente -->
        ${invites.length ? `
          <div style="margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
              <div class="vth-label">${trEsc('team.invites', 'Invitations')}</div>
              <span class="vth-badge vth-badge-amber">${invites.length}</span>
            </div>
            <div id="team-invites-list" style="display:flex;flex-direction:column;gap:6px;"></div>
          </div>
        ` : ''}

        <!-- Onglets Créer / Rejoindre / Classement -->
        <div class="vth-tabs" style="margin-bottom:14px;">
          <button data-tab="create"  class="vth-tab active">
            <i class="fa-solid fa-flag"></i>${trEsc('team.create', 'Créer')}
          </button>
          <button data-tab="search"  class="vth-tab">
            <i class="fa-solid fa-magnifying-glass"></i>${trEsc('team.join', 'Rejoindre')}
          </button>
          <button data-tab="ranking" class="vth-tab">
            <i class="fa-solid fa-trophy"></i>${trEsc('team.topTeams', 'Top Teams')}
          </button>
        </div>

        <div id="team-tab-content"></div>
      </div>
    `;

    // Rendu invitations
    const inviteList = wrapper.querySelector('#team-invites-list');
    if (inviteList && invites.length) {
      inviteList.innerHTML = invites.map(inv => `
        <div style="
          display:flex;align-items:center;gap:10px;padding:12px 14px;
          background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);
        ">
          <div class="vth-team-icon" style="width:36px;height:36px;">
            ${renderIcon(inv.teams?.icon, '20px')}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;color:var(--t1);font-weight:700;
              display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
              ${esc(inv.teams?.name)}
              <span class="vth-tag">[${esc(inv.teams?.tag)}]</span>
            </div>
            <div class="vth-meta">${trEsc('team.invitedBy', 'Invité par {name}', { name: inv.users?.pseudo || tr('chat.anonymous', 'Anonyme') })}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="btn-accept-invite vth-btn vth-btn-sm" data-id="${esc(inv.id)}"
              style="background:${V.green};color:#fff;">
              <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn-decline-invite vth-btn vth-btn-ghost vth-btn-sm" data-id="${esc(inv.id)}">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      `).join('');

      inviteList.querySelectorAll('.btn-accept-invite').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const r = await bg('acceptTeamInvite', { inviteId: btn.dataset.id });
          if (r.success) {
            toast(tr('team.joined', 'Team rejointe !'), 3000);
            _teamsInitialized = false;
            window.initTeamsSection(true);
          } else {
            toast(` ${r.error}`);
            btn.disabled = false;
          }
        });
      });

      inviteList.querySelectorAll('.btn-decline-invite').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          await bg('declineTeamInvite', { inviteId: btn.dataset.id });
          _teamsInitialized = false;
          window.initTeamsSection(true);
        });
      });
    }

    // Gestion des onglets
    const tabBtns = wrapper.querySelectorAll('.vth-tab');
    const tabContent = wrapper.querySelector('#team-tab-content');

    const switchTab = async (tab) => {
      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      await _renderNoTeamTabContent(tab, tabContent);
    };

    tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    switchTab('create');
  }

  async function _renderNoTeamTabContent(tab, el) {
    if (!el) return;

    if (tab === 'create') {
      el.innerHTML = `
        <div class="vth-card" style="padding:18px;">
          <div class="vth-meta" style="margin-bottom:16px;">
            ${trEsc('team.createIntro', 'Crée ta team · {slots} places gratuites', { slots: 5 })}
          </div>

          <!-- Emblème -->
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
            <div id="team-icon-preview" class="vth-team-icon"
              style="width:56px;height:56px;cursor:pointer;border:2px dashed var(--border);">
              <i class="fa-solid fa-camera" style="font-size:18px;color:var(--t3);"></i>
            </div>
            <div style="flex:1;">
              <div class="vth-label" style="margin-bottom:6px;">${trEsc('team.emblem', 'Emblème')}</div>
              <button id="team-upload-btn" class="vth-btn vth-btn-ghost vth-btn-sm" style="margin-bottom:5px;">
                <i class="fa-solid fa-upload"></i> ${trEsc('team.upload', 'Importer')}
              </button>
              <div class="vth-meta" style="margin-top:2px;">
                ${trEsc('team.gifLegend', 'GIF animé réservé aux membres LEGEND')}
              </div>
              <input type="file" id="team-icon-file" accept="image/*" style="display:none;">
              <input id="team-icon-url" type="hidden" value="fa-solid fa-bolt">
            </div>
          </div>

          <!-- Nom + TAG -->
          <div style="display:flex;gap:8px;margin-bottom:10px;">
            <input id="team-name-input" class="vth-input" type="text" maxlength="30"
              placeholder="${trEsc('team.namePlaceholder', 'Nom de la team (3-30 car.)')}" style="flex:1;">
            <input id="team-tag-input" class="vth-input" type="text" maxlength="5"
              placeholder="${trEsc('team.tagPlaceholder', 'TAG')}"
              style="width:72px;text-transform:uppercase;text-align:center;font-weight:800;padding-left:6px;padding-right:6px;">
          </div>

          <!-- Description -->
          <input id="team-desc-input" class="vth-input" type="text" maxlength="200"
            placeholder="${trEsc('team.descriptionPlaceholder', 'Description (optionnel)')}" style="margin-bottom:14px;">

          <div class="vth-meta" style="margin-bottom:16px;">${trEsc('team.publicDefault', 'Toutes les teams sont publiques par défaut.')}</div>

          <button id="team-create-btn" class="vth-btn vth-btn-primary" style="width:100%;padding:11px;font-size:13px;">
            <i class="fa-solid fa-flag"></i> ${trEsc('team.createTeam', 'Créer la Team')}
          </button>
        </div>
      `;

      const fileInput = /** @type {HTMLInputElement | null} */ (document.getElementById('team-icon-file'));
      const uploadBtn = document.getElementById('team-upload-btn');
      const previewEl = document.getElementById('team-icon-preview');
      const hiddenUrl = /** @type {HTMLInputElement | null} */ (document.getElementById('team-icon-url'));

      uploadBtn?.addEventListener('click', () => fileInput?.click());
      previewEl?.addEventListener('click', () => fileInput?.click());
      fileInput?.addEventListener('change', (e) => {
        const file = /** @type {HTMLInputElement} */ (e.target).files[0];
        if (!file) return;
        const isGif = file.type === 'image/gif';
        const isLegend = typeof VOLT_PREMIUM !== 'undefined' && VOLT_PREMIUM.hasGrade?.('legend');
        if (isGif && !isLegend) { toast(tr('team.gifLegendOnly', 'Les GIFs animés sont réservés aux membres LEGEND.')); return; }
        if (!isValidTeamIconFile(file)) { toast(tr('team.invalidImage', 'Image invalide ou trop lourde (max 2 Mo).')); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = /** @type {string} */ (/** @type {FileReader} */(ev.target).result);
          if (previewEl) previewEl.innerHTML = `<img src="${result}" style="width:100%;height:100%;object-fit:cover;">`;
          if (hiddenUrl) hiddenUrl.value = result;
        };
        reader.readAsDataURL(file);
      });

      document.getElementById('team-create-btn')?.addEventListener('click', async () => {
        const nameEl = /** @type {HTMLInputElement | null} */ (document.getElementById('team-name-input'));
        const tagEl = /** @type {HTMLInputElement | null} */ (document.getElementById('team-tag-input'));
        const descEl = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('team-desc-input'));
        const icon = hiddenUrl?.value || 'fa-solid fa-bolt';

        const name = nameEl?.value.trim() || '';
        const tag = tagEl?.value.trim().toUpperCase() || '';
        const desc = descEl?.value.trim() || '';

        if (name.length < 3) { toast(tr('team.nameTooShort', 'Nom trop court (min 3 caractères).')); return; }
        if (tag.length < 2) { toast(tr('team.tagTooShort', 'TAG trop court (min 2 caractères).')); return; }

        const btn = /** @type {HTMLButtonElement | null} */ (document.getElementById('team-create-btn'));
        if (btn) { btn.disabled = true; btn.textContent = tr('team.creating', 'Création…'); }

        const res = await bg('createTeam', { name, tag, description: desc, icon, is_public: true });

        if (res.success) {
          toast(tr('team.created', 'Team créée !'), 3000);
          _teamsInitialized = false;
          window.initTeamsSection(true);
        } else {
          const errs = {
            already_in_team: tr('team.alreadyInTeam', 'Tu es déjà dans une team.'),
            name_taken: tr('team.nameTaken', 'Ce nom est déjà pris.'),
            tag_taken: tr('team.tagTaken', 'Ce TAG est déjà utilisé.'),
          };
          toast(` ${errs[res.error] || res.error}`);
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-flag"></i> ${trEsc('team.createTeam', 'Créer la Team')}`;
          }
        }
      });

    } else if (tab === 'search') {
      el.innerHTML = `
        <div class="vth-card" style="padding:16px;">
          <div style="display:flex;gap:8px;margin-bottom:14px;">
            <input id="team-search-input" class="vth-input" type="text"
              placeholder="${trEsc('team.searchPlaceholder', 'Nom ou TAG…')}" style="flex:1;">
            <button id="team-search-btn" class="vth-btn vth-btn-primary vth-btn-icon" style="width:42px;border-radius:var(--radius);">
              <i class="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
          <div id="team-search-results">
            <div class="vth-empty" style="padding:20px;">
              <i class="fa-solid fa-magnifying-glass"></i>
              ${trEsc('team.searchHint', 'Entre un nom ou TAG pour rechercher.')}
            </div>
          </div>
        </div>
      `;

      const resultsEl = document.getElementById('team-search-results');
      const inputEl = /** @type {HTMLInputElement | null} */ (document.getElementById('team-search-input'));

      const doSearch = async () => {
        const q = inputEl?.value.trim() || '';
        if (q.length < 2) {
          resultsEl.innerHTML = `<div class="vth-meta" style="padding:10px;text-align:center;">${trEsc('team.min2', 'Minimum 2 caractères.')}</div>`;
          return;
        }
        resultsEl.innerHTML = spinnerHTML(tr('common.searching', 'Recherche…'));
        const r = await bg('searchTeams', { query: q });

        if (!r.success || !r.teams?.length) {
          resultsEl.innerHTML = `
            <div class="vth-empty" style="padding:20px;">
              <i class="fa-solid fa-magnifying-glass"></i>${trEsc('team.notFound', 'Aucune team trouvée.')}
            </div>`;
          return;
        }

        resultsEl.innerHTML = r.teams.map((t, i) => `
          <div class="vth-row" style="
            ${i < r.teams.length - 1 ? 'border-bottom:1px solid var(--border);' : ''}
            padding-left:0;padding-right:0;">
            <div class="vth-team-icon" style="width:36px;height:36px;">
              ${renderIcon(t.icon, '20px')}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;color:var(--t1);font-weight:700;
                display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
                ${esc(t.name)} <span class="vth-tag">[${esc(t.tag)}]</span>
              </div>
              <div class="vth-meta">
                ${t.team_members?.[0]?.count ?? 0}/${t.max_members} ${trEsc('team.members', 'membres')}
                ${t.description ? ` · ${esc(t.description.slice(0, 40))}${t.description.length > 40 ? '…' : ''}` : ''}
              </div>
            </div>
            <button class="btn-request-join vth-btn vth-btn-primary vth-btn-sm" data-id="${esc(t.id)}">
              ${trEsc('team.join', 'Rejoindre')}
            </button>
          </div>
        `).join('');

        resultsEl.querySelectorAll('.btn-request-join').forEach(/** @param {Element} _b */ (_b) => {
          const b = /** @type {HTMLButtonElement} */ (_b);
          b.addEventListener('click', async () => {
            const teamId = b.dataset.id;
            b.disabled = true; b.textContent = '…';
            const res = await bg('requestToJoinTeam', { teamId });
            if (res.success) toast(tr('team.requestSent', 'Demande envoyée !'));
            else toast(` ${res.error}`);
            b.textContent = tr('team.join', 'Rejoindre');
            b.disabled = false;
          });
        });
      };

      document.getElementById('team-search-btn')?.addEventListener('click', doSearch);
      inputEl?.addEventListener('keydown', e => e.key === 'Enter' && doSearch());

    } else if (tab === 'ranking') {
      el.innerHTML = spinnerHTML();
      _renderTeamRanking(el);
    }
  }

  // ─── Classement global des teams ──────────────────────────

  function _showRankedTeamInfoModal(team, rank = null) {
    if (!team) return;
    const teamId = team.team_id || team.id || '';
    const memberCount = team.member_count ?? team.team_members?.[0]?.count ?? team.team_members?.length ?? '?';
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:99990;
      display:flex;align-items:center;justify-content:center;padding:20px;
      animation:vth-fadein .15s ease;
    `;
    overlay.innerHTML = `
      <div class="vth-card" style="width:100%;max-width:370px;overflow:hidden;box-shadow:var(--shadow-lg);">
        <div style="padding:18px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:11px;min-width:0;">
              <div class="vth-team-icon" style="width:44px;height:44px;border-radius:12px;">
                ${renderIcon(team.icon, '24px')}
              </div>
              <div style="min-width:0;">
                <div style="font-size:15px;font-weight:900;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${esc(team.name || tr('team.unknown', 'Team'))}
                  <span class="vth-tag">[${esc(team.tag || '---')}]</span>
                </div>
                <div class="vth-meta">${rank ? `#${rank} · ` : ''}${memberCount} ${trEsc('team.members', 'membres')}</div>
              </div>
            </div>
            <button id="_ranked_team_info_close" class="vth-btn vth-btn-ghost vth-btn-icon" title="${trEsc('team.infoClose', 'Fermer')}">
              <i class="fa-solid fa-xmark" style="font-size:12px;"></i>
            </button>
          </div>

          <div class="vth-info-grid">
            <div class="vth-info-cell">
              <div class="vth-label">${trEsc('team.infoRank', 'Rang')}</div>
              <div class="vth-info-value">${rank ? `#${rank}` : '—'}</div>
            </div>
            <div class="vth-info-cell">
              <div class="vth-label">${trEsc('team.members', 'Membres')}</div>
              <div class="vth-info-value">${esc(memberCount)}</div>
            </div>
            <div class="vth-info-cell">
              <div class="vth-label">${trEsc('team.avgShort', 'Moy.')}</div>
              <div class="vth-info-value">${esc(fmtDuration(team.avg_score || 0))}</div>
            </div>
            <div class="vth-info-cell">
              <div class="vth-label">${trEsc('team.infoTotal', 'Temps total')}</div>
              <div class="vth-info-value">${esc(fmtDuration(team.total_score || 0))}</div>
            </div>
          </div>

          ${team.description ? `
            <div class="vth-meta" style="margin-top:10px;padding:10px;border-radius:var(--radius);background:var(--bg-input);border:1px solid var(--border);line-height:1.55;">
              ${esc(team.description)}
            </div>` : ''}

          <div style="margin-top:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
              <div class="vth-label">${trEsc('team.infoMembers', 'Membres et temps')}</div>
              <span class="vth-badge vth-badge-brand">${esc(memberCount)}</span>
            </div>
            <div id="_ranked_team_members" class="vth-card" style="overflow:hidden;max-height:230px;overflow-y:auto;">
              <div class="vth-meta" style="padding:12px;text-align:center;">${trEsc('team.infoMembersLoading', 'Chargement des membres…')}</div>
            </div>
          </div>

          ${(!_myTeamData && teamId) ? `
            <button id="_ranked_team_join_btn" class="vth-btn vth-btn-primary vth-btn-sm" style="width:100%;margin-top:12px;" data-id="${esc(teamId)}">
              <i class="fa-solid fa-plus"></i> ${trEsc('team.join', 'Rejoindre')}
            </button>` : ''}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#_ranked_team_info_close')?.addEventListener('click', close);
    overlay.querySelector('#_ranked_team_join_btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const id = btn.dataset.id;
      if (!id) return;
      btn.disabled = true;
      const res = await bg('requestToJoinTeam', { teamId: id });
      toast(res.success ? tr('team.requestSent', 'Demande envoyée !') : ` ${res.error}`);
      if (res.success) close();
      else btn.disabled = false;
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const membersEl = overlay.querySelector('#_ranked_team_members');
    if (!teamId) {
      if (membersEl) membersEl.innerHTML = `<div class="vth-meta" style="padding:12px;text-align:center;">${trEsc('team.invalidTeamId', 'Team invalide.')}</div>`;
      return;
    }

    bg('getTeamInternalRanking', { teamId }).then((res) => {
      if (!membersEl || !document.body.contains(overlay)) return;
      if (!res?.success) {
        membersEl.innerHTML = `<div class="vth-meta" style="padding:12px;text-align:center;">${trEsc('team.infoMembersError', 'Impossible de charger les membres.')}</div>`;
        return;
      }
      const members = Array.isArray(res.members) ? res.members : [];
      if (!members.length) {
        membersEl.innerHTML = `<div class="vth-meta" style="padding:12px;text-align:center;">${trEsc('team.infoMembersEmpty', 'Aucun membre.')}</div>`;
        return;
      }
      membersEl.innerHTML = members.map((m, i) => {
        const u = m.users || {};
        const pseudo = u.pseudo || tr('chat.anonymous', 'Anonyme');
        const initials = esc((pseudo || '?')[0].toUpperCase());
        const picUrl = isSafeMediaUrl(u.profilePic) ? esc(u.profilePic) : '';
        const bestScore = Number(m.best_score || 0) || 0;
        const isLast = i === members.length - 1;
        return `
          <div class="vth-row" style="padding:10px 12px;${isLast ? '' : 'border-bottom:1px solid var(--border);'}">
            <div class="vth-av" style="width:30px;height:30px;font-size:11px;font-weight:900;color:var(--brand);">
              ${picUrl ? `<img src="${picUrl}" style="width:100%;height:100%;object-fit:cover;" alt="">` : initials}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;font-weight:800;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderBadgeHTML(u.grade) : ''}
                <span style="${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderPseudoStyle(u.grade, u.grade_color, u) : ''}">${esc(pseudo)}</span>
              </div>
              <div class="vth-meta">${esc(roleLabel(m.role))} · ${trEsc('team.levelShort', 'Niv.')} ${esc(u.userLevel || 1)} · ${trEsc('team.joinedAt', 'Rejoint')} ${fmtTime(m.joined_at)}</div>
            </div>
            <div style="font-size:12px;color:var(--brand);font-weight:900;flex-shrink:0;">
              ${bestScore > 0 ? esc(fmtDuration(bestScore)) : '—'}
            </div>
          </div>`;
      }).join('');
    }).catch(() => {
      if (membersEl && document.body.contains(overlay)) {
        membersEl.innerHTML = `<div class="vth-meta" style="padding:12px;text-align:center;">${trEsc('team.infoMembersError', 'Impossible de charger les membres.')}</div>`;
      }
    });
  }

  async function _renderTeamRanking(el) {
    el.innerHTML = spinnerHTML(tr('leaderboard.loading', 'Chargement du classement…'));
    const res = await bg('getTeamLeaderboard');

    if (!res.success) {
      el.innerHTML = `
        <div class="vth-empty">
          <i class="fa-solid fa-triangle-exclamation"></i>${trEsc('leaderboard.error', 'Erreur de chargement.')} ${esc(res.error || '')}
        </div>`;
      return;
    }

    const teams = res.teams || [];

    // Team du joueur hors top
    let myTeamRow = '';
    if (_myTeamData) {
      const isInTop = teams.some(t => (t.team_id || t.id) === _myTeamData.id);
      if (!isInTop) {
        const myT = _myTeamData;
        myTeamRow = `
          <div style="
            margin-top:10px;padding:12px 14px;border-radius:var(--radius);
            background:var(--brand-dim,rgba(193,127,89,.08));
            border:1px dashed var(--border);">
            <div class="vth-label" style="margin-bottom:8px;color:var(--brand);">${trEsc('team.yourTeam', 'Votre équipe')}</div>
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="vth-team-icon" style="width:32px;height:32px;">
                ${renderIcon(myT.icon, '18px')}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;color:var(--t1);font-weight:700;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${esc(myT.name)} <span class="vth-tag">[${esc(myT.tag)}]</span>
                </div>
                <div class="vth-meta">${myT.team_members?.length || 0} ${trEsc('team.members', 'membres')} · ${trEsc('team.avgShort', 'Moy.')} ${fmtDuration(myT.avg_score || 0)}</div>
              </div>
              <div style="font-size:13px;color:var(--brand);font-weight:800;">${fmtDuration(myT.total_score || 0)}</div>
            </div>
          </div>`;
      }
    }

    if (!teams.length) {
      el.innerHTML = `
        <div class="vth-empty"><i class="fa-solid fa-trophy"></i>${trEsc('team.noRanked', 'Aucune équipe classée pour le moment.')}</div>
        ${myTeamRow}`;
      return;
    }

    const rankColors = ['vth-rank-gold', 'vth-rank-silver', 'vth-rank-bronze'];

    el.innerHTML = `
      <div class="vth-card" style="overflow:hidden;">
        ${teams.map((t, i) => {
      const teamId = t.team_id || t.id || '';
      const isMe = _myTeamData && teamId === _myTeamData.id;
      const isLast = i === teams.length - 1;
      return `
            <div class="vth-row" style="
              ${!isLast ? 'border-bottom:1px solid var(--border);' : ''}
              ${isMe ? 'background:var(--brand-dim,rgba(193,127,89,.06));' : ''}
            ">
              <div class="${i < 3 ? rankColors[i] : ''}" style="
                width:22px;text-align:center;flex-shrink:0;
                font-size:${i < 3 ? 14 : 12}px;font-weight:800;
                color:${i >= 3 ? 'var(--t3)' : ''};
              ">${i + 1}</div>
              <div class="vth-team-icon" style="width:32px;height:32px;">
                ${renderIcon(t.icon, '18px')}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;
                  color:${isMe ? 'var(--brand)' : 'var(--t1)'};
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                  display:flex;align-items:center;gap:5px;">
                  ${esc(t.name)} <span class="vth-tag">[${esc(t.tag)}]</span>
                </div>
                <div class="vth-meta">${t.member_count ?? '?'} ${trEsc('team.members', 'membres')} · ${trEsc('team.avgShort', 'Moy.')} ${fmtDuration(t.avg_score)}</div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                <span style="font-size:12px;color:var(--brand);font-weight:800;">${fmtDuration(t.total_score)}</span>
                <button class="btn-team-info vth-btn vth-btn-ghost vth-btn-xs" data-index="${i}" title="${trEsc('team.infoButton', 'Infos')}">
                  <i class="fa-solid fa-circle-info"></i> ${trEsc('team.infoButton', 'Infos')}
                </button>
                ${!_myTeamData ? `
                  <button class="btn-request-join vth-btn vth-btn-ghost vth-btn-xs" data-id="${esc(teamId)}">
                    <i class="fa-solid fa-user-plus"></i> ${trEsc('team.join', 'Rejoindre')}
                  </button>` : ''}
              </div>
            </div>`;
    }).join('')}
      </div>
      ${myTeamRow}`;

    el.querySelectorAll('.btn-team-info').forEach(b => {
      b.addEventListener('click', () => {
        const idx = Number(b.dataset.index);
        _showRankedTeamInfoModal(teams[idx], Number.isFinite(idx) ? idx + 1 : null);
      });
    });

    el.querySelectorAll('.btn-request-join').forEach(b => {
      b.addEventListener('click', async () => {
        const teamId = b.dataset.id;
        if (!teamId) { toast(tr('team.invalidTeamId', 'Team invalide.')); return; }
        b.disabled = true; b.style.opacity = '.5';
        const res = await bg('requestToJoinTeam', { teamId });
        if (res.success) toast(tr('team.requestSent', 'Demande envoyée !'));
        else toast(` ${res.error}`);
        b.style.opacity = '1'; b.disabled = false;
      });
    });
  }

  // ─── Vue "dans une team" ────────────────────────────────────

  function _renderTeamView(wrapper, team, myRole) {
    team = team || {};
    const members = Array.isArray(team.team_members) ? team.team_members : [];
    const cnt = members.length;
    const maxMembers = Math.max(1, Number(team.max_members || 5) || 5);
    const isFull = cnt >= maxMembers;
    const capPct = Math.min(100, Math.round((cnt / maxMembers) * 100));

    wrapper.innerHTML = `
      <div class="vth">
        <!-- ── Header team ────────────────────── -->
        <div class="vth-card" style="padding:16px 18px;margin-bottom:12px;">
          <!-- Infos + icône -->
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
            <div class="vth-team-icon" style="width:46px;height:46px;border-radius:12px;">
              ${renderIcon(team.icon, '26px')}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:800;color:var(--t1);
                display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${esc(team.name)}
                <span class="vth-tag">[${esc(team.tag)}]</span>
              </div>
              <div style="display:flex;align-items:center;gap:5px;margin-top:3px;">
                ${roleIcon(myRole)}
                <span class="vth-meta" style="font-weight:600;">${roleLabel(myRole)}</span>
                <span class="vth-meta" style="opacity:.4;">·</span>
                <span class="vth-meta">${cnt}/${maxMembers} ${trEsc('team.members', 'membres')}</span>
              </div>
            </div>
          </div>

          <!-- Barre capacité -->
          <div class="vth-bar" style="margin-bottom:14px;">
            <div class="vth-bar-fill ${isFull ? 'vth-bar-red' : 'vth-bar-brand'}" style="width:${capPct}%;"></div>
          </div>

          <!-- Actions -->
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${(myRole === 'owner' || myRole === 'officer') ? `
              <button id="team-invite-btn" class="vth-btn vth-btn-primary vth-btn-sm" style="flex:1;">
                <i class="fa-solid fa-user-plus"></i> ${trEsc('team.invite', 'Inviter')}
              </button>
            ` : ''}
            ${myRole === 'owner' ? `
              <button id="team-buy-slots-btn" class="vth-btn vth-btn-ghost vth-btn-sm" style="flex:1;">
                <i class="fa-solid fa-circle-plus"></i> ${trEsc('team.buySlotsShort', '+5 Places')}
              </button>
            ` : ''}
            <button id="team-leave-btn" class="vth-btn vth-btn-danger vth-btn-sm">
              <i class="fa-solid fa-right-from-bracket"></i>
              ${myRole === 'owner' && cnt === 1 ? trEsc('team.dissolve', 'Dissoudre') : trEsc('team.leave', 'Quitter')}
            </button>
          </div>
        </div>

        <!-- ── Tabs internes ─────────────────── -->
        <div class="vth-tabs" style="margin-bottom:12px;">
          ${[
        { id: 'members', label: tr('team.inner.members', 'Membres'), icon: 'fa-users' },
        { id: 'chat', label: tr('team.inner.chat', 'Chat'), icon: 'fa-comments' },
        { id: 'ranking', label: tr('team.inner.ranking', 'Classement'), icon: 'fa-trophy' },
        { id: 'war', label: tr('team.inner.war', 'Guerre'), icon: 'fa-shield-halved' },
        { id: 'bank', label: tr('team.inner.bank', 'Banque'), icon: 'fa-vault' },
        { id: 'dailies', label: tr('team.inner.dailies', 'Défis'), icon: 'fa-flag-checkered' },
      ].map((t, i) => `
            <button data-team-tab="${t.id}" class="vth-tab team-inner-tab ${i === 0 ? 'active' : ''}">
              <i class="fa-solid ${t.icon}"></i>${t.label}
            </button>
          `).join('')}
        </div>

        <div id="team-inner-content"></div>
      </div>
    `;

    document.getElementById('team-invite-btn')?.addEventListener('click', _showInviteModal);
    document.getElementById('team-buy-slots-btn')?.addEventListener('click', _buySlots);
    document.getElementById('team-leave-btn')?.addEventListener('click', _leaveTeam);

    wrapper.querySelectorAll('.team-inner-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        wrapper.querySelectorAll('.team-inner-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _renderTeamInnerTab(btn.dataset.teamTab);
      });
    });

    _renderTeamInnerTab('members');
  }

  async function _renderTeamInnerTab(tab) {
    const el = document.getElementById('team-inner-content');
    if (!el || !_myTeamData) return;
    if (tab !== 'chat') _stopTeamChatPolling();

    if (tab === 'members') await _renderTeamMembers(el);
    else if (tab === 'chat') _renderTeamChat(el);
    else if (tab === 'ranking') await _renderTeamInternalRanking(el);
    else if (tab === 'war') await _renderTeamWarTab(el);
    else if (tab === 'bank') await _renderTeamBankTab(el);
    else if (tab === 'dailies') await _renderTeamDailyChallengesTab(el);
  }

  // ══════════════════════════════════════════════════════════
  //  Wave 5 — Feature 6: DÉFIS QUOTIDIENS D'ÉQUIPE
  // ══════════════════════════════════════════════════════════

  async function _renderTeamDailyChallengesTab(el) {
    if (!el || !_myTeamData) return;
    el.innerHTML = spinnerHTML(tr('team.dailies.loading', 'Chargement des défis…'));

    const teamId = _myTeamData.id || _myTeamData.team_id;

    let res;
    try {
      res = await bg('getTeamDailyChallenges', { teamId });
    } catch (_) {
      res = null;
    }

    el.innerHTML = '';

    const challenges = res?.data || res?.challenges || [];
    if (!Array.isArray(challenges) || !challenges.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:24px;color:' + V.t3 + ';font-size:12px;';
      empty.textContent = tr('team.dailies.empty', 'Les défis du jour seront générés demain.');
      el.appendChild(empty);
      return;
    }

    challenges.forEach(ch => {
      const card = document.createElement('div');
      card.style.cssText = 'background:' + V.bg1 + ';border:1px solid ' + V.border + ';border-radius:10px;padding:12px;margin-bottom:10px;';

      // Title row
      const titleRow = document.createElement('div');
      titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';
      const titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-weight:700;font-size:13px;color:' + V.t1 + ';';
      titleEl.textContent = esc(ch.description || ch.challenge_type || '');
      titleRow.appendChild(titleEl);
      if (ch.completed_at) {
        const doneBadge = document.createElement('span');
        doneBadge.style.cssText = 'font-size:11px;color:' + V.green + ';font-weight:600;';
        doneBadge.textContent = '✅ ' + tr('team.dailies.done', 'Complété');
        titleRow.appendChild(doneBadge);
      }
      card.appendChild(titleRow);

      // Progress bar
      const pct = ch.target_value > 0
        ? Math.min(100, Math.round((ch.current_value / ch.target_value) * 100))
        : (ch.completed_at ? 100 : 0);
      const barWrap = document.createElement('div');
      barWrap.style.cssText = 'background:' + V.bg2 + ';border-radius:4px;height:5px;overflow:hidden;margin-bottom:6px;';
      const barFill = document.createElement('div');
      barFill.style.cssText = 'height:100%;border-radius:4px;background:' + V.brand + ';width:' + pct + '%;transition:width 0.4s;';
      barWrap.appendChild(barFill);
      card.appendChild(barWrap);

      // Meta row
      const meta = document.createElement('div');
      meta.style.cssText = 'font-size:11px;color:' + V.t3 + ';display:flex;justify-content:space-between;';
      const progress = document.createElement('span');
      progress.textContent = ch.target_value > 0
        ? `${ch.current_value || 0} / ${ch.target_value}`
        : (ch.completed_at ? tr('team.dailies.done', 'Complété') : tr('team.dailies.pending', 'En cours'));
      const reward = document.createElement('span');
      reward.style.color = V.amber;
      reward.style.fontWeight = '700';
      reward.textContent = `+${ch.reward_credits || 0} ⚡`;
      meta.appendChild(progress);
      meta.appendChild(reward);
      card.appendChild(meta);

      el.appendChild(card);
    });
  }

  // ══════════════════════════════════════════════════════════
  //  GUERRE D'ÉQUIPES HEBDOMADAIRE + ACHIEVEMENTS
  // ══════════════════════════════════════════════════════════

  async function _renderTeamWarTab(el) {
    if (!el || !_myTeamData) return;
    el.innerHTML = spinnerHTML(tr('team.war.loading', 'Chargement de la guerre…'));

    const teamId = _myTeamData.id || _myTeamData.team_id;

    const [warRes, achRes] = await Promise.all([
      bg('getTeamWar', { teamId }),
      bg('getTeamAchievements', { teamId })
    ]);

    // ── helpers ──────────────────────────────────────────────
    const daysLeft = (dateStr) => {
      if (!dateStr) return null;
      const diff = new Date(dateStr) - Date.now();
      if (diff <= 0) return 0;
      return Math.ceil(diff / 86400000);
    };

    const myTeamName = esc(_myTeamData.name || 'Mon équipe');
    const myTeamTag  = _myTeamData.tag ? `[${esc(_myTeamData.tag)}]` : '';

    // ── Guerre widget ─────────────────────────────────────────
    let warHTML = '';
    if (!warRes || !warRes.success || !warRes.war) {
      warHTML = `
        <div class="vth-card" style="text-align:center;padding:20px 16px;">
          <div style="font-size:26px;margin-bottom:8px;">⚔️</div>
          <div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:4px;">
            ${trEsc('team.war.noWar', 'Aucune guerre active cette semaine')}
          </div>
          <div style="font-size:11px;color:var(--t3);">
            ${trEsc('team.war.noWarHint', 'Les guerres sont lancées par les administrateurs chaque semaine.')}
          </div>
        </div>`;
    } else {
      const war = warRes.war;
      const isA     = war.team_a_id === teamId;
      const myScore = isA ? (war.team_a_score || 0) : (war.team_b_score || 0);
      const opScore = isA ? (war.team_b_score || 0) : (war.team_a_score || 0);
      const total   = myScore + opScore;
      const myPct   = total > 0 ? Math.round((myScore / total) * 100) : 50;
      const opPct   = 100 - myPct;

      const opTeam  = war.opponent || {};
      const opName  = esc(opTeam.name || tr('team.unknown', 'Équipe inconnue'));
      const opTag   = opTeam.tag ? `[${esc(opTeam.tag)}]` : '';

      const weekEnd  = new Date(war.week_start);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const left = daysLeft(weekEnd.toISOString());
      const leftLabel = left === null ? '' : left === 0
        ? tr('team.war.endsToday', 'Se termine aujourd\'hui')
        : tr('team.war.daysLeft', '{n} jour(s) restant(s)', { n: left });

      const leading = myScore > opScore ? '🟢' : myScore < opScore ? '🔴' : '🟡';

      warHTML = `
        <div class="vth-card" style="padding:16px 18px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div style="font-size:13px;font-weight:800;color:var(--t1);">
              ⚔️ ${trEsc('team.war.title', 'Guerre de la semaine')}
            </div>
            <div style="font-size:10px;color:var(--t3);">${esc(leftLabel)}</div>
          </div>

          <!-- Équipes + scores -->
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;">
            <div style="text-align:center;flex:1;min-width:0;">
              <div style="font-size:11px;font-weight:700;color:var(--brand);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${myTeamName} <span class="vth-tag" style="font-size:9px;">${myTeamTag}</span>
              </div>
              <div style="font-size:28px;font-weight:900;color:var(--t1);line-height:1.2;">${esc(String(myScore))}</div>
              <div style="font-size:10px;color:var(--t3);">${trEsc('team.war.runs', 'runs')}</div>
            </div>
            <div style="font-size:18px;color:var(--t3);">${leading}</div>
            <div style="text-align:center;flex:1;min-width:0;">
              <div style="font-size:11px;font-weight:700;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${opName} <span class="vth-tag" style="font-size:9px;">${opTag}</span>
              </div>
              <div style="font-size:28px;font-weight:900;color:var(--t1);line-height:1.2;">${esc(String(opScore))}</div>
              <div style="font-size:10px;color:var(--t3);">${trEsc('team.war.runs', 'runs')}</div>
            </div>
          </div>

          <!-- Barre de progression bipartite -->
          <div style="height:8px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,0.06);display:flex;gap:2px;">
            <div style="width:${myPct}%;background:var(--brand);border-radius:99px 0 0 99px;transition:width .4s;"></div>
            <div style="width:${opPct}%;background:rgba(255,80,80,0.55);border-radius:0 99px 99px 0;transition:width .4s;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;">
            <span style="font-size:10px;color:var(--t3);">${myPct}%</span>
            <span style="font-size:10px;color:var(--t3);">${opPct}%</span>
          </div>
        </div>`;
    }

    // ── Achievements widget ───────────────────────────────────
    const achievements = (achRes && achRes.success && Array.isArray(achRes.achievements))
      ? achRes.achievements : [];

    const lastUnlocked = achievements.filter(a => a.unlocked).sort((a, b) =>
      (b.unlocked_at || '').localeCompare(a.unlocked_at || ''))[0] || null;

    const achCards = achievements.map(a => {
      const locked = !a.unlocked;
      return `
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;
          background:${locked ? 'rgba(255,255,255,0.03)' : 'rgba(193,127,89,0.1)'};
          border:1px solid ${locked ? 'rgba(255,255,255,0.06)' : 'rgba(193,127,89,0.3)'};
          border-radius:10px;padding:10px 6px;opacity:${locked ? '0.5' : '1'};
          filter:${locked ? 'grayscale(1)' : 'none'};transition:opacity .2s;">
          <div style="font-size:22px;margin-bottom:4px;">${esc(a.icon || '🏆')}</div>
          <div style="font-size:10px;font-weight:700;color:var(--t1);margin-bottom:2px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:72px;"
            title="${esc(currentLocale() === 'en' ? a.label_en : a.label_fr)}">
            ${esc(currentLocale() === 'en' ? a.label_en : a.label_fr)}
          </div>
          ${!locked ? `<div style="font-size:9px;color:var(--success);">✔ ${trEsc('team.ach.unlocked', 'Débloqué')}</div>` : ''}
        </div>`;
    }).join('');

    const achSection = `
      <div class="vth-card" style="padding:16px 18px;">
        <div style="font-size:13px;font-weight:800;color:var(--t1);margin-bottom:${lastUnlocked ? '8px' : '12px'};">
          🏆 ${trEsc('team.ach.title', 'Achievements d\'équipe')}
        </div>
        ${lastUnlocked ? `
        <div style="background:rgba(193,127,89,0.12);border:1px solid rgba(193,127,89,0.3);
          border-radius:10px;padding:8px 12px;margin-bottom:12px;
          display:flex;align-items:center;gap:10px;">
          <span style="font-size:20px;">${esc(lastUnlocked.icon || '🏆')}</span>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--brand);">
              ${trEsc('team.ach.latest', 'Dernier débloqué')}
            </div>
            <div style="font-size:12px;color:var(--t1);">
              ${esc(currentLocale() === 'en' ? lastUnlocked.label_en : lastUnlocked.label_fr)}
            </div>
          </div>
        </div>` : ''}
        ${achievements.length === 0
          ? `<div style="text-align:center;padding:12px;color:var(--t3);font-size:11px;">
               ${trEsc('team.ach.none', 'Aucun achievement disponible.')}
             </div>`
          : `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">${achCards}</div>`
        }
        <div style="margin-top:10px;font-size:10px;color:var(--t3);text-align:center;">
          ${achievements.filter(a => a.unlocked).length}/${achievements.length} ${trEsc('team.ach.unlocked', 'débloqués')}
        </div>
      </div>`;

    el.innerHTML = warHTML + achSection;
  }

  // ══════════════════════════════════════════════════════════
  //  ONGLET BANQUE D'ÉQUIPE
  // ══════════════════════════════════════════════════════════
  async function _renderTeamBankTab(el) {
    if (!el || !_myTeamData) return;
    const teamId = _myTeamData.id || _myTeamData.team_id;
    const myRole = _myTeamRole || 'member';
    const members = Array.isArray(_myTeamData.team_members) ? _myTeamData.team_members : [];

    el.innerHTML = spinnerHTML(tr('team.bank.loading', 'Chargement de la banque…'));

    const res = await bg('getTeamBank', { teamId });
    if (!res || !res.success) {
      el.innerHTML = `<div class="vth-card" style="text-align:center;padding:20px 16px;color:var(--t3);font-size:12px;">
        <div style="font-size:24px;margin-bottom:8px;">🏦</div>
        ${esc(res?.error === 'not_team_member' ? tr('team.bank.notMember', 'Accès réservé aux membres.') : tr('team.bank.error', 'Impossible de charger la banque.'))}
      </div>`;
      return;
    }

    const balance = Number(res.balance || 0);
    const transactions = Array.isArray(res.transactions) ? res.transactions : [];

    // ── Helpers ──────────────────────────────────────────────
    const fmtDate = (iso) => {
      try {
        return new Date(iso).toLocaleDateString(currentLocale(), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      } catch (_) { return ''; }
    };

    const txnTypeLabel = (type) => {
      if (type === 'deposit') return `<span style="color:#4a8c6f;font-weight:700;">+${tr('team.bank.deposit', 'Dépôt')}</span>`;
      if (type === 'withdrawal') return `<span style="color:#c45c5c;font-weight:700;">−${tr('team.bank.withdrawal', 'Retrait')}</span>`;
      return `<span style="color:#8b7cf6;font-weight:700;">${tr('team.bank.reward', 'Récompense')}</span>`;
    };

    const txnAmountStyle = (type) => type === 'deposit' ? 'color:#4a8c6f;' : type === 'withdrawal' ? 'color:#c45c5c;' : 'color:#8b7cf6;';
    const txnSign = (type) => type === 'deposit' ? '+' : type === 'withdrawal' ? '−' : '+';

    // ── Historique ────────────────────────────────────────────
    const txnRows = transactions.length === 0
      ? `<div style="text-align:center;padding:16px;color:var(--t3);font-size:11px;">
          ${trEsc('team.bank.noTxn', 'Aucune transaction encore.')}
         </div>`
      : transactions.map(t => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:1px;">
              ${txnTypeLabel(t.type)}
              <span style="font-size:10px;color:var(--t3);">${esc(t.pseudo || 'Anonyme')}</span>
            </div>
            ${t.note ? `<div style="font-size:10px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;" title="${esc(t.note)}">${esc(t.note)}</div>` : ''}
            <div style="font-size:9px;color:var(--t3);margin-top:1px;">${esc(fmtDate(t.created_at))}</div>
          </div>
          <div style="font-size:14px;font-weight:800;${txnAmountStyle(t.type)}white-space:nowrap;">
            ${txnSign(t.type)}${esc(String(t.amount))} <span style="font-size:10px;font-weight:500;opacity:.7;">⚡</span>
          </div>
        </div>`).join('');

    // ── HTML principal ────────────────────────────────────────
    el.innerHTML = `
      <div id="vth-bank-root">
        <!-- Solde central -->
        <div class="vth-card" style="text-align:center;padding:20px 18px;margin-bottom:10px;
          background:linear-gradient(145deg,rgba(193,127,89,0.12),rgba(139,92,246,0.06));
          border:1px solid rgba(193,127,89,0.25);">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);font-weight:700;margin-bottom:6px;">
            ${trEsc('team.bank.balance', 'Solde de la banque')}
          </div>
          <div id="vth-bank-balance" style="font-size:42px;font-weight:900;color:var(--t1);line-height:1;letter-spacing:-1px;">
            ${esc(balance.toLocaleString())}
          </div>
          <div style="font-size:13px;color:var(--brand);margin-top:4px;font-weight:600;">⚡ ${trEsc('team.bank.credits', 'crédits')}</div>
        </div>

        <!-- Formulaire dépôt -->
        <div class="vth-card" style="padding:14px 18px;margin-bottom:10px;">
          <div style="font-size:12px;font-weight:800;color:var(--t1);margin-bottom:10px;">
            <i class="fa-solid fa-arrow-down" style="color:#4a8c6f;margin-right:5px;"></i>${trEsc('team.bank.depositTitle', 'Déposer dans la banque')}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <input id="vth-bank-amount" type="number" min="1" max="10000" placeholder="${trEsc('team.bank.amountPlaceholder', 'Montant (1–10000)')}"
              style="flex:2;min-width:80px;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border);
              border-radius:8px;color:var(--t1);font-size:12px;outline:none;font-family:inherit;" />
            <input id="vth-bank-note" type="text" maxlength="200" placeholder="${trEsc('team.bank.notePlaceholder', 'Note (optionnel)')}"
              style="flex:3;min-width:100px;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border);
              border-radius:8px;color:var(--t1);font-size:12px;outline:none;font-family:inherit;" />
            <button id="vth-bank-deposit-btn" class="vth-btn vth-btn-primary vth-btn-sm" style="flex:0 0 auto;">
              <i class="fa-solid fa-plus"></i> ${trEsc('team.bank.depositBtn', 'Déposer')}
            </button>
          </div>
          <div id="vth-bank-deposit-feedback" style="font-size:11px;margin-top:6px;min-height:16px;"></div>
        </div>

        ${(myRole === 'owner' || myRole === 'captain') ? `
        <!-- Formulaire retrait (capitaine seulement) -->
        <div class="vth-card" style="padding:14px 18px;margin-bottom:10px;border:1px solid rgba(196,92,92,0.2);">
          <div style="font-size:12px;font-weight:800;color:var(--t1);margin-bottom:10px;">
            <i class="fa-solid fa-arrow-up" style="color:#c45c5c;margin-right:5px;"></i>${trEsc('team.bank.withdrawTitle', 'Retirer (capitaine)')}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <select id="vth-bank-withdraw-target"
              style="flex:2;min-width:100px;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border);
              border-radius:8px;color:var(--t1);font-size:11px;outline:none;font-family:inherit;">
              ${members.map(m => `<option value="${esc(m.user_id)}">${esc(m.users?.pseudo || m.user_id)}</option>`).join('')}
            </select>
            <input id="vth-bank-withdraw-amount" type="number" min="1" max="${esc(String(balance))}" placeholder="${trEsc('team.bank.amountPlaceholder', 'Montant')}"
              style="flex:1;min-width:60px;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border);
              border-radius:8px;color:var(--t1);font-size:12px;outline:none;font-family:inherit;" />
            <button id="vth-bank-withdraw-btn" class="vth-btn vth-btn-danger vth-btn-sm" style="flex:0 0 auto;">
              <i class="fa-solid fa-minus"></i> ${trEsc('team.bank.withdrawBtn', 'Retirer')}
            </button>
          </div>
          <div id="vth-bank-withdraw-feedback" style="font-size:11px;margin-top:6px;min-height:16px;"></div>
        </div>` : ''}

        <!-- Historique -->
        <div class="vth-card" style="padding:14px 18px;">
          <div style="font-size:12px;font-weight:800;color:var(--t1);margin-bottom:10px;">
            <i class="fa-solid fa-clock-rotate-left" style="color:var(--t3);margin-right:5px;"></i>${trEsc('team.bank.history', 'Dernières transactions')}
          </div>
          <div id="vth-bank-txn-list">${txnRows}</div>
        </div>
      </div>`;

    // ── Dépôt ─────────────────────────────────────────────────
    document.getElementById('vth-bank-deposit-btn')?.addEventListener('click', async () => {
      const amtInput = /** @type {HTMLInputElement|null} */ (document.getElementById('vth-bank-amount'));
      const noteInput = /** @type {HTMLInputElement|null} */ (document.getElementById('vth-bank-note'));
      const fb = document.getElementById('vth-bank-deposit-feedback');
      const btn = document.getElementById('vth-bank-deposit-btn');
      if (!amtInput || !fb || !btn) return;

      const amount = parseInt(amtInput.value, 10);
      if (!amount || amount < 1 || amount > 10000) {
        if (fb) { fb.textContent = tr('team.bank.errAmount', 'Montant invalide (1–10000).'); fb.style.color = '#c45c5c'; }
        return;
      }

      btn.disabled = true;
      if (fb) { fb.textContent = tr('team.bank.depositing', 'Dépôt en cours…'); fb.style.color = 'var(--t3)'; }

      const r = await bg('teamDepositCredits', { teamId, amount, note: noteInput?.value?.trim() || null });

      btn.disabled = false;
      if (r && r.success) {
        const balEl = document.getElementById('vth-bank-balance');
        if (balEl) balEl.textContent = Number(r.new_balance || 0).toLocaleString();
        if (fb) { fb.textContent = `✔ ${tr('team.bank.deposited', 'Dépôt effectué !')} (${tr('team.bank.newBalance', 'Solde')} : ${Number(r.new_balance || 0).toLocaleString()})`; fb.style.color = '#4a8c6f'; }
        if (amtInput) amtInput.value = '';
        if (noteInput) noteInput.value = '';
        // Reload the tab for fresh history
        setTimeout(() => _renderTeamBankTab(el), 1200);
      } else {
        const errMap = {
          'invalid_amount': tr('team.bank.errAmount', 'Montant invalide.'),
          'not_member': tr('team.bank.errNotMember', 'Tu n\'es pas membre de l\'équipe.'),
          'insufficient_credits': tr('team.bank.errNoCredits', 'Crédits insuffisants sur ton compte.'),
        };
        if (fb) { fb.textContent = errMap[r?.error] || esc(r?.error || tr('team.bank.errUnknown', 'Erreur inconnue.')); fb.style.color = '#c45c5c'; }
      }
    });

    // ── Retrait ───────────────────────────────────────────────
    document.getElementById('vth-bank-withdraw-btn')?.addEventListener('click', async () => {
      const targetInput = /** @type {HTMLSelectElement|null} */ (document.getElementById('vth-bank-withdraw-target'));
      const amtInput = /** @type {HTMLInputElement|null} */ (document.getElementById('vth-bank-withdraw-amount'));
      const fb = document.getElementById('vth-bank-withdraw-feedback');
      const btn = document.getElementById('vth-bank-withdraw-btn');
      if (!targetInput || !amtInput || !fb || !btn) return;

      const targetUid = targetInput.value;
      const amount = parseInt(amtInput.value, 10);
      if (!amount || amount < 1) {
        if (fb) { fb.textContent = tr('team.bank.errAmount', 'Montant invalide.'); fb.style.color = '#c45c5c'; }
        return;
      }

      btn.disabled = true;
      if (fb) { fb.textContent = tr('team.bank.withdrawing', 'Retrait en cours…'); fb.style.color = 'var(--t3)'; }

      const r = await bg('teamWithdrawCredits', { teamId, targetUid, amount });

      btn.disabled = false;
      if (r && r.success) {
        if (fb) { fb.textContent = `✔ ${tr('team.bank.withdrawn', 'Retrait effectué !')}`; fb.style.color = '#4a8c6f'; }
        if (amtInput) amtInput.value = '';
        setTimeout(() => _renderTeamBankTab(el), 1200);
      } else {
        const errMap = {
          'not_captain': tr('team.bank.errNotCaptain', 'Seul le capitaine peut retirer.'),
          'insufficient_bank': tr('team.bank.errBankLow', 'Solde de la banque insuffisant.'),
          'invalid_amount': tr('team.bank.errAmount', 'Montant invalide.'),
        };
        if (fb) { fb.textContent = errMap[r?.error] || esc(r?.error || tr('team.bank.errUnknown', 'Erreur inconnue.')); fb.style.color = '#c45c5c'; }
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  SECTION 1V1 SÉPARÉE DES TEAMS
  // ══════════════════════════════════════════════════════════

  let _duelsInitialized = false;
  let _duelRefreshTimer = null;
  let _duelLiveClockTimer = null;
  let _duelBotClaimInFlight = false;
  let _duelBotClaimedQueueKey = '';
  let _duelLatestRandomQueue = null;

  function _duelIsTextInputTarget(target) {
    try {
      return !!(target && (
        /^(INPUT|TEXTAREA|SELECT)$/i.test(target.tagName || '') ||
        target.isContentEditable ||
        target.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]')
      ));
    } catch (_) {
      return false;
    }
  }

  function _duelIsFormFieldFocused() {
    const active = document.activeElement;
    return !!(active && ['duel-target-input', 'duel-wager-input', 'duel-series-select'].includes(active.id));
  }

  function _duelCaptureFormSnapshot(root = document) {
    try {
      const active = /** @type {HTMLInputElement | null} */ (document.activeElement);
      if (!active || !root?.contains?.(active) || !['duel-target-input', 'duel-wager-input', 'duel-series-select'].includes(active.id)) return null;
      return {
        id: active.id,
        targetValue: /** @type {HTMLInputElement | null} */ (document.getElementById('duel-target-input'))?.value || '',
        wagerValue: /** @type {HTMLInputElement | null} */ (document.getElementById('duel-wager-input'))?.value || '0',
        seriesValue: /** @type {HTMLSelectElement | null} */ (document.getElementById('duel-series-select'))?.value || '1',
        start: typeof active.selectionStart === 'number' ? active.selectionStart : null,
        end: typeof active.selectionEnd === 'number' ? active.selectionEnd : null
      };
    } catch (_) {
      return null;
    }
  }

  function _duelRestoreFormSnapshot(snapshot) {
    if (!snapshot) return;
    setTimeout(() => {
      try {
        const target = /** @type {HTMLInputElement | null} */ (document.getElementById('duel-target-input'));
        const wager = /** @type {HTMLInputElement | null} */ (document.getElementById('duel-wager-input'));
        const series = /** @type {HTMLSelectElement | null} */ (document.getElementById('duel-series-select'));
        if (target && typeof snapshot.targetValue === 'string') target.value = snapshot.targetValue;
        if (wager && typeof snapshot.wagerValue === 'string') wager.value = snapshot.wagerValue;
        if (series && typeof snapshot.seriesValue === 'string') series.value = snapshot.seriesValue;
        const active = /** @type {HTMLInputElement | null} */ (document.getElementById(snapshot.id));
        if (!active) return;
        active.focus({ preventScroll: true });
        if (snapshot.start !== null && typeof active.setSelectionRange === 'function') {
          const len = String(active.value || '').length;
          active.setSelectionRange(Math.max(0, Math.min(len, snapshot.start)), Math.max(0, Math.min(len, snapshot.end ?? snapshot.start)));
        }
      } catch (_) {}
    }, 0);
  }

  function _duelQueueCreatedMs(queue) {
    const ms = new Date(queue?.created_at || queue?.createdAt || queue?.queued_at || 0).getTime();
    return ms && Number.isFinite(ms) ? ms : 0;
  }

  function _duelQueueKey(queue) {
    if (!queue) return '';
    return `${queue.created_at || queue.createdAt || ''}:${Number(queue.wager_tokens ?? queue.wager_credits ?? 0) || 0}:bo${_duelCleanSeriesWins(queue.series_wins_required ?? queue.seriesWins)}`;
  }

  function _duelCleanSeriesWins(value) {
    const wins = Math.floor(Number(value) || 1);
    return wins === 1 || wins === 2 || wins === 3 ? wins : 1;
  }

  function _duelSeriesLabel(d) {
    return `BO${_duelCleanSeriesWins(d?.series_wins_required ?? d?.seriesWins)}`;
  }

  function _duelSeriesScoreLabel(d) {
    const ch = Math.max(0, Math.floor(Number(d?.challenger_round_wins || 0) || 0));
    const op = Math.max(0, Math.floor(Number(d?.opponent_round_wins || 0) || 0));
    return `${_duelSeriesLabel(d)} · ${ch}-${op}`;
  }

  function _duelQueueSecondsRemaining(queue) {
    if (!queue) return 0;
    const createdMs = _duelQueueCreatedMs(queue);
    if (createdMs) return Math.max(0, Math.ceil((createdMs + 60000 - Date.now()) / 1000));
    const serverRemaining = Number(queue.bot_seconds_remaining);
    if (Number.isFinite(serverRemaining) && serverRemaining >= 0 && serverRemaining <= 60) return Math.ceil(serverRemaining);
    return 60;
  }

  function _duelQueueBotLabel(queue) {
    const tokens = Number(queue?.wager_tokens ?? queue?.wager_credits ?? 0) || 0;
    const series = _duelSeriesLabel(queue);
    const remaining = _duelQueueSecondsRemaining(queue);
    if (_duelBotClaimInFlight) return `Préparation adversaire · ${series} · ${tokens} tokens`;
    if (remaining <= 0) return `Adversaire prêt · ${series} · ${tokens} tokens`;
    return `Adversaire garanti dans ${remaining}s · ${series} · ${tokens} tokens`;
  }

  function _duelUpdateBotCountdownLabel() {
    const node = document.querySelector('[data-duel-bot-countdown]');
    if (node && _duelLatestRandomQueue) node.textContent = _duelQueueBotLabel(_duelLatestRandomQueue);
  }

  async function _duelClaimBotIfDue(queue, el, source = 'popup') {
    if (!queue || _duelBotClaimInFlight) return false;
    if (_duelQueueSecondsRemaining(queue) > 0) return false;
    const key = _duelQueueKey(queue);
    if (_duelBotClaimedQueueKey === key) return false;
    _duelBotClaimInFlight = true;
    _duelBotClaimedQueueKey = key;
    _duelUpdateBotCountdownLabel();
    try {
      const r = await bg('claimRandomDuelBot', {
        source,
        wagerTokens: queue?.wager_tokens ?? queue?.wager_credits ?? 0,
        seriesWins: _duelCleanSeriesWins(queue?.series_wins_required ?? queue?.seriesWins)
      });
      if (r?.success && (r.status === 'bot_active' || r.status === 'active') && r.match_id) {
        toast(tr('duel.opponentFound', 'Adversaire trouvé !'));
        _duelLatestRandomQueue = null;
        await _renderDuels(el);
        return true;
      }
      if (r?.success && (r.status === 'queued' || r.reason === 'too_early')) {
        _duelLatestRandomQueue = r.random_queue || queue;
        _duelBotClaimedQueueKey = '';
        _duelUpdateBotCountdownLabel();
        return false;
      }
      if (!r?.success) {
        _duelBotClaimedQueueKey = '';
        toast(` ${_duelErrorLabel(r?.error || r?.reason || 'bot_match_failed')}`);
      }
      return false;
    } finally {
      _duelBotClaimInFlight = false;
      _duelUpdateBotCountdownLabel();
    }
  }

  function _duelStopLiveClock() {
    if (_duelLiveClockTimer) {
      clearInterval(_duelLiveClockTimer);
      _duelLiveClockTimer = null;
    }
  }

  function _duelTickLiveClock() {
    document.querySelectorAll('[data-duel-live-start]').forEach(/** @param {Element} _node */ (_node) => {
      const node = /** @type {HTMLElement} */ (_node);
      const start = Number(node.dataset.duelLiveStart || 0);
      const base = Number(node.dataset.duelLiveBase || 0);
      const seen = Number(node.dataset.duelLiveSeen || 0);
      if (!start) return;
      const elapsed = Math.max(base, Math.floor((Date.now() - start) / 1000));
      node.textContent = fmtDuration(elapsed);
      const wrap = node.closest('[data-duel-live-wrap]');
      if (wrap && seen && Date.now() - seen > 15000) {
        wrap.setAttribute('data-duel-live-stale', '1');
        const stale = wrap.querySelector('[data-duel-live-stale-label]');
        if (stale) stale.textContent = tr('duel.signalLost', 'signal perdu');
      }
    });
  }

  function _duelStartLiveClock() {
    _duelStopLiveClock();
    _duelTickLiveClock();
    _duelLiveClockTimer = setInterval(() => {
      const section = document.getElementById('section-duels');
      if (!section || !section.classList.contains('active')) {
        _duelStopLiveClock();
        return;
      }
      _duelTickLiveClock();
    }, 1000);
  }

  function _duelStopAutoRefresh() {
    if (_duelRefreshTimer) {
      clearInterval(_duelRefreshTimer);
      _duelRefreshTimer = null;
    }
    _duelStopLiveClock();
  }

  function _duelStartAutoRefresh(el, _shouldPoll) {
    // Polling léger: ne re-render pas en boucle, met seulement à jour le compte à rebours
    // et déclenche la RPC bot quand les 60 secondes sont atteintes.
    _duelStopAutoRefresh();
    _duelStartLiveClock();
    if (!el) return;
    const tick = () => {
      const section = document.getElementById('section-duels');
      if (!section || !section.classList.contains('active')) {
        _duelStopAutoRefresh();
        return;
      }
      _duelUpdateBotCountdownLabel();
      if (_duelLatestRandomQueue) {
        _duelClaimBotIfDue(_duelLatestRandomQueue, el, 'popup_countdown').catch(() => {});
      }
    };
    tick();
    _duelRefreshTimer = setInterval(tick, 1000);
  }

  window.initDuelsSection = async function (force = false) {
    const section = document.getElementById('section-duels');
    if (!section) return;
    if (_duelsInitialized && !force) return;
    _duelsInitialized = true;

    const wrapper = getSectionWrapper(section);
    wrapper.innerHTML = spinnerHTML(tr('duel.loading', 'Chargement des 1v1…'));
    const storageRes = await storageLocalGetSafe(['id']);
    _myId = storageRes.id || null;
    await _renderDuels(wrapper);
  };

  // ─── Panneau Membres ───────────────────────────────────────

  function _showTeamMemberInfoModal(member) {
    if (!member) return;
    const u = member.users || {};
    const pseudo = u.pseudo || tr('chat.anonymous', 'Anonyme');
    const bestScore = Number(member.best_score || 0) || 0;
    const initials = esc((pseudo || '?')[0].toUpperCase());
    const picUrl = isSafeMediaUrl(u.profilePic) ? esc(u.profilePic) : '';
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:99990;
      display:flex;align-items:center;justify-content:center;padding:20px;
      animation:vth-fadein .15s ease;
    `;
    overlay.innerHTML = `
      <div class="vth-card" style="width:100%;max-width:360px;overflow:hidden;box-shadow:var(--shadow-lg);">
        <div style="padding:18px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:11px;min-width:0;">
              <div class="vth-av" style="width:42px;height:42px;font-size:14px;font-weight:900;color:var(--brand);">
                ${picUrl ? `<img src="${picUrl}" style="width:100%;height:100%;object-fit:cover;" alt="">` : initials}
              </div>
              <div style="min-width:0;">
                <div style="font-size:15px;font-weight:900;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderBadgeHTML(u.grade) : ''}
                  <span style="${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderPseudoStyle(u.grade, u.grade_color, u) : ''}">${esc(pseudo)}</span>
                </div>
                <div class="vth-meta">${roleLabel(member.role)} · ${trEsc('team.levelShort', 'Niv.')} ${esc(u.userLevel || 1)}</div>
              </div>
            </div>
            <button id="_team_member_info_close" class="vth-btn vth-btn-ghost vth-btn-icon" title="${trEsc('team.infoClose', 'Fermer')}">
              <i class="fa-solid fa-xmark" style="font-size:12px;"></i>
            </button>
          </div>

          <div class="vth-info-grid">
            <div class="vth-info-cell">
              <div class="vth-label">${trEsc('team.infoPseudo', 'Pseudo')}</div>
              <div class="vth-info-value">${esc(pseudo)}</div>
            </div>
            <div class="vth-info-cell">
              <div class="vth-label">${trEsc('team.record', 'Record')}</div>
              <div class="vth-info-value">${bestScore > 0 ? esc(fmtDuration(bestScore)) : '—'}</div>
            </div>
            <div class="vth-info-cell">
              <div class="vth-label">${trEsc('team.infoRole', 'Rôle')}</div>
              <div class="vth-info-value">${esc(roleLabel(member.role))}</div>
            </div>
            <div class="vth-info-cell">
              <div class="vth-label">${trEsc('team.joinedAt', 'Rejoint')}</div>
              <div class="vth-info-value">${esc(fmtDeadline(member.joined_at))}</div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#_team_member_info_close')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  async function _renderTeamMembers(el) {
    let requestsHtml = '';

    if (_myTeamRole === 'owner' || _myTeamRole === 'officer') {
      const r = await bg('getTeamRequests', { teamId: _myTeamData.id });
      if (r.success && r.requests?.length) {
        requestsHtml = `
          <div style="margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
              <div class="vth-label">${trEsc('team.recruitmentRequests', 'Demandes de recrutement')}</div>
              <span class="vth-badge vth-badge-brand">${r.requests.length}</span>
            </div>
            <div class="vth-card" style="overflow:hidden;">
              ${r.requests.map((req, idx) => {
          const u = req.users || {};
          return `
                  <div class="vth-row" style="${idx < r.requests.length - 1 ? 'border-bottom:1px solid var(--border);' : ''}">
                    <div class="vth-av" style="width:32px;height:32px;">
                      ${u.profilePic
              ? `<img src="${esc(u.profilePic)}" style="width:100%;height:100%;object-fit:cover;">`
              : `<i class="fa-solid fa-user" style="font-size:12px;color:var(--t3);"></i>`}
                    </div>
                    <div style="flex:1;min-width:0;">
                      <div style="font-size:12px;color:var(--t1);font-weight:700;">
                        ${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderBadgeHTML(u.grade) : ''}
                        <span style="${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderPseudoStyle(u.grade, u.grade_color, u) : ''}">
                          ${esc(u.pseudo || tr('chat.anonymous', 'Anonyme'))}
                        </span>
                      </div>
                      <div class="vth-meta">${trEsc('team.levelShort', 'Niv.')} ${u.userLevel || 1}</div>
                    </div>
                    <div style="display:flex;gap:6px;">
                      <button class="btn-handle-req vth-btn vth-btn-xs"
                        data-id="${req.id}" data-status="accepted"
                        style="background:${V.green};color:#fff;">
                        <i class="fa-solid fa-check"></i>
                      </button>
                      <button class="btn-handle-req vth-btn vth-btn-danger vth-btn-xs"
                        data-id="${req.id}" data-status="declined">
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  </div>`;
        }).join('')}
            </div>
          </div>`;
      }
    }

    let members = Array.isArray(_myTeamData.team_members) ? _myTeamData.team_members : [];
    if (!members.length && _myTeamData?.id) {
      const memberRes = await bg('getTeamMembers', { teamId: _myTeamData.id });
      if (memberRes.success && Array.isArray(memberRes.members)) {
        members = memberRes.members;
        _myTeamData.team_members = members;
      }
    }
    if (!members.length && !requestsHtml) {
      el.innerHTML = `<div class="vth-empty"><i class="fa-solid fa-users"></i>${trEsc('team.noMembers', 'Aucun membre.')}</div>`;
      return;
    }

    el.innerHTML = `
      ${requestsHtml}
      <div class="vth-card" style="overflow:hidden;">
        ${members.map((m, i) => {
      const u = m.users || {};
      const lv = u.userLevel || 1;
      const isLast = i === members.length - 1;
      const isMe = _myId && m.user_id === _myId;
      const canManage = _myTeamRole === 'owner' || (_myTeamRole === 'officer' && m.role === 'member');
      const initials = esc((u.pseudo || '?')[0].toUpperCase());
      const bestScore = Number(m.best_score || 0) || 0;
      const picUrl = isSafeMediaUrl(u.profilePic) ? esc(u.profilePic) : '';
      const pic = picUrl
        ? `<div class="vth-av" style="width:36px;height:36px;"><img src="${picUrl}" alt=""></div>`
        : `<div class="vth-av" style="
                width:36px;height:36px;font-size:13px;font-weight:800;
                background:${isMe ? 'var(--brand-dim,rgba(193,127,89,.12))' : 'var(--bg-input)'};
                color:${isMe ? 'var(--brand)' : 'var(--t3)'};">
                ${initials}
               </div>`;

      return `
            <div class="vth-row" style="${isLast ? '' : 'border-bottom:1px solid var(--border);'}">
              <div style="position:relative;flex-shrink:0;">
                ${pic}
                <span class="vth-role-chip">
                  ${roleIcon(m.role)}
                </span>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;color:var(--t1);font-weight:700;
                  display:flex;align-items:center;gap:5px;margin-bottom:2px;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderBadgeHTML(u.grade) : ''}
                  <span style="${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderPseudoStyle(u.grade, u.grade_color, u) : ''}">
                    ${esc(u.pseudo || tr('chat.anonymous', 'Anonyme'))}
                  </span>
                  ${isMe ? `<span class="vth-badge" style="background:var(--bg-input);color:var(--t3);">${trEsc('duel.you', 'Toi')}</span>` : ''}
                </div>
                <div class="vth-meta">${trEsc('team.levelShort', 'Niv.')} ${lv} · ${trEsc('team.record', 'Record')} ${bestScore > 0 ? esc(fmtDuration(bestScore)) : '—'} · ${trEsc('team.joinedAt', 'Rejoint')} ${fmtTime(m.joined_at)}</div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                <button class="member-info-btn vth-btn vth-btn-ghost vth-btn-icon"
                  data-uid="${esc(m.user_id)}" title="${trEsc('team.infoButton', 'Infos')}">
                  <i class="fa-solid fa-circle-info" style="font-size:12px;"></i>
                </button>
                ${(canManage && m.role !== 'owner') ? `
                  <button class="member-menu-btn vth-btn vth-btn-ghost vth-btn-icon"
                    data-uid="${esc(m.user_id)}" data-role="${esc(m.role)}" data-pseudo="${esc(u.pseudo)}">
                    <i class="fa-solid fa-ellipsis" style="font-size:12px;"></i>
                  </button>
                ` : ''}
              </div>
            </div>`;
    }).join('')}
      </div>
    `;

    el.querySelectorAll('.member-info-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const member = members.find(m => String(m.user_id) === String(btn.dataset.uid));
        _showTeamMemberInfoModal(member);
      });
    });

    // Menus actions membres
    el.querySelectorAll('.member-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.vth-ctx').forEach(m => m.remove());

        const targetUid = btn.dataset.uid;
        const targetRole = btn.dataset.role;
        const targetPseudo = btn.dataset.pseudo;
        const rect = btn.getBoundingClientRect();

        const ctx = document.createElement('div');
        ctx.className = 'vth-ctx';
        ctx.style.cssText = `top:${rect.bottom + 4}px;right:${window.innerWidth - rect.right}px;`;

        const actions = [];

        if (_myTeamRole === 'owner') {
          if (targetRole === 'member') {
            actions.push({
              icon: 'fa-shield-halved', label: tr('team.promoteOfficer', 'Promouvoir Officier'), color: '#5b96f5', fn: async () => {
                ctx.remove();
                const r = await bg('setTeamMemberRole', { targetUid, newRole: 'officer' });
                if (r.success) { toast(tr('team.promotedOfficer', '{name} est maintenant Officier.', { name: targetPseudo })); _refreshTeamView(); }
                else toast(` ${r.error}`);
              }
            });
          }
          if (targetRole === 'officer') {
            actions.push({
              icon: 'fa-user', label: tr('team.demoteMember', 'Rétrograder Membre'), color: 'var(--t3)', fn: async () => {
                ctx.remove();
                const r = await bg('setTeamMemberRole', { targetUid, newRole: 'member' });
                if (r.success) { toast(tr('team.demotedMember', '{name} rétrogradé.', { name: targetPseudo })); _refreshTeamView(); }
                else toast(` ${r.error}`);
              }
            });
          }
          actions.push({
            icon: 'fa-crown', label: tr('team.transferCommand', 'Transférer commandement'), color: V.amber, fn: async () => {
              ctx.remove();
              const ok = await confirmModal(
                tr('team.transferTitle', 'Transférer le commandement'),
                tr('team.transferMessage', 'Donner le rôle Capitaine à {name} ? Tu deviendras Officier.', { name: targetPseudo }),
                tr('team.transfer', 'Transférer'), false
              );
              if (!ok) return;
              const r = await bg('transferTeamOwnership', { targetUid });
              if (r.success) {
                toast(tr('team.transferDone', 'Commandement transféré à {name}.', { name: targetPseudo }));
                _teamsInitialized = false;
                window.initTeamsSection(true);
              } else toast(` ${r.error}`);
            }
          });
          // Séparateur visuel avant "Expulser"
          actions.push({ _sep: true });
        }

        actions.push({
          icon: 'fa-user-xmark', label: tr('team.kick', 'Expulser'), color: 'var(--danger)', fn: async () => {
            ctx.remove();
            const ok = await confirmModal(tr('team.kickTitle', 'Expulser un membre'), tr('team.kickMessage', 'Expulser {name} de la team ?', { name: targetPseudo }), tr('team.kick', 'Expulser'), true);
            if (!ok) return;
            const r = await bg('kickTeamMember', { targetUid });
            if (r.success) { toast(tr('team.kicked', '{name} expulsé.', { name: targetPseudo })); _refreshTeamView(); }
            else toast(` ${r.error}`);
          }
        });

        ctx.innerHTML = actions.map(a => a._sep
          ? `<div class="vth-ctx-sep"></div>`
          : `<button class="vth-ctx-item" style="color:${a.color};">
               <i class="fa-solid ${a.icon}"></i>${esc(a.label)}
             </button>`
        ).join('');

        const realActions = actions.filter(a => !a._sep);
        ctx.querySelectorAll('.vth-ctx-item').forEach((item, i) => {
          item.addEventListener('click', realActions[i].fn);
        });

        document.body.appendChild(ctx);
        setTimeout(() => document.addEventListener('click', () => ctx.remove(), { once: true }), 50);
      });
    });

    el.querySelectorAll('.btn-handle-req').forEach(b => {
      b.addEventListener('click', async () => {
        const requestId = b.dataset.id;
        const status = b.dataset.status;
        b.disabled = true;
        const res = await bg('handleTeamRequest', { requestId, status });
        if (res.success) {
          toast(status === 'accepted' ? tr('team.playerAccepted', 'Joueur accepté !') : tr('team.requestDeclined', 'Demande refusée.'));
          await _refreshTeamView();
        } else {
          toast(` ${res.error}`);
          b.disabled = false;
        }
      });
    });
  }

  async function _refreshTeamView() {
    _teamsInitialized = false;
    await window.initTeamsSection(true);
  }

  // ─── Classement Interne (Dans la team) ─────────────────────

  async function _renderTeamInternalRanking(el) {
    if (!_myTeamData) return;
    el.innerHTML = spinnerHTML(tr('team.internalRankingLoading', 'Chargement du classement interne…'));

    // On utilise les données déjà présentes dans _myTeamData si possible, 
    // ou on refait une requête pour être sûr d'avoir les derniers scores.
    const res = await bg('getTeamInternalRanking', { teamId: _myTeamData.id });
    
    if (!res.success) {
      el.innerHTML = `<div class="vth-empty"><i class="fa-solid fa-triangle-exclamation"></i>${trEsc('leaderboard.error', 'Erreur de chargement.')} ${esc(res.error || '')}</div>`;
      return;
    }

    const members = res.members || [];
    if (!members.length) {
      el.innerHTML = `<div class="vth-empty"><i class="fa-solid fa-users"></i>${trEsc('team.noMembersToRank', 'Aucun membre à classer.')}</div>`;
      return;
    }

    const rankColors = ['vth-rank-gold', 'vth-rank-silver', 'vth-rank-bronze'];

    el.innerHTML = `
      <div class="vth-card" style="overflow:hidden;">
        <div style="padding:12px 16px;background:var(--bg-input);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <span class="vth-label">${trEsc('team.internalRanking', 'Classement interne')}</span>
          <span class="vth-meta" style="font-size:10px;">${trEsc('team.categoryNoCoin', 'Catégorie : No Coin')}</span>
        </div>
        ${members.map((m, i) => {
          const u = m.users || {};
          const isMe = _myId && m.user_id === _myId;
          const isLast = i === members.length - 1;
          const initials = esc((u.pseudo || '?')[0].toUpperCase());
          
          return `
            <div class="vth-row" style="
              ${!isLast ? 'border-bottom:1px solid var(--border);' : ''}
              ${isMe ? 'background:var(--brand-dim,rgba(193,127,89,.06));' : ''}
            ">
              <div class="${i < 3 ? rankColors[i] : ''}" style="
                width:22px;text-align:center;flex-shrink:0;
                font-size:${i < 3 ? 14 : 12}px;font-weight:800;
                color:${i >= 3 ? 'var(--t3)' : ''};
              ">${i + 1}</div>
              
              <div class="vth-av" style="width:32px;height:32px;font-size:11px;">
                ${u.profilePic 
                  ? `<img src="${esc(u.profilePic)}" style="width:100%;height:100%;object-fit:cover;">`
                  : initials}
              </div>

              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;
                  color:${isMe ? 'var(--brand)' : 'var(--t1)'};
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                  display:flex;align-items:center;gap:5px;">
                  ${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderBadgeHTML(u.grade) : ''}
                  <span style="${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderPseudoStyle(u.grade, u.grade_color, u) : ''}">
                    ${esc(u.pseudo || tr('chat.anonymous', 'Anonyme'))}
                  </span>
                </div>
                <div class="vth-meta">${roleLabel(m.role)} · ${trEsc('team.levelShort', 'Niv.')} ${u.userLevel || 1}</div>
              </div>

              <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:13px;color:var(--brand);font-weight:800;">${fmtDuration(m.best_score)}</div>
                <div class="vth-meta" style="font-size:9px;opacity:0.6;">${trEsc('team.record', 'Record')}</div>
              </div>
            </div>`;
        }).join('')}
      </div>
      <div style="margin-top:12px;text-align:center;">
        <button id="show-global-ranking" class="vth-btn vth-btn-ghost vth-btn-sm" style="width:100%;">
          <i class="fa-solid fa-earth-americas"></i> Voir le classement mondial
        </button>
      </div>
    `;

    document.getElementById('show-global-ranking')?.addEventListener('click', () => {
      _renderTeamRanking(el);
    });
  }

  // ─── 1v1 No-Coin ───────────────────────────────────────

  function _duelStatusLabel(status) {
    const labels = {
      pending: tr('duel.status.pending', 'En attente'),
      active: tr('duel.status.active', 'En cours'),
      completed: tr('duel.status.completed', 'Terminé'),
      declined: tr('duel.status.declined', 'Refusé'),
      cancelled: tr('duel.status.cancelled', 'Annulé'),
      expired: tr('duel.status.expired', 'Expiré')
    };
    return labels[status] || status || '—';
  }

  function _duelErrorLabel(err) {
    const labels = {
      not_logged_in: tr('duel.error.not_logged_in', 'Connecte-toi d’abord.'),
      not_authenticated: tr('duel.error.not_logged_in', 'Connecte-toi d’abord.'),
      invalid_target_pseudo: tr('duel.error.invalid_target_pseudo', 'Pseudo invalide.'),
      target_not_found: tr('duel.error.target_not_found', 'Joueur introuvable.'),
      cannot_duel_self: tr('duel.error.cannot_duel_self', 'Tu ne peux pas te défier toi-même.'),
      target_unavailable: tr('duel.error.target_unavailable', 'Ce joueur est indisponible.'),
      open_duel_exists: tr('duel.error.open_duel_exists', 'Un des deux joueurs a déjà un duel en attente ou actif.'),
      match_not_found: tr('duel.error.match_not_found', 'Duel introuvable ou déjà traité.'),
      duel_already_started: tr('duel.error.duel_already_started', 'La run a déjà commencé, annulation impossible.'),
      not_duel_challenger: tr('duel.error.not_duel_challenger', 'Seul le challenger peut annuler une invitation.'),
      not_duel_opponent: tr('duel.error.not_duel_opponent', 'Seul le joueur défié peut répondre.'),
      duel_expired: tr('duel.error.duel_expired', 'Invitation expirée.'),
      duel_abandon_failed: tr('duel.error.abandon_failed', 'Abandon impossible pour le moment.'),
      abandon_in_progress: tr('duel.error.abandon_in_progress', 'Abandon déjà en cours.'),
      duel_not_active: tr('duel.error.duel_not_active', 'Ce duel n’est pas actif.'),
      not_duel_participant: tr('duel.error.not_duel_participant', 'Tu ne participes pas à ce duel.'),
      invalid_match_id: tr('duel.error.invalid_match_id', 'Duel invalide.'),
      invalid_mode: tr('duel.error.invalid_mode', 'Mode invalide.'),
      insufficient_credits: tr('duel.error.insufficient_tokens', 'Solde de tokens insuffisant pour ce pari.'),
      insufficient_tokens: tr('duel.error.insufficient_tokens', 'Solde de tokens insuffisant pour ce pari.'),
      queue_waiting: tr('duel.error.queue_waiting', 'Recherche lancée. Tu seras matché automatiquement.'),
      run_active: tr('duel.error.run_active', 'Action 1v1 bloquée : une run est déjà en cours.'),
      banned: tr('duel.error.banned', 'Compte banni.')
    };
    return labels[err] || err || tr('duel.error.unknown', 'Erreur inconnue');
  }

  function _duelLiveForSide(d, side) {
    if (!d || !side) return null;
    return side === 'challenger' ? d.challenger_live : d.opponent_live;
  }

  function _duelLiveElapsedSeconds(live) {
    if (!live) return 0;
    const base = Math.floor(Number(live.elapsed_ms || 0) / 1000);
    const startedAt = live.run_started_at ? new Date(live.run_started_at).getTime() : 0;
    if (live.state === 'running' && startedAt && !Number.isNaN(startedAt)) {
      return Math.max(base, Math.floor((Date.now() - startedAt) / 1000));
    }
    return base;
  }

  function _duelLiveIsRunning(live) {
    return !!live && live.state === 'running';
  }

  function _duelLiveIsDead(live) {
    return !!live && ['dead', 'failed', 'opponent_dead'].includes(String(live.state || '').toLowerCase());
  }

  function _duelLiveTimeHTML(live) {
    if (!_duelLiveIsRunning(live)) return esc(fmtDuration(_duelLiveElapsedSeconds(live)));
    const startedAt = live.run_started_at ? new Date(live.run_started_at).getTime() : 0;
    const seenAt = live.last_seen_at ? new Date(live.last_seen_at).getTime() : 0;
    const base = Math.floor(Number(live.elapsed_ms || 0) / 1000);
    if (!startedAt || Number.isNaN(startedAt)) return esc(fmtDuration(base));
    return `<span data-duel-live-wrap><span data-duel-live-start="${startedAt}" data-duel-live-base="${base}" data-duel-live-seen="${seenAt || 0}">${esc(fmtDuration(_duelLiveElapsedSeconds(live)))}</span><span data-duel-live-stale-label style="margin-left:5px;color:var(--t3);"></span></span>`;
  }

  function _duelLivePillHTML(live, score, isMine = false) {
    if (_duelLiveIsRunning(live)) {
      const label = Number(score) > 0 ? 'Nouvelle run' : (isMine ? 'Tu es en run' : 'En run');
      return `
        <div style="margin-top:7px;display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:950;color:#c4965c;padding:5px 7px;border-radius:999px;background:rgba(196,150,92,.12);border:1px solid rgba(196,150,92,.28);">
          <i class="fa-solid fa-person-running"></i> ${esc(label)} · ${_duelLiveTimeHTML(live)}
        </div>`;
    }
    if (_duelLiveIsDead(live)) {
      return `
        <div style="margin-top:7px;display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:900;color:#b45d5d;padding:5px 7px;border-radius:999px;background:rgba(180,93,93,.10);border:1px solid rgba(180,93,93,.25);">
          <i class="fa-solid fa-skull"></i> ${trEsc('duel.runDead', 'Run échouée')} · ${esc(fmtDuration(_duelLiveElapsedSeconds(live)))}
        </div>`;
    }
    if (live?.state === 'finished' && Number(live.elapsed_ms || 0) > 0) {
      const pending = !(Number(score) > 0);
      if (pending) {
        return `
        <div style="margin-top:7px;display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:900;color:#c4965c;padding:5px 7px;border-radius:999px;background:rgba(196,150,92,.12);border:1px solid rgba(196,150,92,.28);">
          <i class="fa-solid fa-hourglass-half"></i> ${trEsc('duel.runFinished', 'Run finie')} · ${esc(fmtDuration(_duelLiveElapsedSeconds(live)))}
        </div>`;
      }
      return `
        <div style="margin-top:7px;display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:900;color:#4a8c6f;padding:5px 7px;border-radius:999px;background:rgba(74,140,111,.10);border:1px solid rgba(74,140,111,.25);">
          <i class="fa-solid fa-circle-check"></i> ${trEsc('duel.runFinished', 'Run finie')} · ${esc(fmtDuration(_duelLiveElapsedSeconds(live)))}
        </div>`;
    }
    return '';
  }

  function _duelRunStateHTML(label, score, active, isMine = false, winnerUid = null, userUid = null, live = null) {
    const hasScore = Number(score) > 0;
    const isWinner = winnerUid && userUid && winnerUid === userUid;
    const running = _duelLiveIsRunning(live);
    const dead = _duelLiveIsDead(live);
    const finishedPending = live?.state === 'finished' && Number(live.elapsed_ms || 0) > 0 && !hasScore;
    const color = running ? '#c4965c' : dead ? '#b45d5d' : finishedPending ? '#c4965c' : hasScore ? (isWinner ? '#4a8c6f' : 'var(--brand)') : (active ? '#c4965c' : 'var(--t3)');
    const text = running
      ? `${isMine ? tr('duel.myRunLive', 'Tu es en run') : tr('duel.runLive', 'En run')} · ${fmtDuration(_duelLiveElapsedSeconds(live))}`
      : dead ? `${tr('duel.runDead', 'Run échouée')} · ${fmtDuration(_duelLiveElapsedSeconds(live))}`
      : finishedPending ? `${tr('duel.runFinished', 'Run finie')} · ${fmtDuration(_duelLiveElapsedSeconds(live))}`
      : hasScore ? `${isMine ? tr('duel.myRunValidated', 'Ta run validée') : tr('duel.runValidated', 'Run validée')} · ${fmtDuration(Number(score))}` : (active ? tr('duel.waitingResult', 'En attente du résultat') : tr('duel.notStarted', 'Pas encore lancé'));
    const icon = running ? 'fa-person-running' : dead ? 'fa-skull' : finishedPending ? 'fa-hourglass-half' : hasScore ? (isWinner ? 'fa-trophy' : 'fa-circle-check') : 'fa-clock';
    return `
      <div class="vth-duel-status-line">
        <span class="vth-meta" style="font-weight:800;color:var(--t2);">${esc(label)}${isMine ? ` <b style="color:var(--brand);">(${trEsc('duel.meMark', 'toi')})</b>` : ''}</span>
        <span style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:${color};min-width:0;text-align:right;">
          <i class="fa-solid ${icon}"></i>
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${running ? _duelLiveTimeHTML(live) : esc(text)}</span>
        </span>
      </div>`;
  }

  function _duelCanCancel(d) {
    if (!d || d.status !== 'pending') return false;
    return !!_myId && d.challenger_uid === _myId;
  }

  const _DUEL_FAKE_OPPONENT_NAMES = [
    'Nexo', 'Kaori', 'Riven', 'Aksel', 'Milo', 'Sora', 'Kairo', 'Nyx',
    'Zayn', 'Eden', 'Luna', 'Orion', 'Rafa', 'Ilyas', 'Noa', 'Tao'
  ];

  function _duelStableIndex(value, max) {
    const text = String(value || 'volt');
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = ((hash * 31) + text.charCodeAt(i)) >>> 0;
    return max > 0 ? hash % max : 0;
  }

  function _duelIsBotMatch(d) {
    return !!(d?.is_bot_match || d?.opponent?.is_bot || d?.challenger?.is_bot || d?.bot_user_id);
  }

  function _duelDisplayOpponentName(d, user) {
    const raw = String(user?.pseudo || '').trim();
    if (raw && !/bot|volt\s*bot/i.test(raw)) return raw;
    return _DUEL_FAKE_OPPONENT_NAMES[_duelStableIndex(d?.id || d?.bot_generated_at || raw, _DUEL_FAKE_OPPONENT_NAMES.length)];
  }

  function _duelDisplayUser(d, side, user) {
    const u = { ...(user || {}) };
    if (side === 'opponent' && _duelIsBotMatch(d)) {
      u.pseudo = _duelDisplayOpponentName(d, u);
      u.is_bot = false;
      u.grade = u.grade === 'bot' ? 'free' : u.grade;
    }
    return u;
  }

  function _duelSide(d, uid = _myId) {
    if (!d || !uid) return null;
    if (d.challenger_uid === uid) return 'challenger';
    if (d.opponent_uid === uid) return 'opponent';
    return null;
  }

  function _duelScoreForSide(d, side) {
    if (!d || !side) return 0;
    return Number(side === 'challenger' ? d.challenger_score : d.opponent_score) || 0;
  }

  function _duelUserForSide(d, side) {
    if (!d || !side) return null;
    return _duelDisplayUser(d, side, side === 'challenger' ? d.challenger : d.opponent);
  }

  function _duelOppositeSide(side) {
    return side === 'challenger' ? 'opponent' : side === 'opponent' ? 'challenger' : null;
  }

  function _duelOutcome(d) {
    const mySide = _duelSide(d);
    const oppSide = _duelOppositeSide(mySide);
    const myScore = _duelScoreForSide(d, mySide);
    const oppScore = _duelScoreForSide(d, oppSide);
    const winnerSide = (d?.winner_side === 'challenger' || d?.winner_side === 'opponent') ? d.winner_side : (d?.winner_uid === d?.challenger_uid ? 'challenger' : d?.winner_uid === d?.opponent_uid ? 'opponent' : null);
    const winnerUser = _duelUserForSide(d, winnerSide);
    const loserUser = _duelUserForSide(d, _duelOppositeSide(winnerSide));
    const winnerScore = _duelScoreForSide(d, winnerSide);
    const loserScore = _duelScoreForSide(d, _duelOppositeSide(winnerSide));
    const meWon = !!winnerSide && winnerSide === mySide;
    const meLost = !!winnerSide && winnerSide !== mySide;
    const bothScores = myScore > 0 && oppScore > 0;
    const tie = d?.status === 'completed' && bothScores && !winnerSide;
    return { mySide, oppSide, myScore, oppScore, winnerSide, winnerUser, loserUser, winnerScore, loserScore, meWon, meLost, bothScores, tie };
  }

  function _duelEloDeltaHTML(delta) {
    const n = Number(delta || 0);
    if (!n) return '';
    const cls = n > 0 ? 'vth-badge-green' : 'vth-badge-danger';
    return `<span class="vth-badge ${cls}">${n > 0 ? '+' : ''}${n} ELO</span>`;
  }

  function _duelEloLineHTML(user) {
    if (!user) return '';
    const elo = Math.max(100, Math.round(Number(user.elo || user.duel_elo || 1000)));
    const rank = user.elo_rank || 'Bronze';
    return `<div class="vth-elo-line">ELO ${esc(elo)} · ${esc(rank)}</div>`;
  }

  function _duelResultBadgeHTML(d) {
    const o = _duelOutcome(d);
    if (d?.status !== 'completed') return '';
    if (o.meWon) return `<span class="vth-badge vth-badge-green">${trEsc('duel.badge.win', 'Tu as gagné')}</span>`;
    if (o.meLost) return `<span class="vth-badge vth-badge-danger">${trEsc('duel.badge.lost', 'Tu as perdu')}</span>`;
    if (o.tie) return `<span class="vth-badge vth-badge-amber">${trEsc('duel.badge.tie', 'Égalité')}</span>`;
    return `<span class="vth-badge vth-badge-brand">${trEsc('duel.badge.completed', 'Terminé')}</span>`;
  }

  function _duelProgressTextHTML(d) {
    if (!d || d.status !== 'active') return '';
    const o = _duelOutcome(d);
    const myLive = _duelLiveForSide(d, o.mySide);
    const oppLive = _duelLiveForSide(d, o.oppSide);
    const oppName = _duelUserForSide(d, o.oppSide)?.pseudo || tr('duel.opponent', 'Ton adversaire');

    if (o.myScore > 0 && o.oppScore > 0) return trEsc('duel.progress.bothReceived', 'Les deux scores sont reçus. La base clôture le duel et déclare le gagnant.');
    if (o.myScore > 0 && _duelLiveIsRunning(oppLive)) return trEsc('duel.progress.myScoreOppRunning', 'Ton score est reçu. {name} continue sa run en direct : {time}.', { name: '__NAME__', time: '__TIME__' }).replace('__NAME__', esc(oppName)).replace('__TIME__', `<b style="color:#c4965c;">${_duelLiveTimeHTML(oppLive)}</b>`);
    if (_duelLiveIsRunning(myLive) && o.oppScore > 0) return trEsc('duel.progress.oppFinishedMyRunning', '{name} a déjà fini : {score}. Continue ta run, ton temps monte en direct : {time}.', { name: '__NAME__', score: '__SCORE__', time: '__TIME__' }).replace('__NAME__', esc(oppName)).replace('__SCORE__', esc(fmtDuration(o.oppScore))).replace('__TIME__', `<b style="color:#c4965c;">${_duelLiveTimeHTML(myLive)}</b>`);
    if (_duelLiveIsRunning(myLive) && !_duelLiveIsRunning(oppLive)) return trEsc('duel.progress.myRunning', 'Tu es en run : {time}. Ton adversaire verra ton chrono en direct.', { time: '__TIME__' }).replace('__TIME__', `<b style="color:#c4965c;">${_duelLiveTimeHTML(myLive)}</b>`);
    if (_duelLiveIsRunning(oppLive)) return trEsc('duel.progress.oppRunning', '{name} est en run : {time}. Tu peux lancer/continuer ta run.', { name: '__NAME__', time: '__TIME__' }).replace('__NAME__', esc(oppName)).replace('__TIME__', `<b style="color:#c4965c;">${_duelLiveTimeHTML(oppLive)}</b>`);
    if (o.myScore > 0 && o.oppScore <= 0) return trEsc('duel.progress.myScoreWaiting', 'Ton score est reçu. En attente que ton adversaire termine sa run.');
    if (o.oppScore > 0 && o.myScore <= 0) return trEsc('duel.progress.oppScoreWaiting', '{name} a fini sa run : {score}. Termine ta run pour comparer.', { name: oppName, score: fmtDuration(o.oppScore) });
    return trEsc('duel.progress.startNoCoin', 'Lance un run No-Coin maintenant. Le résultat sera ajouté automatiquement après validation anti-abus.');
  }

  function _duelSeenPopupKey(d) {
    const ch = Number(d?.challenger_score || 0) || 0;
    const op = Number(d?.opponent_score || 0) || 0;
    const cl = d?.challenger_live ? `${d.challenger_live.state || 'x'}_${d.challenger_live.run_started_at || 'x'}` : 'no_ch_live';
    const ol = d?.opponent_live ? `${d.opponent_live.state || 'x'}_${d.opponent_live.run_started_at || 'x'}` : 'no_op_live';
    return `volt_duel_seen_v2_${_myId || 'me'}_${d?.id || 'x'}_${d?.status || 'x'}_${d?.winner_uid || 'none'}_${ch}_${op}_${cl}_${ol}`;
  }

  function _duelWasSeen(key) {
    if (!key) return true;
    return _duelSeenMem.has(key);
  }

  function _duelMarkSeen(key) {
    if (!key) return;
    _duelSeenMem.add(key);
    storageLocalGetSafe([_DUEL_SEEN_STORE]).then((res) => {
      const data = (res && res[_DUEL_SEEN_STORE] && typeof res[_DUEL_SEEN_STORE] === 'object') ? res[_DUEL_SEEN_STORE] : {};
      data[key] = Date.now();
      const entries = Object.entries(data).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0)).slice(0, 160);
      storageLocalSetSafe({ [_DUEL_SEEN_STORE]: Object.fromEntries(entries) });
    }).catch(() => {});
  }

  function _duelEventStampMs(d) {
    if (!d) return 0;
    const candidates = [];
    const add = (v) => {
      const ms = new Date(v || 0).getTime();
      if (ms && !Number.isNaN(ms)) candidates.push(ms);
    };
    add(d.completed_at);
    add(d.updated_at);
    add(d.sort_at);
    add(d.accepted_at);
    add(d.started_at);
    add(d.created_at);
    ['challenger_live', 'opponent_live'].forEach((k) => {
      const live = d[k];
      if (!live) return;
      add(live.updated_at);
      add(live.last_seen_at);
      add(live.run_started_at);
    });
    return candidates.length ? Math.max(...candidates) : 0;
  }

  function _duelPopupEventFresh(d) {
    const stamp = _duelEventStampMs(d);
    if (!stamp) return false;
    const age = Date.now() - stamp;
    return age >= 0 && age <= _DUEL_POPUP_FRESH_MS;
  }

  function _duelLiveEventFresh(live, maxAgeMs = 90000) {
    if (!live) return false;
    const stamp = new Date(live.updated_at || live.last_seen_at || live.run_started_at || 0).getTime();
    return !!stamp && !Number.isNaN(stamp) && (Date.now() - stamp) >= 0 && (Date.now() - stamp) <= maxAgeMs;
  }

  function _duelLiveSeenKey(d, side, kind, live) {
    const marker = kind === 'start'
      ? (live?.run_started_at || live?.updated_at || 'x')
      : `${live?.elapsed_ms || 0}_${live?.updated_at || live?.last_seen_at || 'x'}`;
    return `volt_duel_live_seen_${d?.id || 'x'}_${side || 'x'}_${kind}_${marker}`;
  }

  function _duelMaybeShowLiveNotifications(duels) {
    const list = Array.isArray(duels) ? duels : [];
    for (const d of list) {
      if (!d || d.status !== 'active') continue;
      const o = _duelOutcome(d);
      const oppSide = o.oppSide;
      if (!oppSide) continue;
      const oppLive = _duelLiveForSide(d, oppSide);
      if (!oppLive || !_duelLiveEventFresh(oppLive)) continue;
      const oppName = _duelUserForSide(d, oppSide)?.pseudo || tr('duel.opponent', 'Ton adversaire');

      if (_duelLiveIsRunning(oppLive)) {
        const key = _duelLiveSeenKey(d, oppSide, 'start', oppLive);
        if (!_duelWasSeen(key)) {
          _duelMarkSeen(key);
          toast(tr('duel.toast.oppStarted', ' {name} a commencé sa run 1v1.', { name: oppName }), 5200);
        }
      } else if (_duelLiveIsDead(oppLive)) {
        const key = _duelLiveSeenKey(d, oppSide, 'dead', oppLive);
        if (!_duelWasSeen(key)) {
          _duelMarkSeen(key);
          toast(tr('duel.toast.oppDead', '{name} est mort en 1v1.', { name: oppName }), 6200);
        }
      } else if (oppLive.state === 'finished' && Number(oppLive.elapsed_ms || 0) > 0) {
        const key = _duelLiveSeenKey(d, oppSide, 'finish', oppLive);
        if (!_duelWasSeen(key)) {
          _duelMarkSeen(key);
          toast(tr('duel.toast.oppFinished', ' {name} a fini sa run : {time}.', { name: oppName, time: fmtDuration(_duelLiveElapsedSeconds(oppLive)) }), 6200);
        }
      }
    }
  }

  function _duelResultSummaryHTML(d) {
    if (!d) return '';
    const chScore = Number(d.challenger_score || 0);
    const opScore = Number(d.opponent_score || 0);
    const chName = d.challenger?.pseudo || tr('duel.player1', 'Joueur 1');
    const opName = d.opponent?.pseudo || tr('duel.player2', 'Joueur 2');
    const o = _duelOutcome(d);

    if (d.status === 'completed') {
      if (o.winnerSide) {
        const winnerName = o.winnerUser?.pseudo || (o.winnerSide === 'challenger' ? chName : opName);
        const loserName = o.loserUser?.pseudo || (o.winnerSide === 'challenger' ? opName : chName);
        const title = o.meWon ? tr('duel.result.youWonTitle', 'Tu as gagné le 1v1') : o.meLost ? tr('duel.result.youLostTitle', 'Tu as perdu le 1v1') : tr('duel.result.playerWonTitle', '{name} gagne le 1v1', { name: winnerName });
        return `
          <div class="vth-duel-result-box">
            <i class="fa-solid fa-trophy"></i> ${esc(title)}<br>
            <span style="color:var(--t2);">${trEsc('duel.result.winner', 'Gagnant')} : ${esc(winnerName)} · ${o.winnerScore > 0 ? esc(fmtDuration(o.winnerScore)) : trEsc('duel.result.scoreUnavailable', 'score indisponible')}</span><br>
            <span style="color:var(--t3);">${trEsc('duel.result.loser', 'Perdant')} : ${esc(loserName)} · ${o.loserScore > 0 ? esc(fmtDuration(o.loserScore)) : trEsc('duel.result.scoreUnavailable', 'score indisponible')}</span>
            ${Number(d.my_elo_delta || 0) ? `<div style="margin-top:6px;">${_duelEloDeltaHTML(d.my_elo_delta)}</div>` : ''}
          </div>`;
      }
      if (chScore > 0 && opScore > 0) {
        return `
          <div class="vth-meta" style="margin-top:10px;padding:9px 10px;border-radius:var(--radius);background:var(--bg-input);font-weight:900;">
            ${trEsc('duel.badge.tie', 'Égalité')} · ${esc(chName)} ${esc(fmtDuration(chScore))} · ${esc(opName)} ${esc(fmtDuration(opScore))}
          </div>`;
      }
    }

    if (d.status === 'active' && (chScore > 0 || opScore > 0)) {
      const done = [];
      const waiting = [];
      if (chScore > 0) done.push(`${chName}: ${fmtDuration(chScore)}`); else waiting.push(chName);
      if (opScore > 0) done.push(`${opName}: ${fmtDuration(opScore)}`); else waiting.push(opName);
      return `
        <div class="vth-meta" style="margin-top:10px;padding:9px 10px;border-radius:var(--radius);background:var(--bg-input);line-height:1.5;">
          <b>${trEsc('duel.result.scoreReceived', 'Score reçu')} :</b> ${esc(done.join(' · '))}<br>
          <b>${trEsc('duel.result.waiting', 'En attente')} :</b> ${esc(waiting.join(', ') || '—')}
        </div>`;
    }

    if ((d.status === 'expired' || d.status === 'cancelled') && (chScore > 0 || opScore > 0)) {
      const scores = [];
      if (chScore > 0) scores.push(`${chName}: ${fmtDuration(chScore)}`);
      if (opScore > 0) scores.push(`${opName}: ${fmtDuration(opScore)}`);
      return `
        <div class="vth-meta" style="margin-top:10px;padding:9px 10px;border-radius:var(--radius);background:var(--bg-input);">
          ${trEsc('duel.result.savedBeforeClose', 'Score enregistré avant clôture')} : ${esc(scores.join(' · '))}
        </div>`;
    }

    return '';
  }

  function _showDuelInfoModal(d) {
    if (!d) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.58);z-index:99990;
      display:flex;align-items:center;justify-content:center;padding:20px;
      animation:vth-fadein .15s ease;
    `;
    const statusClass = d.status === 'active' ? 'vth-badge-green' : (d.status === 'pending' ? 'vth-badge-amber' : 'vth-badge-brand');
    const opponent = d.challenger_uid === _myId ? d.opponent : d.challenger;
    const active = d.status === 'active';
    const timingText = active ? tr('duel.info.ends', 'Fin {time}', { time: fmtDeadline(d.ends_at) }) : d.status === 'pending' ? tr('duel.info.expires', 'Expire {time}', { time: fmtDeadline(d.expires_at) }) : fmtDeadline(d.completed_at || d.created_at);
    overlay.innerHTML = `
      <div class="vth-card" style="width:100%;max-width:380px;overflow:hidden;box-shadow:var(--shadow-lg);">
        <div style="padding:18px 18px 14px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;">
            <div style="min-width:0;">
              <div style="font-size:15px;font-weight:900;color:var(--t1);">${trEsc('duel.info.title', 'Infos 1v1')}</div>
              <div class="vth-meta">No-Coin · ${esc(timingText)}</div>
            </div>
            <button id="_duel_info_close" class="vth-btn vth-btn-ghost vth-btn-icon" title="${trEsc('duel.info.close', 'Fermer')}">
              <i class="fa-solid fa-xmark" style="font-size:12px;"></i>
            </button>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
            <span class="vth-badge ${statusClass}">${esc(_duelStatusLabel(d.status))}</span>
            ${Number(d.wager_tokens ?? d.wager_credits ?? 0) > 0 ? `<span class="vth-badge vth-badge-brand">${Number(d.wager_tokens ?? d.wager_credits)} tokens</span>` : ''}
            <span class="vth-badge vth-badge-brand">${esc(_duelSeriesScoreLabel(d))}</span>
            ${d.winner_uid ? `<span class="vth-badge vth-badge-green">${trEsc('duel.info.winnerDeclared', 'Gagnant déclaré')}</span>` : ''}
          </div>
          <div class="vth-duel-info-grid" style="margin-bottom:10px;">
            <div class="vth-duel-info-cell">
              <div class="vth-label">${trEsc('duel.youAlt', 'Vous')}</div>
              <div class="vth-duel-info-value">${esc((d.challenger_uid === _myId ? d.challenger : d.opponent)?.pseudo || tr('duel.youAlt', 'Vous'))}</div>
            </div>
            <div class="vth-duel-info-cell">
              <div class="vth-label">${trEsc('duel.opponent', 'Adversaire')}</div>
              <div class="vth-duel-info-value">${esc(opponent?.pseudo || tr('duel.opponent', 'Adversaire'))}</div>
            </div>
            <div class="vth-duel-info-cell">
              <div class="vth-label">${trEsc('elo.current', 'ELO')}</div>
              <div class="vth-duel-info-value">${esc((d.challenger_uid === _myId ? d.challenger : d.opponent)?.elo || 1000)} · ${esc((d.challenger_uid === _myId ? d.challenger : d.opponent)?.elo_rank || 'Bronze')}</div>
            </div>
            <div class="vth-duel-info-cell">
              <div class="vth-label">${trEsc('elo.delta', 'Variation ELO')}</div>
              <div class="vth-duel-info-value">${Number(d.my_elo_delta || 0) ? `${Number(d.my_elo_delta) > 0 ? '+' : ''}${esc(d.my_elo_delta)}` : '—'}</div>
            </div>
            <div class="vth-duel-info-cell">
              <div class="vth-label">Format</div>
              <div class="vth-duel-info-value">${esc(_duelSeriesLabel(d))}</div>
            </div>
            <div class="vth-duel-info-cell">
              <div class="vth-label">Rounds</div>
              <div class="vth-duel-info-value">${esc(_duelSeriesScoreLabel(d))}</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${_duelRunStateHTML(d.challenger?.pseudo || tr('duel.player1', 'Joueur 1'), d.challenger_score, active, d.challenger_uid === _myId, d.winner_uid, d.challenger_uid, d.challenger_live)}
            ${_duelRunStateHTML(d.opponent?.pseudo || tr('duel.player2', 'Joueur 2'), d.opponent_score, active, d.opponent_uid === _myId, d.winner_uid, d.opponent_uid, d.opponent_live)}
          </div>
          ${_duelResultSummaryHTML(d)}
          <div class="vth-meta" style="margin-top:12px;line-height:1.6;">
            ${active ? _duelProgressTextHTML(d) : d.status === 'pending' ? trEsc('duel.info.pendingHint', 'Le challenger peut annuler tant que l’invitation n’a pas été acceptée.') : trEsc('duel.info.closed', 'Duel clôturé.')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#_duel_info_close')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  function _showDuelResultModal(d) {
    if (!d) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:99991;
      display:flex;align-items:center;justify-content:center;padding:20px;
      animation:vth-fadein .15s ease;
    `;
    const o = _duelOutcome(d);
    const opponent = d.challenger_uid === _myId ? d.opponent : d.challenger;
    let icon = 'fa-circle-info';
    let title = tr('duel.modal.updateTitle', 'Mise à jour 1v1');
    let sub = tr('duel.modal.updateSub', 'Le duel a été mis à jour.');
    let heroBorder = 'var(--border)';
    let heroBg = 'var(--bg-input)';

    if (d.status === 'completed') {
      if (o.meWon) { icon = 'fa-trophy'; title = tr('duel.result.youWonTitle', 'Tu as gagné le 1v1'); sub = tr('duel.modal.winSub', 'Ton score est meilleur que celui de ton adversaire.'); heroBorder = 'rgba(74,140,111,.35)'; heroBg = 'rgba(74,140,111,.10)'; }
      else if (o.meLost) { icon = 'fa-flag-checkered'; title = tr('duel.result.youLostTitle', 'Tu as perdu le 1v1'); sub = tr('duel.modal.lostSub', '{name} a gagné ce duel.', { name: o.winnerUser?.pseudo || tr('duel.opponent', 'Ton adversaire') }); heroBorder = 'rgba(190,88,88,.35)'; heroBg = 'rgba(190,88,88,.10)'; }
      else { icon = 'fa-scale-balanced'; title = tr('duel.modal.tieTitle', 'Égalité 1v1'); sub = tr('duel.modal.tieSub', 'Les deux scores sont identiques.'); heroBorder = 'rgba(196,150,92,.35)'; heroBg = 'rgba(196,150,92,.10)'; }
    } else if (d.status === 'active' && o.myScore > 0 && _duelLiveIsRunning(_duelLiveForSide(d, o.oppSide))) {
      icon = 'fa-person-running';
      title = tr('duel.modal.oppContinuesTitle', '{name} continue sa run', { name: opponent?.pseudo || tr('duel.opponent', 'Ton adversaire') });
      sub = tr('duel.modal.oppContinuesSub', 'Ton score est déjà enregistré. Son chrono continue en direct dans le 1v1.');
      heroBorder = 'rgba(196,150,92,.35)';
      heroBg = 'rgba(196,150,92,.10)';
    } else if (d.status === 'active' && o.oppScore > 0 && o.myScore <= 0) {
      icon = 'fa-person-running';
      title = tr('duel.modal.oppFinishedTitle', '{name} a fini sa run', { name: opponent?.pseudo || tr('duel.opponent', 'Ton adversaire') });
      sub = tr('duel.modal.oppFinishedSub', 'Son score est affiché. Termine ta run pour voir qui gagne.');
      heroBorder = 'rgba(196,150,92,.35)';
      heroBg = 'rgba(196,150,92,.10)';
    } else if (d.status === 'active' && o.myScore > 0 && o.oppScore <= 0) {
      icon = 'fa-circle-check';
      title = tr('duel.modal.myScoreSavedTitle', 'Ton score 1v1 est enregistré');
      sub = tr('duel.modal.myScoreSavedSub', 'En attente que ton adversaire termine sa run.');
      heroBorder = 'rgba(74,140,111,.35)';
      heroBg = 'rgba(74,140,111,.10)';
    }

    const winnerLine = o.winnerSide ? `
      <div class="vth-duel-info-cell">
        <div class="vth-label">${trEsc('duel.result.winner', 'Gagnant')}</div>
        <div class="vth-duel-info-value">${esc(o.winnerUser?.pseudo || '—')} · ${o.winnerScore > 0 ? esc(fmtDuration(o.winnerScore)) : '—'}</div>
      </div>
      <div class="vth-duel-info-cell">
        <div class="vth-label">${trEsc('duel.result.loser', 'Perdant')}</div>
        <div class="vth-duel-info-value">${esc(o.loserUser?.pseudo || '—')} · ${o.loserScore > 0 ? esc(fmtDuration(o.loserScore)) : '—'}</div>
      </div>` : `
      <div class="vth-duel-info-cell">
        <div class="vth-label">${trEsc('duel.modal.myScore', 'Ton score')}</div>
        <div class="vth-duel-info-value">${o.myScore > 0 ? esc(fmtDuration(o.myScore)) : trEsc('duel.notFinished', 'Pas encore fini')}</div>
      </div>
      <div class="vth-duel-info-cell">
        <div class="vth-label">${trEsc('duel.opponent', 'Adversaire')}</div>
        <div class="vth-duel-info-value">${o.oppScore > 0 ? esc(fmtDuration(o.oppScore)) : trEsc('duel.notFinished', 'Pas encore fini')}</div>
      </div>`;

    overlay.innerHTML = `
      <div class="vth-card" style="width:100%;max-width:390px;overflow:hidden;box-shadow:var(--shadow-lg);">
        <div style="padding:18px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;">
            <div style="min-width:0;">
              <div style="font-size:15px;font-weight:900;color:var(--t1);">${trEsc('duel.modal.resultTitle', 'Résultat 1v1')}</div>
              <div class="vth-meta">${trEsc('duel.modal.resultSub', 'Résumé du duel')}</div>
            </div>
            <button id="_duel_result_close" class="vth-btn vth-btn-ghost vth-btn-icon" title="${trEsc('duel.info.close', 'Fermer')}">
              <i class="fa-solid fa-xmark" style="font-size:12px;"></i>
            </button>
          </div>
          <div class="vth-duel-result-hero" style="border-color:${heroBorder};background:${heroBg};">
            <i class="fa-solid ${icon}" style="font-size:24px;color:var(--brand);"></i>
            <div class="vth-duel-result-title">${esc(title)}</div>
            <div class="vth-meta" style="margin-top:5px;line-height:1.5;">${esc(sub)}</div>
          </div>
          <div class="vth-duel-info-grid" style="margin-top:10px;">
            ${winnerLine}
            <div class="vth-duel-info-cell">
              <div class="vth-label">${trEsc('elo.delta', 'Variation ELO')}</div>
              <div class="vth-duel-info-value">${Number(d.my_elo_delta || 0) ? `${Number(d.my_elo_delta) > 0 ? '+' : ''}${esc(d.my_elo_delta)} ELO` : '—'}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button id="_duel_result_infos" class="vth-btn vth-btn-primary vth-btn-sm" style="flex:1;">
              <i class="fa-solid fa-circle-info"></i> ${trEsc('duel.modal.viewInfo', 'Voir infos')}
            </button>
            <button id="_duel_result_ok" class="vth-btn vth-btn-ghost vth-btn-sm" style="flex:1;">OK</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#_duel_result_close')?.addEventListener('click', close);
    overlay.querySelector('#_duel_result_ok')?.addEventListener('click', close);
    overlay.querySelector('#_duel_result_infos')?.addEventListener('click', () => { close(); _showDuelInfoModal(d); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  function _duelMaybeShowResultPopup(duels) {
    const list = Array.isArray(duels) ? duels : [];
    if (!_duelSeenStoreReady) {
      setTimeout(() => _duelMaybeShowResultPopup(list), 120);
      return;
    }
    for (const d of list) {
      if (!d || !String(d.id || '').trim()) continue;
      const o = _duelOutcome(d);
      const oppRunning = _duelLiveIsRunning(_duelLiveForSide(d, o.oppSide));
      const shouldShow =
        (d.status === 'completed' && (o.bothScores || o.winnerSide)) ||
        (d.status === 'active' && ((o.oppScore > 0 && o.myScore <= 0) || (o.myScore > 0 && o.oppScore <= 0) || (o.myScore > 0 && oppRunning)));
      if (!shouldShow) continue;
      const key = _duelSeenPopupKey(d);
      if (_duelWasSeen(key)) continue;
      // Ne pas ressortir les anciens résultats quand on rouvre l'extension.
      // Seules les mises à jour très récentes déclenchent une modale automatique.
      if (!_duelPopupEventFresh(d)) {
        _duelMarkSeen(key);
        continue;
      }
      _duelMarkSeen(key);
      setTimeout(() => _showDuelResultModal(d), 80);
      break;
    }
  }

  function _duelPlayerHTML(user, score, winnerUid, live = null, duel = null, side = null) {
    const u = _duelDisplayUser(duel, side, user || {});
    const uid = u.id || '';
    const isMe = uid === _myId;
    const isWinner = winnerUid && uid === winnerUid;
    const hasScore = Number(score) > 0;
    const running = _duelLiveIsRunning(live);
    const dead = _duelLiveIsDead(live);
    const finishedLive = live?.state === 'finished' && Number(live.elapsed_ms || 0) > 0;
    const finishedPending = finishedLive && !hasScore;
    const initials = esc((u.pseudo || '?')[0].toUpperCase());
    const picUrl = isSafeMediaUrl(u.profilePic) ? esc(u.profilePic) : '';
    const stateClass = isWinner ? 'is-winner' : running ? 'is-running' : dead ? 'is-dead' : hasScore ? 'is-done' : '';
    const subClass = isWinner || hasScore ? 'is-green' : dead ? 'is-red' : (running || finishedPending) ? 'is-amber' : '';
    const scoreHtml = running
      ? _duelLiveTimeHTML(live)
      : hasScore ? esc(fmtDuration(Number(score))) : (dead || finishedPending) ? esc(fmtDuration(_duelLiveElapsedSeconds(live))) : '—';
    const subIcon = running ? 'fa-person-running' : dead ? 'fa-skull' : hasScore ? (isWinner ? 'fa-trophy' : 'fa-circle-check') : 'fa-hourglass-half';
    const subText = running
      ? (isMe ? tr('duel.myLiveTimer', 'Ton chrono live') : tr('duel.liveTimer', 'Chrono live'))
      : dead ? tr('duel.runDead', 'Run échouée')
      : hasScore ? (isWinner ? tr('duel.winner', 'Gagnant') : tr('duel.runValidated', 'Run validée')) : finishedLive ? tr('duel.runFinished', 'Run finie') : tr('duel.notFinished', 'Pas encore fini');

    const stickerRow = isMe && running ? `
      <div class="vth-sticker-row">
        <button class="vth-sticker-btn" data-sticker="🔥" title="Feu"></button>
        <button class="vth-sticker-btn" data-sticker="💪" title="Force"></button>
        <button class="vth-sticker-btn" data-sticker="😎" title="Cool"></button>
        <button class="vth-sticker-btn" data-sticker="😱" title="Choc"></button>
        <button class="vth-sticker-btn" data-sticker="🏆" title="Trophée"></button>
      </div>` : '';

    return `
      <div class="vth-duel-player ${isMe ? 'is-me' : ''} ${stateClass}" data-player-uid="${esc(uid)}">
        <div class="vth-duel-player-top">
          <div class="vth-duel-avatar">
            ${picUrl ? `<img src="${picUrl}" alt="">` : initials}
          </div>
          <div class="vth-duel-name">
            <div class="vth-duel-name-main">
              ${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderBadgeHTML(u.grade) : ''}
              <span style="${typeof VOLT_PREMIUM !== 'undefined' ? VOLT_PREMIUM.renderPseudoStyle(u.grade, u.grade_color, u) : ''}">${esc(u.pseudo || tr('chat.anonymous', 'Anonyme'))}</span>
            </div>
            <div class="vth-duel-role">${isMe ? trEsc('duel.you', 'Toi') : trEsc('duel.opponent', 'Adversaire')} · ${trEsc('team.levelShort', 'Niv.')} ${esc(u.userLevel || 1)}</div>
            ${_duelEloLineHTML(u)}
          </div>
        </div>
        <div class="vth-duel-big-score ${running ? 'is-live' : ''}">${scoreHtml}</div>
        <div class="vth-duel-score-sub ${subClass}">
          <i class="fa-solid ${subIcon}"></i><span>${esc(subText)}</span>
        </div>
        ${(!running && _duelLivePillHTML(live, score, isMe)) || ''}
        ${stickerRow}
      </div>`;
  }

  async function _renderDuels(el) {
    if (!el) return;
    let formSnapshot = _duelCaptureFormSnapshot(el);
    if (!formSnapshot) el.innerHTML = spinnerHTML(tr('duel.loading', 'Chargement des 1v1…'));
    /** @type {any} */ let res = null;
    /** @type {any} */ let tokenRes = null;
    /** @type {any} */ let duelPanelSetting = null;
    /** @type {any} */ let eloRes = null;
    // H8: allSettled so a failing RPC (e.g. ELO) doesn't lock the whole duel panel.
    try {
      const _s = await Promise.allSettled([
        bg('getMyDuels', { limit: 20 }),
        bg('getVoltTokens'),
        storageLocalGetSafe(['voltDuelPanelEnabled']),
        bg('getMyEloProfile')
      ]);
      const _pickD = (i, fallback) => _s[i].status === 'fulfilled' ? _s[i].value : (fallback != null ? fallback : { success: false, error: String(_s[i].reason?.message || 'rejected') });
      res = _pickD(0);
      tokenRes = _pickD(1);
      duelPanelSetting = _pickD(2);
      eloRes = _pickD(3);
    } catch (e) {
      res = { success: false, error: e?.message || 'network_error' };
    }
    res = res || { success: false, error: 'empty_response' };
    tokenRes = tokenRes || {};
    duelPanelSetting = duelPanelSetting || {};
    eloRes = eloRes || {};
    const tokenBalance = tokenRes?.success ? Math.max(0, Number(tokenRes.balance || 0)) : null;
    const duelPanelEnabled = duelPanelSetting?.voltDuelPanelEnabled !== false;
    const myElo = eloRes?.success ? Math.round(Number(eloRes.elo || 1000)) : 1000;
    const myRank = eloRes?.success ? (eloRes.rank || 'Bronze') : 'Bronze';
    const myWinrate = eloRes?.success ? Number(eloRes.winrate || 0) : 0;

    if (!res.success) {
      _duelStartAutoRefresh(el, false);
      el.innerHTML = `<div class="vth-empty"><i class="fa-solid fa-triangle-exclamation"></i>${esc(_duelErrorLabel(res.error))}</div>`;
      return;
    }

    const duels = Array.isArray(res.duels) ? res.duels : [];
    const randomQueue = res.random_queue || null;
    _duelLatestRandomQueue = randomQueue;
    if (!randomQueue) _duelBotClaimedQueueKey = '';
    const activeOrPending = !!randomQueue || duels.some(d => d.status === 'pending' || d.status === 'active');
    const findDuelById = (id) => duels.find(d => String(d.id) === String(id));
    const verifyWagerBalance = (wager) => {
      const amount = Math.max(0, Math.floor(Number(wager || 0)));
      if (amount > 0 && tokenBalance !== null && amount > tokenBalance) {
        toast(tr('duel.notEnoughTokens', 'Tokens insuffisants pour cette mise.'));
        return false;
      }
      return true;
    };

    formSnapshot = _duelCaptureFormSnapshot(el) || formSnapshot;
    el.innerHTML = `
      <div class="vth-card vth-duel-hero">
        <div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;">
          <div style="min-width:0;">
            <div class="vth-duel-hero-title"><i class="fa-solid fa-bolt" style="color:var(--brand);margin-right:6px;"></i>1v1 No-Coin</div>
            <div class="vth-meta">${trEsc('duel.heroSubtitle', 'UI minimaliste · mises en tokens · live sans refresh permanent.')}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <div class="vth-elo-chip" title="${trEsc('elo.current', 'ELO actuel')}"><i class="fa-solid fa-ranking-star"></i> ${esc(myElo)} · ${esc(myRank)}</div>
            <div style="padding:6px 10px;border-radius:999px;background:rgba(196,150,92,.12);border:1px solid rgba(196,150,92,.28);font-size:11px;font-weight:900;color:var(--brand);white-space:nowrap;">
              <i class="fa-solid fa-coins"></i> ${tokenBalance === null ? trEsc('duel.tokensEmpty', 'Tokens —') : trEsc('duel.tokensPill', '{count} tokens', { count: tokenBalance })}
            </div>
            <button id="duel-refresh-btn" class="vth-btn vth-btn-ghost vth-btn-icon" title="${trEsc('common.refresh', 'Rafraîchir')}">
              <i class="fa-solid fa-rotate-right" style="font-size:12px;"></i>
            </button>
          </div>
        </div>
        <div class="control-row" style="position:relative;z-index:1;margin-bottom:12px;padding:10px 12px;border:1px solid var(--border);border-radius:14px;background:var(--bg-input);">
          <div>
            <div class="control-label">Afficher la popup 1v1 en jeu</div>
            <div class="control-desc">Active ou masque le panneau flottant 1v1 sur Subway Surfers.</div>
          </div>
          <label class="switch"><input type="checkbox" id="duel-game-panel-toggle" ${duelPanelEnabled ? 'checked' : ''}><span class="slider"></span></label>
        </div>
        <div class="vth-duel-form" style="position:relative;z-index:1;">
          <input id="duel-target-input" class="vth-input" type="text" maxlength="30" placeholder="${trEsc('duel.targetPlaceholder', 'Pseudo exact…')}">
          <input id="duel-wager-input" class="vth-input" type="number" min="0" max="10000" step="1" value="0" title="${trEsc('duel.wagerTitle', 'Mise en tokens')}" style="font-weight:900;text-align:center;">
          <select id="duel-series-select" class="vth-input" title="${trEsc('duel.seriesTitle', 'Format du 1v1')}" style="font-weight:900;text-align:center;">
            <option value="1">BO1</option>
            <option value="2">BO2</option>
            <option value="3">BO3</option>
          </select>
          <button id="duel-create-btn" class="vth-btn vth-btn-primary vth-btn-sm" ${activeOrPending ? 'disabled' : ''}>
            <i class="fa-solid fa-bolt"></i> ${trEsc('duel.create', 'Défier')}
          </button>
          <button id="duel-random-btn" class="vth-btn vth-btn-ghost vth-btn-sm" ${activeOrPending ? 'disabled' : ''}>
            <i class="fa-solid fa-shuffle"></i> ${trEsc('duel.random', 'Random')}
          </button>
        </div>
        <div class="vth-meta" style="position:relative;z-index:1;margin-top:9px;">
          ${randomQueue ? trEsc('duel.randomActive', 'Recherche random active. Même mise en tokens requise pour être matché.') : activeOrPending ? trEsc('duel.hasOpen', 'Tu as déjà un duel en attente/actif. Termine-le avant d’en lancer un autre.') : trEsc('duel.rulesHint', 'Invitation 5 min · duel actif 13h · notifications dans le jeu.')}
          <br>${trEsc('elo.duelStats', 'ELO 1v1')} : <b style="color:var(--brand);">${esc(myElo)}</b> · ${esc(myRank)} · ${esc(myWinrate)}% WR
        </div>
        ${randomQueue ? `
          <div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:9px 10px;border-radius:var(--radius);background:var(--bg-input);border:1px solid var(--border);">
            <span class="vth-meta"><i class="fa-solid fa-magnifying-glass"></i> ${trEsc('duel.queue', 'File random · {tokens} tokens', { tokens: Number(randomQueue.wager_tokens ?? randomQueue.wager_credits ?? 0) })} · ${esc(_duelSeriesLabel(randomQueue))}</span>
            <span class="vth-meta" data-duel-bot-countdown>${esc(_duelQueueBotLabel(randomQueue))}</span>
            <button id="duel-leave-queue-btn" class="vth-btn vth-btn-ghost vth-btn-xs">${trEsc('duel.leaveQueue', 'Quitter')}</button>
          </div>` : ''}
      </div>

      <div id="duel-list">
        ${duels.length ? duels.map(d => {
          const isOpponent = _myId && d.opponent_uid === _myId;
          const isParticipant = _myId && (d.challenger_uid === _myId || d.opponent_uid === _myId);
          const canCancel = isParticipant && _duelCanCancel(d);
          const canAbandon = isParticipant && d.status === 'active';
          const statusClass = d.status === 'active' ? 'vth-badge-green' : (d.status === 'pending' ? 'vth-badge-amber' : 'vth-badge-brand');
          const timingLabel = d.status === 'active' ? tr('duel.endsAt', 'Fin {time}', { time: fmtDeadline(d.ends_at) }) : d.status === 'pending' ? tr('duel.expiresAt', 'Expire {time}', { time: fmtDeadline(d.expires_at) }) : fmtDeadline(d.completed_at || d.created_at);
          return `
            <div class="vth-card vth-duel-list-card">
              <div class="vth-duel-topline">
                <div style="display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:wrap;">
                  <span class="vth-badge ${statusClass}">${esc(_duelStatusLabel(d.status))}</span>
                  ${Number(d.wager_tokens ?? d.wager_credits ?? 0) > 0 ? `<span class="vth-badge vth-badge-brand">${Number(d.wager_tokens ?? d.wager_credits)} tokens</span>` : ''}
                  <span class="vth-badge vth-badge-brand">${esc(_duelSeriesScoreLabel(d))}</span>
                  ${_duelEloDeltaHTML(d.my_elo_delta)}
                  <span class="vth-meta">${timingLabel}</span>
                </div>
                ${_duelResultBadgeHTML(d)}
              </div>

              <div class="vth-duel-board">
                ${_duelPlayerHTML(d.challenger, d.challenger_score, d.winner_uid, d.challenger_live, d, 'challenger')}
                <div class="vth-duel-vs-pill">VS</div>
                ${_duelPlayerHTML(d.opponent, d.opponent_score, d.winner_uid, d.opponent_live, d, 'opponent')}
              </div>
              ${_duelResultSummaryHTML(d)}

              ${d.status === 'active' ? `
                <div class="vth-duel-progress-box">
                  ${_duelProgressTextHTML(d)}
                </div>` : ''}

              <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
                <button class="duel-info-btn vth-btn vth-btn-ghost vth-btn-sm" data-id="${esc(d.id)}">
                  <i class="fa-solid fa-circle-info"></i> ${trEsc('duel.info', 'Infos')}
                </button>
                ${(d.status === 'pending' && isOpponent) ? `
                  <button class="duel-respond-btn vth-btn vth-btn-primary vth-btn-sm" data-id="${esc(d.id)}" data-accept="true">
                    <i class="fa-solid fa-check"></i> ${trEsc('duel.accept', 'Accepter')}
                  </button>
                  <button class="duel-respond-btn vth-btn vth-btn-danger vth-btn-sm" data-id="${esc(d.id)}" data-accept="false">
                    <i class="fa-solid fa-xmark"></i> ${trEsc('duel.decline', 'Refuser')}
                  </button>` : ''}
                ${canCancel ? `
                  <button class="duel-cancel-btn vth-btn vth-btn-ghost vth-btn-sm" data-id="${esc(d.id)}">
                    <i class="fa-solid fa-ban"></i> ${trEsc('duel.cancel', 'Annuler')}
                  </button>` : ''}
                ${canAbandon ? `
                  <button class="duel-abandon-btn vth-btn vth-btn-abandon vth-btn-sm" data-id="${esc(d.id)}" title="${trEsc('duel.abandonTitle', 'Abandonner le 1v1')}">
                    <i class="fa-solid fa-flag"></i> ${trEsc('duel.abandon', 'Abandonner')}
                  </button>` : ''}
                ${(d.status === 'active' && !d.is_bot_match && d.started_at
                   && (Date.now() - new Date(d.started_at).getTime() > 300000)) ? `
                  <button class="duel-claim-dc-btn vth-btn vth-btn-warning vth-btn-sm" data-id="${esc(d.id)}" title="${trEsc('duel.claimDcTitle', 'Réclamer victoire (adversaire déconnecté)')}">
                    <i class="fa-solid fa-plug-circle-xmark"></i> ${trEsc('duel.claimDc', 'Réclamer (AFK)')}
                  </button>` : ''}
              </div>
            </div>`;
        }).join('') : `
          <div class="vth-empty"><i class="fa-solid fa-bolt"></i>${trEsc('duel.noDuels', 'Aucun 1v1 pour le moment.')}</div>`}
      </div>
    `;

    document.getElementById('duel-refresh-btn')?.addEventListener('click', () => _renderDuels(el));
    document.getElementById('duel-game-panel-toggle')?.addEventListener('change', (ev) => {
      storageLocalSetSafe({ voltDuelPanelEnabled: !!(/** @type {HTMLInputElement} */(ev.target).checked) });
    });
    document.getElementById('duel-leave-queue-btn')?.addEventListener('click', async (ev) => {
      const btn = /** @type {HTMLButtonElement | null} */ (ev.currentTarget);
      if (btn?.disabled) return;
      if (btn) btn.disabled = true;
      const r = await bg('leaveRandomDuelQueue', { knownQueueActive: !!_duelLatestRandomQueue });
      toast(r.success ? tr('duel.queueCancelled', 'Recherche random annulée.') : ` ${_duelErrorLabel(r.error)}`);
      await _renderDuels(el);
    });

    const createBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('duel-create-btn'));
    const randomBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('duel-random-btn'));
    const input = /** @type {HTMLInputElement | null} */ (document.getElementById('duel-target-input'));
    const wagerInput = /** @type {HTMLInputElement | null} */ (document.getElementById('duel-wager-input'));
    const seriesInput = /** @type {HTMLSelectElement | null} */ (document.getElementById('duel-series-select'));
    _duelRestoreFormSnapshot(formSnapshot);
    const getWagerTokens = () => {
      const raw = Math.floor(Number(wagerInput?.value || 0) || 0);
      return Math.max(0, Math.min(10000, raw));
    };
    const getSeriesWins = () => _duelCleanSeriesWins(seriesInput?.value || 1);
    const createDuel = async () => {
      if (createBtn?.disabled) return;
      if (await blockDuelActionIfLocalRunActive(tr('duel.create', 'Défier'))) return;
      const targetPseudo = input?.value.trim() || '';
      if (targetPseudo.length < 2) { toast(tr('duel.pseudoTooShort', 'Pseudo trop court.')); return; }
      if (!verifyWagerBalance(getWagerTokens())) return;
      if (createBtn) { createBtn.disabled = true; createBtn.textContent = tr('common.sending', 'Envoi…'); }
      const r = await bg('createDuel', { targetPseudo, mode: 'no_coin', wagerTokens: getWagerTokens(), seriesWins: getSeriesWins() });
      try { window._voltBgCacheInvalidate && window._voltBgCacheInvalidate('getVoltTokens'); } catch (_) {}
      if (r.success) {
        toast(tr('duel.inviteSent', 'Invitation 1v1 envoyée !'));
        await _renderDuels(el);
      } else {
        toast(` ${_duelErrorLabel(r.error)}`);
        if (createBtn) { createBtn.disabled = false; createBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> ${trEsc('duel.create', 'Défier')}`; }
      }
    };
    createBtn?.addEventListener('click', createDuel);
    input?.addEventListener('keydown', e => e.key === 'Enter' && createDuel());

    randomBtn?.addEventListener('click', async () => {
      if (randomBtn.disabled) return;
      if (await blockDuelActionIfLocalRunActive(tr('duel.random', 'Random'))) return;
      if (!verifyWagerBalance(getWagerTokens())) return;
      randomBtn.disabled = true;
      randomBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${trEsc('common.searching', 'Recherche')}`;
      const r = await bg('joinRandomDuel', { mode: 'no_coin', wagerTokens: getWagerTokens(), seriesWins: getSeriesWins() });
      if (r.success) {
        toast(r.status === 'queued' ? tr('duel.searchLaunched', 'Recherche random lancée.') : tr('duel.opponentFound', 'Adversaire trouvé !'));
        await _renderDuels(el);
      } else {
        toast(` ${_duelErrorLabel(r.error)}`);
        randomBtn.disabled = false;
        randomBtn.innerHTML = `<i class="fa-solid fa-shuffle"></i> ${trEsc('duel.random', 'Random')}`;
      }
    });

    el.querySelectorAll('.duel-respond-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        const matchId = btn.dataset.id;
        el.querySelectorAll('.duel-respond-btn').forEach(b => {
          if (String(b?.dataset?.id || '') === String(matchId || '')) b.disabled = true;
        });
        const accept = btn.dataset.accept === 'true';
        if (accept && await blockDuelActionIfLocalRunActive(tr('duel.accept', 'Accepter'))) { await _renderDuels(el); return; }
        const duel = findDuelById(matchId);
        const wager = Math.max(0, Math.floor(Number(duel?.wager_tokens ?? duel?.wager_credits ?? 0)));
        if (accept && wager > 0) {
          const ok = await confirmModal(tr('duel.acceptStakeTitle', 'Accepter le 1v1 avec mise'), tr('duel.acceptStakeMessage', 'Ce duel va bloquer {tokens} tokens jusqu’au résultat serveur.', { tokens: wager }), tr('duel.accept', 'Accepter'), false);
          if (!ok) { await _renderDuels(el); return; }
          if (!verifyWagerBalance(wager)) { await _renderDuels(el); return; }
        }
        const r = await bg('respondDuel', { matchId, accept });
        if (r.success) {
          toast(accept ? tr('duel.acceptedRun', 'Duel accepté. Lance ton run !') : tr('duel.declined', 'Duel refusé.'));
          try { window._voltBgCacheInvalidate && window._voltBgCacheInvalidate('getMyDuels'); } catch (_) {}
        } else {
          toast(` ${_duelErrorLabel(r.error)}`);
        }
        await _renderDuels(el);
      });
    });

    el.querySelectorAll('.duel-info-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const duel = duels.find(d => String(d.id) === String(btn.dataset.id));
        _showDuelInfoModal(duel);
      });
    });

    el.querySelectorAll('.duel-cancel-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        const ok = await confirmModal(tr('duel.cancelTitle', 'Annuler le 1v1'), tr('duel.cancelMessage', 'Cette invitation sera annulée pour les deux joueurs. Un duel actif ne peut pas être annulé.'), tr('duel.cancelConfirm', 'Annuler le duel'), true);
        if (!ok) return;
        btn.disabled = true;
        const r = await bg('cancelDuel', { matchId: btn.dataset.id });
        if (r.success) {
          toast(tr('duel.cancelledToast', 'Duel annulé.'));
          try { window._voltBgCacheInvalidate && window._voltBgCacheInvalidate('getMyDuels'); } catch (_) {}
        } else {
          toast(` ${_duelErrorLabel(r.error)}`);
        }
        await _renderDuels(el);
      });
    });

    el.querySelectorAll('.duel-abandon-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        const ok = await confirmModal(
          tr('duel.abandonTitle', 'Abandonner le 1v1'),
          tr('duel.abandonMessage', 'Si la run est lancée, l’adversaire gagne. Continuer ?'),
          tr('duel.abandonConfirm', 'Abandonner'),
          true
        );
        if (!ok) return;
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${trEsc('common.sending', 'Envoi…')}`;
        const r = await bg('abandonDuel', { matchId: btn.dataset.id });
        if (r.success) toast(r.cancelled ? tr('duel.abandonedCancelledToast', '1v1 annulé proprement.') : tr('duel.abandonedToast', '1v1 abandonné.'));
        else toast(` ${_duelErrorLabel(r.error || r.reason || 'duel_abandon_failed')}`);
        await _renderDuels(el);
      });
    });

    el.querySelectorAll('.duel-claim-dc-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${trEsc('common.sending', 'Envoi…')}`;
        const r = await bg('claimDuelPartnerDisconnectWin', { matchId: btn.dataset.id });
        if (r.success) {
          toast(tr('duel.claimDcOk', 'Victoire réclamée — adversaire AFK.'));
        } else {
          const code = r.error || r.reason || 'claim_failed';
          if (code === 'opponent_recently_alive') toast(tr('duel.opponentAlive', 'Adversaire encore actif.'));
          else if (code === 'too_early') toast(tr('duel.tooEarly', 'Attends 5 minutes minimum.'));
          else if (code === 'opponent_already_started') toast(tr('duel.oppStarted', 'Adversaire déjà parti — réclamation impossible.'));
          else toast(` ${_duelErrorLabel(code)}`);
        }
        await _renderDuels(el);
      });
    });

    el.querySelectorAll('.vth-sticker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sticker = btn.dataset.sticker || '🔥';
        const board = btn.closest('.vth-duel-board');
        if (!board) return;
        const floater = document.createElement('span');
        floater.className = 'vth-sticker-float';
        floater.textContent = sticker;
        const btnRect = btn.getBoundingClientRect();
        const boardRect = board.getBoundingClientRect();
        floater.style.left = (btnRect.left - boardRect.left + btn.offsetWidth / 2 - 14) + 'px';
        floater.style.bottom = '0';
        board.style.position = 'relative';
        board.appendChild(floater);
        floater.addEventListener('animationend', () => floater.remove(), { once: true });
      });
    });

    _duelMaybeShowLiveNotifications(duels);
    _duelMaybeShowResultPopup(duels);
    _duelStartAutoRefresh(el, false);
    _duelStartLiveClock();
  }

  try {
    if (!window.__voltDuelQueueCancelledForRunPopupListener) {
      window.__voltDuelQueueCancelledForRunPopupListener = true;
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.action !== 'duelRandomQueueCancelledForRun') return;
        try { toast(msg.message || 'Recherche random annulée : une run a commencé.'); } catch (_) {}
        try {
          const el = document.getElementById('duels-content');
          if (el) _renderDuels(el);
        } catch (_) {}
      });
    }
  } catch (_) {}

  // ─── Chat de team ──────────────────────────────────────────

  function _renderTeamChat(el) {
    _stopTeamChatPolling();
    if (_teamChatListener) {
      chrome.runtime.onMessage.removeListener(_teamChatListener);
      _teamChatListener = null;
    }

    el.innerHTML = `
      <div class="vth-card" style="overflow:hidden;display:flex;flex-direction:column;height:320px;">
        <!-- Header -->
        <div style="padding:11px 16px;border-bottom:1px solid var(--border);
          display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <i class="fa-solid fa-comments" style="color:var(--brand);font-size:13px;"></i>
          <span style="font-size:13px;font-weight:700;color:var(--t1);flex:1;">${trEsc('team.inner.chat', 'Chat')}</span>
          <span style="width:7px;height:7px;border-radius:50%;background:${V.green};
            box-shadow:0 0 5px ${V.green}55;" title="${trEsc('team.realtimeActive', 'Synchronisation active / polling')}"></span>
        </div>

        <!-- Messages -->
        <div id="team-chat-messages" style="
          flex:1;overflow-y:auto;padding:12px 14px;
          display:flex;flex-direction:column;gap:8px;scrollbar-width:thin;">
          ${spinnerHTML()}
        </div>

        <!-- Input -->
        <div style="padding:10px 12px;border-top:1px solid var(--border);
          display:flex;gap:8px;flex-shrink:0;">
          <input id="team-chat-input" class="vth-input" type="text" maxlength="500"
            placeholder="${trEsc('chat.privatePlaceholder', 'Message…')}" style="flex:1;padding:8px 11px;font-size:12px;">
          <button id="team-chat-send" class="vth-btn vth-btn-primary vth-btn-icon">
            <i class="fa-solid fa-paper-plane" style="font-size:12px;"></i>
          </button>
        </div>
      </div>
    `;

    _loadTeamChatHistory();
    _startTeamChatPolling(4500);

    document.getElementById('team-chat-send')?.addEventListener('click', _sendTeamChatMsg);
    document.getElementById('team-chat-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) _sendTeamChatMsg();
    });

    _teamChatListener = (msg) => {
      if (msg.action === 'newTeamChatMessage') _appendTeamChatMessage(msg.message);
    };
    chrome.runtime.onMessage.addListener(_teamChatListener);
  }

  async function _loadTeamChatHistory(opts = {}) {
    if (!_myTeamData) return;
    const el = document.getElementById('team-chat-messages');
    if (!el) return;
    const wasNearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 90;
    const res = await bg('getTeamChat', { teamId: _myTeamData.id });
    if (!el) return;

    if (!res.success || !res.messages?.length) {
      if (!opts.silent) {
        el.innerHTML = `
          <div class="vth-empty" style="margin:auto;padding:20px;">
            <i class="fa-solid fa-comment-slash"></i>
            ${trEsc('chat.noMessageYet', 'Aucun message. Sois le premier !')}
          </div>`;
      }
      return;
    }

    const previousCount = el.querySelectorAll('[data-msg-id]').length;
    el.innerHTML = '';
    for (const m of res.messages) _appendTeamChatMessage(m, true);
    if (!opts.preserveScroll || wasNearBottom || previousCount === 0) el.scrollTop = el.scrollHeight;
  }

  function _appendTeamChatMessage(m, skipScroll = false) {
    const el = document.getElementById('team-chat-messages');
    if (!el) return;

    if (m.id && el.querySelector(`[data-msg-id="${safeAttrSelectorValue(m.id)}"]`)) return;

    const emptyEl = el.querySelector('.vth-empty');
    if (emptyEl) emptyEl.remove();

    const isMe = _myId && (m.uid === _myId || m.user_id === _myId);
    const initials = esc((m.pseudo || '?')[0].toUpperCase());

    const row = document.createElement('div');
    row.setAttribute('data-msg-id', m.id || '');
    row.style.cssText = `display:flex;gap:8px;align-items:flex-end;${isMe ? 'flex-direction:row-reverse;' : ''}`;

    const picUrl = isSafeMediaUrl(m.profilePic) ? esc(m.profilePic) : '';
    const pic = picUrl
      ? `<div class="vth-av" style="width:26px;height:26px;flex-shrink:0;"><img src="${picUrl}" alt=""></div>`
      : `<div class="vth-av" style="
          width:26px;height:26px;font-size:10px;font-weight:800;flex-shrink:0;
          background:${isMe ? 'var(--brand)' : 'var(--bg-input)'};
          color:${isMe ? '#fff' : 'var(--brand)'};">
          ${initials}
         </div>`;

    row.innerHTML = `
      ${pic}
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;${isMe ? 'align-items:flex-end;' : ''}">
        <div style="display:flex;align-items:baseline;gap:5px;margin-bottom:3px;
          ${isMe ? 'flex-direction:row-reverse;' : ''}">
          <span style="font-size:11px;font-weight:700;color:var(--brand);">${esc(m.pseudo || tr('chat.anonymous', 'Anonyme'))}</span>
          <span class="vth-meta" style="font-size:10px;">${fmtTime(m.created_at)}</span>
        </div>
        <div class="vth-bubble ${isMe ? 'vth-bubble-me' : 'vth-bubble-other'}">${esc(m.text)}</div>
      </div>
    `;

    el.appendChild(row);
    if (!skipScroll) el.scrollTop = el.scrollHeight;
  }

  async function _sendTeamChatMsg() {
    if (!_myTeamData) return;
    const input = document.getElementById('team-chat-input');
    const text = input?.value.trim() || '';
    if (!text) return;

    const sendBtn = document.getElementById('team-chat-send');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '.4'; }
    input.value = '';
    input.disabled = true;

    const res = await bg('sendTeamChatMessage', { teamId: _myTeamData.id, text });

    input.disabled = false;
    input.focus();
    if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = '1'; }

    if (!res.success) {
      const err = res.error === 'slowmode_active'
        ? tr('chat.slowmode', 'Patiente avant de renvoyer un message.')
        : `${tr('chat.sendError', 'Erreur d’envoi')} : ${res.error}`;
      toast(err);
      return;
    }
    _loadTeamChatHistory({ preserveScroll: false, silent: true });
  }

  // ─── Modal : inviter un joueur ─────────────────────────────

  function _showInviteModal() {
    if (!_myTeamData) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99990;
      display:flex;align-items:center;justify-content:center;padding:20px;
      animation:vth-fadein .15s ease;
    `;
    overlay.innerHTML = `
      <div class="vth-card" style="width:100%;max-width:290px;overflow:hidden;box-shadow:var(--shadow-lg);">
        <div style="padding:20px 20px 16px;">
          <div style="font-size:15px;font-weight:800;color:var(--t1);margin-bottom:4px;">${trEsc('team.invitePlayer', 'Inviter un joueur')}</div>
          <div class="vth-meta" style="margin-bottom:14px;">${trEsc('team.inviteDesc', 'Entre le pseudo exact du joueur.')}</div>
          <input id="modal-invite-pseudo" class="vth-input" type="text" maxlength="30"
            placeholder="${trEsc('team.exactPseudo', 'Pseudo exact…')}" style="margin-bottom:8px;">
          <div id="modal-inv-status" class="vth-meta" style="min-height:16px;text-align:center;"></div>
        </div>
        <div class="vth-sep"></div>
        <div style="display:flex;">
          <button id="modal-inv-cancel" class="vth-modal-action"
            style="color:var(--t3);border-right:1px solid var(--border);">${trEsc('common.cancel', 'Annuler')}</button>
          <button id="modal-inv-confirm" class="vth-modal-action" style="color:var(--brand);font-weight:800;">
            <i class="fa-solid fa-paper-plane" style="margin-right:5px;font-size:11px;"></i>${trEsc('team.invite', 'Inviter')}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const pseudoInput = /** @type {HTMLInputElement | null} */ (overlay.querySelector('#modal-invite-pseudo'));
    pseudoInput?.focus();

    overlay.querySelector('#modal-inv-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const doInvite = async () => {
      const pseudo = pseudoInput?.value.trim() || '';
      const statusEl = overlay.querySelector('#modal-inv-status');
      const confirmBtn = overlay.querySelector('#modal-inv-confirm');

      if (!pseudo) {
        statusEl.style.color = 'var(--danger)';
        statusEl.textContent = tr('team.pseudoRequired', 'Pseudo requis.');
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = tr('common.sending', 'Envoi…');
      statusEl.textContent = '';

      const res = await bg('inviteToTeam', { teamId: _myTeamData.id, targetPseudo: pseudo });

      if (res.success) {
        statusEl.style.color = V.green;
        statusEl.textContent = tr('team.inviteSent', 'Invitation envoyée !');
        setTimeout(() => overlay.remove(), 1400);
      } else {
        const errs = {
          user_not_found: tr('team.userNotFound', 'Joueur introuvable.'),
          target_already_in_team: tr('team.targetAlreadyInTeam', 'Ce joueur est déjà dans une team.'),
          team_full: tr('team.full', 'Team pleine.'),
          insufficient_permissions: tr('team.insufficientPermissions', 'Permissions insuffisantes.'),
          already_invited: tr('team.alreadyInvited', 'Invitation déjà envoyée.'),
        };
        statusEl.style.color = 'var(--danger)';
        statusEl.textContent = errs[res.error] || res.error;
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<i class="fa-solid fa-paper-plane" style="margin-right:5px;font-size:11px;"></i>${trEsc('team.invite', 'Inviter')}`;
      }
    };

    overlay.querySelector('#modal-inv-confirm')?.addEventListener('click', doInvite);
    pseudoInput?.addEventListener('keydown', e => e.key === 'Enter' && doInvite());
  }

  // ─── Acheter des places ────────────────────────────────────

  async function _buySlots() {
    if (!_myTeamData) return;
    const cost = 250;
    const credRes = await bg('getVoltCredits');
    const bal = credRes.balance ?? 0;

    if (bal < cost) {
      toast(tr('team.insufficientCredits', 'Crédits insuffisants ({balance} / {cost}). Complète des défis !', { balance: bal, cost }), 5000);
      return;
    }

    const ok = await confirmModal(
      tr('team.buySlots', 'Acheter des places'),
      tr('team.buySlotsMessage', '+5 places pour {cost} crédits\nSolde actuel : {balance} → {after} crédits', { cost, balance: bal, after: bal - cost }),
      tr('team.buySlotsConfirm', 'Acheter — {cost} crédits', { cost }),
      false
    );
    if (!ok) return;

    const res = await bg('buyTeamSlots', { teamId: _myTeamData.id, slots: 5 });
    if (res.success) {
      toast(tr('team.slotsBought', '+5 places achetées ! Capacité max : {max}', { max: res.new_max }), 4000);
      await _refreshTeamView();
    } else {
      const errs = {
        insufficient_credits: tr('team.insufficientCredits', 'Crédits insuffisants ({balance} / {cost}). Complète des défis !', { balance: bal, cost }),
        max_cap_exceeded: tr('team.maxCapReached', 'Limite de 50 membres atteinte.'),
        not_owner: tr('team.ownerOnly', 'Réservé au Capitaine.'),
      };
      toast(errs[res.error] || ` ${res.error}`);
    }
  }

  // ─── Quitter / Dissoudre la team ──────────────────────────

  async function _leaveTeam() {
    if (!_myTeamData) return;
    const membersCount = _myTeamData.team_members?.length ?? 0;

    if (_myTeamRole === 'owner' && membersCount > 1) {
      toast(tr('team.transferFirst', 'Transfère d’abord le commandement (onglet Membres).'), 5000);
      return;
    }

    const isDissolution = _myTeamRole === 'owner' && membersCount <= 1;
    const ok = await confirmModal(
      isDissolution ? tr('team.dissolveTitle', 'Dissoudre la team') : tr('team.leaveTitle', 'Quitter la team'),
      isDissolution
        ? tr('team.dissolveMessage', 'Tu es le seul membre. La team sera définitivement supprimée. Cette action est irréversible.')
        : tr('team.leaveMessage', 'Quitter la team définitivement ?'),
      isDissolution ? tr('team.dissolve', 'Dissoudre') : tr('team.leave', 'Quitter'),
      true
    );
    if (!ok) return;

    const res = await bg('leaveTeam');
    if (res.success) {
      try { window._voltBgCacheInvalidate && window._voltBgCacheInvalidate(''); } catch (_) {}
      toast(res.dissolved ? tr('team.dissolved', 'Team dissoute.') : tr('team.left', 'Tu as quitté la team.'), 3000);
      try { chrome.storage.local.remove('myTeamId', () => void chrome.runtime?.lastError); } catch (_) {}
      _teamChatListener && chrome.runtime.onMessage.removeListener(_teamChatListener);
      _teamChatListener = null;
      _stopTeamChatPolling();
      _teamsInitialized = false;
      setTimeout(() => window.initTeamsSection(true), 400);
    } else {
      const errs = { transfer_ownership_first: tr('team.transferFirst', 'Transfère d’abord le commandement (onglet Membres).') };
      toast(` ${errs[res.error] || res.error}`);
    }
  }

  // ══════════════════════════════════════════════════════════
  // BOOTSTRAP — Navigation vers les sections
  // ══════════════════════════════════════════════════════════

  if (!window.__voltDuelResultListenerAttached) {
    window.__voltDuelResultListenerAttached = true;
    let _duelRuntimeRefreshTimer = null;
    const scheduleDuelRefresh = () => {
      const duels = document.getElementById('section-duels');
      if (!duels?.classList.contains('active')) return;
      clearTimeout(_duelRuntimeRefreshTimer);
      _duelRuntimeRefreshTimer = setTimeout(() => {
        if (_duelIsFormFieldFocused() || _duelIsTextInputTarget(document.activeElement)) {
          scheduleDuelRefresh();
          return;
        }
        window.initDuelsSection(true);
      }, _duelIsFormFieldFocused() ? 900 : 180);
    };
    chrome.runtime?.onMessage?.addListener((message) => {
      if (!message) return;
      // Pas de toast dans l'extension : notifications uniquement injectées en jeu.
      if (message.action === 'duelOpponentRunEvent' || message.action === 'duelResultRecorded' || message.action === 'duelLiveStateUpdated' || message.action === 'duelAccepted' || message.action === 'duelNoStartWinClaimed') {
        scheduleDuelRefresh();
      }
    });
    try {
      window.addEventListener('pagehide', () => clearTimeout(_duelRuntimeRefreshTimer), { once: true });
    } catch (_) {}
  }

  const _sectionHandlers = {
    'section-team': () => window.initTeamsSection(),
    'section-duels': () => window.initDuelsSection(),
    'section-challenges-credits': () => window.initChallengesCreditsSection(),
  };

  const _sectionObserver = new MutationObserver((mutations) => {
    for (const mut of mutations) {
      if (mut.type !== 'attributes') continue;
      const el = mut.target;
      if (!el.classList.contains('active')) continue;
      const id = el.id;
      if (_sectionHandlers[id]) _sectionHandlers[id]();
    }
  });

  setTimeout(() => {
    for (const id of Object.keys(_sectionHandlers)) {
      const el = document.getElementById(id);
      if (el) {
        _sectionObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
        if (el.classList.contains('active')) _sectionHandlers[id]();
      }
    }
  }, 200);

  try {
    window.addEventListener('pagehide', () => {
      try { _sectionObserver.disconnect(); } catch (_) {}
      try { _duelStopAutoRefresh(); } catch (_) {}
      try { _stopTeamChatPolling(); } catch (_) {}
    }, { once: true });
  } catch (_) {}

  window.updateSocialPopup = function () {
    _duelStopAutoRefresh();
    _creditsInitialized = false;
    _challengesInitialized = false;
    _teamsInitialized = false;
    _duelsInitialized = false;
    const comb = document.getElementById('section-challenges-credits');
    const team = document.getElementById('section-team');
    const duels = document.getElementById('section-duels');
    if (comb?.classList.contains('active')) /** @type {any} */(window.initChallengesCreditsSection)(true);
    if (team?.classList.contains('active')) window.initTeamsSection(true);
    if (duels?.classList.contains('active')) window.initDuelsSection(true);
  };

  window.initAppSystems = window.updateSocialPopup;

})();

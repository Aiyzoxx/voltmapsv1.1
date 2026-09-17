// @ts-check
(function () {
  'use strict';

  // AUDIT R.5: minimal i18n loader for admin.html. Reads the popup's
  // chrome.storage.local 'preferredLanguage' and fetches the matching
  // i18n/<locale>.json from the extension package. Silent fallback to FR
  // (HTML text content) if anything fails. Bindings:
  //   data-i18n-key         -> element.textContent
  //   data-i18n-placeholder -> element.placeholder
  //   data-i18n-title       -> element.title
  const _adminI18nLocales = ['fr', 'en', 'pt-BR', 'zh'];
  let _adminI18nDict = null;
  let _adminCurrentLocale = 'fr';
  async function _adminLoadI18n() {
    let locale = 'fr';
    try {
      const stored = await new Promise(r => chrome.storage.local.get(['preferredLanguage'], r));
      const raw = String(stored?.preferredLanguage || '').trim();
      if (_adminI18nLocales.includes(raw)) locale = raw;
    } catch (_) { /* default fr */ }
    _adminCurrentLocale = locale;
    if (locale === 'fr') return; // FR is the HTML default — no work needed.
    try {
      const res = await fetch(chrome.runtime.getURL(`i18n/${locale}.json`));
      if (!res.ok) return;
      _adminI18nDict = await res.json();
    } catch (_) { _adminI18nDict = null; }
  }
  function _adminTr(key) {
    if (!_adminI18nDict) return null;
    const v = _adminI18nDict[key];
    return (typeof v === 'string' && v.length > 0) ? v : null;
  }
  function _adminApplyI18n(root = document) {
    if (!_adminI18nDict) return;
    root.querySelectorAll('[data-i18n-key]').forEach((el) => {
      const k = el.getAttribute('data-i18n-key');
      const v = k ? _adminTr(k) : null;
      if (v) el.textContent = v;
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const k = el.getAttribute('data-i18n-placeholder');
      const v = k ? _adminTr(k) : null;
      if (v) el.setAttribute('placeholder', v);
    });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const k = el.getAttribute('data-i18n-title');
      const v = k ? _adminTr(k) : null;
      if (v) el.setAttribute('title', v);
    });
  }
  // Public-ish helper so the section map below can localize titles/descs.
  function _adminLocalizedSection(key, fallback) {
    return _adminTr(`admin.section.${key}`) || fallback;
  }
  // Kick off i18n loading; apply when ready (idempotent).
  _adminLoadI18n().then(() => _adminApplyI18n(document)).catch(() => {});

  const client = self.supabaseClient;
  const content = /** @type {HTMLElement} */ (document.getElementById('admin-content'));
  const alertBox = /** @type {HTMLElement} */ (document.getElementById('admin-alert'));
  const roleLabel = /** @type {HTMLElement} */ (document.getElementById('admin-role-label'));
  const pageTitle = /** @type {HTMLElement} */ (document.getElementById('admin-page-title'));
  const pageDescription = /** @type {HTMLElement} */ (document.getElementById('admin-page-description'));
  const refreshBtn = /** @type {HTMLButtonElement} */ (document.getElementById('admin-refresh-btn'));
  const closeBtn = /** @type {HTMLButtonElement} */ (document.getElementById('admin-close-btn'));
  const nav = /** @type {HTMLElement} */ (document.getElementById('admin-nav'));

  const modal = /** @type {HTMLElement} */ (document.getElementById('admin-modal'));
  const modalTitle = /** @type {HTMLElement} */ (document.getElementById('admin-modal-title'));
  const modalDescription = /** @type {HTMLElement} */ (document.getElementById('admin-modal-description'));
  const modalFields = /** @type {HTMLElement} */ (document.getElementById('admin-modal-fields'));
  const modalReason = /** @type {HTMLTextAreaElement} */ (document.getElementById('admin-modal-reason'));
  const modalConfirm = /** @type {HTMLButtonElement} */ (document.getElementById('admin-modal-confirm'));
  const modalCancel = /** @type {HTMLButtonElement} */ (document.getElementById('admin-modal-cancel'));
  const modalClose = /** @type {HTMLButtonElement} */ (document.getElementById('admin-modal-close'));

  const state = {
    me: null,
    section: 'dashboard',
    loading: false,
    offset: { users: 0, messages: 0, clans: 0, runs: 0, duels: 0, logs: 0 },
    filters: {
      users: { q: '', status: 'all' },
      messages: { kind: 'global', q: '' },
      clans: { q: '' },
      runs: { q: '', status: 'all', source: 'all' },
      duels: { q: '', status: 'all' },
      logs: { q: '' }
    }
  };

  const sections = {
    dashboard: ['Dashboard admin', 'Vue d’ensemble de la modération et des anomalies.'],
    users: ['Gestion utilisateurs', 'Recherche, bans temporaires/permanents et statut du compte.'],
    messages: ['Gestion messages', 'Masquage/restauration par soft delete avec raison obligatoire.'],
    clans: ['Gestion clans / teams', 'Désactivation/restauration prudente des clans.'],
    runs: ['Gestion runs / temps', 'Ajout, modification, invalidation et restauration de runs.'],
    duels: ['Gestion 1v1 / duels', 'Annulation, void et résolution des duels bloqués.'],
    'review-queue': ['Anti-cheat queue', 'Duels void/cancelled/abandoned ou joueurs avec score de suspicion ≥ 50.'],
    seasons: ['Saisons ELO', 'Ouvrir et clôturer une saison ranked, avec récompenses graduées.'],
    logs: ['Audit logs', 'Historique complet des actions admin sensibles.'],
    stats: ['Stats live', 'DAU, MAU, runs, messages, nouveaux users — rafraîchi toutes les 60s.'],
    'bans-ip': ['Bans IP', 'Bannir une adresse IP (permanent ou temporaire).'],
    appeals: ['Appels de ban', 'Traiter les contestations de ban en attente.'],
    modlog: ['Journal de modération', 'Audit trail de toutes les actions admin (bans, badges, appels…).'],
    badges: ['Badges de tournoi', 'Assigner des badges exclusifs aux joueurs après un tournoi.'],
    usersearch: ['Recherche utilisateurs', 'Recherche avancée par pseudo, grade et tranche ELO.']
  };

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const _adminTT = (typeof trustedTypes !== 'undefined' && trustedTypes?.createPolicy)
    ? trustedTypes.createPolicy('admin-internal', {
        createHTML: (input) => String(input || ''),
        createScript: () => { throw new Error('admin-internal: script blocked'); },
        createScriptURL: () => { throw new Error('admin-internal: scriptURL blocked'); }
      })
    : null;
  function safeAdminHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, iframe, object, embed').forEach(el => el.remove());
    const div = document.createElement('div');
    div.innerHTML = doc.body.innerHTML;
    const sanitized = div.innerHTML;
    if (_adminTT) return _adminTT.createHTML(sanitized);
    return sanitized;
  }

  function fmtDate(value) {
    if (!value) return '<span class="admin-muted">—</span>';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '<span class="admin-muted">date invalide</span>';
    return esc(date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }));
  }

  function fmtDuration(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '<span class="admin-badge danger">invalide</span>';
    if (n < 60) return `${n.toFixed(2)}s`;
    const m = Math.floor(n / 60);
    const s = n % 60;
    return `${m}m ${s.toFixed(1)}s`;
  }

  function shortId(value) {
    const s = String(value || '');
    if (!s) return '—';
    return s.length > 12 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s;
  }

  function badge(label, type = '') {
    return `<span class="admin-badge ${esc(type)}">${esc(label)}</span>`;
  }

  /** @type {ReturnType<typeof setTimeout>|null} */
  let _showAlertTimer = null;
  /** @type {ReturnType<typeof setInterval>|null} */
  let _statsRefreshTimer = null;
  /** @param {string} message @param {string} [type] */
  function showAlert(message, type = 'error') {
    alertBox.className = `admin-alert ${type === 'success' ? 'success' : ''}`;
    alertBox.textContent = message;
    alertBox.hidden = false;
    if (_showAlertTimer) clearTimeout(_showAlertTimer);
    _showAlertTimer = setTimeout(() => { alertBox.hidden = true; }, 6000);
  }

  function setLoading(text = 'Chargement…') {
    content.innerHTML = `<div class="admin-loading">${esc(text)}</div>`;
  }

  async function rpc(name, args = {}) {
    if (!client) throw new Error('Supabase non initialisé');
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error(error?.message || `RPC ${name} échouée`);
    if (data && data.success === false) throw new Error(data.error || `RPC ${name} refusée`);
    return data || {};
  }

  function hasPerm(permission) {
    const perms = state.me?.permissions || [];
    return state.me?.role === 'owner' || perms.includes(permission);
  }

  function serializeForm(form) {
    const values = {};
    new FormData(form).forEach((value, key) => { values[key] = String(value || '').trim(); });
    return values;
  }

  function pageSize(section) {
    return section === 'users' ? 25 : 50;
  }

  function isUUID(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
  }

  function requireUUID(value, label = 'UUID') {
    if (!isUUID(value)) throw new Error(`${label} invalide.`);
    return value;
  }

  function requirePositiveNumber(value, label = 'Nombre') {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) throw new Error(`${label} invalide.`);
    return n;
  }

  function requireAllowed(value, allowed, label = 'Valeur') {
    const clean = String(value || '').trim();
    if (!allowed.includes(clean)) throw new Error(`${label} invalide.`);
    return clean;
  }

  function normalizeOptionalIsoDate(value) {
    const clean = String(value || '').trim();
    if (!clean) return null;
    const t = Date.parse(clean);
    if (!Number.isFinite(t)) throw new Error('Date ISO invalide.');
    return new Date(t).toISOString();
  }

  function pagination(section) {
    const prevDisabled = (state.offset[section] || 0) <= 0 ? 'disabled' : '';
    return `
      <div class="admin-pagination">
        <button class="admin-button secondary" data-page-prev="${esc(section)}" ${prevDisabled}>Précédent</button>
        <button class="admin-button secondary" data-page-next="${esc(section)}">Suivant</button>
      </div>`;
  }

  function empty(label) {
    return `<div class="admin-empty">${esc(label)}</div>`;
  }

  function table(headers, rows) {
    if (!rows.length) return empty('Aucun résultat.');
    return `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>`;
  }

  function textField(name, label, value = '', placeholder = '') {
    return `<label class="admin-field"><span class="admin-label">${esc(label)}</span><input class="admin-input" name="${esc(name)}" value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
  }

  function selectField(name, label, value, options) {
    return `<label class="admin-field"><span class="admin-label">${esc(label)}</span><select class="admin-select" name="${esc(name)}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(value) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  }

  function toolbar(section, fields, extra = '') {
    return `
      <form class="admin-card admin-toolbar" data-filter-form="${esc(section)}">
        ${fields}
        <button class="admin-button" type="submit">Rechercher</button>
        ${extra}
      </form>`;
  }

  let modalResolver = null;
  function closeModal(result = null) {
    modal.hidden = true;
    modalReason.value = '';
    modalReason.removeAttribute('aria-invalid');
    modalFields.innerHTML = '';
    modalConfirm.disabled = false;
    if (modalResolver) modalResolver(result);
    modalResolver = null;
  }

  function openReasonModal(config) {
    modalTitle.textContent = config.title || 'Action admin';
    modalDescription.textContent = config.description || 'Confirme cette action sensible.';
    modalReason.value = '';
    modalReason.removeAttribute('aria-invalid');
    modalFields.innerHTML = safeAdminHTML(config.fields || '');
    modalConfirm.textContent = config.confirmText || 'Confirmer';
    modalConfirm.disabled = false;
    modal.hidden = false;
    setTimeout(() => modalReason.focus(), 50);
    return new Promise(resolve => { modalResolver = resolve; });
  }

  async function requireReason(config) {
    return openReasonModal(config);
  }

  modalConfirm.addEventListener('click', (e) => {
    e.preventDefault();
    modalConfirm.disabled = true;
    try {
      const reason = modalReason.value.trim();
      if (reason.length < 3) {
        modalReason.setAttribute('aria-invalid', 'true');
        showAlert('La raison admin est obligatoire et doit contenir au moins 3 caractères.');
        modalReason.focus();
        modalConfirm.disabled = false;
        return;
      }
      /** @type {Record<string, string>} */
      const extra = {};
      modalFields.querySelectorAll('input,select,textarea').forEach(/** @param {Element} el */ (el) => {
        const inp = /** @type {HTMLInputElement} */ (el);
        if (inp.name) extra[inp.name] = String(inp.value || '').trim();
      });
      closeModal({ reason, extra });
    } catch (err) {
      showAlert(err?.message || String(err));
      modalConfirm.disabled = false;
    }
  });
  modalCancel.addEventListener('click', () => closeModal(null));
  modalClose.addEventListener('click', () => closeModal(null));
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(null); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) closeModal(null);
  });

  async function init() {
    if (!client) {
      content.innerHTML = '<div class="admin-denied">Supabase n’est pas chargé. Impossible d’ouvrir le panneau admin.</div>';
      return;
    }
    try {
      const me = await rpc('admin_get_me');
      state.me = me;
      if (!me.is_admin) {
        roleLabel.textContent = 'Accès refusé';
        content.innerHTML = '<div class="admin-denied">Accès refusé. Ce compte n’a aucun rôle admin actif côté base de données.</div>';
        nav.querySelectorAll('button').forEach(btn => { btn.disabled = true; });
        return;
      }
      roleLabel.textContent = `${me.role || 'admin'} · ${Array.isArray(me.permissions) ? me.permissions.length : 0} permissions`;
      await loadSection('dashboard');
    } catch (error) {
      content.innerHTML = `<div class="admin-denied">Impossible de vérifier le rôle admin : ${esc(error?.message || '')}</div>`;
    }
  }

  async function loadSection(section = state.section) {
    // Stopper le rafraîchissement automatique des stats si on change de section
    if (section !== 'stats' && _statsRefreshTimer) {
      clearInterval(_statsRefreshTimer);
      _statsRefreshTimer = null;
    }
    state.section = section;
    const [title, desc] = sections[section] || sections.dashboard;
    // AUDIT R.5: prefer localized title/desc when an i18n key exists.
    pageTitle.textContent = _adminLocalizedSection(section + '.title', title);
    pageDescription.textContent = _adminLocalizedSection(section + '.desc', desc);
    nav.querySelectorAll('.admin-nav-btn').forEach(/** @param {Element} el */ (el) => {
      const btn = /** @type {HTMLButtonElement} */ (el);
      btn.classList.toggle('active', btn.dataset.section === section);
    });
    setLoading();
    try {
      if (section === 'dashboard') return await renderDashboard();
      if (section === 'users') return await renderUsers();
      if (section === 'messages') return await renderMessages();
      if (section === 'clans') return await renderClans();
      if (section === 'runs') return await renderRuns();
      if (section === 'duels') return await renderDuels();
      if (section === 'review-queue') return await renderReviewQueue();
      if (section === 'seasons') return await renderSeasons();
      if (section === 'logs') return await renderLogs();
      if (section === 'stats') return await renderStats();
      if (section === 'bans-ip') return await renderBansIp();
      if (section === 'appeals') return await renderAppeals();
      if (section === 'modlog') return renderModerationLog();
      if (section === 'badges') return renderTournamentBadges();
      if (section === 'usersearch') return renderAdminUserSearch();
    } catch (error) {
      content.innerHTML = `<div class="admin-denied">Erreur : ${esc(error?.message || '')}</div>`;
    }
  }

  async function renderDashboard() {
    const data = await rpc('admin_get_dashboard');
    const actions = data.actions_recent || [];
    content.innerHTML = `
      <div class="admin-grid">
        ${kpi(data.users_total, 'Utilisateurs')}
        ${kpi(data.users_banned, 'Utilisateurs bannis')}
        ${kpi(data.messages_recent, 'Messages 24h')}
        ${kpi(data.clans_active, 'Clans actifs')}
        ${kpi(data.runs_recent, 'Runs 24h')}
        ${kpi(data.runs_suspicious, 'Runs suspectes')}
        ${kpi(data.duels_open, 'Duels ouverts')}
        ${kpi(data.duels_stuck, 'Duels bloqués')}
      </div>
      <div class="admin-card">
        <h2>Actions admin récentes</h2>
        ${table(['Action','Cible','Raison','Date'], actions.map(a => `
          <tr>
            <td>${badge(a.action || 'action')}</td>
            <td><span class="admin-mono">${esc(a.target_type || '')}:${esc(shortId(a.target_id))}</span></td>
            <td>${esc(a.reason || '')}</td>
            <td>${fmtDate(a.created_at)}</td>
          </tr>`))}
      </div>`;
  }

  function kpi(value, label) {
    return `<div class="admin-kpi"><div class="admin-kpi-value">${esc(value ?? 0)}</div><div class="admin-kpi-label">${esc(label)}</div></div>`;
  }

  async function renderUsers() {
    if (!hasPerm('manage_users') && !hasPerm('manage_bans')) throw new Error('Permission manage_users/manage_bans manquante.');
    const f = state.filters.users;
    const data = await rpc('admin_search_users', { p_query: f.q, p_status: f.status, p_limit: 25, p_offset: state.offset.users });
    const rows = (data.users || []).map(u => `
      <tr>
        <td><strong>${esc(u.pseudo || u.username || 'Anonyme')}</strong><div class="admin-muted">${esc(u.email || '')}</div><div class="admin-mono">${esc(u.id)}</div></td>
        <td>${esc(u.role || 'user')} ${u.grade ? `<div>${badge(u.grade)}</div>` : ''}</td>
        <td>${u.is_banned || u.has_active_ban ? badge('banni', 'danger') : badge('actif', 'success')}</td>
        <td>Runs: ${esc(u.run_count || 0)}<br>Duels: ${esc(u.duel_count || 0)}<br>Crédits: ${esc(u.credits ?? '—')} · Tokens: ${esc(u.tokens ?? '—')}</td>
        <td>${fmtDate(u.created_at)}</td>
        <td><div class="admin-row-actions">
          <button class="admin-mini-btn danger" data-action="ban-user" data-user-id="${esc(u.id)}" data-user-label="${esc(u.pseudo || u.email || u.id)}">Ban</button>
          <button class="admin-mini-btn success" data-action="unban-user" data-user-id="${esc(u.id)}" data-user-label="${esc(u.pseudo || u.email || u.id)}">Unban</button>
        </div></td>
      </tr>`);
    content.innerHTML = `
      ${toolbar('users', textField('q','Pseudo, email ou UUID', f.q, 'ex: joueur, email, uuid') + selectField('status','Statut',f.status,[['all','Tous'],['banned','Bannis'],['active','Actifs']]))}
      <div class="admin-card"><h2>Utilisateurs</h2>${table(['Utilisateur','Rôle','Statut','Activité','Création','Actions'], rows)}${pagination('users')}</div>`;
  }

  async function renderMessages() {
    if (!hasPerm('manage_messages')) throw new Error('Permission manage_messages manquante.');
    const f = state.filters.messages;
    const data = await rpc('admin_search_messages', { p_kind: f.kind, p_query: f.q, p_limit: 50, p_offset: state.offset.messages });
    const rows = (data.messages || []).map(m => `
      <tr>
        <td>${badge(m.message_table || 'message')} ${m.is_deleted ? badge('supprimé', 'danger') : badge('visible', 'success')}<div class="admin-mono">${esc(m.id)}</div></td>
        <td><strong>${esc(m.pseudo || 'Anonyme')}</strong><div class="admin-mono">${esc(m.user_id || '')}</div></td>
        <td>${esc(m.body || '').slice(0, 240)}${String(m.body || '').length > 240 ? '…' : ''}</td>
        <td>${fmtDate(m.created_at)}</td>
        <td><div class="admin-row-actions">
          ${m.is_deleted ? `<button class="admin-mini-btn success" data-action="restore-message" data-table="${esc(m.message_table)}" data-id="${esc(m.id)}">Restaurer</button>` : `<button class="admin-mini-btn danger" data-action="delete-message" data-table="${esc(m.message_table)}" data-id="${esc(m.id)}">Masquer</button>`}
        </div></td>
      </tr>`);
    content.innerHTML = `
      ${toolbar('messages', selectField('kind','Source',f.kind,[['global','Global'],['team','Team / clan'],['direct','Messages privés'],['all','Tout']]) + textField('q','Recherche',f.q,'contenu, pseudo, UUID'))}
      <div class="admin-card"><h2>Messages</h2>${table(['Type','Auteur','Contenu','Date','Actions'], rows)}${pagination('messages')}</div>`;
  }

  async function renderClans() {
    if (!hasPerm('manage_clans')) throw new Error('Permission manage_clans manquante.');
    const f = state.filters.clans;
    const data = await rpc('admin_search_clans', { p_query: f.q, p_limit: 50, p_offset: state.offset.clans });
    const rows = (data.clans || []).map(c => `
      <tr>
        <td><strong>${esc(c.name || 'Clan')}</strong> ${c.tag ? badge(c.tag) : ''}<div class="admin-mono">${esc(c.id)}</div></td>
        <td>${c.is_deleted ? badge('désactivé', 'danger') : badge('actif', 'success')}</td>
        <td>${esc(c.owner_pseudo || '—')}<div class="admin-mono">${esc(c.owner_id || '')}</div></td>
        <td>${esc(c.member_count || 0)} membre(s)</td>
        <td>${fmtDate(c.created_at)}</td>
        <td><div class="admin-row-actions">
          ${c.is_deleted ? `<button class="admin-mini-btn success" data-action="restore-clan" data-id="${esc(c.id)}">Restaurer</button>` : `<button class="admin-mini-btn danger" data-action="delete-clan" data-id="${esc(c.id)}">Désactiver</button>`}
        </div></td>
      </tr>`);
    content.innerHTML = `
      ${toolbar('clans', textField('q','Nom, tag ou UUID', f.q, 'ex: VOLT'))}
      <div class="admin-card"><h2>Clans</h2>${table(['Clan','Statut','Owner','Membres','Création','Actions'], rows)}${pagination('clans')}</div>`;
  }

  async function renderRuns() {
    if (!hasPerm('manage_runs')) throw new Error('Permission manage_runs manquante.');
    const f = state.filters.runs;
    const addButton = '<button class="admin-button secondary" type="button" data-action="open-add-run">Ajouter une run</button>';
    const data = await rpc('admin_search_runs', { p_query: f.q, p_status: f.status, p_source: f.source, p_limit: 50, p_offset: state.offset.runs });
    const rows = (data.runs || []).map(r => `
      <tr>
        <td>${badge(r.run_table || 'run')}<div class="admin-mono">${esc(r.id)}</div>${r.duel_id ? `<div>duel <span class="admin-mono">${esc(shortId(r.duel_id))}</span></div>` : ''}</td>
        <td><strong>${esc(r.pseudo || 'Anonyme')}</strong><div class="admin-mono">${esc(r.user_id || '')}</div></td>
        <td>${fmtDuration(r.time_value)}<div class="admin-muted">${esc(r.category || '')}</div></td>
        <td>${r.status === 'valid' ? badge('valid', 'success') : badge(r.status || 'invalid', 'danger')}<br>${badge(r.source || 'user')}</td>
        <td>${fmtDate(r.created_at)}</td>
        <td><div class="admin-row-actions">
          <button class="admin-mini-btn" data-action="update-run" data-table="${esc(r.run_table)}" data-id="${esc(r.id)}">Modifier</button>
          ${r.status === 'valid' ? `<button class="admin-mini-btn danger" data-action="invalidate-run" data-table="${esc(r.run_table)}" data-id="${esc(r.id)}">Invalider</button>` : `<button class="admin-mini-btn success" data-action="restore-run" data-table="${esc(r.run_table)}" data-id="${esc(r.id)}">Restaurer</button>`}
        </div></td>
      </tr>`);
    content.innerHTML = `
      ${toolbar('runs', textField('q','Pseudo, user, run ou duel UUID', f.q, 'recherche') + selectField('status','Statut',f.status,[['all','Tous'],['valid','Valid'],['invalid','Invalid'],['admin_voided','Admin voided']]) + selectField('source','Source',f.source,[['all','Toutes'],['user','User'],['admin_added','Admin added'],['duel','Duel']]), addButton)}
      <div class="admin-card"><h2>Runs / temps</h2>${table(['Source','User','Temps','Statut','Date','Actions'], rows)}${pagination('runs')}</div>`;
  }

  async function renderDuels() {
    if (!hasPerm('manage_duels')) throw new Error('Permission manage_duels manquante.');
    const f = state.filters.duels;
    const data = await rpc('admin_search_duels', { p_query: f.q, p_status: f.status, p_limit: 50, p_offset: state.offset.duels });
    const rows = (data.duels || []).map(d => `
      <tr>
        <td>${badge(d.status || 'duel', d.status === 'active' ? 'warning' : d.status === 'voided' || d.status === 'cancelled' ? 'danger' : '')}<div class="admin-mono">${esc(d.id)}</div>${d.is_stuck ? badge('bloqué', 'danger') : ''}</td>
        <td><strong>${esc(d.challenger_pseudo || 'A')}</strong><div>${fmtDuration(d.challenger_score)} · ${esc(d.challenger_state || '—')}</div><div class="admin-mono">${esc(shortId(d.challenger_uid))}</div></td>
        <td><strong>${esc(d.opponent_pseudo || 'B')}</strong><div>${fmtDuration(d.opponent_score)} · ${esc(d.opponent_state || '—')}</div><div class="admin-mono">${esc(shortId(d.opponent_uid))}</div></td>
        <td>${fmtDate(d.created_at)}<br><span class="admin-muted">fin: ${fmtDate(d.completed_at || d.ends_at)}</span></td>
        <td><div class="admin-row-actions">
          <button class="admin-mini-btn danger" data-action="cancel-duel" data-id="${esc(d.id)}">Annuler</button>
          <button class="admin-mini-btn danger" data-action="void-duel" data-id="${esc(d.id)}">Void</button>
          <button class="admin-mini-btn" data-action="resolve-duel" data-id="${esc(d.id)}" data-challenger="${esc(d.challenger_uid)}" data-opponent="${esc(d.opponent_uid)}">Résoudre</button>
        </div></td>
      </tr>`);
    content.innerHTML = `
      ${toolbar('duels', textField('q','Pseudo ou UUID duel/user', f.q, 'recherche') + selectField('status','Statut',f.status,[['all','Tous'],['pending','Pending'],['active','Active'],['completed','Completed'],['stuck','Bloqués'],['cancelled','Cancelled'],['voided','Voided']]))}
      <div class="admin-card"><h2>Duels</h2>${table(['Duel','Joueur A','Joueur B','Dates','Actions'], rows)}${pagination('duels')}</div>`;
  }

  async function renderReviewQueue() {
    if (!hasPerm('view_audit_logs') && !hasPerm('manage_duels')) {
      throw new Error('Permission view_audit_logs/manage_duels manquante.');
    }
    const client = self.supabaseClient || (typeof window !== 'undefined' ? window.supabaseClient : null);
    if (!client) throw new Error('Supabase client indisponible.');

    // SEC C4: defense-in-depth — fail-fast server-side before reading admin view.
    // RLS on v_admin_review_queue still enforces actual access; this guards against
    // client UI being rendered while server policy is still being checked.
    try {
      const { data: perm, error: permErr } = await client.rpc('admin_assert_permission', { p_perm: 'view_audit_logs' });
      if (permErr) throw permErr;
      if (!perm?.success) throw new Error(perm?.error || 'forbidden');
    } catch (e) {
      throw new Error('Accès refusé: ' + (e?.message || 'forbidden'));
    }

    const { data, error } = await client
      .from('v_admin_review_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error?.message || 'Erreur lecture queue');

    const rows = (data || []).map(item => `
      <tr>
        <td><span class="admin-mono">${esc(shortId(item.match_id))}</span><div class="admin-muted">${fmtDate(item.created_at)}</div></td>
        <td>${badge(item.status || 'unknown', item.status === 'voided' || item.status === 'abandoned' ? 'danger' : 'warning')}</td>
        <td>
          <div><span class="admin-mono">${esc(shortId(item.challenger_uid))}</span></div>
          <div class="admin-muted">susp: ${esc(item.challenger_suspicion ?? 0)}</div>
        </td>
        <td>
          <div><span class="admin-mono">${esc(shortId(item.opponent_uid))}</span></div>
          <div class="admin-muted">susp: ${esc(item.opponent_suspicion ?? 0)}</div>
        </td>
        <td>${item.is_bot_match ? badge('bot', 'warning') : ''}</td>
        <td><div class="admin-row-actions">
          <button class="admin-mini-btn" data-action="bump-suspicion" data-user-id="${esc(item.challenger_uid)}" data-user-label="Challenger">+10 susp. challenger</button>
          <button class="admin-mini-btn" data-action="bump-suspicion" data-user-id="${esc(item.opponent_uid)}" data-user-label="Opponent">+10 susp. opponent</button>
          <button class="admin-mini-btn danger" data-action="void-duel" data-id="${esc(item.match_id)}">Void</button>
        </div></td>
      </tr>`);

    content.innerHTML = `
      <div class="admin-card">
        <h2>Queue de revue (${(data || []).length})</h2>
        <p class="admin-muted">Affiche les duels void/cancelled/abandoned, plus les joueurs dont le score de suspicion ≥ 50.</p>
        ${table(['Match', 'Statut', 'Challenger', 'Opponent', 'Type', 'Actions'], rows)}
      </div>`;
  }

  async function renderSeasons() {
    if (!hasPerm('manage_duels')) throw new Error('Permission manage_duels manquante.');
    const client = self.supabaseClient || (typeof window !== 'undefined' ? window.supabaseClient : null);
    if (!client) throw new Error('Supabase client indisponible.');

    // SEC C4: defense-in-depth server-side permission check before reading season table.
    try {
      const { data: perm, error: permErr } = await client.rpc('admin_assert_permission', { p_perm: 'manage_duels' });
      if (permErr) throw permErr;
      if (!perm?.success) throw new Error(perm?.error || 'forbidden');
    } catch (e) {
      throw new Error('Accès refusé: ' + (e?.message || 'forbidden'));
    }

    const { data, error } = await client
      .from('elo_seasons')
      .select('*')
      .order('starts_at', { ascending: false })
      .limit(20);
    if (error) throw new Error(error?.message || 'Erreur lecture saisons');

    const rows = (data || []).map(s => `
      <tr>
        <td><strong>${esc(s.name || '')}</strong><div class="admin-mono">#${esc(s.id)}</div></td>
        <td>${fmtDate(s.starts_at)} → ${fmtDate(s.ends_at)}</td>
        <td>${s.is_active ? badge('active', 'success') : (s.closed_at ? badge('closed', 'danger') : badge('inactive', 'warning'))}</td>
        <td>${s.closed_at ? fmtDate(s.closed_at) : '<span class="admin-muted">—</span>'}</td>
        <td><div class="admin-row-actions">
          ${s.is_active && !s.closed_at ? `<button class="admin-mini-btn danger" data-action="close-season" data-id="${esc(s.id)}" data-name="${esc(s.name)}">Clôturer</button>` : ''}
        </div></td>
      </tr>`);

    content.innerHTML = `
      <div class="admin-card">
        <h2>Saisons ELO</h2>
        <div style="margin-bottom:12px;">
          <button class="admin-button" id="admin-open-season-btn" type="button">+ Nouvelle saison</button>
        </div>
        ${table(['Saison', 'Fenêtre', 'Statut', 'Clôturée le', 'Actions'], rows)}
      </div>`;

    const openBtn = document.getElementById('admin-open-season-btn');
    if (openBtn) openBtn.addEventListener('click', async () => {
      const result = await requireReason({
        title: 'Ouvrir une nouvelle saison',
        description: 'Désactive la saison active. Format ISO : 2026-06-01T00:00:00Z',
        fields: `${textField('seasonName','Nom','','ex: Saison 1 - 2026')}${textField('startsAt','Début (ISO)','','2026-05-15T00:00:00Z')}${textField('endsAt','Fin (ISO)','','2026-08-15T00:00:00Z')}`,
        confirmText: 'Créer'
      });
      if (!result) return;
      try {
        const { data: r, error: e } = await client.rpc('admin_open_season', {
          p_name: result.extra.seasonName,
          p_starts_at: result.extra.startsAt,
          p_ends_at: result.extra.endsAt
        });
        if (e || !r?.success) throw new Error(e?.message || 'erreur');
        showAlert(`Saison #${r.season_id} ouverte.`, 'success');
        return loadSection('seasons');
      } catch (err) {
        showAlert(err?.message || 'Échec', 'danger');
      }
    });
  }

  async function renderLogs() {
    if (!hasPerm('view_logs')) throw new Error('Permission view_logs manquante.');
    const f = state.filters.logs;
    const data = await rpc('admin_get_audit_logs', { p_query: f.q, p_limit: 50, p_offset: state.offset.logs });
    const rows = (data.logs || []).map(l => `
      <tr>
        <td>${badge(l.action || 'action')}<div class="admin-mono">${esc(l.id)}</div></td>
        <td>${esc(l.admin_pseudo || 'admin')}<div class="admin-mono">${esc(shortId(l.admin_id))}</div></td>
        <td>${esc(l.target_type || '')}<div class="admin-mono">${esc(l.target_id || '')}</div>${l.target_pseudo ? `<div>${esc(l.target_pseudo)}</div>` : ''}</td>
        <td>${esc(l.reason || '')}</td>
        <td>${fmtDate(l.created_at)}</td>
      </tr>`);
    content.innerHTML = `
      ${toolbar('logs', textField('q','Action, raison, cible', f.q, 'recherche'))}
      <div class="admin-card"><h2>Audit logs</h2>${table(['Action','Admin','Cible','Raison','Date'], rows)}${pagination('logs')}</div>`;
  }

  nav.addEventListener('click', /** @param {Event} event */ (event) => {
    const tgt = /** @type {HTMLElement|null} */ (event.target);
    const btn = /** @type {HTMLButtonElement|null} */ (tgt?.closest('.admin-nav-btn') ?? null);
    if (!btn || btn.disabled) return;
    loadSection(btn.dataset.section);
  });

  refreshBtn.addEventListener('click', () => loadSection());
  closeBtn.addEventListener('click', () => window.close());

  content.addEventListener('submit', /** @param {Event} event */ (event) => {
    const tgt = /** @type {HTMLElement|null} */ (event.target);
    const form = /** @type {HTMLFormElement|null} */ (tgt?.closest('[data-filter-form]') ?? null);
    if (!form) return;
    event.preventDefault();
    const section = form.dataset.filterForm;
    if (!section) return;
    state.filters[section] = { ...state.filters[section], ...serializeForm(form) };
    state.offset[section] = 0;
    loadSection(section);
  });

  content.addEventListener('click', /** @param {Event} event */ async (event) => {
    const tgt = /** @type {HTMLElement|null} */ (event.target);
    const target = /** @type {HTMLButtonElement|null} */ (tgt?.closest('button') ?? null);
    if (!target) return;
    const action = target.dataset.action;
    const prev = target.dataset.pagePrev;
    const next = target.dataset.pageNext;
    if (prev || next) {
      const section = prev || next;
      const step = pageSize(section);
      state.offset[section] = Math.max(0, (state.offset[section] || 0) + (next ? step : -step));
      loadSection(section);
      return;
    }
    if (!action) return;
    target.disabled = true;
    try {
      await handleAction(target, action);
    } catch (error) {
      showAlert(error?.message || String(error));
    } finally {
      target.disabled = false;
    }
  });

  async function handleAction(target, action) {
    if (action === 'ban-user') {
      const result = await requireReason({
        title: 'Bannir utilisateur',
        description: `Bannir ${target.dataset.userLabel || target.dataset.userId}. Choisis un type et une durée éventuelle.`,
        fields: `${selectField('banType','Type de ban','global',[['global','Global'],['chat','Chat'],['leaderboard','Leaderboard'],['runs','Runs'],['duels','1v1 / duels'],['clans','Clans']])}${textField('expiresAt','Expiration optionnelle ISO','', '2026-06-01T12:00:00Z')}`,
        confirmText: 'Bannir'
      });
      if (!result) return;
      await rpc('admin_ban_user', { p_target_uid: requireUUID(target.dataset.userId, 'Utilisateur'), p_ban_type: result.extra.banType || 'global', p_reason: result.reason, p_expires_at: normalizeOptionalIsoDate(result.extra.expiresAt), p_admin_note: result.reason });
      showAlert('Utilisateur banni.', 'success');
      return loadSection('users');
    }
    if (action === 'unban-user') {
      const result = await requireReason({
        title: 'Débannir utilisateur',
        description: `Lever un ban pour ${target.dataset.userLabel || target.dataset.userId}.`,
        fields: selectField('banType','Type à lever','all',[['all','Tous'],['global','Global'],['chat','Chat'],['leaderboard','Leaderboard'],['runs','Runs'],['duels','1v1 / duels'],['clans','Clans']]),
        confirmText: 'Débannir'
      });
      if (!result) return;
      await rpc('admin_unban_user', { p_target_uid: requireUUID(target.dataset.userId, 'Utilisateur'), p_ban_type: result.extra.banType || 'all', p_reason: result.reason });
      showAlert('Ban levé.', 'success');
      return loadSection('users');
    }
    if (action === 'delete-message' || action === 'restore-message') {
      const result = await requireReason({ title: action === 'delete-message' ? 'Masquer message' : 'Restaurer message', description: `Table: ${target.dataset.table} · ID: ${target.dataset.id}`, confirmText: action === 'delete-message' ? 'Masquer' : 'Restaurer' });
      if (!result) return;
      await rpc(action === 'delete-message' ? 'admin_delete_message' : 'admin_restore_message', { p_message_table: requireAllowed(target.dataset.table, ['global_chat','direct_messages','team_chat'], 'Table message'), p_message_id: requireUUID(target.dataset.id, 'Message'), p_reason: result.reason });
      showAlert('Action message appliquée.', 'success');
      return loadSection('messages');
    }
    if (action === 'delete-clan' || action === 'restore-clan') {
      const result = await requireReason({ title: action === 'delete-clan' ? 'Désactiver clan' : 'Restaurer clan', description: `Clan ID: ${target.dataset.id}`, confirmText: action === 'delete-clan' ? 'Désactiver' : 'Restaurer' });
      if (!result) return;
      await rpc(action === 'delete-clan' ? 'admin_delete_clan' : 'admin_restore_clan', { p_team_id: requireUUID(target.dataset.id, 'Clan'), p_reason: result.reason });
      showAlert('Action clan appliquée.', 'success');
      return loadSection('clans');
    }
    if (action === 'open-add-run') {
      const result = await requireReason({
        title: 'Ajouter une run admin',
        description: 'La run sera marquée source=admin_added et auditée.',
        fields: `${textField('userId','User UUID','','00000000-0000-0000-0000-000000000000')}${textField('duration','Temps en secondes','','123.45')}${selectField('category','Catégorie','no_coin',[['no_coin','no_coin'],['speedrun','speedrun'],['no_coin_record','no_coin_record'],['no_coin_average','no_coin_average']])}${textField('createdAt','Date optionnelle ISO','','2026-05-02T12:00:00Z')}`,
        confirmText: 'Ajouter'
      });
      if (!result) return;
      await rpc('admin_add_run', { p_target_uid: requireUUID(result.extra.userId, 'Utilisateur'), p_duration: requirePositiveNumber(result.extra.duration, 'Temps'), p_category: result.extra.category || 'no_coin', p_created_at: normalizeOptionalIsoDate(result.extra.createdAt), p_reason: result.reason });
      showAlert('Run ajoutée.', 'success');
      return loadSection('runs');
    }
    if (action === 'update-run') {
      const result = await requireReason({ title: 'Modifier temps de run', description: `${target.dataset.table} · ${target.dataset.id}`, fields: textField('newTime','Nouveau temps en secondes','','123.45'), confirmText: 'Modifier' });
      if (!result) return;
      await rpc('admin_update_run_time', { p_run_table: requireAllowed(target.dataset.table, ['run_history','scores','duel_match_results'], 'Table run'), p_run_id: requireUUID(target.dataset.id, 'Run'), p_new_time: requirePositiveNumber(result.extra.newTime, 'Nouveau temps'), p_reason: result.reason });
      showAlert('Temps modifié.', 'success');
      return loadSection('runs');
    }
    if (action === 'invalidate-run' || action === 'restore-run') {
      const result = await requireReason({ title: action === 'invalidate-run' ? 'Invalider run' : 'Restaurer run', description: `${target.dataset.table} · ${target.dataset.id}`, confirmText: action === 'invalidate-run' ? 'Invalider' : 'Restaurer' });
      if (!result) return;
      await rpc(action === 'invalidate-run' ? 'admin_invalidate_run' : 'admin_restore_run', { p_run_table: requireAllowed(target.dataset.table, ['run_history','scores','duel_match_results'], 'Table run'), p_run_id: requireUUID(target.dataset.id, 'Run'), p_reason: result.reason });
      showAlert('Action run appliquée.', 'success');
      return loadSection('runs');
    }
    if (action === 'cancel-duel' || action === 'void-duel') {
      const result = await requireReason({ title: action === 'cancel-duel' ? 'Annuler duel' : 'Void duel', description: `Duel ID: ${target.dataset.id}. Les résultats liés seront marqués correctement.`, fields: selectField('refund','Rembourser tokens escrow','true',[['true','Oui'],['false','Non']]), confirmText: action === 'cancel-duel' ? 'Annuler' : 'Void' });
      if (!result) return;
      await rpc(action === 'cancel-duel' ? 'admin_cancel_duel' : 'admin_void_duel', { p_match_id: requireUUID(target.dataset.id, 'Duel'), p_reason: result.reason, p_refund_tokens: result.extra.refund !== 'false' });
      showAlert('Action duel appliquée.', 'success');
      return loadSection('duels');
    }
    if (action === 'resolve-duel') {
      const result = await requireReason({
        title: 'Résoudre duel',
        description: `Duel ID: ${target.dataset.id}. Utilise completed uniquement si un gagnant légitime est clair.`,
        fields: `${selectField('resolution','Résolution','voided',[['voided','Voided'],['cancelled','Cancelled'],['completed','Completed avec gagnant']])}${selectField('winner','Winner si completed','',[['','Aucun'],[target.dataset.challenger,'Challenger'],[target.dataset.opponent,'Opponent']])}`,
        confirmText: 'Résoudre'
      });
      if (!result) return;
      await rpc('admin_resolve_duel', { p_match_id: requireUUID(target.dataset.id, 'Duel'), p_resolution: result.extra.resolution || 'voided', p_winner_uid: result.extra.winner ? requireUUID(result.extra.winner, 'Gagnant') : null, p_reason: result.reason });
      showAlert('Duel résolu.', 'success');
      return loadSection('duels');
    }
    if (action === 'bump-suspicion') {
      const result = await requireReason({
        title: `Augmenter suspicion · ${target.dataset.userLabel || ''}`,
        description: 'Score capé à ±100. Tracé dans admin_audit_logs.',
        fields: `${textField('delta','Delta','10','+10 par défaut')}`,
        confirmText: 'Appliquer'
      });
      if (!result) return;
      const delta = Number(result.extra.delta) || 10;
      await rpc('admin_bump_suspicion', { p_uid: requireUUID(target.dataset.userId, 'Utilisateur'), p_delta: delta, p_reason: result.reason });
      showAlert('Suspicion mise à jour.', 'success');
      return loadSection('review-queue');
    }
    if (action === 'close-season') {
      const result = await requireReason({
        title: `Clôturer saison · ${target.dataset.name || target.dataset.id}`,
        description: 'Snapshot des rangs + récompenses graduées (top 1 / top 10 / top 100).',
        fields: `${textField('top1','Tokens top 1','100','100')}${textField('top10','Tokens top 2-10','30','30')}${textField('top100','Tokens top 11-100','10','10')}`,
        confirmText: 'Clôturer'
      });
      if (!result) return;
      await rpc('admin_close_season', {
        p_season_id: Number(target.dataset.id),
        p_reward_top1: Number(result.extra.top1) || 100,
        p_reward_top10: Number(result.extra.top10) || 30,
        p_reward_top100: Number(result.extra.top100) || 10
      });
      showAlert('Saison clôturée + snapshot enregistré.', 'success');
      return loadSection('seasons');
    }
    // -- Stats section actions --
    if (action === 'invalidate-suspicious-run') {
      const result = await requireReason({
        title: 'Invalider run suspecte',
        description: `Run ID: ${target.dataset.runId} · ${esc(target.dataset.pseudo || '')}`,
        confirmText: 'Invalider'
      });
      if (!result) return;
      const res = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'adminInvalidateSuspiciousRun', runId: target.dataset.runId, reason: result.reason }, resolve);
      });
      if (!res || !res.success) throw new Error(res?.error || 'Échec invalidation');
      showAlert('Run invalidée.', 'success');
      return loadSection('stats');
    }
    // -- Ban IP actions --
    if (action === 'submit-ban-ip') {
      const form = /** @type {HTMLFormElement|null} */ (target.closest('form'));
      if (!form) return;
      const vals = serializeForm(form);
      const ip = vals.ip || '';
      const reason = vals.reason || '';
      const duration = vals.duration || '';
      if (!ip) { showAlert('Adresse IP requise.'); return; }
      if (!reason || reason.length < 3) { showAlert('Raison requise (min 3 caractères).'); return; }
      const durationHours = duration ? Number(duration) : null;
      const res = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'banIpAddress', ip, reason, durationHours }, resolve);
      });
      if (!res || !res.success) throw new Error(res?.error || 'Échec ban IP');
      showAlert(`IP ${esc(ip)} bannie.`, 'success');
      return loadSection('bans-ip');
    }
    // -- Appeals actions --
    if (action === 'approve-appeal' || action === 'reject-appeal') {
      const decision = action === 'approve-appeal' ? 'approved' : 'rejected';
      const result = await requireReason({
        title: action === 'approve-appeal' ? "Approuver l’appel" : "Rejeter l’appel",
        description: `Appel ID: ${target.dataset.appealId} · Joueur: ${esc(target.dataset.pseudo || '')}`,
        confirmText: action === 'approve-appeal' ? 'Approuver' : 'Rejeter'
      });
      if (!result) return;
      const res = await new Promise(resolve => {
        chrome.runtime.sendMessage({
          action: 'reviewBanAppeal',
          appealId: target.dataset.appealId,
          decision,
          response: result.reason
        }, resolve);
      });
      if (!res || !res.success) throw new Error(res?.error || 'Échec révision appel');
      showAlert(decision === 'approved' ? 'Appel approuvé — ban levé.' : 'Appel rejeté.', 'success');
      return loadSection('appeals');
    }
  }

  // ----------------------------------------------------------------
  // Chart.js loader (admin-local, does not depend on popup.js)
  // ----------------------------------------------------------------
  /** @type {Promise<void>|null} */
  let _adminChartJsPromise = null;
  function loadAdminChartJs() {
    if (typeof window !== 'undefined' && /** @type {any} */ (window).Chart) return Promise.resolve();
    if (_adminChartJsPromise) return _adminChartJsPromise;
    _adminChartJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'chart.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Impossible de charger chart.min.js'));
      document.head.appendChild(script);
    });
    return _adminChartJsPromise;
  }

  // ----------------------------------------------------------------
  // SECTION : Stats live (DAU/MAU/runs/messages)
  // ----------------------------------------------------------------

  async function renderStats() {
    if (_statsRefreshTimer) { clearInterval(_statsRefreshTimer); _statsRefreshTimer = null; }

    async function doRender() {
      const res = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'adminGetDashboardStats' }, resolve);
      });
      if (!res || !res.success) {
        content.innerHTML = `<div class="admin-denied">Erreur stats : ${esc(res?.error || 'inconnue')}</div>`;
        return;
      }
      const s = res.stats || {};

      // Suspicious runs
      const runsRes = await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'adminGetSuspiciousRuns', limit: 50 }, resolve);
      });
      const suspRuns = (runsRes && runsRes.success ? runsRes.runs : null) || [];

      const suspRows = suspRuns.map(r => `
        <tr>
          <td><span class="admin-mono">${esc(r.id ? r.id.slice(0, 8) + '…' : '—')}</span></td>
          <td><strong>${esc(r.pseudo || 'Anonyme')}</strong><div class="admin-mono">${esc(r.user_id || '')}</div></td>
          <td>${esc(r.map_name || '—')}</td>
          <td>${esc(r.score ?? '—')}</td>
          <td>${r.duration_ms != null ? (r.duration_ms / 1000).toFixed(2) + 's' : '<span class="admin-muted">—</span>'}</td>
          <td><span class="admin-badge danger">${esc(r.suspect_reason || 'suspect')}</span></td>
          <td>${fmtDate(r.created_at)}</td>
          <td>
            <button class="admin-mini-btn danger" data-action="invalidate-suspicious-run"
              data-run-id="${esc(r.id || '')}" data-pseudo="${esc(r.pseudo || '')}">Invalider</button>
          </td>
        </tr>`);

      content.innerHTML = `
        <div class="admin-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">
          ${kpi(s.dau ?? '…', 'DAU (runs)')}
          ${kpi(s.mau ?? '…', 'MAU (runs)')}
          ${kpi(s.total_users ?? '…', 'Total utilisateurs')}
          ${kpi(s.active_bans ?? '…', 'Bans actifs')}
          ${kpi(s.runs_today ?? '…', 'Runs aujourd\'hui')}
          ${kpi(s.runs_week ?? '…', 'Runs 7 jours')}
          ${kpi(s.messages_today ?? '…', 'Messages aujourd\'hui')}
          ${kpi(s.messages_week ?? '…', 'Messages 7 jours')}
          ${kpi(s.new_users_today ?? '…', 'Nouveaux users auj.')}
          ${kpi(s.new_users_week ?? '…', 'Nouveaux users 7j')}
          ${kpi(s.duel_matches_today ?? '…', 'Duels aujourd\'hui')}
          ${kpi(s.pending_appeals ?? '…', 'Appels en attente')}
        </div>
        <div class="admin-card">
          <h2>Runs par heure (24h)</h2>
          <canvas id="admin-stats-chart" height="80"></canvas>
        </div>
        <div class="admin-card">
          <h2>Runs suspectes (${esc(suspRuns.length)})</h2>
          <p class="admin-muted" style="margin-bottom:8px">Runs avec score top 0.1% ou durée &lt; 10s. Cliquer "Invalider" pour les retirer du leaderboard.</p>
          ${table(['ID','Joueur','Map','Score','Durée','Raison','Date','Action'], suspRows)}
        </div>`;

      // Graphe runs par heure
      try {
        await loadAdminChartJs();
        const ChartCtor = /** @type {any} */ (window).Chart;
        const chartCanvas = /** @type {HTMLCanvasElement|null} */ (document.getElementById('admin-stats-chart'));
        if (chartCanvas && ChartCtor) {
          const runsPerHour = Array.isArray(s.runs_per_hour) ? s.runs_per_hour : [];
          // Génère les 24 dernières heures même si pas de données
          const now = new Date();
          const labels = [];
          const values = [];
          for (let i = 23; i >= 0; i--) {
            const h = new Date(now.getTime() - i * 3600000);
            h.setMinutes(0, 0, 0);
            const isoH = h.toISOString();
            labels.push(h.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
            const found = runsPerHour.find(x => {
              if (!x.hour) return false;
              return new Date(x.hour).toISOString().slice(0, 13) === isoH.slice(0, 13);
            });
            values.push(found ? Number(found.count) : 0);
          }
          if (/** @type {any} */ (chartCanvas)._adminChart) {
            /** @type {any} */ (chartCanvas)._adminChart.destroy();
          }
          /** @type {any} */ (chartCanvas)._adminChart = new ChartCtor(chartCanvas, {
            type: 'bar',
            data: {
              labels,
              datasets: [{
                label: 'Runs',
                data: values,
                backgroundColor: 'rgba(52, 211, 153, 0.5)',
                borderColor: 'rgba(52, 211, 153, 1)',
                borderWidth: 1,
                borderRadius: 3
              }]
            },
            options: {
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, ticks: { color: '#767d94', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: '#767d94', maxRotation: 45, font: { size: 9 } }, grid: { display: false } }
              }
            }
          });
        }
      } catch (_chartErr) {
        // Chart.js non disponible — dégradé silencieux
        const chartWrap = document.getElementById('admin-stats-chart');
        if (chartWrap && chartWrap.parentElement) {
          chartWrap.parentElement.innerHTML += '<p class="admin-muted" style="margin-top:6px">Graphe indisponible (chart.min.js non chargé).</p>';
        }
      }
    }

    await doRender();
    _statsRefreshTimer = setInterval(async () => {
      try {
        if (state.section === 'stats') await doRender();
      } catch (e) {
        console.warn('[VOLT Admin] Stats refresh error:', e);
      }
    }, 60000);

    // Timer stoppé automatiquement dans loadSection() lors du changement de section.
  }

  // ----------------------------------------------------------------
  // SECTION : Bans IP
  // ----------------------------------------------------------------

  async function renderBansIp() {
    const ipBansRes = await (async () => {
      try {
        const { data, error } = await client.from('ip_bans').select('*').order('created_at', { ascending: false }).limit(100);
        if (error) return [];
        return data || [];
      } catch (_) { return []; }
    })();

    const ipRows = ipBansRes.map(b => `
      <tr>
        <td><span class="admin-mono">${esc(b.ip_address || '')}</span></td>
        <td>${esc(b.reason || '')}</td>
        <td>${b.expires_at ? fmtDate(b.expires_at) : '<span class="admin-badge warning">Permanent</span>'}</td>
        <td>${fmtDate(b.created_at)}</td>
      </tr>`);

    content.innerHTML = `
      <div class="admin-card">
        <h2>Bannir une adresse IP</h2>
        <form class="admin-toolbar" style="flex-direction:column;align-items:flex-start;gap:10px;" data-action-form="ban-ip">
          ${textField('ip', 'Adresse IP', '', '1.2.3.4 ou 2001:db8::1')}
          ${textField('reason', 'Raison', '', 'Motif du ban IP (min 3 caractères)')}
          <label class="admin-field">
            <span class="admin-label">Durée</span>
            <select class="admin-select" name="duration">
              <option value="">Permanent</option>
              <option value="24">24 heures</option>
              <option value="168">7 jours</option>
              <option value="720">30 jours</option>
            </select>
          </label>
          <button class="admin-button danger" type="button" data-action="submit-ban-ip">Bannir IP</button>
        </form>
      </div>
      <div class="admin-card">
        <h2>IPs bannies (${esc(ipBansRes.length)})</h2>
        ${table(['IP', 'Raison', 'Expiration', 'Date ban'], ipRows)}
      </div>`;
  }

  // ----------------------------------------------------------------
  // SECTION : Appels de ban
  // ----------------------------------------------------------------

  async function renderAppeals() {
    const res = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'getPendingAppeals', limit: 50, offset: 0 }, resolve);
    });
    if (!res || !res.success) {
      content.innerHTML = `<div class="admin-denied">Erreur appels : ${esc(res?.error || 'inconnue')}</div>`;
      return;
    }
    const appeals = res.appeals || [];

    const appealRows = appeals.map(a => `
      <tr>
        <td><strong>${esc(a.user_pseudo || 'Anonyme')}</strong><div class="admin-mono">${esc(a.user_id || '')}</div></td>
        <td>${esc(a.ban_type || 'global')} ${a.ban_expires_at ? `<div class="admin-muted">expire: ${fmtDate(a.ban_expires_at)}</div>` : '<div><span class="admin-badge danger">Permanent</span></div>'}</td>
        <td>${esc(a.ban_reason || '—')}</td>
        <td class="admin-appeal-reason">${esc(a.reason || '')}</td>
        <td>${fmtDate(a.created_at)}</td>
        <td>
          <div class="admin-row-actions">
            <button class="admin-mini-btn success"
              data-action="approve-appeal"
              data-appeal-id="${esc(a.id || '')}"
              data-pseudo="${esc(a.user_pseudo || '')}">Approuver</button>
            <button class="admin-mini-btn danger"
              data-action="reject-appeal"
              data-appeal-id="${esc(a.id || '')}"
              data-pseudo="${esc(a.user_pseudo || '')}">Rejeter</button>
          </div>
        </td>
      </tr>`);

    content.innerHTML = `
      <div class="admin-card">
        <h2>Appels en attente (${esc(appeals.length)})</h2>
        ${appeals.length === 0
          ? '<div class="admin-empty">Aucun appel en attente.</div>'
          : table(['Joueur', 'Type ban', 'Raison ban', 'Raison appel', 'Date appel', 'Actions'], appealRows)
        }
      </div>`;
  }

  // ----------------------------------------------------------------
  // SECTION : Journal de modération (Wave 5)
  // ----------------------------------------------------------------

  function renderModerationLog() {
    /** @type {Array<{id:string,admin_username:string,action_type:string,target_username:string,details:any,created_at:string}>} */
    let _modlogAllRows = [];

    function buildModlogTable(rows) {
      if (!rows.length) {
        content.innerHTML = _modlogPageShell('');
        const container = /** @type {HTMLElement|null} */ (document.getElementById('modlog-container'));
        if (container) container.textContent = 'Aucune entrée';
        return;
      }
      content.innerHTML = _modlogPageShell('');
      const container = /** @type {HTMLElement|null} */ (document.getElementById('modlog-container'));
      if (!container) return;

      const tableWrap = document.createElement('div');
      tableWrap.className = 'admin-table-wrap';

      const tbl = document.createElement('table');
      tbl.className = 'admin-table mod-log-table';

      const thead = document.createElement('thead');
      const hrow = document.createElement('tr');
      ['Date', 'Admin', 'Action', 'Cible', 'Détails'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        hrow.appendChild(th);
      });
      thead.appendChild(hrow);
      tbl.appendChild(thead);

      const tbody = document.createElement('tbody');
      rows.forEach(entry => {
        const tr = document.createElement('tr');
        if (entry.details) tr.style.cursor = 'pointer';

        const tdDate = document.createElement('td');
        tdDate.textContent = new Date(entry.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

        const tdAdmin = document.createElement('td');
        tdAdmin.textContent = entry.admin_username || '?';

        const tdAction = document.createElement('td');
        const span = document.createElement('span');
        const actionClass = 'mod-action-badge mod-action-' + (entry.action_type || '').replace(/_/g, '-');
        span.className = actionClass;
        span.textContent = entry.action_type || '?';
        tdAction.appendChild(span);

        const tdTarget = document.createElement('td');
        tdTarget.textContent = entry.target_username || '—';

        const tdDetails = document.createElement('td');
        if (entry.details) {
          const eyeBtn = document.createElement('button');
          eyeBtn.className = 'admin-mini-btn';
          eyeBtn.textContent = '👁 Voir';
          tdDetails.appendChild(eyeBtn);
        } else {
          tdDetails.textContent = '—';
          tdDetails.className = 'admin-muted';
        }

        tr.appendChild(tdDate);
        tr.appendChild(tdAdmin);
        tr.appendChild(tdAction);
        tr.appendChild(tdTarget);
        tr.appendChild(tdDetails);

        if (entry.details) {
          const detailRow = document.createElement('tr');
          detailRow.className = 'mod-log-detail-row';
          detailRow.hidden = true;
          const detailTd = document.createElement('td');
          detailTd.colSpan = 5;
          const pre = document.createElement('pre');
          pre.className = 'mod-log-detail-pre';
          try {
            pre.textContent = JSON.stringify(entry.details, null, 2);
          } catch (_) {
            pre.textContent = String(entry.details);
          }
          detailTd.appendChild(pre);
          detailRow.appendChild(detailTd);

          tr.addEventListener('click', () => {
            detailRow.hidden = !detailRow.hidden;
            tr.classList.toggle('expanded', !detailRow.hidden);
          });
          tbody.appendChild(tr);
          tbody.appendChild(detailRow);
        } else {
          tbody.appendChild(tr);
        }
      });

      tbl.appendChild(tbody);
      tableWrap.appendChild(tbl);
      container.appendChild(tableWrap);

      // Wire filter
      const filterSel = /** @type {HTMLSelectElement|null} */ (document.getElementById('modlog-filter-type'));
      if (filterSel) {
        filterSel.onchange = () => {
          const val = filterSel.value;
          buildModlogTable(val ? _modlogAllRows.filter(r => (r.action_type || '').startsWith(val)) : _modlogAllRows);
        };
      }

      // Wire export CSV
      const exportBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('btn-export-modlog'));
      if (exportBtn) {
        exportBtn.onclick = () => {
          const filterVal = /** @type {HTMLSelectElement|null} */ (document.getElementById('modlog-filter-type'))?.value || '';
          const exportRows = filterVal ? _modlogAllRows.filter(r => (r.action_type || '').startsWith(filterVal)) : _modlogAllRows;
          const csv = ['Date,Admin,Action,Cible,Détails']
            .concat(exportRows.map(r => [
              new Date(r.created_at).toISOString(),
              r.admin_username || '',
              r.action_type || '',
              r.target_username || '',
              JSON.stringify(r.details || '')
            ].map(s => '"' + String(s).replace(/"/g, '""') + '"').join(',')))
            .join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'modlog.csv';
          a.click();
          URL.revokeObjectURL(url);
        };
      }

      // Wire refresh
      const refreshBtn2 = /** @type {HTMLButtonElement|null} */ (document.getElementById('btn-refresh-modlog'));
      if (refreshBtn2) refreshBtn2.onclick = renderModerationLog;
    }

    function _modlogPageShell(innerHtml) {
      return `
        <div class="admin-card">
          <h2>Journal de modération</h2>
          <div class="admin-filter-row" style="display:flex;gap:8px;margin-bottom:12px;align-items:center;flex-wrap:wrap;">
            <select id="modlog-filter-type" class="admin-select" style="flex:1;min-width:160px;">
              <option value="">Toutes actions</option>
              <option value="ban">Bans</option>
              <option value="unban">Unbans</option>
              <option value="invalidate">Invalidations</option>
              <option value="assign_badge">Badges</option>
              <option value="appeal_approved">Appels approuvés</option>
              <option value="appeal_rejected">Appels rejetés</option>
            </select>
            <button id="btn-export-modlog" class="admin-button secondary">Export CSV</button>
            <button id="btn-refresh-modlog" class="admin-button secondary">🔄</button>
          </div>
          <div id="modlog-container">${innerHtml}</div>
        </div>`;
    }

    content.innerHTML = _modlogPageShell('<div class="admin-loading">Chargement…</div>');

    chrome.runtime.sendMessage({ action: 'getModerationLog', limit: 200 }, (/** @type {any} */ res) => {
      if (!res?.success || !Array.isArray(res.data)) {
        const container = /** @type {HTMLElement|null} */ (document.getElementById('modlog-container'));
        if (container) container.textContent = res?.error || 'Aucune donnée';
        return;
      }
      _modlogAllRows = res.data;
      buildModlogTable(_modlogAllRows);
    });
  }

  // ----------------------------------------------------------------
  // SECTION : Badges de tournoi (Wave 5)
  // ----------------------------------------------------------------

  function renderTournamentBadges() {
    content.innerHTML = `
      <div class="admin-card">
        <h2>Assigner un badge</h2>
        <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <input type="text" id="badge-target-username" class="admin-input" placeholder="Nom d'utilisateur cible" maxlength="50" style="flex:1;min-width:160px;">
          <button id="btn-lookup-badge-user" class="admin-button secondary">Chercher</button>
        </div>
        <div id="badge-user-info" style="min-height:22px;margin-bottom:8px;font-size:12px;"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <select id="badge-type-select" class="admin-select" style="flex:1;min-width:180px;">
            <option value="vainqueur_saison_1">🥇 Vainqueur Saison 1</option>
            <option value="mvp">⭐ MVP</option>
            <option value="champion_all_time">🏆 Champion All-Time</option>
            <option value="top_fragger">💥 Top Fragger</option>
            <option value="undefeated">🛡️ Undefeated</option>
            <option value="speed_demon">⚡ Speed Demon</option>
          </select>
          <button id="btn-assign-badge" class="admin-button danger">Assigner le badge</button>
        </div>
        <div id="badge-result" style="margin-top:8px;font-size:12px;"></div>
      </div>
      <div class="admin-card" style="margin-top:0">
        <h2>Attributions récentes</h2>
        <div id="recent-badges-list"><div class="admin-loading">Chargement…</div></div>
      </div>`;

    /** @type {string|null} */
    let _foundUserId = null;

    const lookupBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('btn-lookup-badge-user'));
    const assignBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('btn-assign-badge'));
    const userInfo = /** @type {HTMLElement|null} */ (document.getElementById('badge-user-info'));
    const badgeResult = /** @type {HTMLElement|null} */ (document.getElementById('badge-result'));

    if (lookupBtn && userInfo) {
      lookupBtn.addEventListener('click', () => {
        const q = /** @type {HTMLInputElement|null} */ (document.getElementById('badge-target-username'))?.value?.trim() || '';
        if (!q) return;
        userInfo.textContent = 'Recherche…';
        chrome.runtime.sendMessage({ action: 'searchUsers', query: q, grade: null, minElo: null, maxElo: null }, (/** @type {any} */ res) => {
          if (res?.success && Array.isArray(res.data) && res.data.length) {
            const u = res.data[0];
            _foundUserId = u.user_id;
            userInfo.textContent = '';
            const s = document.createElement('span');
            s.textContent = '✓ ' + (u.username || '?') + ' (' + (u.grade || '?') + ', ELO ' + (u.duel_elo ?? '?') + ')';
            s.style.color = 'var(--a-success)';
            userInfo.appendChild(s);
          } else {
            _foundUserId = null;
            userInfo.textContent = 'Utilisateur introuvable';
          }
        });
      });
    }

    if (assignBtn && badgeResult) {
      assignBtn.addEventListener('click', () => {
        if (!_foundUserId) { if (badgeResult) badgeResult.textContent = 'Cherchez un utilisateur d\'abord'; return; }
        const badge = /** @type {HTMLSelectElement|null} */ (document.getElementById('badge-type-select'))?.value;
        if (!badge) return;
        if (!confirm('Assigner le badge "' + badge + '" à cet utilisateur ?')) return;
        badgeResult.textContent = 'Assignation…';
        chrome.runtime.sendMessage({ action: 'adminAssignTournamentBadge', userId: _foundUserId, badge }, (/** @type {any} */ res) => {
          if (res?.success) {
            badgeResult.style.color = 'var(--a-success)';
            badgeResult.textContent = '✓ Badge assigné !';
            _loadRecentBadges();
          } else {
            badgeResult.style.color = 'var(--a-danger)';
            badgeResult.textContent = res?.error || 'Erreur';
          }
        });
      });
    }

    _loadRecentBadges();
  }

  function _loadRecentBadges() {
    const list = /** @type {HTMLElement|null} */ (document.getElementById('recent-badges-list'));
    if (!list) return;
    list.textContent = 'Chargement…';
    chrome.runtime.sendMessage({ action: 'getModerationLog', limit: 50 }, (/** @type {any} */ res) => {
      list.innerHTML = '';
      if (!res?.success) { list.textContent = 'Erreur chargement'; return; }
      const badges = (res.data || []).filter((/** @type {any} */ e) => e.action_type === 'assign_badge');
      if (!badges.length) { list.textContent = 'Aucune attribution récente'; return; }
      badges.forEach((/** @type {any} */ b) => {
        const row = document.createElement('div');
        row.className = 'mod-badge-recent-row';
        const left = document.createElement('span');
        left.textContent = (b.target_username || '?') + ' → ' + (b.details?.badge || '?');
        const right = document.createElement('span');
        right.textContent = new Date(b.created_at).toLocaleDateString('fr-FR');
        right.style.opacity = '0.5';
        row.appendChild(left);
        row.appendChild(right);
        list.appendChild(row);
      });
    });
  }

  // ----------------------------------------------------------------
  // SECTION : Recherche admin utilisateurs (Wave 5)
  // ----------------------------------------------------------------

  function renderAdminUserSearch() {
    content.innerHTML = `
      <div class="admin-card">
        <h2>Recherche utilisateurs</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
          <input type="text" id="admin-search-q" class="admin-input" placeholder="Nom d'utilisateur…" maxlength="50" style="flex:2;min-width:160px;">
          <select id="admin-search-grade" class="admin-select" style="flex:1;min-width:110px;">
            <option value="">Tous grades</option>
            <option value="free">Free</option>
            <option value="elite">Elite</option>
            <option value="legend">Legend</option>
            <option value="owner">Owner</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
          <input type="number" id="admin-search-min-elo" class="admin-input" placeholder="ELO min" style="flex:1;min-width:90px;">
          <input type="number" id="admin-search-max-elo" class="admin-input" placeholder="ELO max" style="flex:1;min-width:90px;">
          <button id="btn-admin-search" class="admin-button">Rechercher</button>
        </div>
        <div id="admin-search-results" style="margin-top:12px;"></div>
      </div>`;

    const btn = /** @type {HTMLButtonElement|null} */ (document.getElementById('btn-admin-search'));
    if (!btn) return;

    btn.addEventListener('click', () => {
      const query = /** @type {HTMLInputElement|null} */ (document.getElementById('admin-search-q'))?.value?.trim() || '';
      const grade = /** @type {HTMLSelectElement|null} */ (document.getElementById('admin-search-grade'))?.value || null;
      const minEloRaw = /** @type {HTMLInputElement|null} */ (document.getElementById('admin-search-min-elo'))?.value;
      const maxEloRaw = /** @type {HTMLInputElement|null} */ (document.getElementById('admin-search-max-elo'))?.value;
      const minElo = minEloRaw ? (parseInt(minEloRaw, 10) || null) : null;
      const maxElo = maxEloRaw ? (parseInt(maxEloRaw, 10) || null) : null;

      const results = /** @type {HTMLElement|null} */ (document.getElementById('admin-search-results'));
      if (!results) return;
      results.textContent = 'Recherche…';

      chrome.runtime.sendMessage({ action: 'searchUsers', query, grade, minElo, maxElo }, (/** @type {any} */ res) => {
        results.innerHTML = '';
        if (!res?.success || !Array.isArray(res.data) || !res.data.length) {
          results.textContent = 'Aucun résultat';
          return;
        }

        const wrap = document.createElement('div');
        wrap.className = 'admin-table-wrap';

        const tbl = document.createElement('table');
        tbl.className = 'admin-table';

        const thead = document.createElement('thead');
        const hrow = document.createElement('tr');
        ['Username', 'Grade', 'ELO', 'Niveau', 'Prestige', 'Inscrit le', 'Actions'].forEach(h => {
          const th = document.createElement('th');
          th.textContent = h;
          hrow.appendChild(th);
        });
        thead.appendChild(hrow);
        tbl.appendChild(thead);

        const tbody = document.createElement('tbody');
        res.data.forEach((/** @type {any} */ u) => {
          const tr = document.createElement('tr');

          const cells = [
            u.username || 'Anonyme',
            u.grade || 'free',
            String(u.duel_elo ?? '—'),
            String(u.level_cached || 1),
            u.prestige_level > 0 ? '★' + u.prestige_level : '—',
            u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '?'
          ];
          cells.forEach(c => {
            const td = document.createElement('td');
            td.textContent = c;
            tr.appendChild(td);
          });

          const actionTd = document.createElement('td');
          const banBtn = document.createElement('button');
          banBtn.className = 'admin-mini-btn danger';
          banBtn.textContent = 'Bannir';
          banBtn.addEventListener('click', async () => {
            const result = await requireReason({
              title: 'Bannir utilisateur',
              description: 'Bannir ' + (u.username || u.user_id) + '. Choisis un type et une durée éventuelle.',
              fields: selectField('banType', 'Type de ban', 'global', [['global', 'Global'], ['chat', 'Chat'], ['leaderboard', 'Leaderboard'], ['runs', 'Runs'], ['duels', '1v1 / duels'], ['clans', 'Clans']]) +
                      textField('expiresAt', 'Expiration optionnelle ISO', '', '2026-06-01T12:00:00Z'),
              confirmText: 'Bannir'
            });
            if (!result) return;
            try {
              await rpc('admin_ban_user', {
                p_target_uid: requireUUID(u.user_id, 'Utilisateur'),
                p_ban_type: result.extra.banType || 'global',
                p_reason: result.reason,
                p_expires_at: normalizeOptionalIsoDate(result.extra.expiresAt),
                p_admin_note: result.reason
              });
              showAlert('Utilisateur banni.', 'success');
            } catch (err) {
              showAlert(err?.message || 'Échec ban');
            }
          });
          actionTd.appendChild(banBtn);
          tr.appendChild(actionTd);
          tbody.appendChild(tr);
        });

        tbl.appendChild(tbody);
        wrap.appendChild(tbl);
        results.appendChild(wrap);
      });
    });
  }

  init();
})();

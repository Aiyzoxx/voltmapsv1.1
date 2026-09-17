// @ts-check
// ============================================================
// Volt Extension — Premium Module v1.0
// Copyright (c) 2024-2026 Volt — Discord
// ============================================================
// USAGE: importer avant popup.js dans popup.html
//   <script src="volt_premium.js"></script>
// ============================================================

// eslint-disable-next-line no-unused-vars
const VOLT_PREMIUM = (() => {

  // ── CONFIG ────────────────────────────────────────────────
  // Per-tier capability matrix. Authoritative for client-side gating;
  // server-side enforcement (RPCs / RLS) must mirror critical caps.
  const GRADE_CONFIG = {
    star: {
      label: 'STAR',
      emoji: '⭐',
      color: '#c17f59',
      slowmode_ms: 3000,
      gif_pp: true,
      colored_pseudo: true,        // solid color
      gradient_pseudo: false,
      rainbow_pseudo: false,
      custom_title: false,
      exclusive_emojis: true,
      history_limit: 125,
      broadcast: false,
      no_slowmode: false,
      friend_slots: 10,
      bg_uploads: 5,
      reactions_custom: 1,
      queue_skip_pct: 50,
      profile_views_counter: true,
      profile_rich_text: false,
      sound_packs_upload: false,
      replay_viewer: false,
      tournament_create: 0,
      webgl_overlays: false,
      custom_html_css: false,
      animated_frame: false,
      streak_badge: true,
      ignore_list_cloud: true,
      browser_push: true,
      analytics_export: false,
      live_stream_embed: false,
      featured_homepage: false,
      beta_access: false,
      voice_cues_custom: false,
      particle_effects: false,
      url_slug: false,
      custom_timer_font: true,
      tournament_max_players: 0,
      monthly_token_grant: 0,
    },
    elite: {
      label: 'ELITE',
      emoji: '💎',
      color: '#8b5cf6',
      slowmode_ms: 1000,
      gif_pp: true,
      colored_pseudo: true,
      gradient_pseudo: true,        // 2-color gradient
      rainbow_pseudo: false,
      custom_title: true,
      exclusive_emojis: true,
      history_limit: 500,
      broadcast: true,
      no_slowmode: false,
      friend_slots: 25,
      bg_uploads: 20,
      reactions_custom: 3,
      queue_skip_pct: 80,
      profile_views_counter: true,
      profile_rich_text: true,
      sound_packs_upload: true,
      replay_viewer: true,
      tournament_create: 1,
      tournament_max_players: 8,
      webgl_overlays: true,
      custom_html_css: false,
      animated_frame: false,
      streak_badge: true,
      ignore_list_cloud: true,
      browser_push: true,
      analytics_export: false,
      live_stream_embed: false,
      featured_homepage: false,
      beta_access: false,
      voice_cues_custom: true,
      particle_effects: true,
      url_slug: false,
      custom_timer_font: true,
      monthly_token_grant: 0,
    },
    legend: {
      label: 'LEGEND',
      emoji: '👑',
      color: '#f59e0b',
      slowmode_ms: 0,
      gif_pp: true,
      colored_pseudo: true,
      gradient_pseudo: true,
      rainbow_pseudo: true,         // animated rainbow
      custom_title: true,
      exclusive_emojis: true,
      history_limit: null,           // unlimited (server still caps at 5000 for sanity)
      broadcast: true,
      no_slowmode: true,
      friend_slots: null,            // unlimited
      bg_uploads: null,              // unlimited
      reactions_custom: 10,
      queue_skip_pct: 100,
      profile_views_counter: true,
      profile_rich_text: true,
      sound_packs_upload: true,
      replay_viewer: true,
      tournament_create: -1,
      tournament_max_players: 64,
      webgl_overlays: true,
      custom_html_css: true,
      animated_frame: true,
      streak_badge: true,
      ignore_list_cloud: true,
      browser_push: true,
      analytics_export: true,
      live_stream_embed: true,
      featured_homepage: true,
      beta_access: true,
      voice_cues_custom: true,
      particle_effects: true,
      url_slug: true,
      custom_timer_font: true,
      monthly_token_grant: 100,
    }
  };

  // FREE tier defaults (no grade) — explicit so canUse() doesn't return undefined
  const FREE_CAPS = {
    label: 'FREE',
    emoji: '',
    color: null,
    slowmode_ms: 5000,
    gif_pp: false,
    colored_pseudo: false,
    gradient_pseudo: false,
    rainbow_pseudo: false,
    custom_title: false,
    exclusive_emojis: false,
    history_limit: 100,
    broadcast: false,
    no_slowmode: false,
    friend_slots: 2,
    bg_uploads: 1,
    reactions_custom: 0,
    queue_skip_pct: 0,
    profile_views_counter: false,
    profile_rich_text: false,
    sound_packs_upload: false,
    replay_viewer: false,
    tournament_create: 0,
    tournament_max_players: 0,
    webgl_overlays: false,
    custom_html_css: false,
    animated_frame: false,
    streak_badge: false,
    ignore_list_cloud: false,
    browser_push: false,
    analytics_export: false,
    live_stream_embed: false,
    featured_homepage: false,
    beta_access: false,
    voice_cues_custom: false,
    particle_effects: false,
    url_slug: false,
    custom_timer_font: false,
    monthly_token_grant: 0,
  };

  const GRADE_ORDER = { legend: 3, elite: 2, star: 1, null: 0 };

  // Slowmode par défaut (utilisateurs free)
  const FREE_SLOWMODE_MS = 5000;

  // ── STATE ─────────────────────────────────────────────────
  let _currentGrade = null;      // 'star' | 'elite' | 'legend' | null
  let _gradeExpiresAt = null;    // Date | null
  let _lastChatSent = 0;         // timestamp pour slowmode

  // ── HELPERS ───────────────────────────────────────────────

  /** Retourne true si l'utilisateur a au moins le grade demandé */
  function hasGrade(minGrade) {
    return GRADE_ORDER[_currentGrade] >= GRADE_ORDER[minGrade];
  }

  /** Retourne la config du grade actuel (ou FREE_CAPS si free) */
  function getConfig() {
    return _currentGrade ? GRADE_CONFIG[_currentGrade] : FREE_CAPS;
  }

  /** Charge le grade depuis le profil Supabase */
  async function loadGradeFromProfile(profileData) {
    if (!profileData) { _currentGrade = null; return; }

    let grade = profileData.grade || null;
    if (typeof grade === 'string') grade = grade.toLowerCase();
    
    const expiresAt = profileData.grade_expires_at ? new Date(profileData.grade_expires_at) : null;

    // Vérifier expiration locale (double protection)
    if (grade && expiresAt && expiresAt < new Date()) {
      _currentGrade = null;
      _gradeExpiresAt = null;
    } else {
      _currentGrade = grade;
      _gradeExpiresAt = expiresAt;
    }

    // Sauvegarder en cache local pour éviter un lag au prochain démarrage
    chrome.storage.local.set({
      volt_grade: _currentGrade,
      volt_grade_expires: _gradeExpiresAt ? _gradeExpiresAt.toISOString() : null
    });

    return _currentGrade;
  }

  /** Charge depuis le cache local (démarrage instantané) */
  function loadGradeFromCache() {
    return new Promise(resolve => {
      chrome.storage.local.get(['volt_grade', 'volt_grade_expires'], (res) => {
        const grade = res.volt_grade || null;
        const expiresAt = res.volt_grade_expires ? new Date(res.volt_grade_expires) : null;
        if (grade && expiresAt && expiresAt < new Date()) {
          _currentGrade = null;
        } else {
          _currentGrade = grade;
          _gradeExpiresAt = expiresAt;
        }
        resolve(_currentGrade);
      });
    });
  }

  // Server-authoritative resync: cache (chrome.storage.local) is editable from
  // devtools and cannot be trusted for premium gating. Call this before any
  // sensitive premium-only action, or periodically.
  let _resyncInFlight = null;
  let _lastResyncMs = 0;
  const RESYNC_MIN_INTERVAL_MS = 30 * 1000;

  /**
   * Resync grade from server via the `get_my_active_grade` RPC. Throttled to
   * once every {@link RESYNC_MIN_INTERVAL_MS} unless `force` is set. Updates
   * cache and returns the freshly known grade (or current cache on failure).
   * @param {{ force?: boolean }} [opts]
   * @returns {Promise<string|null>}
   */
  async function resyncGradeFromServer({ force = false } = {}) {
    const client = (typeof self !== 'undefined' && self.supabaseClient)
      || (typeof window !== 'undefined' && window.supabaseClient)
      || null;
    if (!client || typeof client.rpc !== 'function') return _currentGrade;
    const now = Date.now();
    if (!force && _resyncInFlight) return _resyncInFlight;
    if (!force && (now - _lastResyncMs) < RESYNC_MIN_INTERVAL_MS) return _currentGrade;
    _resyncInFlight = (async () => {
      try {
        const { data, error } = await client.rpc('get_my_active_grade');
        if (error) return _currentGrade;
        const serverGrade = (data && typeof data === 'object') ? data.grade : null;
        const serverExpires = (data && typeof data === 'object' && data.expires_at)
          ? new Date(data.expires_at) : null;
        _currentGrade = serverGrade ? String(serverGrade).toLowerCase() : null;
        _gradeExpiresAt = serverExpires;
        try {
          chrome.storage.local.set({
            volt_grade: _currentGrade,
            volt_grade_expires: _gradeExpiresAt ? _gradeExpiresAt.toISOString() : null
          });
        } catch (_) {}
        _lastResyncMs = Date.now();
        return _currentGrade;
      } catch (_) {
        return _currentGrade;
      } finally {
        _resyncInFlight = null;
      }
    })();
    return _resyncInFlight;
  }

  /**
   * Server-checked feature gate: re-verifies grade against the server before
   * granting access, then delegates to {@link canUse}. Use for actions where
   * stale cache could let a free user run a premium-only flow.
   * @param {string} feature
   * @param {(() => void)} [upsellCallback]
   * @returns {Promise<boolean>}
   */
  async function canUseSecure(feature, upsellCallback) {
    await resyncGradeFromServer();
    return canUse(feature, upsellCallback);
  }

  // ── SLOWMODE ──────────────────────────────────────────────

  /**
   * Vérifie si l'utilisateur peut envoyer un message en chat.
   * @returns {{ allowed: boolean, remainingMs: number }}
   */
  function checkChatCooldown() {
    const cfg = getConfig();
    const cooldownMs = cfg ? cfg.slowmode_ms : FREE_SLOWMODE_MS;
    if (cooldownMs === 0) return { allowed: true, remainingMs: 0 };

    const now = Date.now();
    const elapsed = now - _lastChatSent;
    if (elapsed >= cooldownMs) return { allowed: true, remainingMs: 0 };
    return { allowed: false, remainingMs: cooldownMs - elapsed };
  }

  /** Appeler après chaque envoi réussi de message */
  function markChatSent() {
    _lastChatSent = Date.now();
  }

  // ── RENDERERS HTML ────────────────────────────────────────

  /**
   * Génère le HTML du badge de grade à afficher dans le chat.
   * @param {string} grade - 'star' | 'elite' | 'legend'
   */
  function renderBadgeHTML(grade) {
    if (!grade || !GRADE_CONFIG[grade]) return '';
    // Whitelist: only known grades render. cfg.label / cfg.emoji come from
    // the static GRADE_CONFIG dictionary above and never from the DB, so
    // the resulting markup cannot be poisoned by remote data.
    const cfg = GRADE_CONFIG[grade];
    const safeGrade = String(grade).replace(/[^a-z0-9_-]/gi, '');
    const safeLabel = String(cfg.label || '').replace(/[^A-Za-z0-9 _-]/g, '');
    const safeIcon = String(cfg.emoji || '');
    return `<span class="volt-grade-badge volt-grade-${safeGrade}" title="${safeLabel}" style="display:inline-flex;align-items:center;justify-content:center;font-size:11px;line-height:1;margin-right:4px;vertical-align:middle;">${safeIcon}</span>`;
  }

  /**
   * DOM-node variant of {@link renderBadgeHTML}. Preferred for new code paths
   * to avoid string interpolation entirely.
   * @param {string} grade - 'star' | 'elite' | 'legend'
   * @returns {HTMLSpanElement|null}
   */
  function renderBadgeNode(grade) {
    if (!grade || !GRADE_CONFIG[grade]) return null;
    const cfg = GRADE_CONFIG[grade];
    const span = document.createElement('span');
    const safeGrade = String(grade).replace(/[^a-z0-9_-]/gi, '');
    span.className = `volt-grade-badge volt-grade-${safeGrade}`;
    span.title = String(cfg.label || '').replace(/[^A-Za-z0-9 _-]/g, '');
    span.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;font-size:11px;line-height:1;margin-right:4px;vertical-align:middle;';
    span.textContent = cfg.emoji;
    return span;
  }

  /**
   * Whitelist-sanitize a CSS color value. Accepts hex (`#rgb`/`#rrggbb`),
   * `rgb()` and `hsl()` with components clamped to safe ranges. Returns
   * `fallback` for anything that does not match.
   * @param {string} value
   * @param {string} fallback
   * @returns {string}
   */
  function sanitizeCssColor(value, fallback) {
    const color = String(value || '').trim();
    if (color.length > 64) return fallback;
    // Hex: #RGB / #RRGGBB / #RRGGBBAA only.
    if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) return color;
    // RGB / RGBA — clamp channels to 0-255.
    const rgbMatch = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/.exec(color);
    if (rgbMatch) {
      const r = +rgbMatch[1], g = +rgbMatch[2], b = +rgbMatch[3];
      if (r <= 255 && g <= 255 && b <= 255) return color;
      return fallback;
    }
    // HSL / HSLA — hue 0-360, sat/light 0-100%.
    const hslMatch = /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/.exec(color);
    if (hslMatch) {
      const h = +hslMatch[1], s = +hslMatch[2], l = +hslMatch[3];
      if (h <= 360 && s <= 100 && l <= 100) return color;
      return fallback;
    }
    return fallback;
  }

  /**
   * Clamp an angle to `[0, 360]` degrees, rounded to the nearest integer.
   * Falls back to `90` for non-finite input.
   * @param {*} value
   * @returns {number}
   */
  function sanitizeAngle(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 90;
    return Math.max(0, Math.min(360, Math.round(n)));
  }

  /**
   * Génère le style CSS inline pour le pseudo coloré.
   * Prend en compte le mode (solid/gradient) et les couleurs personnalisées.
   */
  function renderPseudoStyle(grade, color, profile = {}) {
    if (!grade || !GRADE_CONFIG[grade]) return 'font-weight: 600;';
    
    // Mode LEGEND arc-en-ciel (Prioritaire si grade === legend)
    if (grade === 'legend') {
      return `
          background: linear-gradient(90deg, #ff0080, #f59e0b, #00ff88, #ff0080);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: volt-rainbow 2s linear infinite;
          font-weight: 800;
          display: inline-block;
      `.replace(/\n/g, ' ').trim();
    }

    // Personnalisation pour STAR et ELITE
    const mode = profile.grade_color_mode === 'gradient' ? 'gradient' : 'solid';
    const fallbackColor = GRADE_CONFIG[grade].color;
    const c1 = sanitizeCssColor(color || profile.grade_color, fallbackColor);

    if (mode === 'gradient') {
      const c2 = sanitizeCssColor(profile.grade_color_2, '#4ecdc4');
      const angle = sanitizeAngle(profile.grade_color_angle);
      return `background: linear-gradient(${angle}deg, ${c1}, ${c2}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 700; display: inline-block;`.trim();
    }
    
    return `font-weight: 700; color: ${c1};`;
  }

  /**
   * CSS à injecter dans le document pour les animations premium.
   */
  const PREMIUM_CSS = `
    @keyframes volt-rainbow {
      0%   { background-position: 0% center; }
      100% { background-position: 200% center; }
    }
    @keyframes volt-glow-pulse {
      0%, 100% { text-shadow: 0 0 8px currentColor; }
      50%       { text-shadow: 0 0 20px currentColor; }
    }
    .volt-rainbow-text {
      background: linear-gradient(90deg, #ff0080, #f59e0b, #00ff88, #ff0080);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: volt-rainbow 2s linear infinite;
      font-weight: 800;
    }
    .volt-grade-legend { animation: volt-glow-pulse 2s ease-in-out infinite; }
    .volt-grade-badge { cursor: default; user-select: none; }
    .volt-premium-title {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      opacity: 0.8;
      display: block;
      margin-top: 1px;
    }
    .volt-chat-slowmode-bar {
      height: 2px;
      background: linear-gradient(90deg, var(--volt-c-accent), transparent);
      transform-origin: left;
      transform: scaleX(0);
      transition: transform linear;
      border-radius: 1px;
    }
  `;

  /**
   * Inject the premium-only stylesheet into the document once. No-op if it
   * has already been injected (idempotent).
   * @returns {void}
   */
  function injectPremiumCSS() {
    if (document.getElementById('volt-premium-css')) return;
    const s = document.createElement('style');
    s.id = 'volt-premium-css';
    s.textContent = PREMIUM_CSS;
    document.head.appendChild(s);
  }

  // ── FEATURE GATE ──────────────────────────────────────────

  /**
   * Vérifie si une feature est accessible et affiche un upsell sinon.
   * @returns boolean
   */
  function canUse(feature, upsellCallback) {
    const cfg = getConfig();
    const allowed = cfg ? !!cfg[feature] : false;
    if (!allowed && typeof upsellCallback === 'function') {
      upsellCallback(_currentGrade, feature);
    }
    return allowed;
  }

  // ── UPSELL TOAST ─────────────────────────────────────────

  /**
   * Affiche un toast "feature réservée aux premium" dans la popup.
   * @param {string} featureName - Nom de la feature (affiché dans le toast)
   * @param {string} minGrade - Grade minimum requis
   */
  function showUpsellToast(featureName, minGrade = 'star') {
    const cfg = GRADE_CONFIG[minGrade];
    if (!cfg) return;

    // Réutiliser showToast de popup.js si disponible
    if (typeof showToast === 'function') {
      showToast(`${cfg.emoji} ${featureName} — réservé aux membres ${cfg.label}. Upgradez dans la boutique !`, 4000);
    } else {
      console.warn(`[VOLT Premium] Upsell: ${featureName} requires ${minGrade}`);
    }

    // Clignoter l'onglet boutique
    const shopNav = document.querySelector('[data-target="premium-shop"]');
    if (shopNav) {
      shopNav.classList.add('volt-nav-highlight');
      setTimeout(() => shopNav.classList.remove('volt-nav-highlight'), 2000);
    }
  }

  // ── SLOWMODE UI ───────────────────────────────────────────

  /**
   * Attache la logique de slowmode à un bouton d'envoi de chat.
   * @param {HTMLElement} sendBtn - Bouton d'envoi
   * @param {HTMLElement} [barEl] - Optionnel: élément barre de progression
   */
  /** @param {HTMLButtonElement} sendBtn @param {HTMLElement|null} barEl */
  function attachSlowmode(sendBtn, barEl) {
    const cfg = getConfig();
    const cooldownMs = cfg ? cfg.slowmode_ms : FREE_SLOWMODE_MS;
    if (cooldownMs === 0) return; // ELITE/LEGEND : rien à faire

    sendBtn.addEventListener('click', (e) => {
      const { allowed, remainingMs } = checkChatCooldown();
      if (!allowed) {
        e.preventDefault();
        e.stopImmediatePropagation();

        // Feedback visuel sur le bouton
        const prevText = sendBtn.textContent;
        const secs = (remainingMs / 1000).toFixed(1);
        sendBtn.disabled = true;
        sendBtn.textContent = `⏳ ${secs}s`;

        // Barre de progression
        if (barEl) {
          barEl.style.transition = `transform ${remainingMs}ms linear`;
          barEl.style.transform = 'scaleX(1)';
          setTimeout(() => { barEl.style.transform = 'scaleX(0)'; }, 50);
        }

        setTimeout(() => {
          sendBtn.disabled = false;
          sendBtn.textContent = prevText;
        }, remainingMs);
      }
    }, true); // capture phase pour intercepter avant les autres listeners
  }

  // ── EMOJI PICKER PREMIUM ──────────────────────────────────

  /**
   * Filtre les emojis exclusifs selon le grade de l'utilisateur.
   * @param {Array} allEmojis - Liste depuis la DB premium_emojis
   * @returns {Array} - Emojis accessibles
   */
  function filterAccessibleEmojis(allEmojis) {
    return allEmojis.filter(e => GRADE_ORDER[e.min_grade] <= GRADE_ORDER[_currentGrade]);
  }

  // ── PROFIL GRADE UI (pour section account/profil) ─────────

  /**
   * Met à jour l'affichage du badge de grade dans la sidebar/profil.
   * À appeler après chaque login ou changement de grade.
   */
  function updateGradeDisplayInUI(profileData) {
    if (!profileData) return;

    const grade = profileData.grade;

    // Sidebar badge (next to pseudo)
    const sidebarBadgeEl = document.getElementById('sidebar-premium-badge');
    if (sidebarBadgeEl) {
      sidebarBadgeEl.innerHTML = grade ? renderBadgeHTML(grade) : '';
    }

    // Sidebar pseudo color (Reset to default)
    const sidebarPseudoEl = document.getElementById('sidebar-display-pseudo');
    if (sidebarPseudoEl) {
      sidebarPseudoEl.style.color = '';
      sidebarPseudoEl.style.fontWeight = grade ? '700' : '500';
    }

    // Account section pseudo color
    const loggedPseudoEl = document.getElementById('logged-pseudo-display');
    if (loggedPseudoEl) {
      loggedPseudoEl.style.color = '';
      loggedPseudoEl.style.fontWeight = grade ? '700' : '500';
    }

    // Premium shop button badge
    const shopNavEl = document.querySelector('[data-target="premium-shop"] .volt-current-grade-badge');
    if (shopNavEl) {
      shopNavEl.textContent = grade ? (GRADE_CONFIG[grade]?.emoji || '') : '';
    }
  }

  // ── GRADE EXPIRY WARNING ──────────────────────────────────

  /**
   * Vérifie si le grade expire dans moins de 7 jours et affiche un avertissement.
   */
  function checkGradeExpiry() {
    if (!_currentGrade || !_gradeExpiresAt) return; // lifetime → pas d'alerte

    const daysLeft = (_gradeExpiresAt - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft <= 7 && daysLeft > 0) {
      const days = Math.ceil(daysLeft);
      if (typeof showToast === 'function') {
        showToast(`⚠️ Ton grade ${GRADE_CONFIG[_currentGrade].label} expire dans ${days} jour${days > 1 ? 's' : ''} ! Renouvelle dans la boutique.`, 6000);
      }
    }
  }

  // ── PUBLIC API ────────────────────────────────────────────
  return {
    GRADE_CONFIG,
    GRADE_ORDER,
    FREE_SLOWMODE_MS,

    get currentGrade() { return _currentGrade; },
    get gradeExpiresAt() { return _gradeExpiresAt; },

    hasGrade,
    getConfig,
    loadGradeFromProfile,
    loadGradeFromCache,
    resyncGradeFromServer,
    canUseSecure,
    sanitizeCssColor,
    sanitizeAngle,
    checkChatCooldown,
    markChatSent,
    renderBadgeHTML,
    renderBadgeNode,
    renderPseudoStyle,
    injectPremiumCSS,
    canUse,
    showUpsellToast,
    attachSlowmode,
    filterAccessibleEmojis,
    updateGradeDisplayInUI,
    checkGradeExpiry,

    /** Initialisation complète (appeler après login) */
    async init(profileData) {
      await loadGradeFromCache(); // affichage instantané depuis cache
      await loadGradeFromProfile(profileData); // puis vérification DB via profil
      // Server-authoritative resync (anti-spoof of chrome.storage.local).
      try { await resyncGradeFromServer({ force: true }); } catch (_) {}
      injectPremiumCSS();
      updateGradeDisplayInUI(profileData);
      checkGradeExpiry();
      console.log(`[VOLT Premium] Grade: ${_currentGrade || 'free'}`);
    }
  };
})();

// ─── INTÉGRATION DANS POPUP.JS ──────────────────────────────
// Dans ta fonction initProfile() ou là où tu charge profileData :
//
//   await VOLT_PREMIUM.init(profileData);
//
// Dans renderMessage() de chatUIInjected.js, remplace le span pseudo par :
//
//   ${VOLT_PREMIUM.renderBadgeHTML(m.user_grade, m.user_grade_badge)}
//   <span class="volt-msg-pseudo" style="${VOLT_PREMIUM.renderPseudoStyle(m.user_grade, m.user_grade_color, m.user_grade_rainbow)}">
//     ${escapeHtml(pseudo)}
//   </span>
//
// Pour bloquer une feature premium :
//   if (!VOLT_PREMIUM.canUse('gif_pp', () => VOLT_PREMIUM.showUpsellToast('PP animée', 'star'))) return;

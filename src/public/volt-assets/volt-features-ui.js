// @ts-check
// ============================================================
// volt-features-ui.js — Premium feature UI bindings
// Injects:
//   - Friends-only leaderboard filter
//   - Achievement unlock toasts + showcase grid
//   - About me / linked accounts edit form
//   - URL slug claim (legend)
//   - Reactions emoji picker on chat messages
//   - Profile views counter display
//   - Daily login streak ping at auth
//   - Streak badge in sidebar
// Loaded after popup.js + volt_premium.js + volt-features.js.
// ============================================================
"use strict";

(function () {
  if (typeof window === 'undefined') return;
  const W = /** @type {any} */ (window);

  // Delegates to voltEscapeHtml in volt-helpers.js (single source of truth).
  // Compared to the pre-consolidation version, this also escapes single quotes
  // — strictly more defensive, never less.
  const escapeHtml = /** @type {(s: any) => string} */ (W.voltEscapeHtml ||
    ((s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')));

  // ── 1. ACHIEVEMENT UNLOCK TOAST ───────────────────────────
  /** @param {{id:string, title:string, icon?:string, points?:number}} ach */
  function showAchievementToast(ach) {
    if (!ach || !ach.title) return;
    const t = document.createElement('div');
    t.className = 'volt-achievement-toast';
    t.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:linear-gradient(135deg,rgba(245,158,11,0.95),rgba(139,92,246,0.95));color:#fff;padding:14px 18px;border-radius:14px;display:flex;align-items:center;gap:12px;box-shadow:0 12px 32px rgba(245,158,11,0.4),0 0 28px rgba(139,92,246,0.5);min-width:240px;max-width:340px;font-family:Inter,sans-serif;animation:voltAchSlide 0.4s ease;';
    t.innerHTML = `<div style="font-size:32px;line-height:1;">${escapeHtml(ach.icon || '🏆')}</div><div style="flex:1;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;">Achievement débloqué</div><div style="font-size:14px;font-weight:800;margin-top:2px;">${escapeHtml(ach.title)}</div>${ach.points ? `<div style="font-size:11px;opacity:0.75;margin-top:2px;">+${ach.points} points</div>` : ''}</div>`;
    document.body.appendChild(t);
    if (!document.getElementById('volt-ach-anim-style')) {
      const st = document.createElement('style');
      st.id = 'volt-ach-anim-style';
      st.textContent = '@keyframes voltAchSlide{from{transform:translateX(120%);opacity:0;}to{transform:translateX(0);opacity:1;}}@keyframes voltAchOut{to{transform:translateX(120%);opacity:0;}}';
      document.head.appendChild(st);
    }
    setTimeout(() => { t.style.animation = 'voltAchOut 0.4s ease forwards'; setTimeout(() => t.remove(), 450); }, 5000);
  }
  W.voltShowAchievement = showAchievementToast;

  /** @param {string} achievementId */
  async function tryUnlockAchievement(achievementId) {
    try {
      const client = W.supabaseClient;
      if (!client?.rpc) return;
      const { data } = await client.rpc('unlock_achievement', { p_id: achievementId });
      if (data?.unlocked) {
        const { data: ach } = await client.from('achievements').select('id, title, icon, points').eq('id', achievementId).maybeSingle();
        if (ach) showAchievementToast(ach);
      }
    } catch (_) {}
  }
  W.voltUnlockAchievement = tryUnlockAchievement;

  // ── 2. ACHIEVEMENT SHOWCASE GRID ──────────────────────────
  async function renderAchievementShowcase(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const client = W.supabaseClient;
    if (!client?.from || !W.currentUser?.id) return;
    container.innerHTML = '<div class="volt-skeleton card"></div><div class="volt-skeleton card"></div>';
    try {
      const [achQ, unlockedQ] = await Promise.all([
        client.from('achievements').select('id, title, description, icon, points, hidden, category').eq('active', true),
        client.from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', W.currentUser.id)
      ]);
      const all = (achQ.data || []).filter(a => !a.hidden);
      const unlockedSet = new Set((unlockedQ.data || []).map(u => u.achievement_id));
      const totalPoints = (achQ.data || []).filter(a => unlockedSet.has(a.id)).reduce((s, a) => s + (a.points || 0), 0);
      const summary = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding:12px;background:var(--bg-input);border-radius:10px;"><span style="font-weight:700;">${unlockedSet.size}/${all.length} débloqués</span><span style="background:linear-gradient(135deg,#f59e0b,#8b5cf6);color:#fff;padding:4px 12px;border-radius:100px;font-weight:800;font-size:13px;">${totalPoints} pts</span></div>`;
      const grid = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;">' +
        all.map(a => {
          const unlocked = unlockedSet.has(a.id);
          return `<div title="${escapeHtml(a.description)}" style="text-align:center;padding:10px 6px;background:${unlocked?'rgba(245,158,11,0.10)':'rgba(148,163,184,0.05)'};border:1px solid ${unlocked?'rgba(245,158,11,0.4)':'var(--border)'};border-radius:10px;opacity:${unlocked?'1':'0.45'};filter:${unlocked?'none':'grayscale(0.8)'};"><div style="font-size:24px;margin-bottom:4px;">${escapeHtml(a.icon||'🏆')}</div><div style="font-size:10px;font-weight:700;color:var(--text-main);">${escapeHtml(a.title)}</div><div style="font-size:9px;color:var(--text-muted);margin-top:2px;">+${a.points||0}</div></div>`;
        }).join('') + '</div>';
      container.innerHTML = summary + grid;
    } catch (_e) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Erreur de chargement</div>';
    }
  }
  W.voltRenderAchievementShowcase = renderAchievementShowcase;

  // ── 3. ABOUT ME / LINKED ACCOUNTS EDIT MODAL ──────────────
  function openProfileExtrasModal() {
    if (document.getElementById('volt-profile-extras-modal')) return;
    const overlay = document.createElement('div');
    overlay.id = 'volt-profile-extras-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,18,0.78);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
    overlay.innerHTML = `
      <div style="background:linear-gradient(160deg,rgba(30,41,59,0.96),rgba(15,23,42,0.98));border:1px solid var(--border-highlight);border-radius:22px;padding:24px;max-width:440px;width:92%;color:#f8fafc;">
        <div style="font-size:20px;font-weight:800;margin-bottom:14px;background:linear-gradient(135deg,#8b5cf6,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Modifier le profil</div>
        <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">À propos (max 600)</label>
        <textarea id="volt-pe-about" maxlength="600" rows="4" style="width:100%;margin:6px 0 14px;padding:10px;background:rgba(148,163,184,0.12);border:1px solid var(--border);border-radius:10px;color:#f8fafc;font-family:inherit;resize:vertical;"></textarea>
        <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">Discord</label>
        <input id="volt-pe-discord" maxlength="32" placeholder="username#0000 ou @user" style="width:100%;margin:6px 0 10px;padding:10px;background:rgba(148,163,184,0.12);border:1px solid var(--border);border-radius:10px;color:#f8fafc;">
        <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">Twitter / X</label>
        <input id="volt-pe-twitter" maxlength="16" placeholder="@yourhandle" style="width:100%;margin:6px 0 10px;padding:10px;background:rgba(148,163,184,0.12);border:1px solid var(--border);border-radius:10px;color:#f8fafc;">
        <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:700;">Twitch</label>
        <input id="volt-pe-twitch" maxlength="25" placeholder="channel" style="width:100%;margin:6px 0 18px;padding:10px;background:rgba(148,163,184,0.12);border:1px solid var(--border);border-radius:10px;color:#f8fafc;">
        <div style="display:flex;gap:10px;">
          <button id="volt-pe-cancel" style="flex:1;padding:12px;border:1px solid var(--border);background:rgba(148,163,184,0.12);color:#f8fafc;border-radius:12px;cursor:pointer;font-weight:600;font-family:inherit;">Annuler</button>
          <button id="volt-pe-save" style="flex:2;padding:12px;border:none;background:linear-gradient(135deg,#8b5cf6,#22d3ee);color:#fff;border-radius:12px;cursor:pointer;font-weight:700;font-family:inherit;">Enregistrer</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // Pre-fill from cached profile
    const profile = W._currentProfileData || {};
    /** @type {HTMLTextAreaElement|null} */ const aboutInput = /** @type {any} */ (document.getElementById('volt-pe-about'));
    /** @type {HTMLInputElement|null} */ const discordInput = /** @type {any} */ (document.getElementById('volt-pe-discord'));
    /** @type {HTMLInputElement|null} */ const twitterInput = /** @type {any} */ (document.getElementById('volt-pe-twitter'));
    /** @type {HTMLInputElement|null} */ const twitchInput = /** @type {any} */ (document.getElementById('volt-pe-twitch'));
    if (aboutInput) aboutInput.value = profile.about_me || '';
    if (discordInput) discordInput.value = profile.linked_accounts?.discord || '';
    if (twitterInput) twitterInput.value = profile.linked_accounts?.twitter || '';
    if (twitchInput) twitchInput.value = profile.linked_accounts?.twitch || '';

    document.getElementById('volt-pe-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('volt-pe-save')?.addEventListener('click', async () => {
      const aboutMe = W.voltSanitizeAboutMe ? W.voltSanitizeAboutMe(aboutInput?.value) : (aboutInput?.value || '').slice(0, 600);
      const linked = W.voltSanitizeLinkedAccounts ? W.voltSanitizeLinkedAccounts({
        discord: discordInput?.value, twitter: twitterInput?.value, twitch: twitchInput?.value
      }) : {};
      try {
        const { data, error } = await W.supabaseClient.rpc('set_profile_extras', { p_about_me: aboutMe, p_linked: linked });
        if (error || !data?.success) {
          if (typeof W.showStatus === 'function') W.showStatus('Erreur sauvegarde profil', false);
          return;
        }
        if (W._currentProfileData) {
          W._currentProfileData.about_me = aboutMe;
          W._currentProfileData.linked_accounts = linked;
        }
        // Persist to cache mirror so the modal pre-fill is correct on reopen.
        try {
          chrome.storage.local.get(['volt_profile_cache'], (r) => {
            const cur = (r && r.volt_profile_cache) || {};
            cur.about_me = aboutMe;
            cur.linked_accounts = linked;
            chrome.storage.local.set({ volt_profile_cache: cur });
            try { localStorage.setItem('volt_profile_cache_sync', JSON.stringify(cur)); } catch (_) {}
          });
        } catch (_) {}
        if (typeof W.showStatus === 'function') W.showStatus('Profil mis à jour', true);
        overlay.remove();
      } catch (_e) {
        if (typeof W.showStatus === 'function') W.showStatus('Erreur réseau', false);
      }
    });
  }
  W.voltOpenProfileExtrasModal = openProfileExtrasModal;

  // ── 4. URL SLUG (legend only) ─────────────────────────────
  function openUrlSlugModal() {
    const cfg = W.VOLT_PREMIUM?.getConfig?.();
    if (!cfg?.url_slug) {
      if (typeof W.showStatus === 'function') W.showStatus('Réservé au grade LEGEND', false);
      return;
    }
    if (document.getElementById('volt-slug-modal')) return;
    const overlay = document.createElement('div');
    overlay.id = 'volt-slug-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,18,0.78);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
    overlay.innerHTML = `
      <div style="background:linear-gradient(160deg,rgba(30,41,59,0.96),rgba(15,23,42,0.98));border:1px solid var(--border-highlight);border-radius:22px;padding:24px;max-width:380px;width:92%;color:#f8fafc;">
        <div style="font-size:20px;font-weight:800;margin-bottom:6px;background:linear-gradient(135deg,#f59e0b,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">URL personnalisée 👑</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:14px;">3-32 caractères. Lettres, chiffres, _ et - autorisés.</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:18px;">
          <span style="font-size:12px;color:#94a3b8;">volt.gg/</span>
          <input id="volt-slug-input" maxlength="32" placeholder="yourname" style="flex:1;padding:10px;background:rgba(148,163,184,0.12);border:1px solid var(--border);border-radius:10px;color:#f8fafc;">
        </div>
        <div style="display:flex;gap:10px;">
          <button id="volt-slug-cancel" style="flex:1;padding:12px;border:1px solid var(--border);background:rgba(148,163,184,0.12);color:#f8fafc;border-radius:12px;cursor:pointer;font-weight:600;font-family:inherit;">Annuler</button>
          <button id="volt-slug-save" style="flex:2;padding:12px;border:none;background:linear-gradient(135deg,#f59e0b,#8b5cf6);color:#fff;border-radius:12px;cursor:pointer;font-weight:700;font-family:inherit;">Réclamer</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    /** @type {HTMLInputElement|null} */ const input = /** @type {any} */ (document.getElementById('volt-slug-input'));
    if (input) input.value = W._currentProfileData?.url_slug || '';
    document.getElementById('volt-slug-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('volt-slug-save')?.addEventListener('click', async () => {
      const slug = (input?.value || '').toLowerCase().trim();
      if (!/^[a-z0-9_-]{3,32}$/.test(slug)) {
        if (typeof W.showStatus === 'function') W.showStatus('Format invalide (3-32 chars: a-z 0-9 _ -)', false);
        return;
      }
      try {
        const { data, error } = await W.supabaseClient.rpc('set_url_slug', { p_slug: slug });
        if (error || !data?.success) {
          const msg = data?.error === 'taken' ? 'URL déjà prise' : (data?.error || error?.message || 'Erreur');
          if (typeof W.showStatus === 'function') W.showStatus(msg, false);
          return;
        }
        if (W._currentProfileData) W._currentProfileData.url_slug = slug;
        // Persist to cache mirror.
        try {
          chrome.storage.local.get(['volt_profile_cache'], (r) => {
            const cur = (r && r.volt_profile_cache) || {};
            cur.url_slug = slug;
            chrome.storage.local.set({ volt_profile_cache: cur });
            try { localStorage.setItem('volt_profile_cache_sync', JSON.stringify(cur)); } catch (_) {}
          });
        } catch (_) {}
        if (typeof W.showStatus === 'function') W.showStatus('URL réclamée: volt.gg/' + slug, true);
        overlay.remove();
      } catch (_e) {
        if (typeof W.showStatus === 'function') W.showStatus('Erreur réseau', false);
      }
    });
  }
  W.voltOpenUrlSlugModal = openUrlSlugModal;

  // ── 5. REACTIONS PICKER ON CHAT MESSAGE ───────────────────
  const REACTION_EMOJIS = ['👍', '😂', '🔥', '⚡', '❤️', '😮', '🎉', '💎', '👑', '⭐'];

  /** @param {string} table @param {number|string} messageId @param {HTMLElement} bubble */
  function attachReactionsPicker(table, messageId, bubble) {
    const cfg = W.VOLT_PREMIUM?.getConfig?.();
    const allowedCount = cfg?.reactions_custom ?? 0;
    if (!allowedCount || allowedCount <= 0) return;
    let pickerOpen = false;

    const trigger = document.createElement('button');
    trigger.textContent = '+';
    trigger.title = 'Réagir';
    trigger.style.cssText = 'position:absolute;top:-10px;right:-10px;width:22px;height:22px;border-radius:50%;background:var(--bg-card);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;font-size:13px;line-height:1;display:none;z-index:5;';
    bubble.style.position = 'relative';
    bubble.appendChild(trigger);
    bubble.addEventListener('mouseenter', () => trigger.style.display = 'block');
    bubble.addEventListener('mouseleave', () => { if (!pickerOpen) trigger.style.display = 'none'; });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pickerOpen) return;
      pickerOpen = true;
      const picker = document.createElement('div');
      picker.style.cssText = 'position:absolute;top:-44px;right:-10px;background:var(--bg-card);border:1px solid var(--border-highlight);border-radius:100px;padding:4px 8px;display:flex;gap:4px;box-shadow:0 6px 18px rgba(0,0,0,0.4);z-index:10;';
      REACTION_EMOJIS.slice(0, Math.max(5, allowedCount + 4)).forEach(emo => {
        const b = document.createElement('button');
        b.textContent = emo;
        b.style.cssText = 'background:transparent;border:none;cursor:pointer;font-size:18px;padding:2px 4px;';
        b.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          try { await W.supabaseClient.rpc('toggle_reaction', { p_table: table, p_message_id: Number(messageId), p_emoji: emo }); } catch (_) {}
          picker.remove(); pickerOpen = false;
        });
        picker.appendChild(b);
      });
      bubble.appendChild(picker);
      setTimeout(() => {
        const close = (e) => { if (!picker.contains(e.target)) { picker.remove(); pickerOpen = false; document.removeEventListener('click', close); } };
        document.addEventListener('click', close);
      }, 0);
    });
  }
  W.voltAttachReactionsPicker = attachReactionsPicker;

  // ── 6. PROFILE VIEWS COUNTER DISPLAY ──────────────────────
  function renderProfileViewsCounter() {
    const profile = W._currentProfileData || {};
    const count = Number(profile.profile_views_count || 0);
    const cfg = W.VOLT_PREMIUM?.getConfig?.();
    if (!cfg?.profile_views_counter) return;
    const accountHero = document.getElementById('account-hero');
    if (!accountHero) return;
    let badge = document.getElementById('volt-profile-views-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'volt-profile-views-badge';
      badge.className = 'volt-profile-views';
      accountHero.appendChild(badge);
    }
    badge.innerHTML = `<i class="fa-solid fa-eye"></i> ${count} vues`;
  }
  W.voltRenderProfileViews = renderProfileViewsCounter;

  // ── 7. DAILY LOGIN STREAK PING ────────────────────────────
  async function pingLoginStreak() {
    try {
      const client = W.supabaseClient;
      if (!client?.rpc) return;
      const { data } = await client.rpc('update_login_streak');
      if (data?.success && data.is_new) {
        // Show streak badge in sidebar
        renderStreakBadge(data.streak, data.best);
        if (data.streak === 7 || data.streak === 30 || data.streak === 100) {
          showAchievementToast({ id: 'login_streak', title: `${data.streak} jours d'affilée !`, icon: '📅', points: data.streak });
        }
      } else if (data?.streak) {
        renderStreakBadge(data.streak, data.best);
      }
    } catch (_) {}
  }
  W.voltPingLoginStreak = pingLoginStreak;

  function renderStreakBadge(streak, best) {
    const cfg = W.VOLT_PREMIUM?.getConfig?.();
    if (!cfg?.streak_badge) return;
    if (streak < 2) return;
    const profileMini = document.querySelector('.sidebar-profile');
    if (!profileMini) return;
    let badge = document.getElementById('volt-sidebar-streak-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'volt-sidebar-streak-badge';
      badge.className = 'volt-streak-badge';
      profileMini.appendChild(badge);
    }
    badge.title = `Meilleur: ${best || streak} jours`;
    badge.innerHTML = `<i class="fa-solid fa-fire"></i> ${streak}`;
  }

  // ── 8. FRIENDS-ONLY LEADERBOARD FILTER ────────────────────
  function injectFriendsLbFilter() {
    const lbList = document.getElementById('leaderboard-container');
    if (!lbList || !lbList.parentElement || document.getElementById('volt-friends-only-toggle')) return;
    const wrap = document.createElement('label');
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin:8px 0;font-size:12px;cursor:pointer;color:var(--text-main);';
    const labelText = (typeof W.VOLT_I18N !== 'undefined' && typeof W.VOLT_I18N.t === 'function')
      ? (W.VOLT_I18N.t('leaderboard.friendsOnly') || 'Mes amis uniquement')
      : 'Mes amis uniquement';
    wrap.innerHTML = `<input type="checkbox" id="volt-friends-only-toggle" style="margin:0;"> <i class="fa-solid fa-user-group"></i> ${escapeHtml(labelText)}`;
    lbList.parentElement.insertBefore(wrap, lbList);

    /** @type {HTMLInputElement|null} */ const toggle = /** @type {any} */ (document.getElementById('volt-friends-only-toggle'));
    if (!toggle) return;
    toggle.addEventListener('change', async () => {
      const list = document.getElementById('leaderboard-container');
      if (!list) return;
      if (toggle.checked) {
        if (typeof W.voltShowSkeleton === 'function') W.voltShowSkeleton(list.id, { rows: 8, type: 'leaderboard' });
        try {
          const { data } = await W.supabaseClient.rpc('get_friends_leaderboard', { p_category: 'no_coin_record', p_limit: 100 });
          renderFriendsLb(list, data?.rows || []);
        } catch (_e) {
          const errText = (typeof W.VOLT_I18N !== 'undefined' && typeof W.VOLT_I18N.t === 'function')
            ? (W.VOLT_I18N.t('leaderboard.error') || 'Erreur')
            : 'Erreur';
          list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);">${escapeHtml(errText)}</div>`;
        }
      } else {
        const tab = (typeof document !== 'undefined' && document._lbCurrentTab) || 'noCoinRecord';
        const fn = (W && typeof W.loadLeaderboard === 'function') ? W.loadLeaderboard : null;
        if (fn) fn(tab, true);
      }
    });
  }
  function renderFriendsLb(list, rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Aucun ami n\'a de score</div>';
      return;
    }
    list.innerHTML = rows.map((r, i) => {
      const safePic = r.profilePic ? `<img src="${escapeHtml(r.profilePic)}" loading="lazy" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">` : '';
      const time = (Number(r.time) || 0).toFixed(2);
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--border);"><span style="font-weight:800;width:24px;text-align:center;color:${i<3?'var(--accent)':'var(--text-muted)'};">${i+1}</span>${safePic}<span style="flex:1;font-weight:600;">${escapeHtml(r.pseudo)}</span><span style="font-variant-numeric:tabular-nums;color:var(--accent);font-weight:700;">${time}s</span></div>`;
    }).join('');
  }
  W.voltInjectFriendsLb = injectFriendsLbFilter;

  // ── 9. AUTO-WIRING ON LOAD ────────────────────────────────
  function autoWire() {
    if (typeof document === 'undefined') return;
    // Profile extras edit button (account section).
    const accountHero = document.getElementById('account-hero');
    if (accountHero && !document.getElementById('volt-pe-edit-btn')) {
      const btn = document.createElement('button');
      btn.id = 'volt-pe-edit-btn';
      btn.className = 'btn btn-mini';
      btn.style.cssText = 'margin-top:8px;font-size:11px;';
      btn.innerHTML = '<i class="fa-solid fa-pen"></i> Éditer profil (about, liens)';
      btn.addEventListener('click', () => openProfileExtrasModal());
      accountHero.appendChild(btn);
    }
    // URL slug button (visible only if grade legend).
    const cfg = W.VOLT_PREMIUM?.getConfig?.();
    if (cfg?.url_slug && accountHero && !document.getElementById('volt-slug-btn')) {
      const btn = document.createElement('button');
      btn.id = 'volt-slug-btn';
      btn.className = 'btn btn-mini';
      btn.style.cssText = 'margin-top:6px;margin-left:6px;font-size:11px;background:linear-gradient(135deg,#f59e0b,#8b5cf6);color:#fff;';
      btn.innerHTML = '<i class="fa-solid fa-link"></i> URL custom 👑';
      btn.addEventListener('click', () => openUrlSlugModal());
      accountHero.appendChild(btn);
    }
    renderProfileViewsCounter();
    injectFriendsLbFilter();
    // Render achievements when section opens.
    const achSection = document.getElementById('achievements');
    if (achSection && !achSection.dataset.voltAchHook) {
      achSection.dataset.voltAchHook = '1';
      const obs = new MutationObserver(() => {
        if (achSection.classList.contains('active')) {
          let host = document.getElementById('volt-achievement-grid');
          if (!host) {
            host = document.createElement('div');
            host.id = 'volt-achievement-grid';
            host.style.marginTop = '14px';
            achSection.appendChild(host);
          }
          renderAchievementShowcase('volt-achievement-grid');
        }
      });
      obs.observe(achSection, { attributes: true, attributeFilter: ['class'] });
      window.addEventListener('unload', () => obs.disconnect(), { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(autoWire, 200), { once: true });
  } else {
    setTimeout(autoWire, 200);
  }

  // Ping login streak after auth resolves.
  document.addEventListener('voltAuthReady', () => { pingLoginStreak(); }, { once: true });
})();

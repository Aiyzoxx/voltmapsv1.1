// @ts-check
(function () {
  const PAYPAL_URL = 'https://www.paypal.com/qrcodes/p2pqrc/X9GLU9F6C5VL4';

  /** Defensive HTML escape — pseudo / uid come from chrome.storage and could
   *  in theory carry HTML if a future code path skips registration validation.
   *  Delegates to voltEscapeHtml in volt-helpers.js (single source of truth). */
  const _esc = /** @type {(value: any) => string} */ (
    /** @type {any} */ (window).voltEscapeHtml
  );

  /** @returns {Promise<{ uid: string, pseudo: string }>} */
  function _getUserUid() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(['id', 'volt_profile_cache', 'pseudo'], (r) => {
          const uid = r?.id || r?.volt_profile_cache?.id || '';
          const pseudo = r?.pseudo || r?.volt_profile_cache?.pseudo || '';
          resolve({ uid, pseudo });
        });
      } catch (_) { resolve({ uid: '', pseudo: '' }); }
    });
  }

  function _showPaypalModal(productLabel, price, noteHint) {
    const existing = document.getElementById('volt-paypal-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'volt-paypal-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'volt-paypal-premium-title');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,18,0.78);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);animation:fadeIn 0.2s ease;';
    overlay.innerHTML = `
      <div style="background:linear-gradient(160deg,rgba(30,41,59,0.96),rgba(15,23,42,0.98));border:1px solid rgba(226,232,240,0.45);border-radius:22px;padding:28px;max-width:420px;width:90%;color:#f8fafc;box-shadow:0 24px 60px rgba(8,10,18,0.65),0 0 40px rgba(139,92,246,0.18);">
        <div id="volt-paypal-premium-title" style="font-size:22px;font-weight:800;margin-bottom:6px;background:linear-gradient(135deg,#8b5cf6,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Paiement PayPal</div>
        <div style="font-size:13px;color:#94a3b8;margin-bottom:18px;">${_esc(productLabel)} · <strong style="color:#f8fafc;">${_esc(price)}</strong></div>

        <div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:14px;padding:14px;margin-bottom:16px;">
          <div style="font-size:11px;color:#22d3ee;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px;">⚠️ Important</div>
          <div style="font-size:13px;line-height:1.5;color:#f8fafc;">Ajoute en <strong>note du paiement</strong> :</div>
          <div id="volt-paypal-note" style="margin-top:10px;padding:10px;background:rgba(8,10,18,0.6);border-radius:10px;font-family:monospace;font-size:12px;color:#22d3ee;word-break:break-all;user-select:all;cursor:pointer;border:1px dashed rgba(34,211,238,0.4);">${_esc(noteHint)}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:6px;">Clique pour copier · Activation manuelle après validation admin</div>
        </div>

        <div style="display:flex;gap:10px;">
          <button id="volt-paypal-cancel" style="flex:1;padding:12px;border:1px solid rgba(148,163,184,0.18);background:rgba(148,163,184,0.12);color:#f8fafc;border-radius:12px;cursor:pointer;font-weight:600;font-size:13px;font-family:inherit;">Annuler</button>
          <button id="volt-paypal-go" style="flex:2;padding:12px;border:none;background:linear-gradient(135deg,#8b5cf6,#22d3ee);color:#fff;border-radius:12px;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 12px 24px rgba(139,92,246,0.32);font-family:inherit;">
            <i class="fa-brands fa-paypal" style="margin-right:6px;"></i>Ouvrir PayPal
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const noteEl = /** @type {HTMLElement|null} */ (overlay.querySelector('#volt-paypal-note'));
    if (noteEl) {
      noteEl.addEventListener('click', () => {
        try {
          navigator.clipboard.writeText(noteEl.textContent || '');
          noteEl.style.background = 'rgba(34,211,238,0.18)';
          setTimeout(() => { noteEl.style.background = 'rgba(8,10,18,0.6)'; }, 600);
        } catch (_) {}
      });
    }
    overlay.querySelector('#volt-paypal-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#volt-paypal-go')?.addEventListener('click', async () => {
      try {
        if (chrome?.tabs?.create) await chrome.tabs.create({ url: PAYPAL_URL });
        else window.open(PAYPAL_URL, '_blank', 'noopener');
      } catch (_) {
        window.open(PAYPAL_URL, '_blank', 'noopener');
      }
      overlay.remove();
    });
  }

  // Exposed so other handlers (e.g. NoCoin map purchase) can reuse the same flow.
  window.voltShowPaypalModal = _showPaypalModal;
  window.voltGetUserUidForPaypal = _getUserUid;

  window.initPremiumShop = function () {
    const GRADE_LABELS = {
      star: { name: 'STAR ⭐', price: '2€/mois' },
      elite: { name: 'ELITE 💎', price: '5€/mois' },
      legend: { name: 'LEGEND 👑', price: '15€ à vie' },
    };

    const currentGrade = (typeof VOLT_PREMIUM !== 'undefined') ? VOLT_PREMIUM.currentGrade : null;

    const statusSubtitle = document.getElementById('premium-status-subtitle');
    const currentGradeCard = document.getElementById('premium-current-grade-card');
    const activeGradeLabel = document.getElementById('premium-active-grade-label');
    const activeGradeIcon = document.getElementById('premium-active-grade-icon');
    const expiryLabel = document.getElementById('premium-expiry-label');

    if (currentGrade && typeof VOLT_PREMIUM !== 'undefined') {
      const cfg = VOLT_PREMIUM.GRADE_CONFIG[currentGrade];
      if (currentGradeCard) currentGradeCard.style.display = 'block';
      if (cfg && activeGradeLabel) {
        activeGradeLabel.textContent = cfg.label;
        activeGradeLabel.style.cssText = `color: ${cfg.color}; font-size:22px; font-weight:800;`;
      }
      if (cfg && activeGradeIcon) {
        activeGradeIcon.textContent = cfg.emoji;
        activeGradeIcon.style.color = cfg.color;
      }

      const expires = VOLT_PREMIUM.gradeExpiresAt;
      if (expires && expiryLabel) {
        const _t = (typeof window.VOLT_TRANSLATE === 'function') ? window.VOLT_TRANSLATE : (k) => k;
        const daysLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        expiryLabel.textContent = daysLeft > 0
          ? `⏳ ${daysLeft === 1 ? _t('premium.expiresInDay') : _t('premium.expiresInDays').replace('{n}', daysLeft)}`
          : `⚠️ ${_t('premium.expired')}`;
        expiryLabel.style.color = daysLeft <= 7 ? '#ef4444' : 'var(--text-muted)';
      } else if (expiryLabel) {
        const _t = (typeof window.VOLT_TRANSLATE === 'function') ? window.VOLT_TRANSLATE : (k) => k;
        expiryLabel.textContent = _t('premium.lifetimeAccess');
        expiryLabel.style.color = '#22c55e';
      }

      if (statusSubtitle) statusSubtitle.textContent = `Grade actif : ${cfg.emoji} ${cfg.label}`;
    }

    if (currentGrade && typeof VOLT_PREMIUM !== 'undefined') {
      const myRank = VOLT_PREMIUM.GRADE_ORDER[currentGrade] || 0;
      document.querySelectorAll('.premium-plan-card').forEach(/** @param {Element} card */ (card) => {
        const grade = card.id.replace('plan-', '');
        const cardRank = VOLT_PREMIUM.GRADE_ORDER[grade] || 0;
        const btn = /** @type {HTMLButtonElement|null} */ (card.querySelector('.premium-buy-btn'));
        if (!btn) return;

        if (grade === currentGrade) {
          btn.textContent = 'Grade actuel';
          btn.disabled = true;
          btn.style.background = '#22c55e';
        } else if (cardRank < myRank) {
          btn.textContent = `✨ Inclus dans ${currentGrade.toUpperCase()}`;
          btn.disabled = true;
          btn.style.background = 'var(--bg-secondary)';
          btn.style.color = 'var(--text-muted)';
        } else {
          const _t = (typeof window.VOLT_TRANSLATE === 'function') ? window.VOLT_TRANSLATE : (k) => k;
          btn.textContent = _t('premium.openDiscordTicket');
          btn.disabled = false;
          btn.style.background = '';
        }
      });
    }

    if (typeof window.updateSidebarPremiumBadge === 'function') {
      window.updateSidebarPremiumBadge(currentGrade);
    }

    document.querySelectorAll('.premium-buy-btn').forEach(/** @param {Element} el */ (el) => {
      const btn = /** @type {HTMLButtonElement} */ (el);
      if (btn.disabled || btn.dataset.premiumListener) return;
      btn.dataset.premiumListener = '1';
      btn.addEventListener('click', async () => {
        const grade = btn.dataset.grade;
        const info = GRADE_LABELS[grade || ''] || { name: String(grade || '').toUpperCase() };
        try {
          const { uid, pseudo } = await _getUserUid();
          const noteHint = `${(grade || '').toUpperCase()} · UID:${uid || '???'} · ${pseudo || '?'}`;
          _showPaypalModal(info.name, info.price || '', noteHint);
        } catch (e) {
          if (typeof showToast === 'function') showToast(`Erreur ouverture paiement : ${e?.message || e}`, 5500);
        }
      });
    });

    const gradeOrder = (typeof VOLT_PREMIUM !== 'undefined') ? VOLT_PREMIUM.GRADE_ORDER : {};
    const hasStar = currentGrade && gradeOrder[currentGrade] >= 1;
    if (!hasStar) {
      const customPanel = document.getElementById('premium-custom-panel');
      if (customPanel) {
        customPanel.style.opacity = '0.5';
        customPanel.style.pointerEvents = 'none';
      }
    }
  };

  window.updateSidebarPremiumBadge = function (grade) {
    const badgeEl = document.getElementById('sidebar-premium-badge');
    if (!badgeEl) return;
    if (grade && typeof VOLT_PREMIUM !== 'undefined' && VOLT_PREMIUM.GRADE_CONFIG[grade]) {
      const cfg = VOLT_PREMIUM.GRADE_CONFIG[grade];
      badgeEl.textContent = cfg.emoji;
      badgeEl.style.display = 'inline-block';
    } else {
      badgeEl.style.display = 'none';
    }
  };

  const observer = new MutationObserver(() => {
    const premiumSection = document.getElementById('premium-shop');
    if (premiumSection && premiumSection.classList.contains('active')) {
      window.initPremiumShop();
    }
  });

  const main = document.querySelector('.main');
  if (main) observer.observe(main, { subtree: true, attributes: true, attributeFilter: ['class'] });

  setTimeout(() => {
    const premiumSection = document.getElementById('premium-shop');
    if (premiumSection && premiumSection.classList.contains('active')) window.initPremiumShop();
  }, 500);

})();

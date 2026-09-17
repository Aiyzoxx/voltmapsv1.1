// @ts-check
(() => {
  try {
    if (window.__VOLT_EXTENSION_CONTENT_BOOTED_V19__) return;
    window.__VOLT_EXTENSION_CONTENT_BOOTED_V19__ = true;
    try { Object.defineProperty(window, '__VOLT_EXTENSION_CONTENT_BOOTED_V19__', { value: true, writable: false, configurable: false }); } catch (_) {}
  } catch (_) {}

  // Keyboard shield for VOLT in-game panels (1v1, chat, social).
  // Registered on window at document_start (before the game loads its listeners).
  // Calling stopImmediatePropagation blocks the game's JS handlers while letting
  // the browser's native text-insertion still work in the focused input.
  (function _voltInstallPanelKeyShield() {
    const PANEL_SELECTOR = '#volt-duel-game-root, #volt-chat-panel, #volt-chat-root, #volt-social-root';
    function _voltPanelKeyShield(e) {
      try {
        const active = document.activeElement;
        if (active && active.closest && active.closest(PANEL_SELECTOR)) {
          e.stopImmediatePropagation();
        }
      } catch (_) {}
    }
    window.addEventListener('keydown',  _voltPanelKeyShield, true);
    window.addEventListener('keyup',    _voltPanelKeyShield, true);
    window.addEventListener('keypress', _voltPanelKeyShield, true);
  })();

  let T = (e, t) => {
      if (typeof chrome < "u" && chrome.runtime?.id) try {
        if (t) {
          chrome.runtime.sendMessage(e, o => {
            const n = chrome.runtime?.lastError?.message;
            t(n ? { success: false, error: n } : o);
          });
          return;
        } else {
          const o = chrome.runtime.sendMessage(e);
          return o && o.catch ? o.catch(() => {}) : Promise.resolve();
        }
      } catch {}
      return t && t(null), Promise.resolve();
    },
    M = {
      local: {
        get: (e, t) => {
          if (t)
            if (typeof chrome < "u" && chrome.runtime?.id) try {
              chrome.storage.local.get(e, t);
            } catch {
              t({});
            } else t({});
            else return new Promise(o => {
              if (typeof chrome < "u" && chrome.runtime?.id) try {
                chrome.storage.local.get(e, n => o(n || {}));
              } catch {
                o({});
              } else o({});
            });
        },
        set: (e, t) => {
          if (t)
            if (typeof chrome < "u" && chrome.runtime?.id) try {
              chrome.storage.local.set(e, t);
            } catch {
              t();
            } else t();
            else return new Promise(o => {
              if (typeof chrome < "u" && chrome.runtime?.id) try {
                chrome.storage.local.set(e, () => o());
              } catch {
                o();
              } else o();
            });
        },
        remove: (e, t) => {
          if (t)
            if (typeof chrome < "u" && chrome.runtime?.id) try {
              chrome.storage.local.remove(e, t);
            } catch {
              t();
            } else t();
            else return new Promise(o => {
              if (typeof chrome < "u" && chrome.runtime?.id) try {
                chrome.storage.local.remove(e, () => o());
              } catch {
                o();
              } else o();
            });
        },
        clear: t => {
          if (t)
            if (typeof chrome < "u" && chrome.runtime?.id) try {
              chrome.storage.local.clear(t);
            } catch {
              t();
            } else t();
            else return new Promise(o => {
              if (typeof chrome < "u" && chrome.runtime?.id) try {
                chrome.storage.local.clear(() => o());
              } catch {
                o();
              } else o();
            });
        }
      }
    },
    A1 = !0,
    q = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      debug: console.debug.bind(console),
      error: console.error.bind(console)
    };
  z("!!! CONTENT SCRIPT IS ALIVE !!!");

  function z(e, t = "#2997ff", ...o) {
    if (A1 && !(typeof v !== "undefined" && v && v.voltDebugLogs === true)) return;
    q.log(`%c[VOLT]%c ${e}`, `color:${t};font-weight:bold;`, "color:inherit;font-weight:normal;", ...o);
  }
  (function () {
    const e = document.createElement("script");
    e.src = chrome.runtime.getURL("securityInjected.js"), (document.head || document.documentElement).appendChild(e),
      e.onload = () => e.remove();
  })();
  let voltSpeedhackBlocked = false;

  function voltBlockForSpeedhack(reason = "speedhack_detected") {
    voltSpeedhackBlocked = true;
    try { window.__VOLT_SPEEDHACK_BLOCKED__ = true; Object.defineProperty(window, '__VOLT_SPEEDHACK_BLOCKED__', { value: true, writable: false, configurable: false }); } catch (_) {}
    try {
      if (window._voltHeartbeat) { clearInterval(window._voltHeartbeat);
        window._voltHeartbeat = null; }
      if (window._voltNoCoinHeartbeat) { clearInterval(window._voltNoCoinHeartbeat);
        window._voltNoCoinHeartbeat = null; }
    } catch (_) {}
    try {
      T({ action: "resetRunSession", reason: "speedhack_detected", detail: String(reason || "").slice(0, 80) }).catch(() => {});
    } catch (_) {}
  }
  window.addEventListener("message", e => {
    const data = e && e.data || {};
    if (e.source !== window || e.origin !== window.location.origin) return;
    if (data.source === "VOLT_SECURITY" && data.type === "SPEEDHACK_DETECTED") {
      voltBlockForSpeedhack(data.reason || "speedhack_detected");
    }
  });

  function voltCanStartTrustedRun() {
    if (!voltSpeedhackBlocked) return true;
    // Defer reload so callers observe the false return before the page tears down.
    try { setTimeout(() => { try { window.location.reload(); } catch (_) {} }, 0); } catch (_) {}
    return false;
  }

  function T0() {
    const detectAudio = voltAudioDetectionEnabled(v);
    const smartGuard = voltSmartGuardEnabled(v);
    const sendAudioConfig = (volume) => {
      try {
        window.postMessage({ type: "VOLT_AUDIO_HOOK_CONFIG", detectAudio, smartGuard }, window.location.origin);
        window.postMessage({ type: "EXT_SET_VOLUME", volume }, window.location.origin);
      } catch (_) {}
    };
    if (document.getElementById("volt-audio-hook")) {
      M.local.get(["globalVolumeLevel"], t => {
        const o = t.globalVolumeLevel !== void 0 ? t.globalVolumeLevel : 1;
        setTimeout(() => sendAudioConfig(o), 50);
      });
      return;
    }
    const e = document.createElement("script");
    e.id = "volt-audio-hook", e.src = chrome.runtime.getURL("audioHook.js"), (document.head || document.documentElement).appendChild(e),
      M.local.get(["globalVolumeLevel"], t => {
        const o = t.globalVolumeLevel !== void 0 ? t.globalVolumeLevel : 1;
        setTimeout(() => sendAudioConfig(o), 100);
      });
  }

  function voltSmartGuardEnabled(e = v) {
    // STAGE5: hidden run tracking is always ON and independent from the visible
    // Timer / Smart Timer toggles, so analytics, leaderboard and 1v1 can count
    // runs even when the user keeps those UI options disabled.
    return true;
  }

  function voltAudioDetectionEnabled(e = v) {
    return !!(e && (e.smartTimer === true || voltSmartGuardEnabled(e)));
  }

  function voltSendAudioHookConfig() {
    try {
      window.postMessage({ type: "VOLT_AUDIO_HOOK_CONFIG", detectAudio: voltAudioDetectionEnabled(v), smartGuard: voltSmartGuardEnabled(v) }, window.location.origin);
    } catch (_) {}
  }

  function voltNeedsAudioHook(e = v) {
    // STAGE4: main-world WebAudio patching is required for the hidden anti-cheat Smart Guard.
    // UI overlays stay lazy, but the audio detector must be ready even if the Smart Timer switch is OFF.
    return voltAudioDetectionEnabled(e);
  }

  function voltEnsureAudioHookIfNeeded(reason) {
    try {
      if (voltNeedsAudioHook(v)) T0();
    } catch (_) {}
  }

  function Je() {
    const e = t => {
      t.play().then(() => {
        t.pause(), t.currentTime = 0;
      }).catch(() => {});
    };
    z("Audio unlock interaction received");
  }
  window.addEventListener("mousedown", Je, {
    once: !0
  });
  window.addEventListener("keydown", Je, {
    once: !0
  });
  let voltStatsRefreshTimer = 0;

  function voltScheduleStatsRefresh(delay = 60000) {
    try { clearTimeout(voltStatsRefreshTimer); } catch (_) {}
    voltStatsRefreshTimer = setTimeout(() => {
      if (!x1 || document.hidden || L === "running") return voltScheduleStatsRefresh(document.hidden ? 180000 : 60000);
      try {
        chrome.storage.local.get(["stats_no_coin_record", "voltPerfDefaultsMigratedV19"], e => {
          e && e.stats_no_coin_record && e.stats_no_coin_record > d1 && (d1 = e.stats_no_coin_record);
          voltScheduleStatsRefresh(60000);
        });
      } catch (_) {
        voltScheduleStatsRefresh(120000);
      }
    }, Math.max(10000, delay));
  }
  voltScheduleStatsRefresh();
  // STAGE4: audioHook.js is injected after settings restore for hidden Smart Guard anti-cheat.
  // The hook stays filtered and does not create overlay DOM or RAF by itself.
  voltEnsureAudioHookIfNeeded('boot');
  let J = !1;
  const C0 = ["#ads", ".ads", "#google_ads_frame", ".ad-container", ".ad-wrap", ".ad-box", ".adsbygoogle", ".googlesyndication", ".doubleclick", ".media-net", ".pub_300x250", ".pub_300x250m", ".pub_728x90", ".text-ad", ".textAd", "#carbonads", ".carbon-wrap", "#ad_top", "#ad_bottom", "[class*='poki-ad']", "[id*='poki-sdk']", "#poki-ad", ".CG_ad_container", "[id*='crazygames-video']", ".crazygames-ad", ".preroll-ad", "[id*='preroll']", ".game-sponsor", "[id*='game-sponsor']", ".video-ad-container", ".ima-container", "[data-ad-type]", "#playwire", ".unblocked-ad", ".ad-sidebar", ".ads-sidebar", "[id*='ad-sidebar']", "[class*='ad-sidebar']", ".ad-fixed", ".fixed-ad", "[id*='ad-fixed']", "[class*='ad-fixed']", ".ad-sticky", ".sticky-ad", ".bottom-ad-container", ".top-ad-container", ".left-ad-container", ".right-ad-container", "[class*='ad-unit']", "[id*='ad-unit']", "[class*='ad-slot']", "[id*='ad-slot']", ".ad-banner-container", ".ads-wrapper"],
    Qe = C0.join(","),
    z0 = ["doubleclick", "googlesyndication", "adsystem", "adservice", "adnxs", "taboola", "outbrain", "popads", "propellerads", "trafficroots", "clickadu", "spoutable", "onclick", "interstitial", "popunder", "redir", "redirect", "trk.", "track.", "adzerk", "revcontent", "megapop", "adblade", "exoclick", "juicyads", "adsterra", "popcash", "admaven", "hilltopads", "monetag", "richads", "trafficjunky", "mgid", "zeroredirect", "pubmatic", "openx", "criteo", "smartadserver", "amazon-adsystem", "media.net", "bidvertiser", "adcash", "adcolony", "unity3d", "applovin", "vungle", "inmobi", "mopub", "ironsrc", "chartboost", "startapp", "fyber", "tapjoy", "adroll", "perfectaudience", "retargeter", "steelhouse", "chango", "triggit", "ad.", "ads.", "adv.", "banner.", "click.", "pop.", "tracking.", "pixel.", "syndication", "adsrv", "adserver", "adtech", "advertising", "sponsor", "playwire", "adinplay", "venatus", "cpmstar", "superawesome", "kidoz", "kraut", "tynt", "exponential", "mintegral", "ironsource"],
    L0 = ["popup", "popunder", "interstitial", "advert", "ads", "trk", "redirect", "click", "banner", "promo", "sponsor", "aff", "partner", "track", "pixel", "conversion", "campaign", "landing", "offer", "deal", "cpa", "cpc", "cpm", "preroll", "rewarded", "ima3", "vast", "vpaid", "videoad"],
    F0 = new RegExp(z0.map(e => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i"),
    A0 = new RegExp(L0.join("|"), "i");
  if (!A1 || (typeof v !== "undefined" && v && v.voltDebugLogs === true)) console.log("%c[VOLT] !!! CONTENT SCRIPT IS ALIVE !!!", "background: #3b82f6; color: #fff; font-weight: bold; font-size: 20px;");
  var v = {},
    x1 = !1;

  function P0() {
    let e = document.getElementById("volt-core-styles");
    return e || (e = document.createElement("style"), e.id = "volt-core-styles", document.head.appendChild(e)),
      e;
  }
  const e0 = {};

  function M0() {
    const e = P0();
    e.textContent = Object.values(e0).join(`\n`);
  }

  function Q(e, t) {
    e0[e] = t, M0();
  }
  async function c1() {
    const e = ["adblockActive", "tripleClickActive", "tripleClickKey", "customHotkey", "zqsdActive", "zqsdKeys", "performanceMode", "customFontData", "timerSettings", "globalVolumeLevel", "smartTimer", "tripleClickX", "tripleClickY", "stretchedResActive", "stretchedResFactor", "blackBarsEnabled", "forcedResolutionMode", "verticalResolutionEnabled", "barsColor", "selectedResolutionMode", "colorLabSettings", "keySoundSettings", "livesplitTheme", "timerRgbMode", "timerColors", "keypressSettings", "volt_profile_cache", "dndActive", "timerFont", "voltTheme", "advancedStyleV2", "keysStylePreset", "preferredLanguage", "languageConfirmed", "customKeys", "musicPlaylistUrl", "bgTimer", "bgFps", "bgKeys", "bgKeysActive", "resolutionStretch", "pseudo", "profilePic", "bannerPic", "bannerSize", "bannerOffset", "lastTab", "customFontName", "stats_no_coin_record", "voltPerfDefaultsMigratedV19", "voltPerfStage2MigratedV19", "voltDebugLogs", "voltDebugPerf", "voltSmartGuard", "voltDuelPanelEnabled", "voltDuelPanelOpen", "fpsSettings", "keypressSettings", "keyColors", "keyImages", "overlaySnapGrid", "overlayPositions"],
      t = await M.local.get(e);
    if (!t.voltPerfDefaultsMigratedV19) {
      const perfMigration = { voltPerfDefaultsMigratedV19: true };
      if (t.adblockActive === true) { t.adblockActive = false;
        perfMigration.adblockActive = false; }
      if (t.tripleClickActive === true) { t.tripleClickActive = false;
        perfMigration.tripleClickActive = false; }
      if (Number(t.globalVolumeLevel) === .5) { t.globalVolumeLevel = 1;
        perfMigration.globalVolumeLevel = 1; }
      if (t.smartTimer === true) { t.smartTimer = false;
        perfMigration.smartTimer = false; }
      if (t.timerSettings && t.timerSettings.visible === true) {
        t.timerSettings = { ...t.timerSettings, visible: false };
        perfMigration.timerSettings = t.timerSettings;
      }
      M.local.set(perfMigration).catch?.(() => {});
    }
    if (!t.voltPerfStage2MigratedV19) {
      const perfStage2 = {
        voltPerfStage2MigratedV19: true,
        performanceMode: true,
        adblockActive: false,
        tripleClickActive: false,
        smartTimer: false,
        voltDuelPanelEnabled: true,
        voltDuelPanelOpen: false,
        voltSmartGuard: true,
        globalVolumeLevel: 1
      };
      if (t.timerSettings && typeof t.timerSettings === "object") perfStage2.timerSettings = { ...t.timerSettings, visible: false };
      else perfStage2.timerSettings = { position: { x: 20, y: 20 }, size: { width: 300, height: 80 }, visible: false };
      if (t.fpsSettings && typeof t.fpsSettings === "object") perfStage2.fpsSettings = { ...t.fpsSettings, visible: false };
      else perfStage2.fpsSettings = { position: { x: 20, y: 100 }, visible: false, mode: "normal", color: "#FFFFFF", showBg: true, fontSize: 36 };
      if (t.keypressSettings && typeof t.keypressSettings === "object") perfStage2.keypressSettings = { ...t.keypressSettings, visible: false };
      else perfStage2.keypressSettings = { visible: false, size: 1, layout: "arrows", theme: "default", position: null };
      Object.assign(t, perfStage2);
      M.local.set(perfStage2).catch?.(() => {});
    }
    v = t || {};
    // STAGE5: keep the persisted flag true for old installs. The runtime no longer
    // lets this setting disable hidden run tracking.
    if (v.voltSmartGuard !== true) {
      v.voltSmartGuard = true;
      M.local.set({ voltSmartGuard: true }).catch?.(() => {});
    }
    x1 = !0, v.stats_no_coin_record ? d1 = v.stats_no_coin_record : T({
        action: "syncFromCloud"
      }), typeof J < "u" && (J = t.adblockActive === !0), typeof M1 < "u" && (M1 = !!t.tripleClickActive),
      typeof R1 < "u" && (R1 = t.tripleClickKey || "KeyF"), window.livesplitThemeEnabled = !!t.livesplitTheme,
      R0();
  }

  function R0() {
    const e = v;
    e.colorLabSettings && Y1(e.colorLabSettings), e.keySoundSettings && ve(e.keySoundSettings);
    const t = e.globalVolumeLevel !== void 0 ? e.globalVolumeLevel : 1;
    voltTimerUiMinIntervalMs = e.performanceMode !== false ? 50 : 33;
    D = t, typeof a1 < "u" && a1 && (a1.volume = t), typeof l1 < "u" && l1 && (l1.volume = t), e.timerSettings?.visible && typeof e1 == "function" && e1(),
      typeof Ce == "function" && Ce(e.performanceMode !== false), e.advancedStyleV2 && setTimeout(() => {
        typeof G1 == "function" && G1(e.advancedStyleV2);
      }, 500);
    voltEnsureAudioHookIfNeeded('settings_restore');
    // Tâche A+B: init snap et couleurs depuis storage
    if (e.overlaySnapGrid !== undefined) voltOverlaySnapGrid = !!e.overlaySnapGrid;
    if (e.keyColors && typeof e.keyColors === 'object') voltKeyColors = e.keyColors;
    if (e.keyImages && typeof e.keyImages === 'object') voltKeyImages = e.keyImages;
    if (e.overlayPositions) setTimeout(() => voltRestoreOverlayPositions(e.overlayPositions), 100);
    if (e.fpsSettings?.visible) {
      const fps = e.fpsSettings;
      if (fps.position) C.position = fps.position;
      C.mode = fps.mode || 'normal';
      C.color = fps.color || '#FFFFFF';
      C.showBg = fps.showBg !== undefined ? fps.showBg : true;
      C.fontSize = fps.fontSize || 36;
      I = true;
      const _startFps = () => { y || v1(); at(); };
      if (document.readyState === 'loading') {
        window.addEventListener('load', () => setTimeout(_startFps, 250), { once: true });
      } else {
        setTimeout(_startFps, 250);
      }
    }
  }
  chrome.storage.onChanged.addListener(e => {
    if (!(typeof v > "u" || !v)) {
      for (const t in e) v[t] = e[t].newValue, t === "livesplitTheme" && (window.livesplitThemeEnabled = !!e[t].newValue,
        typeof B == "function" && B());
      if (e.adblockActive) {
        e.adblockActive.newValue === true ? (J = true, N0(), D0(), i0()) : voltDisableDomAdblock();
      }
      if (e.tripleClickActive || e.tripleClickKey || e.tripleClickX || e.tripleClickY) V0();
      e.advancedStyleV2?.newValue && typeof G1 == "function" && requestAnimationFrame(() => G1(e.advancedStyleV2.newValue));
      e.keysStylePreset && v.advancedStyleV2 && typeof G1 == "function" && requestAnimationFrame(() => G1(v.advancedStyleV2));
      if (e.timerWatermark) voltUpdateTimerWatermark(e.timerWatermark.newValue || "");
      if (e.showDeathCounter) { v.showDeathCounter = e.showDeathCounter.newValue;
        voltUpdateDeathCounter(); }
      // Tâche A : couleurs par touche
      if (e.keyColors) {
        voltKeyColors = e.keyColors.newValue || {};
        voltApplyKeyColors(voltKeyColors);
      }
      if (e.keyImages) {
        voltKeyImages = e.keyImages.newValue || {};
        voltApplyKeyImages(voltKeyImages);
      }
      // Tâche B : snap-to-grid toggle
      if (e.overlaySnapGrid !== undefined) {
        voltOverlaySnapGrid = !!e.overlaySnapGrid.newValue;
      }
    }
  });
  c1();
  let I0 = !1,
    O0 = e => {
      if (!e) return "";
      try {
        return new URL(e, location.href).href;
      } catch {
        return String(e);
      }
    },
    t0 = e => {
      const t = O0(e);
      if (!t) return !1;
      try {
        const o = new URL(t);
        if (o.origin === location.origin) return !1;
        const n = o.hostname.toLowerCase();
        return !!(F0.test(n) || A0.test(o.pathname.toLowerCase()));
      } catch {
        return !0;
      }
    };
  let voltAdblockClickHandler = null,
    voltAdblockInteractionHandler = null,
    voltAdblockHeadObserver = null;

  function N0() {
    if (!J) return;
    const e = /** @type {any} */ (window.open);
    if (!e || e.__gt_patched) return;
    const t = function (n, i, r) {
      return !n || n === "about:blank" || n === "" || t0(n) ? (T({
        action: "adBlocked"
      }), null) : window._userInteracting ? e.apply(this, arguments) : (T({
        action: "adBlocked"
      }), null);
    };
    t.__gt_patched = !0, window.open = t;
    if (!voltAdblockInteractionHandler) {
      voltAdblockInteractionHandler = () => {
        window._userInteracting = !0;
        clearTimeout(window._voltAdblockInteractingTimer);
        window._voltAdblockInteractingTimer = setTimeout(() => {
          window._userInteracting = !1;
        }, 1e3);
      };
      ["click", "mousedown", "keydown", "touchstart"].forEach(o => {
        document.addEventListener(o, voltAdblockInteractionHandler, { capture: true, passive: true });
      });
    }
  }

  function D0() {
    if (!J || voltAdblockClickHandler) return;
    voltAdblockClickHandler = t => {
      if (!J || !t.isTrusted) return;
      const n = t.target?.closest?.("a")?.href || null;
      n && t0(n) && (t.preventDefault(), t.stopPropagation(), T({
        action: "adBlocked"
      }));
    };
    document.addEventListener("click", voltAdblockClickHandler, !0);
  }

  function voltDisableDomAdblock() {
    J = false;
    const e = document.getElementById("gaming-tools-adblock");
    e && e.remove();
    if (voltAdblockHeadObserver) {
      try { voltAdblockHeadObserver.disconnect(); } catch (_) {}
      voltAdblockHeadObserver = null;
    }
    if (voltAdblockClickHandler) {
      try { document.removeEventListener("click", voltAdblockClickHandler, true); } catch (_) {}
      voltAdblockClickHandler = null;
    }
    if (voltAdblockInteractionHandler) {
      ["click", "mousedown", "keydown", "touchstart"].forEach(o => {
        try { document.removeEventListener(o, voltAdblockInteractionHandler, true); } catch (_) {}
      });
      voltAdblockInteractionHandler = null;
    }
    Ke = false;
  }
  let $1 = null;

  function Be(e = document) {
    !J || A1 || ($1 && clearTimeout($1), $1 = setTimeout(() => {
      try {
        if (e.closest?.("canvas")) return;
        const t = e.querySelectorAll(Qe);
        t.length > 0 && T({
          action: "adBlocked",
          count: t.length
        });
      } catch {}
      $1 = null;
    }, 1e3));
  }

  function B0() {
    I0 = !0, z("[VOLT] High-perf AdBlock mode active (Observer disabled)");
  }
  (async () => {
    if (x1 || await c1(), v.adblockActive !== !0) {
      J = !1;
      return;
    }
    J = !0, N0(), D0(), i0();
  })();
  var o0 = window.innerWidth / 2,
    n0 = window.innerHeight / 2,
    M1 = !1,
    R1 = "KeyF",
    I1 = null,
    O1 = null,
    de = !1,
    voltMouseTracking = !1;

  function voltMouseTrackHandler(e) {
    o0 = e.clientX, n0 = e.clientY;
  }

  function voltUpdateMouseTracking() {
    if (M1 && !voltMouseTracking) {
      document.addEventListener("mousemove", voltMouseTrackHandler, { passive: !0 });
      voltMouseTracking = !0;
    } else if (!M1 && voltMouseTracking) {
      document.removeEventListener("mousemove", voltMouseTrackHandler, /** @type {any} */ ({ passive: !0 }));
      voltMouseTracking = !1;
    }
  }

  function V0() {
    const e = v;
    e.tripleClickActive !== void 0 && (M1 = !!e.tripleClickActive), e.tripleClickKey && (R1 = e.tripleClickKey),
      e.tripleClickX != null && (I1 = Number(e.tripleClickX)), e.tripleClickY != null && (O1 = Number(e.tripleClickY));
    voltUpdateMouseTracking();
  }
  V0();

  function K0(e, t, o) {
    const n = document.createElement("div");
    n.style.cssText = "position:fixed;width:30px;height:30px;border-radius:50%;pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);background:#10b981;box-shadow:0 0 15px #10b981;",
      n.style.left = e + "px", n.style.top = t + "px", (document.documentElement || document.body).appendChild(n),
      setTimeout(() => n.remove(), 300);
  }

  function H0() {
    const e = I1 !== null ? I1 : o0,
      t = O1 !== null ? O1 : n0;
    K0(e, t);
    const o = document.querySelector("canvas");
    if (!o) return;
    const n = o.getBoundingClientRect(),
      i = e - n.left,
      r = t - n.top,
      l = () => {
        const p = {
          bubbles: !0,
          cancelable: !0,
          view: window,
          clientX: e,
          clientY: t,
          screenX: e + window.screenX,
          screenY: t + window.screenY,
          pageX: e + window.scrollX,
          pageY: t + window.scrollY,
          offsetX: i,
          offsetY: r,
          button: 0,
          buttons: 1,
          detail: 1
        };
        o.dispatchEvent(new MouseEvent("mousedown", p)), o.dispatchEvent(new MouseEvent("mouseup", p)),
          o.dispatchEvent(new MouseEvent("click", p));
      };
    l();
    let d = 1;
    setTimeout(() => {
      l(), d++, setTimeout(() => {
        l();
      }, 80);
    }, 80);
  }

  function $0() {
    if (de) return;
    de = !0;
    const e = document.createElement("div");
    e.id = "triple-click-pick-overlay", e.style.cssText = "position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:rgba(99,102,241,0.15);";
    const t = document.createElement("div");
    t.id = "triple-click-pick-indicator", t.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#6366f1;color:white;padding:12px 24px;border-radius:12px;font-family:Inter,sans-serif;font-size:14px;font-weight:600;z-index:2147483647;box-shadow:0 8px 32px rgba(99,102,241,0.4);pointer-events:none;",
      t.textContent = " Cliquez pour définir la position (Échap pour annuler)";
    const o = document.createElement("div");
    o.id = "triple-click-cursor", o.style.cssText = "position:fixed;width:20px;height:20px;border:3px solid #6366f1;border-radius:50%;pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);box-shadow:0 0 0 2px white,0 4px 12px rgba(0,0,0,0.3);";
    const n = document.createElement("div");
    n.id = "triple-click-coords", n.style.cssText = "position:fixed;background:#18181b;color:#f4f4f5;padding:6px 12px;border-radius:8px;font-family:monospace;font-size:13px;pointer-events:none;z-index:2147483647;transform:translate(15px,-50%);border:1px solid #3f3f46;",
      (document.documentElement || document.body).appendChild(e), (document.documentElement || document.body).appendChild(t),
      (document.documentElement || document.body).appendChild(o), (document.documentElement || document.body).appendChild(n);
    const i = d => {
        o.style.left = d.clientX + "px", o.style.top = d.clientY + "px", n.style.left = d.clientX + "px",
          n.style.top = d.clientY + "px", n.textContent = "X: " + d.clientX + " | Y: " + d.clientY;
      },
      r = () => {
        de = !1, e.remove(), t.remove(), o.remove(), n.remove(), document.removeEventListener("mousemove", i),
          document.removeEventListener("keydown", l);
      },
      l = d => {
        d.key === "Escape" && r();
      };
    e.addEventListener("click", d => {
      d.preventDefault(), d.stopPropagation();
      const p = d.clientX,
        s = d.clientY;
      I1 = p, O1 = s, M.local.set({
          tripleClickX: p,
          tripleClickY: s
        }), t.textContent = " Position: X=" + p + ", Y=" + s, t.style.background = "#10b981",
        setTimeout(r, 800);
    }), document.addEventListener("mousemove", i), document.addEventListener("keydown", l);
  }
  z("Volt Extension Complete - Content script chargé");

  function Ve() {
    const e = "gaming-tools-adblock";
    if (document.getElementById(e)) return;
    const t = document.createElement("style");
    t.id = e, t.textContent = Qe + " { display: none !important; visibility: hidden !important; pointer-events: none !important; width: 0 !important; height: 0 !important; position: absolute !important; left: -9999px !important; }",
      document.head.appendChild(t), z("AdBlock CSS injecté");
  }
  var Ke = !1;
  async function i0() {
    if (!J || Ke) return;
    Ke = !0;
    const e = await T({
      action: "getAdblockState"
    });
    e && e.active !== !1 && (Ve(), Be(), B0(), voltAdblockHeadObserver && voltAdblockHeadObserver.disconnect(), (() => {
      let _adblockDebounceTimer = null;
      voltAdblockHeadObserver = new MutationObserver(() => {
        if (!J || document.getElementById("gaming-tools-adblock")) return;
        clearTimeout(_adblockDebounceTimer);
        _adblockDebounceTimer = setTimeout(Ve, 100);
      });
    })(), voltAdblockHeadObserver.observe(document.head, {
      childList: !0
    }), Be());
  }
  let m = null;
  window.livesplitThemeEnabled = !1;
  var L = "stopped",
    N1 = null,
    F = 0,
    R = null,
    V = !1,
    S = null,
    i1 = null,
    Y = null,
    he = "",
    ge = "",
    N = "Control",
    be = null,
    T1 = !1,
    y = null,
    I = !1,
    voltLocalRunEpochMs = 0;
  // Snap-to-grid and per-key colours (Tâches A+B)
  var voltOverlaySnapGrid = false;
  var voltKeyColors = {};
  var voltKeyImages = {};

  function voltSnapValue(x) { return voltOverlaySnapGrid ? Math.round(x / 20) * 20 : x; }

  function voltApplyKeyColors(keyColorsMap) {
    if (!c) return;
    const overlay = c;
    const globalBg = (v.advancedStyleV2 && v.advancedStyleV2.keys && v.advancedStyleV2.keys.bgColor) || '#000000';
    ['key-up', 'key-down', 'key-left', 'key-right'].forEach(function (keyId) {
      const el = overlay.querySelector('#' + keyId);
      if (!el) return;
      const col = keyColorsMap && keyColorsMap[keyId];
      if (col) {
        el.dataset.voltKeyColor = col;
        // Override background directly — wins over global style
        el.style.setProperty('background-color', col, 'important');
        el.style.setProperty('background-image', 'none', 'important');
      } else {
        delete el.dataset.voltKeyColor;
        el.style.removeProperty('background-color');
        el.style.removeProperty('background-image');
        // Restore global bg
        el.style.backgroundColor = globalBg;
      }
    });
  }

  function voltApplyKeyImages(keyImagesMap) {
    if (!c) return;
    ['key-up', 'key-down', 'key-left', 'key-right'].forEach(function (keyId) {
      const el = c.querySelector('#' + keyId);
      if (!el) return;
      const img = keyImagesMap && keyImagesMap[keyId];
      if (img) {
        el.style.setProperty('background-image', 'url(' + img + ')', 'important');
        el.style.setProperty('background-size', 'cover', 'important');
        el.style.setProperty('background-position', 'center', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
      } else {
        el.style.removeProperty('background-image');
        el.style.removeProperty('background-size');
        el.style.removeProperty('background-position');
      }
    });
  }

  function voltSaveOverlayPosition(which, x, y) {
    M.local.get(['overlayPositions'], function (r) {
      const pos = Object.assign({}, r.overlayPositions || {});
      pos[which] = { x: Math.round(x), y: Math.round(y) };
      M.local.set({ overlayPositions: pos });
    });
  }

  function voltRestoreOverlayPositions(positions) {
    if (!positions) return;
    if (positions.timer && m) {
      m.style.left = positions.timer.x + 'px';
      m.style.top = positions.timer.y + 'px';
    }
    if (positions.fps && y) {
      y.style.left = positions.fps.x + 'px';
      y.style.top = positions.fps.y + 'px';
    }
    if (positions.keys && c) {
      c.style.left = positions.keys.x + 'px';
      c.style.top = positions.keys.y + 'px';
    }
  }
  var voltLastTimerUiRender = 0,
    voltTimerUiMinIntervalMs = 33,
    voltLastOvertakeScan = 0;
  var _voltDeathCount = 0,
    _voltAttemptCount = 0,
    _voltSessionStart = Date.now();

  function voltUpdateDeathCounter() {
    var el = document.getElementById("volt-death-counter");
    if (!el) return;
    var showDC = !(v && v.showDeathCounter === false);
    if (!showDC || (_voltDeathCount === 0 && _voltAttemptCount === 0)) {
      el.style.display = "none";
      return;
    }
    el.textContent = "☠ " + _voltDeathCount + " · " + _voltAttemptCount + " essais";
    el.style.display = "block";
  }

  function voltUpdateTimerWatermark(text) {
    var el = document.getElementById("volt-timer-watermark");
    if (!el) return;
    var safe = String(text || "").slice(0, 30);
    if (!safe) { el.style.display = "none"; return; }
    el.textContent = safe;
    el.style.display = "block";
  }
  let voltTimerLoopIsTimeout = false;

  function voltCancelTimerLoop() {
    if (!R) return;
    try {
      voltTimerLoopIsTimeout ? clearTimeout(R) : cancelAnimationFrame(R);
    } catch (_) {
      try { clearTimeout(R); } catch (__) {}
      try { cancelAnimationFrame(R); } catch (__) {}
    }
    R = null;
    voltTimerLoopIsTimeout = false;
  }

  function voltScheduleTimerLoop(e) {
    voltCancelTimerLoop();
    voltTimerLoopIsTimeout = true;
    R = setTimeout(e, Math.max(16, voltTimerUiMinIntervalMs || 33));
    return R;
  }
  let o1 = null,
    He = "",
    $e = "",
    C = {
      position: {
        x: 20,
        y: 100
      },
      visible: !1,
      mode: "normal",
      color: "#FFFFFF",
      showBg: !0,
      fontSize: 36
    };
  let r0 = {
      visible: !1,
      size: 1,
      layout: "arrows",
      theme: "default",
      position: null
    },
    c = null,
    P = !1,
    b = {
      ...r0
    },
    W = null,
    W1 = null,
    b1 = {},
    m1 = null;
  let r1 = Object.create(null),
    D1 = new Set,
    ue = null,
    u1 = {
      ...r0,
      position: null
    };
  let voltKeypressListenersActive = false;

  function voltUpdateKeypressListeners() {
    try {
      if (P && !voltKeypressListenersActive) {
        document.addEventListener("keydown", ht, true);
        document.addEventListener("keyup", gt, true);
        voltKeypressListenersActive = true;
      } else if (!P && voltKeypressListenersActive) {
        document.removeEventListener("keydown", ht, true);
        document.removeEventListener("keyup", gt, true);
        voltKeypressListenersActive = false;
        Ee();
      }
    } catch (_) {}
  }
  async function q0() {
    x1 || await c1();
    const e = v;
    typeof xe == "function" && xe();
    const t = await new Promise(o => M.local.get("volt_profile_cache", o));
    window._voltProfile = t.volt_profile_cache || null, e.customHotkey && (N = e.customHotkey),
      e.zqsdActive && (z("Restoring ZQSD Mode..."), _1()), e.performanceMode || T({
        action: "getFpsSettings"
      }, o => {
        if (o?.settings?.visible) {
          const { position: n, mode: i, color: r, showBg: l, fontSize: d } = o.settings;
          n && (C.position = n), C.visible = !0, C.mode = i || "normal", C.color = r || "#FFFFFF",
            C.showBg = l !== void 0 ? l : !0, C.fontSize = d || 36, y || v1(), I = !0, V1();
        }
      }), T({
        action: "getKeypressSettings"
      }, o => {
        const kp = o && o.settings && typeof o.settings === "object" ? o.settings : null;
        if (kp) {
          // Restore the full key display configuration on every page load,
          // not only the visible flag. This keeps presets/layout/size/position
          // consistent when the user reopens the game or the popup later.
          b.visible = kp.visible === true;
          b.size = re(kp.size ?? b.size ?? 1);
          b.layout = kp.layout || b.layout || "arrows";
          b.theme = Re(kp.theme || b.theme || "default");
          if (kp.position && typeof kp.position === "object") b.position = kp.position;
          P = b.visible === true;
          if (P) {
            c || b0();
            H1(b.theme || "default");
            le(b.layout || "arrows");
            ae(b.size || 1);
            c && (c.style.display = "block");
            b.position && Oe(b.position);
            k1();
            te();
            Ie();
            Ee();
          }
          voltUpdateKeypressListeners();
          if (v.keysStylePreset && v.advancedStyleV2 && typeof G1 === 'function') {
            requestAnimationFrame(() => G1(v.advancedStyleV2));
          }
        }
      }), e.customFontData && s0(e.customFontData);
  }

  function s0(e) {
    let t = "volt-custom-font-face",
      o = document.getElementById(t);
    o || (o = document.createElement("style"), o.id = t, document.head.appendChild(o)),
      e ? o.textContent = `\n      @font-face {\n        font-family: 'VOLT-Custom';\n        src: url('${e}');\n      }\n      #speedrun-timer-overlay #timer-display { font-family: 'VOLT-Custom', sans-serif !important; }\n      #key-display-overlay { --key-font: 'VOLT-Custom', sans-serif !important; }
      #key-display-overlay, #key-display-overlay .key, #key-display-overlay .key span { font-family: 'VOLT-Custom', sans-serif !important; }\n    ` : o.textContent = "";
  }
  async function qe() {
    z(" Initialisation VOLT..."), await q0(), i0(), v.timerSettings?.visible && e1(),
      z(" VOLT Prêt.");
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", qe) : qe();
  var D = 1,
    Ue = !1;

  function a0() {
    const e = document.documentElement || document.head || document.body;
    if (!e) {
      window.addEventListener("DOMContentLoaded", a0, {
        once: !0
      });
      return;
    }
    if (e.dataset?.volumeInjected === "true") return;
    const t = document.createElement("script");
    t.type = "text/javascript", t.src = chrome.runtime.getURL("volumeInjected.js"),
      t.dataset.channel = "GAMING_TOOLS_VOLUME_CHANNEL", t.addEventListener("load", () => {
        t.remove();
      }), e.appendChild(t), e.dataset && (e.dataset.volumeInjected = "true");
  }

  function Le(e, t = {}) {
    window.postMessage({
      source: "GAMING_TOOLS_VOLUME_CHANNEL",
      type: e,
      payload: t
    }, window.location.origin);
  }
  async function U0() {
    x1 || await c1();
    const e = v.globalVolumeLevel;
    if (e === void 0 || Math.abs(Number(e) - 1) <= .001) return;
    a0();
    e !== void 0 && (D = Math.min(1, Math.max(0, e)));
    const t = () => {
      window.postMessage({
        type: "EXT_SET_VOLUME",
        volume: D
      }, window.location.origin), Le("EXT_SET_VOLUME", {
        volume: D
      });
    };
    Ue && t(), window.addEventListener("message", o => {
      if (o.source !== window || o.origin !== window.location.origin || !o.data || o.data.source !== "GAMING_TOOLS_VOLUME_CHANNEL") return;
      const { type: n, payload: i } = o.data;
      if (n === "PAGE_READY") Ue = !0, t();
      else if (n === "PAGE_VOLUME") {
        const r = Math.min(1, Math.max(0, i?.volume || 0));
        D = r, M.local.set({
          globalVolumeLevel: r
        });
      }
    });
  }
  U0();
  let l0 = {
      enabled: !1,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      applyToCanvas: !0
    },
    p1 = {
      ...l0
    },
    G = null,
    pe = null,
    Fe = {
      enabled: !1,
      volume: .6,
      dataUrl: null
    },
    $ = {
      ...Fe
    },
    C1 = null;

  function f1(e, t, o) {
    const n = Number(e);
    return Number.isFinite(n) ? Math.min(o, Math.max(t, n)) : t;
  }

  function _0(e) {
    return e.applyToCanvas ? document.querySelector("canvas") || document.documentElement || document.body : document.documentElement || document.body;
  }

  function X0(e) {
    const t = f1(e.brightness, 50, 150) / 100,
      o = f1(e.contrast, 50, 150) / 100,
      n = f1(e.saturation, 0, 200) / 100,
      i = f1(e.hue, -180, 180);
    return `brightness(${t}) contrast(${o}) saturate(${n}) hue-rotate(${i}deg)`;
  }

  function Y1(e = {}) {
    p1 = {
      ...l0,
      ...e
    };
    const t = _0(p1);
    if (G && G !== t && (G.style.filter = ""), G = t, !!G) {
      if (!p1.enabled) {
        G.style.filter = "";
        return;
      }
      G.style.filter = X0(p1), G.style.willChange = "filter", p1.applyToCanvas && !document.querySelector("canvas") && (pe || (pe = new MutationObserver(() => {
        document.querySelector("canvas") && Y1(p1);
      }), pe.observe(document.documentElement, {
        childList: !0,
        subtree: !0
      })));
    }
  }

  function ve(e = {}) {
    $ = {
      ...Fe,
      ...e
    }, $.dataUrl ? (C1 = new Audio($.dataUrl), C1.volume = f1($.volume, 0, 1)) : C1 = null;
  }

  function j0(e) {
    if (!$.enabled || !$.dataUrl || e.repeat) return !1;
    return !voltIsTypingTarget(e);
  }
  let W0 = 80,
    n1 = null,
    S1 = null;

  function Y0() {
    if (!$.enabled || !$.dataUrl) return;
    if (S1 && (clearTimeout(S1), S1 = null), n1) {
      try {
        n1.pause(), n1.currentTime = 0;
      } catch {}
      n1 = null;
    }
    const e = C1 ? C1.cloneNode() : new Audio($.dataUrl);
    e.volume = f1($.volume, 0, 1), n1 = e, e.play().catch(() => {}), S1 = setTimeout(() => {
      try {
        e.pause(), e.currentTime = 0;
      } catch {}
      n1 === e && (n1 = null), S1 = null;
    }, W0);
  }

  function G1(e) {
    const t = document.getElementById("speedrun-timer-overlay"),
      o = t?.querySelector("#timer-display"),
      n = document.getElementById("fps-monitor-overlay"),
      i = document.getElementById("key-display-overlay");
    if (e.timer && t) {
      const r = e.timer;
      t.style.backgroundColor = r.bgColor || "#000000", t.style.borderRadius = r.borderRadius || "0px",
        t.style.opacity = r.opacity !== void 0 ? r.opacity : 1, t.style.borderWidth = r.borderWidth || "0px",
        t.style.borderColor = r.borderColor || "#6366f1", t.style.borderStyle = parseInt(r.borderWidth) > 0 ? "solid" : "none",
        t.style.boxShadow = parseInt(r.shadow) > 0 ? `0 0 ${r.shadow} rgba(0,0,0,0.5)` : "none",
        v.bgTimer ? (t.style.backgroundImage = `url(${v.bgTimer})`, t.style.backgroundSize = "cover",
          t.style.backgroundPosition = "center") : t.style.backgroundImage = "none";
      if (o) {
        const l = r.textColor && r.textColor.toLowerCase() !== "#ffffff" ? r.textColor : null;
        l ? o.style.setProperty("color", l, "important") : o.style.removeProperty("color"),
          o.style.textShadow = parseInt(r.textShadow || "0") > 0 ? `0 0 ${r.textShadow} ${r.textColor || "#FFFFFF"}` : "none",
          o.style.padding = `${r.paddingY || "8px"} ${r.paddingX || "12px"}`, o.style.justifyContent = r.align || "flex-end",
          o.style.letterSpacing = r.letterSpacing || "0px", r.fontFamily && (o.style.fontFamily = r.fontFamily);
      }
      if (o) {
        const l = t.offsetWidth || parseFloat(t.style.width) || 225,
          d = t.offsetHeight || parseFloat(t.style.height) || 50,
          p = Math.min(l / 225, d / 50),
          _fs = r.fontScale > 10 ? r.fontScale / 100 : (r.fontScale || 1),
          s = Math.max(18, Math.min(120, 43 * p * _fs));
        o.style.fontSize = `${s}px`;
        const a = o.querySelector(".time-decimals");
        a && (a.style.fontSize = `${r.decimalScale || .7}em`);
      }
    }
    if (e.fps && n) {
      const r = e.fps;
      C.mode = r.mode || C.mode || "normal", C.showBg = r.showBg !== void 0 ? r.showBg : C.showBg, C.color = r.textColor || C.color, C.fontSize = Math.round(36 * (r.fontScale || 1)),
        typeof V1 == "function" && V1(), n.style.setProperty("background-color", r.showBg === !1 ? "transparent" : r.bgColor || "#000000", "important"), n.style.borderRadius = r.borderRadius || "4px",
        n.style.opacity = r.opacity !== void 0 ? r.opacity : 1, n.style.borderWidth = r.borderWidth || "0px",
        n.style.borderColor = r.borderColor || "#10b981", n.style.borderStyle = parseInt(r.borderWidth) > 0 ? "solid" : "none",
        n.style.boxShadow = parseInt(r.shadow) > 0 ? `0 0 ${r.shadow} rgba(0,0,0,0.5)` : "none", n.style.padding = r.padding || "0px",
        v.bgFps ? (n.style.backgroundImage = `url(${v.bgFps})`, n.style.backgroundSize = "cover",
          n.style.backgroundPosition = "center") : n.style.backgroundImage = "none";
      const l = n.querySelector(".fps-value"),
        d = n.querySelector(".fps-label");
      l && (l.style.color = r.textColor || "#FFFFFF", l.style.fontSize = `${36 * (r.fontScale || 1)}px`, r.fontFamily && (l.style.fontFamily = r.fontFamily)),
        d && (d.style.color = r.labelColor || r.textColor || "#FFFFFF", d.style.fontSize = `${10 * (r.labelScale || 1)}px`, d.style.opacity = r.labelOpacity ?? .8);
    }
    if (e.keys && i) {
      i.classList.toggle("key-preset-nohboard-3d", v.keysStylePreset === "transparent");
      const r = e.keys;
      i.style.setProperty("--key-bg", r.bgColor || "#000000"), i.style.setProperty("--key-color", r.textColor || "#ffffff"),
        i.style.setProperty("--key-border", r.borderColor || "#3d3d3d"), i.style.setProperty("--key-active-bg", r.activeBgColor || "#4bc277"),
        i.style.setProperty("--key-active-border", r.activeBorderColor || r.activeColor || "#6fe49d"), i.style.setProperty("--key-radius", r.borderRadius || "12px"),
        i.style.setProperty("--key-border-width", r.borderWidth || "2px"), i.style.setProperty("--key-gap", r.gap || "10px"),
        i.style.setProperty("--key-width-scale", String(r.widthScale || 1)), i.style.setProperty("--key-height-scale", String(r.heightScale || 1)),
        i.style.setProperty("--key-text-size", `${22 * (r.textScale || 1)}px`), i.style.setProperty("--key-font-weight", String(r.fontWeight || 700)),
        i.style.setProperty("--key-press-scale", String(r.pressScale || .96)), i.style.setProperty("--key-tilt", r.tilt || "0deg"),
        i.style.setProperty("--key-text-transform", r.textTransform || "none"), i.style.setProperty("--key-label-opacity", r.showLabels === !1 ? "0" : "1"),
        i.style.padding = r.containerPadding || "15px",
        i.style.opacity = r.opacity !== void 0 ? r.opacity : 1;
      const l = parseInt(r.shadow) || 0,
        d = Number.isFinite(parseInt(r.activeGlow)) ? parseInt(r.activeGlow) : l || 15;
      l > 0 ? (i.style.setProperty("--key-shadow", `inset 0 1px 0 rgba(255,255,255,.16), inset 0 -4px 0 rgba(0,0,0,.30), 0 ${Math.max(2, Math.round(l * .45))}px 0 rgba(0,0,0,.42), 0 ${l}px ${l * 2}px rgba(0,0,0,0.3)`),
        i.style.setProperty("--key-active-shadow", `0 0 ${d}px ${r.activeBgColor || "#4bc277"}`)) : (i.style.setProperty("--key-shadow", "none"),
        i.style.setProperty("--key-active-shadow", `0 0 ${d}px ${r.activeBgColor || "#4bc277"}`));
      const f = r.sizeScale || 1;
      i.style.setProperty("--key-scale", String(f));
      const u = i.querySelector(".key-container");
      u && (u.style.gap = `calc(${r.gap || "10px"} * ${f})`), typeof Z1 == "function" && Z1(r.activeBgColor || "#4bc277", r.activeTextColor || "#ffffff", r.activeBorderColor || r.activeColor || "#6fe49d"),
        i.querySelectorAll(".key").forEach(a => {
          const keyCustomBg = a.dataset.voltKeyColor || null;
          a.style.backgroundColor = keyCustomBg || r.bgColor || "#000000", a.style.borderColor = r.borderColor || "#3d3d3d",
            a.style.borderRadius = r.borderRadius || "12px", a.style.borderWidth = r.borderWidth || "2px",
            a.style.borderStyle = "solid", v.bgKeys ? (a.style.backgroundImage = `url(${v.bgKeys})`,
              a.style.backgroundSize = "cover", a.style.backgroundPosition = "center") : (a.style.backgroundImage = v.keysStylePreset === "transparent" ? "linear-gradient(180deg, rgba(255,255,255,.16), rgba(0,0,0,.14))" : "none",
              a.style.backgroundSize = "auto", a.style.backgroundPosition = "initial"),
            a.style.removeProperty("box-shadow");
          const fspan = a.querySelector("span");
          fspan && (fspan.style.color = r.textColor || "#ffffff");
        });
      // Apply per-key colors on top of global style
      voltApplyKeyColors(voltKeyColors);
    }
  }
  chrome.storage.onChanged.addListener((e, t) => {
    if (t === "local") {
      if (Object.prototype.hasOwnProperty.call(e, "smartTimer") || Object.prototype.hasOwnProperty.call(e, "voltSmartGuard")) {
        if (Object.prototype.hasOwnProperty.call(e, "smartTimer")) v.smartTimer = e.smartTimer.newValue === true;
        if (Object.prototype.hasOwnProperty.call(e, "voltSmartGuard")) v.voltSmartGuard = e.voltSmartGuard.newValue !== false;
        if (voltNeedsAudioHook(v)) T0();
        else voltSendAudioHookConfig();
      }
      if (Object.prototype.hasOwnProperty.call(e, "globalVolumeLevel") && (D = Math.min(1, Math.max(0, e.globalVolumeLevel.newValue)),
          typeof a1 < "u" && (a1.volume = D), typeof l1 < "u" && (l1.volume = D), Math.abs(D - 1) > .001 && a0(), window.postMessage({
            type: "EXT_SET_VOLUME",
            volume: D
          }, window.location.origin), Le("EXT_SET_VOLUME", {
            volume: D
          })), e.fpsMode || e.fpsColor || e.fpsShowBg || e.fpsFontSize || e.fpsVisible) {
        const o = v;
        C.mode = o.fpsMode || "normal", C.color = o.fpsColor || "#FFFFFF", C.showBg = o.fpsShowBg !== void 0 ? o.fpsShowBg : !0,
          C.fontSize = o.fpsFontSize || 36, I = !!o.fpsVisible, o.fpsPosition && (C.position = o.fpsPosition),
          I && !y ? v1() : y && V1();
      }
      e.volt_profile_cache && (window._voltProfile = e.volt_profile_cache.newValue || null,
        typeof B == "function" && B());
    }
  });
  let U1 = !0,
    z1 = {
      "608x1080": {
        width: 608,
        height: 1080,
        indicator: "608×1080 ACTIF"
      },
      "890x1080": {
        width: 890,
        height: 1080,
        indicator: "890×1080 ACTIF"
      }
    },
    L1 = null;
  (async () => {
    x1 || await c1();
    const e = v;
    e.blackBarsEnabled !== void 0 && (U1 = e.blackBarsEnabled);
    let t = e.forcedResolutionMode;
    !t && e.verticalResolutionEnabled && (t = "608x1080"), e.stretchedResActive && (t = null);
    const o = t && z1[t],
      n = t && /^\d{2,4}x\d{2,4}$/i.test(t);
    if (t && (o || n)) {
      const i = t,
        r = typeof e.barsColor == "string" && e.barsColor ? e.barsColor : "#000000",
        l = () => {
          document.readyState === "complete" ? setTimeout(() => we(i, U1, r), 500) : window.addEventListener("load", () => {
            setTimeout(() => we(i, U1, r), 500);
          }, {
            once: !0
          });
        };
      document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", l, {
        once: !0
      }) : l();
    }
  })();

  function we(e = "608x1080", t = !0, o = "#000000", n = null) {
    let i, r, l;
    if (z1[e]) {
      const w = z1[e];
      i = w.width, r = w.height, l = w.indicator;
    } else if (typeof e == "string" && /^\d{2,4}x\d{2,4}$/i.test(e)) {
      const w = e.toLowerCase().split("x");
      i = parseInt(w[0], 10), r = parseInt(w[1], 10), (!Number.isFinite(i) || !Number.isFinite(r)) && (i = 608,
        r = 1080), l = `${i}×${r} ACTIF`;
    } else {
      const w = z1["608x1080"];
      i = w.width, r = w.height, l = w.indicator, e = "608x1080";
    }
    z("Application permanente du mode " + e), U1 = t, L1 = e, T1 = !0, M.local.set({
      blackBarsEnabled: t,
      verticalResolutionEnabled: e === "608x1080",
      forcedResolutionMode: e,
      selectedResolutionMode: e
    }), T({
      action: "saveResolutionState",
      active: !0,
      mode: e
    });
    let d = document.querySelector('meta[name="viewport"]');
    d || (d = document.createElement("meta"), d.name = "viewport", document.head.appendChild(d)),
      d.content = "width=" + i + ", user-scalable=no";
    const p = document.body,
      s = document.documentElement,
      a = document.getElementById("speedrun-timer-overlay");
    a && (document.documentElement.appendChild(a), a.style.position = "fixed", a.style.zIndex = "2147483647"),
      p.style.cssText = `\n        margin: 0 !important;\n        padding: 0 !important;\n        width: ${i}px !important;\n        min-width: ${i}px !important;\n        max-width: ${i}px !important;\n        height: ${r}px !important;\n        min-height: ${r}px !important;\n        overflow: hidden !important;\n        position: fixed !important;\n        left: 50% !important;\n        top: 50% !important;\n        transform: translate(-50%, -50%) !important;\n        box-sizing: border-box !important;\n    `;
    let f = "transparent";
    t && (n ? f = `url(${n}) center/cover no-repeat fixed ${o}` : f = o), s.style.cssText = `\n        margin: 0 !important;\n        padding: 0 !important;\n        width: 100vw !important;\n        height: 100vh !important;\n        overflow: hidden !important;\n        background: ${f} !important;\n        background-size: cover !important;\n        box-sizing: border-box !important;\n    `,
      s.style.setProperty("background", f, "important"), s.style.setProperty("background-size", "cover", "important"),
      document.body.offsetHeight, s.offsetHeight, setTimeout(() => {
        window.dispatchEvent(new Event("resize")), document.body.offsetHeight;
      }, 50), setTimeout(() => {
        window.dispatchEvent(new Event("resize")), window.scrollTo(0, 0);
      }, 150), setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 300), setTimeout(() => {
        Z0(i);
      }, 100);
    const u = document.createElement("div");
    u.style.cssText = `\n        position: fixed;\n        top: 10px;\n        left: 50%;\n        transform: translateX(-50%);\n        background: #44ff44;\n        color: black;\n        padding: 5px 10px;\n        border-radius: 3px;\n        font-family: Arial, sans-serif;\n        font-size: 12px;\n        z-index: 2147483646;\n        pointer-events: none;\n        opacity: 0.8;\n    `,
      u.textContent = l, u.id = "resolution-indicator-permanent", (document.documentElement || document.body).appendChild(u),
      setTimeout(() => {
        u && u.parentNode && (u.style.transition = "opacity 0.5s", u.style.opacity = "0",
          setTimeout(() => {
            u && u.parentNode && u.remove();
          }, 500));
      }, 3e3), z("Mode " + e + " appliqué de manière permanente");
  }

  function G0() {
    z("Restauration de la résolution normale");
    const e = document.body,
      t = document.documentElement;
    e.style.cssText = "", t.style.cssText = "", document.querySelectorAll("*").forEach(r => {
      (r.style.maxWidth || r.style.minWidth || r.style.width === "100%") && (r.style.maxWidth = "",
        r.style.minWidth = "", r.style.width === "100%" && (r.style.width = "")), r.style.height === "auto" && (r.style.height = "");
    });
    const o = document.querySelector('meta[name="viewport"]');
    o && (o.content = "width=device-width, initial-scale=1.0");
    const n = document.getElementById("resolution-indicator-permanent");
    n && n.remove(), window.dispatchEvent(new Event("resize"));
    const i = document.createElement("div");
    i.style.cssText = `\n        position: fixed;\n        top: 10px;\n        left: 50%;\n        transform: translateX(-50%);\n        background: #ff4444;\n        color: white;\n        padding: 5px 10px;\n        border-radius: 3px;\n        font-family: Arial, sans-serif;\n        font-size: 12px;\n        z-index: 2147483646;\n        pointer-events: none;\n        opacity: 0.8;\n    `,
      i.textContent = "MODE NORMAL", (document.documentElement || document.body).appendChild(i),
      setTimeout(() => {
        i && i.parentNode && (i.style.transition = "opacity 0.5s", i.style.opacity = "0",
          setTimeout(() => {
            i && i.parentNode && i.remove();
          }, 500));
      }, 2e3), M.local.set({
        verticalResolutionEnabled: !1
      }), M.local.remove(["forcedResolutionMode", "selectedResolutionMode", "resolutionActive", "resolutionMode"]),
      T({
        action: "saveResolutionState",
        active: !1,
        mode: null
      }), z("Résolution normale restaurée"), L1 = null, T1 = !1;
  }

  function Z0(e) {
    const t = document.querySelectorAll("div, section, main, article, header, footer, img"),
      o = [];
    t.forEach(n => {
      if (n.id === "speedrun-timer-overlay") return;
      const i = n.tagName.toLowerCase();
      ["div", "section", "main", "article", "header", "footer"].includes(i) ? (window.getComputedStyle(n).width === "100%" || n.offsetWidth > e) && o.push({
        el: n,
        type: "block"
      }) : i === "img" && o.push({
        el: n,
        type: "img"
      });
    }), o.forEach(({ el: n, type: i }) => {
      i === "block" ? (n.style.width = "100%", n.style.maxWidth = e + "px") : i === "img" && (n.style.maxWidth = "100%",
        n.style.height = "auto");
    });
  }

  function _1() {
    if (window.wasdZqsdHandler) {
      z("ZQSD déjà actif");
      return;
    }
    const e = [document, window, document.activeElement, document.querySelector("canvas")].filter(Boolean),
      t = v.zqsdKeys,
      o = n => {
        if (voltIsTypingTarget(n) || voltIsTypingTarget(document.activeElement)) return;
        const i = n.target;
        let r;
        n.code === "Space" || n.key === " " ? r = "SPACE" : r = n.key.toUpperCase();
        let l;
        if (t ? l = {
            [t.up]: ["ArrowUp", 38],
            [t.left]: ["ArrowLeft", 37],
            [t.down]: ["ArrowDown", 40],
            [t.right]: ["ArrowRight", 39]
          } : l = {
            W: ["ArrowUp", 38],
            A: ["ArrowLeft", 37],
            S: ["ArrowDown", 40],
            D: ["ArrowRight", 39],
            Z: ["ArrowUp", 38],
            Q: ["ArrowLeft", 37]
          }, n.key === "1") {
          n.preventDefault(), n.stopImmediatePropagation(), e.forEach(p => p.dispatchEvent(new KeyboardEvent(n.type, {
            key: " ",
            code: "Space",
            keyCode: 32,
            which: 32,
            bubbles: !0
          })));
          return;
        }
        if (n.key === " " && n.isTrusted) {
          if (N === "Space") {
            if (n.preventDefault(), n.stopImmediatePropagation(), v.smartTimer) {
              t1("%c[VOLT] Manuel bloqué car Smart Timer est ON", "color: #94a3b8; font-size: 10px;");
              return;
            }
            d0();
            return;
          }
          if (!(t && Object.values(t).includes("SPACE"))) {
            n.preventDefault(), n.stopImmediatePropagation();
            return;
          }
        }
        const d = l[r];
        d && (n.preventDefault(), n.stopImmediatePropagation(), e.forEach(p => p.dispatchEvent(new KeyboardEvent(n.type, {
          key: d[0],
          code: d[0],
          keyCode: d[1],
          which: d[1],
          bubbles: !0
        }))));
      };
    document.addEventListener("keydown", o, !0), document.addEventListener("keyup", o, !0),
      window.wasdZqsdHandler = o, be = o, z("ZQSD activé automatiquement");
  }

  function B() {
    const e = S;
    if (!e) return;
    e.classList.remove("timer-livesplit-style"), e.style.removeProperty("color"), e.style.removeProperty("filter");
    const t = e.querySelectorAll("span");
    if (t.forEach(o => {
        o.classList.remove("timer-livesplit-style", "timer-color-ahead", "timer-color-behind", "timer-color-paused"),
          o.style.removeProperty("color"), o.style.removeProperty("-webkit-text-fill-color"),
          o.style.removeProperty("background"), o.style.removeProperty("-webkit-background-clip"),
          o.style.removeProperty("background-clip");
      }), window.livesplitThemeEnabled) {
      e.classList.add("timer-livesplit-style"), e.style.setProperty("filter", "drop-shadow(0px 1px 0px #000) drop-shadow(1px 0px 0px #000) drop-shadow(-1px 0px 0px #000) drop-shadow(0px -1px 0px #000) drop-shadow(2px 2px 1px rgba(0,0,0,0.5))", "important");
      let o = "timer-color-ahead";
      L === "paused" ? o = "timer-color-paused" : L === "stopped" && (o = ""), t.forEach(n => {
        n.classList.add("timer-livesplit-style"), o && n.classList.add(o), n.style.setProperty("color", "transparent", "important"),
          n.style.setProperty("-webkit-text-fill-color", "transparent", "important");
      });
    } else {
      let o = v.timerColors || {
          stopped: "#FFFFFF",
          running: "#FFFFFF",
          paused: "#FFFFFF"
        },
        r = v.advancedStyleV2?.timer?.textColor,
        l = r && r.toLowerCase() !== "#ffffff" ? r : null,
        n = l || o.stopped || "#FFFFFF";
      L === "running" ? n = o.running || "#FFFFFF" : L === "paused" && (n = o.paused || "#FFFFFF"),
        l && (n = l),
        e.style.setProperty("color", n, "important"), t.forEach(i => {
          i.style.setProperty("color", "inherit", "important");
        });
    }
  }

  function c0() {
    if (!m || !S) return;
    Object.assign(m.style, {
      background: "#000",
      border: "none",
      borderRadius: "0",
      boxShadow: "none",
      backdropFilter: "none",
      padding: "0"
    }), Object.assign(S.style, {
      fontFamily: "'Calibri','Segoe UI',Arial,sans-serif",
      fontWeight: "bold",
      textShadow: "none",
      fontSize: "43px",
      letterSpacing: "0",
      textAlign: "right",
      padding: "8px 12px",
      lineHeight: "1",
      position: "relative",
      transform: "none",
      top: "auto",
      left: "auto",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end"
    }), B();
    const e = m.getBoundingClientRect();
    Pe(e.width, e.height);
  }

  function e1() {
    m || (Q("volt-timer-core", `\n    #speedrun-timer-overlay{position:fixed;top:20px;right:20px;width:225px;height:50px;z-index:2147483647;display:none;user-select:none;min-width:180px;min-height:40px;max-width:800px;max-height:200px;overflow:hidden;background:#000;border:none;box-shadow:none;border-radius:0}\n    #timer-content{width:100%;height:100%;position:relative;cursor:move;pointer-events:auto}\n    #timer-display{font-family:'Calibri','Segoe UI',Arial,sans-serif;font-weight:bold;font-size:43px;letter-spacing:0;line-height:1;color:#FFF;text-shadow:none;white-space:nowrap;display:flex;align-items:baseline;justify-content:flex-end;width:100%;height:100%;padding:8px 12px;box-sizing:border-box;position:relative}\n    #timer-display .time-main{font-size:1em;line-height:1;display:inline-block}\n    #timer-display .time-decimals{font-size:.7em;line-height:1;display:inline-block;transform:translateY(0.12em)}\n    .timer-stopped,.timer-running,.timer-paused{color:#FFF}\n    .resize-handle{position:absolute;background:transparent;z-index:2147483648;opacity:0;transition:opacity .2s}\n    #speedrun-timer-overlay:hover .resize-handle{opacity:.3;background:rgba(255,255,255,.1)}\n    .resize-handle:hover{opacity:.6!important;background:rgba(255,255,255,.2)!important}\n    .resize-nw{top:0;left:0;width:12px;height:12px;cursor:nw-resize}\n    .resize-ne{top:0;right:0;width:12px;height:12px;cursor:ne-resize}\n    .resize-sw{bottom:0;left:0;width:12px;height:12px;cursor:sw-resize}\n    .resize-se{bottom:0;right:0;width:12px;height:12px;cursor:se-resize}\n    .resize-n{top:0;left:12px;right:12px;height:8px;cursor:n-resize}\n    .resize-s{bottom:0;left:12px;right:12px;height:8px;cursor:s-resize}\n    .resize-w{left:0;top:12px;bottom:12px;width:8px;cursor:w-resize}\n    .resize-e{right:0;top:12px;bottom:12px;width:8px;cursor:e-resize}\n    .size-indicator{position:absolute;top:-35px;right:0;background:rgba(0,0,0,.9);color:#FFF;padding:6px 12px;font-size:12px;opacity:0;pointer-events:none;font-family:'Segoe UI',Arial,sans-serif;font-weight:400;transition:opacity .2s;border-radius:3px}\n    #speedrun-timer-overlay.resizing .size-indicator{opacity:1}\n    .overtake-anim{position:absolute; bottom:-30px; left:0; right:0; text-align:center; font-size:14px; font-weight:900; color:#ffd700; text-shadow:0 0 10px rgba(255,215,0,.5); opacity:0; transform:translateY(10px); transition:all .4s cubic-bezier(.175,.885,.32,1.275); pointer-events:none; z-index:10; font-family:sans-serif;}\n    .overtake-anim.show{opacity:1; transform:translateY(0)}\n    .overtake-anim .user-name{color:#fff; margin-left:5px}\n    @keyframes volt-rainbow {\n      0% { background-position: 0% 50%; }\n      50% { background-position: 100% 50%; }\n      100% { background-position: 0% 50%; }\n    }\n\n    /* LIVESPLIT THEME CSS (Authentic Colors V2) */\n    .timer-livesplit-style {\n        font-weight: 900 !important;\n        filter: drop-shadow(0px 1px 0px #000) drop-shadow(1px 0px 0px #000) drop-shadow(-1px 0px 0px #000) drop-shadow(0px -1px 0px #000) drop-shadow(2px 2px 1px rgba(0,0,0,0.5)) !important;\n    }\n    span.timer-livesplit-style {\n        background: linear-gradient(180deg, #ffffff 0%, #777777 100%) !important;\n        -webkit-background-clip: text !important;\n        background-clip: text !important;\n        -webkit-text-fill-color: transparent !important;\n        color: transparent !important;\n        display: inline-block;\n    }\n    span.timer-livesplit-style.timer-color-ahead {\n        background: linear-gradient(180deg, #44ce1b 0%, #17630a 100%) !important;\n        -webkit-background-clip: text !important;\n    }\n    span.timer-livesplit-style.timer-color-behind {\n        background: linear-gradient(180deg, #e51f1f 0%, #7a0b0b 100%) !important;\n        -webkit-background-clip: text !important;\n    }\n    span.timer-livesplit-style.timer-color-paused {\n        background: linear-gradient(180deg, #999999 0%, #444444 100%) !important;\n        -webkit-background-clip: text !important;\n    }\n  `),
      m = document.createElement("div"), m.id = "speedrun-timer-overlay", m.innerHTML = `\n        <div id="timer-content">\n            <div id="timer-display" class="timer-stopped">\n                <span class="time-main">0</span><span class="time-decimals">.00</span>\n            </div>\n            <div id="volt-death-counter" style="font-size:0.7em;opacity:0.7;text-align:center;margin-top:2px;display:none;"></div>\n            <div id="volt-timer-watermark" style="font-size:0.6em;opacity:0.4;text-align:center;letter-spacing:1px;display:none;"></div>\n        </div>\n        <div class="resize-handle resize-nw" data-direction="nw"></div>\n        <div class="resize-handle resize-ne" data-direction="ne"></div>\n        <div class="resize-handle resize-sw" data-direction="sw"></div>\n        <div class="resize-handle resize-se" data-direction="se"></div>\n        <div class="resize-handle resize-n" data-direction="n"></div>\n        <div class="resize-handle resize-s" data-direction="s"></div>\n        <div class="resize-handle resize-w" data-direction="w"></div>\n        <div class="resize-handle resize-e" data-direction="e"></div>\n        <div class="size-indicator">225px × 50px</div>\n    `,
      S = m.querySelector("#timer-display"), i1 = S ? S.querySelector(".time-main") : null,
      Y = S ? S.querySelector(".time-decimals") : null, he = i1 ? i1.textContent : "",
      ge = Y ? Y.textContent : "", document.documentElement.appendChild(m), U(m, W), c0(),
      Ae(m), Q0(m), xe(), (() => {
        const e = v.timerFont || "default",
          t = {
            monospace: "'Courier New', Courier, monospace",
            "'Roboto Mono', monospace": "'Roboto Mono', 'Courier New', monospace",
            "'Press Start 2P', cursive": "'Press Start 2P', Impact, fantasy",
            "'Inter', sans-serif": "Inter, Arial, sans-serif",
            "'Orbitron', sans-serif": "Orbitron, Rajdhani, Arial, sans-serif"
          },
          o = e === "default" ? "" : t[e] || e;
        o && S && (S.style.fontFamily = o);
      })(), v.advancedStyleV2 && G1(v.advancedStyleV2),
      // Apply watermark and death counter from stored settings
      M.local.get(["timerWatermark", "showDeathCounter"], function (dc) {
        voltUpdateTimerWatermark(dc.timerWatermark || "");
        if (dc.showDeathCounter === false) v.showDeathCounter = false;
        voltUpdateDeathCounter();
      }));
  }

  function v1() {
    const e = document.getElementById("fps-monitor-overlay");
    if (e) {
      y = e;
      return;
    }
    y || (y = document.createElement("div"), y.id = "fps-monitor-overlay", y.innerHTML = `\n    <div id="fps-content">\n      <span class="fps-value">--</span>\n      <span class="fps-label">FPS</span>\n    </div>\n    <div class="resize-handle resize-nw" data-direction="nw"></div>\n    <div class="resize-handle resize-ne" data-direction="ne"></div>\n    <div class="resize-handle resize-sw" data-direction="sw"></div>\n    <div class="resize-handle resize-se" data-direction="se"></div>\n    <div class="resize-handle resize-n" data-direction="n"></div>\n    <div class="resize-handle resize-s" data-direction="s"></div>\n    <div class="resize-handle resize-w" data-direction="w"></div>\n    <div class="resize-handle resize-e" data-direction="e"></div>\n    <div class="size-indicator">120px × 70px</div>\n  `,
      Q("volt-fps-core", `\n    #fps-monitor-overlay {\n      position: fixed; top: 100px; left: 20px;\n      width: 120px; height: 75px;\n      background: rgba(0, 0, 0, 0.8);\n      color: #fff; border-radius: 4px;\n      z-index: 2147483647; display: none;\n      flex-direction: column; align-items: center; justify-content: center;\n      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\n      user-select: none; border: 1px solid rgba(255,255,255,0.1);\n      box-shadow: 0 4px 15px rgba(0,0,0,0.5);\n    }\n    #fps-content { pointer-events: none; text-align: center; }\n    .fps-value { font-size: 36px; font-weight: bold; line-height: 1; display: block; color: #10b981; }\n    .fps-label { font-size: 10px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }\n  `),
      (document.documentElement || document.body).appendChild(y), Ae(y), tt(y), V1(), v.advancedStyleV2 && G1(v.advancedStyleV2));
  }

  function _e() {
    e1(), v1();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", _e) : _e();

  function xe() {
    T({
      action: "getTimerSettings"
    }, e => {
      if (e && e.settings) {
        const t = e.settings;
        t.visible ? (m || e1(), m.style.left = t.position.x + "px", m.style.top = t.position.y + "px",
          m.style.width = t.size.width + "px", m.style.height = t.size.height + "px", Pe(t.size.width, t.size.height),
          V = !0, m.style.display = "block") : (V = !1, m && (m.style.display = "none"));
      }
    });
  }

  function J0(e, t = 180) {
    let o = null;
    return {
      trigger() {
        o === null && (o = setTimeout(() => {
          o = null, e();
        }, t));
      },
      flush() {
        o !== null && (clearTimeout(o), o = null), e();
      }
    };
  }

  function Ae(e, t = {}) {
    let o = 0,
      n = 0,
      i = 0,
      r = 0,
      l = !1,
      d = typeof t.onChange == "function" ? t.onChange : null,
      p = typeof t.onStart == "function" ? t.onStart : null,
      s = typeof t.onStop == "function" ? t.onStop : null,
      a = d ? J0(d) : null;
    (t.handleSelector && e.querySelector(t.handleSelector) || e).addEventListener("mousedown", u);

    function u(g) {
      g.target.classList.contains("resize-handle") || t.handleSelector && !g.target.closest(t.handleSelector) || (e.style.right = "",
        e.style.bottom = "", l = !0, i = g.clientX, r = g.clientY, p && p(), document.addEventListener("mousemove", w),
        document.addEventListener("mouseup", h));
    }

    function w(g) {
      if (!l) return;
      g.preventDefault(), o = i - g.clientX, n = r - g.clientY, i = g.clientX, r = g.clientY;
      const k = Math.max(0, Math.min((e.offsetLeft || 0) - o, window.innerWidth - e.offsetWidth)),
        E = Math.max(0, Math.min((e.offsetTop || 0) - n, window.innerHeight - e.offsetHeight));
      e.style.left = `${k}px`, e.style.top = `${E}px`, a && a.trigger();
    }

    function h() {
      l = !1, document.removeEventListener("mousemove", w), document.removeEventListener("mouseup", h);
      // Snap-to-grid: arrondir la position à la grille de 20px
      if (voltOverlaySnapGrid) {
        const sx = voltSnapValue(parseFloat(e.style.left) || 0);
        const sy = voltSnapValue(parseFloat(e.style.top) || 0);
        e.style.left = sx + 'px';
        e.style.top = sy + 'px';
      }
      // Sauvegarder la position dans overlayPositions
      const elId = e.id;
      if (elId === 'speedrun-timer-overlay' || elId === 'fps-monitor-overlay' || elId === 'key-display-overlay') {
        const posX = parseFloat(e.style.left) || 0;
        const posY = parseFloat(e.style.top) || 0;
        const posKey = elId === 'speedrun-timer-overlay' ? 'timer' : elId === 'fps-monitor-overlay' ? 'fps' : 'keys';
        voltSaveOverlayPosition(posKey, posX, posY);
      }
      s && s(), a && a.flush();
    }
  }

  function Q0(e) {
    let t = e.querySelectorAll(".resize-handle"),
      o = e.querySelector(".size-indicator"),
      n = !1,
      i = "",
      r = 0,
      l = 0,
      d = 0,
      p = 0,
      s = 0,
      a = 0;
    t.forEach(h => h.addEventListener("mousedown", f));

    function f(h) {
      h.preventDefault(), h.stopPropagation(), e.style.right = "", e.style.bottom = "",
        n = !0, i = h.target.dataset.direction, r = h.clientX, l = h.clientY;
      const g = e.getBoundingClientRect();
      d = g.width, p = g.height, s = g.left, a = g.top, e.classList.add("resizing"), o && (o.style.opacity = "1"),
        document.addEventListener("mousemove", u), document.addEventListener("mouseup", w);
    }

    function u(h) {
      if (!n) return;
      h.preventDefault();
      let g = h.clientX - r,
        k = h.clientY - l,
        E = d,
        x = p,
        O = s,
        K = a;
      i.includes("e") && (E = Math.max(180, Math.min(800, d + g))), i.includes("w") && (E = Math.max(180, Math.min(800, d - g)),
          O = s + (d - E)), i.includes("s") && (x = Math.max(40, Math.min(200, p + k))), i.includes("n") && (x = Math.max(40, Math.min(200, p - k)),
          K = a + (p - x)), e.style.width = `${E}px`, e.style.height = `${x}px`, e.style.left = `${O}px`,
        e.style.top = `${K}px`, Pe(E, x), o && (o.textContent = `${Math.round(E)}px × ${Math.round(x)}px`),
        B1();
    }

    function w() {
      n = !1, e.classList.remove("resizing"), o && (o.style.opacity = "0"), document.removeEventListener("mousemove", u),
        document.removeEventListener("mouseup", w), B1();
    }
  }

  function et(e, t) {
    if (!y) return;
    const o = y.querySelector(".fps-value"),
      n = y.querySelector(".fps-label");
    if (!o || !n) return;
    const i = 120,
      r = 70,
      l = e / i,
      d = t / r,
      p = Math.min(l, d),
      s = v.advancedStyleV2?.fps || {},
      a = 36 * (s.fontScale || 1),
      f = 10 * (s.labelScale || 1);
    o.style.fontSize = `${Math.max(12, a * p)}px`, n.style.fontSize = `${Math.max(6, f * p)}px`;
  }

  function tt(e) {
    let t = e.querySelectorAll(".resize-handle"),
      o = e.querySelector(".size-indicator"),
      n = !1,
      i = "",
      r = 0,
      l = 0,
      d = 0,
      p = 0,
      s = 0,
      a = 0;
    t.forEach(h => h.addEventListener("mousedown", f));

    function f(h) {
      h.preventDefault(), h.stopPropagation(), e.style.right = "", e.style.bottom = "",
        n = !0, i = h.target.dataset.direction, r = h.clientX, l = h.clientY;
      const g = e.getBoundingClientRect();
      d = g.width, p = g.height, s = g.left, a = g.top, e.classList.add("resizing"), document.addEventListener("mousemove", u),
        document.addEventListener("mouseup", w);
    }

    function u(h) {
      if (!n) return;
      h.preventDefault();
      let g = h.clientX - r,
        k = h.clientY - l,
        E = d,
        x = p,
        O = s,
        K = a;
      i.includes("e") && (E = Math.max(100, d + g)), i.includes("w") && (E = Math.max(100, d - g),
          O = s + (d - E)), i.includes("s") && (x = Math.max(50, p + k)), i.includes("n") && (x = Math.max(50, p - k),
          K = a + (p - x)), e.style.width = `${E}px`, e.style.height = `${x}px`, e.style.left = `${O}px`,
        e.style.top = `${K}px`, et(E, x), o && (o.textContent = `${Math.round(E)}px × ${Math.round(x)}px`,
          o.style.opacity = "1");
    }

    function w() {
      n && (n = !1, document.removeEventListener("mousemove", u), document.removeEventListener("mouseup", w),
        e.classList.remove("resizing"), o && (o.style.opacity = "0"), lt());
    }
  }

  function Pe(e, t) {
    if (!S) return;
    const o = v.advancedStyleV2?.timer || {},
      n = e / 225,
      i = t / 50,
      r = Math.min(n, i),
      _fs = o.fontScale > 10 ? o.fontScale / 100 : (o.fontScale || 1),
      l = Math.max(18, Math.min(120, 43 * r * _fs));
    S.style.fontSize = l + "px", S.style.letterSpacing = o.letterSpacing || "0px", S.style.lineHeight = "1",
      S.style.padding = `${o.paddingY || "8px"} ${o.paddingX || "12px"}`, S.style.textAlign = o.align === "center" ? "center" : o.align === "flex-start" ? "left" : "right",
      S.style.justifyContent = o.align || "flex-end", Y && (Y.style.fontSize = `${o.decimalScale || .7}em`);
  }

  function B1() {
    if (!m) return;
    const e = m.getBoundingClientRect();
    T({
      action: "saveTimerSettings",
      position: {
        x: Math.round(e.left),
        y: Math.round(e.top)
      },
      size: {
        width: Math.round(e.width),
        height: Math.round(e.height)
      },
      visible: V
    });
  }

  function U(e, t) {
    if (e) {
      if (e.id === "key-display-overlay") {
        const o = e.querySelectorAll(".key");
        t ? (o.forEach(n => {
          n.style.setProperty("background-image", `url(${t})`), n.style.setProperty("background-size", "100% 100%"),
            n.style.setProperty("background-color", "transparent", "important");
        }), e.style.setProperty("background", "transparent", "important")) : o.forEach(n => {
          n.style.removeProperty("background-image"), n.style.removeProperty("background-attachment"),
            n.style.removeProperty("background-size"), n.style.removeProperty("background-color"),
            n.style.removeProperty("border");
        });
        return;
      }
      t ? (e.style.setProperty("background-image", `url(${t})`, "important"), e.style.setProperty("background-size", "100% 100%", "important"),
        e.style.setProperty("background-position", "center", "important"), e.style.setProperty("background-repeat", "no-repeat", "important"),
        e.style.setProperty("background-color", "rgba(0,0,0,0.7)", "important")) : (e.style.removeProperty("background-image"),
        e.style.removeProperty("background-size"), e.style.removeProperty("background-position"),
        e.style.removeProperty("background-repeat"), e.id === "fps-monitor-overlay" ? e.style.setProperty("background-color", "rgba(0, 0, 0, 1.0)", "important") : e.id === "speedrun-timer-overlay" ? e.style.setProperty("background", "#000") : e.style.removeProperty("background-color"));
    }
  }

  function Z1(e, t, o) {
    if (!c) return;
    const n = "key-active-dynamic-style";
    W1 ? Q(n, `\n            #key-display-overlay .key.active {\n                background-image: url('${W1}') !important;\n                background-size: 100% 100% !important;\n                background-repeat: no-repeat !important;\n                background-position: center !important;\n                background-color: transparent !important;\n                border-color: ${o || "#ffffff"} !important;\n            }\n            #key-display-overlay .key.active span {\n                color: ${t || "#ffffff"} !important;\n                text-shadow: 0 2px 4px rgba(0,0,0,0.8) !important;\n            }\n        `) : Q(n, `\n            #key-display-overlay .key.active {\n                background: ${e || "#ffffff"} !important;\n                background-image: ${v.keysStylePreset === "transparent" ? "linear-gradient(180deg, rgba(255,255,255,.22), rgba(0,0,0,.10))" : "none"} !important;\n                border-color: ${o || "#ffffff"} !important;\n            }\n            #key-display-overlay .key.active span {\n                color: ${t || "#000000"} !important;\n                text-shadow: ${v.keysStylePreset === "transparent" ? "0 1px 0 rgba(255,255,255,.25), 0 2px 5px rgba(0,0,0,.35)" : "none"} !important;\n            }\n        `);
  }
  v.customBackground && (W = v.customBackground, m && U(m, W), y && U(y, W), c && U(c, W));

  function s1(e, t) {
    !i1 || !Y || (he !== e && (i1.textContent = e, he = e), ge !== t && (Y.textContent = t,
      ge = t));
  }

  function w1(e) {
    const t = Math.floor(e / 1e3),
      o = Math.floor(t / 3600),
      n = Math.floor(t % 3600 / 60),
      i = t % 60,
      l = Math.floor(e % 1e3 / 10).toString().padStart(2, "0");
    return {
      mainPart: o > 0 ? `${o}:${n.toString().padStart(2, "0")}:${i.toString().padStart(2, "0")}` : n > 0 ? `${n}:${i.toString().padStart(2, "0")}` : `${i}`,
      decimalPart: l
    };
  }
  var ot = [{
      name: "Interstellar",
      minTime: 5400 * 1e3
    }, {
      name: "Suprême",
      minTime: 4380 * 1e3
    }, {
      name: "Grand Champion",
      minTime: 3300 * 1e3
    }, {
      name: "Champion",
      minTime: 2820 * 1e3
    }, {
      name: "Grand Master",
      minTime: 2460 * 1e3
    }, {
      name: "Master +",
      minTime: 2100 * 1e3
    }, {
      name: "Master",
      minTime: 1680 * 1e3
    }, {
      name: "Élite",
      minTime: 1380 * 1e3 + 1e3
    }, {
      name: "Diamant 3",
      minTime: 1380 * 1e3
    }, {
      name: "Diamant 2",
      minTime: 1140 * 1e3
    }, {
      name: "Diamant 1",
      minTime: 900 * 1e3 + 1e3
    }, {
      name: "Platine 3",
      minTime: 900 * 1e3
    }, {
      name: "Platine 2",
      minTime: 720 * 1e3
    }, {
      name: "Platine 1",
      minTime: 540 * 1e3 + 1e3
    }, {
      name: "Gold 3",
      minTime: 540 * 1e3
    }, {
      name: "Gold 2",
      minTime: 420 * 1e3
    }, {
      name: "Gold 1",
      minTime: 300 * 1e3
    }, {
      name: "Argent 3",
      minTime: 240 * 1e3
    }, {
      name: "Argent 2",
      minTime: 180 * 1e3
    }, {
      name: "Argent 1",
      minTime: 120 * 1e3
    }, {
      name: "Bronze 3",
      minTime: 90 * 1e3
    }, {
      name: "Bronze 2",
      minTime: 60 * 1e3
    }, {
      name: "Bronze 1",
      minTime: 30 * 1e3
    }, {
      name: "Unranked",
      minTime: 0
    }].sort((e, t) => t.minTime - e.minTime),
    Z = null,
    me = "",
    Xe = 0,
    J1 = [],
    ke = new Set,
    d1 = 0,
    Q1 = !1,
    X = null,
    voltRunSubmissionLocked = false;

  function nt() {
    T({
      action: "getLeaderboard",
      category: "no_coin_record"
    }, e => {
      e && e.success && e.data && (J1 = e.data.sort((t, o) => t.time - o.time), z(` Top 10 Leaderboard chargé (${J1.length} joueurs)`));
    });
  }

  function it(e) {
    if (!X && m) {
      X = document.createElement("div"), X.className = "overtake-anim";
      const t = m.querySelector("#timer-content");
      t && t.appendChild(X);
    }
    X && (X.innerHTML = 'UPGRADE! <span class="user-name"></span>', X.querySelector(".user-name").textContent = "@" + e,
      X.classList.add("show"), setTimeout(() => {
        X.classList.remove("show");
      }, 3e3));
  }

  function rt(e) {
    if (!m) return;
    if (!Z && (Z = m.querySelector("#rank-display"), !Z)) {
      Z = document.createElement("div"), Z.id = "rank-display", Object.assign(Z.style, {
        color: "#fff",
        fontSize: "16px",
        fontWeight: "bold",
        position: "absolute",
        top: "-20px",
        left: "0px",
        textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
        zIndex: "1"
      });
      const i = m.querySelector("#timer-content");
      i && i.insertBefore(Z, i.firstChild);
    }
    const t = performance.now();
    if (t - Xe < 500 && me !== "") return;
    Xe = t;
    const o = ot.find(i => e >= i.minTime),
      n = o ? o.name : "";
    n !== me && (Z.textContent = n, me = n);
  }

  function Me() {
    if (!m || !V || L !== "running" || !i1 || !Y) return;
    const voltTimerNow = performance.now();
    F = voltTimerNow - N1;
    if (voltTimerNow - voltLastTimerUiRender < voltTimerUiMinIntervalMs) return;
    voltLastTimerUiRender = voltTimerNow;
    rt(F);
    const e = F / 1e3;
    if (J1.length > 0 && voltTimerNow - voltLastOvertakeScan > 250) {
      voltLastOvertakeScan = voltTimerNow;
      for (const n of J1) e >= n.time && !ke.has(n.pseudo) && (ke.add(n.pseudo), it(n.pseudo));
    }
    d1 > 5 && e >= d1 && !Q1 && (Q1 = !0);
    const { mainPart: t, decimalPart: o } = w1(F);
    s1(t, "." + o);
  }

  function voltHeartbeatDelayMs() {
    return v && v.performanceMode !== false ? 2000 : 1000;
  }

  function d0() {
    if (!(!V || !S))
      if (L === "stopped") {
        if (!voltCanStartTrustedRun()) return;
        if (_ && (v && v.smartTimer)) return; // smart timer is visually driving the run — don't overlay manual
        // Cross-tab guard: another VOLT tab already owns the duel timer.
        try { if (typeof window.voltIsDuelOwnerForeign === 'function' && window.voltIsDuelOwnerForeign()) return; } catch (_) {}
        try { if (typeof window.voltClaimDuelOwner === 'function') window.voltClaimDuelOwner(); } catch (_) {}
        const voltManualStartEpochMs = Date.now();
        voltClearLocalDuelTerminal();
        _voltAttemptCount++;
        voltUpdateDeathCounter();
        N1 = performance.now(), F = 0, voltLastTimerUiRender = 0, voltLastOvertakeScan = 0, L = "running", voltLocalRunEpochMs = voltManualStartEpochMs, voltRunSubmissionLocked = false, S.className = "timer-running", B(),
          s1("0", ".00"), Q1 = !1, d1 = v.stats_no_coin_record || 0, voltNotifyLocalRunStartedForDuelGuards("manual_timer", voltManualStartEpochMs), T({
            action: "startRun",
            source: "manual_timer",
            smartTimer: !!(v && v.smartTimer),
            smartGuard: voltSmartGuardEnabled(v),
            duelSmartTimerEquivalent: true,
            clientStartedAtMs: voltManualStartEpochMs,
            runStartedAtIso: new Date(voltManualStartEpochMs).toISOString(),
            duelVisibleActiveAtMs: Number(window.__voltDuelActiveVisibleSinceMs || 0) || 0
          }).catch(() => {}), window._voltHeartbeat && clearInterval(window._voltHeartbeat),
          window._voltHeartbeat = setInterval(() => {
            L === "running" && T({
              action: "gameHeartbeat"
            });
          }, voltHeartbeatDelayMs());
        const e = () => {
          L === "running" && (Me(), voltScheduleTimerLoop(e));
        };
        voltScheduleTimerLoop(e);
      } else if (L === "running") {
      voltCancelTimerLoop(), F = performance.now() - N1, L = "paused", S.className = "timer-paused",
        B(), window._voltHeartbeat && (clearInterval(window._voltHeartbeat), window._voltHeartbeat = null);
      const { mainPart: e, decimalPart: t } = w1(F);
      const voltManualStopStartedAtMs = voltCurrentRunStartedAtMs(F);
      const voltManualStopState = "dead";
      const voltManualStopServerState = "finished";
      const voltManualStopSource = voltCurrentRunSourceForScore();
      // In a 1v1, manually pausing/stopping the timer must not leave the
      // duel live row running. There is no SQL "paused" state, so treat
      // this as a terminal run state and freeze the duel clock immediately.
      F > 0 && voltMarkLocalDuelTerminal(voltManualStopState, F, voltManualStopStartedAtMs);
      F > 0 && T({
        action: "updateDuelRunState",
        state: voltManualStopServerState,
        elapsedMs: F,
        runStartedAt: new Date(voltManualStopStartedAtMs).toISOString(),
        forceDuelStart: true,
        lookupActiveBeforeStart: true,
        allowServerStartFallback: true,
        allowPreDuelStartFallback: true,
        duelVisibleActiveAtMs: Number(window.__voltDuelActiveVisibleSinceMs || 0) || 0
      }).catch(() => {});
      s1(e, "." + t);
    } else voltCancelTimerLoop(), L = "stopped", F = 0, voltLocalRunEpochMs = 0, S.className = "timer-stopped",
      B(), window._voltHeartbeat && (clearInterval(window._voltHeartbeat), window._voltHeartbeat = null),
      s1("0", ".00");
  }

  function u0(e = "finished") {
    if (L === "running") {
      if (String(e || "").toLowerCase() === "dead") {
        _voltDeathCount++;
        voltUpdateDeathCounter();
      }
      if (voltCancelTimerLoop(), F = performance.now() - N1, L = "paused",
        S) {
        S.className = "timer-paused", B();
        const { mainPart: e, decimalPart: t } = w1(F);
        s1(e, "." + t);
      }
      window._voltHeartbeat && (clearInterval(window._voltHeartbeat), window._voltHeartbeat = null);
      const voltTerminalStartedAtMs = voltCurrentRunStartedAtMs(F);
      const voltTerminalSource = voltCurrentRunSourceForScore();
      const voltTerminalServerState = "finished";
      F > 0 && voltMarkLocalDuelTerminal(e, F, voltTerminalStartedAtMs), F > 0 && T({
        action: "updateDuelRunState",
        state: voltTerminalServerState,
        elapsedMs: F,
        runStartedAt: new Date(voltTerminalStartedAtMs).toISOString(),
        forceDuelStart: true,
        lookupActiveBeforeStart: true,
        allowServerStartFallback: true,
        allowPreDuelStartFallback: true,
        duelVisibleActiveAtMs: Number(window.__voltDuelActiveVisibleSinceMs || 0) || 0
      }).catch(() => {}), F > 0 && !voltRunSubmissionLocked && (voltRunSubmissionLocked = true, T({
        action: "saveRunScore",
        time: F,
        resultState: voltTerminalServerState,
        source: voltTerminalSource,
        clientStartedAtMs: voltTerminalStartedAtMs,
        runStartedAtIso: new Date(voltTerminalStartedAtMs).toISOString(),
        duelVisibleActiveAtMs: Number(window.__voltDuelActiveVisibleSinceMs || 0) || 0
      }, e => {
        e && e.success ? z(" Score sauvegardé avec succès!", "#00ff88") : z(` Échec sauvegarde score: ${e ? e.error : "Réponse vide"}`, "#ff4444");
      }));
    }
  }

  function st() {
    if (!voltCanStartTrustedRun()) return;
    if (L === "running") return; // manual timer already running, refuse smart start
    // Cross-tab guard: another VOLT tab already owns the duel timer.
    try { if (typeof window.voltIsDuelOwnerForeign === 'function' && window.voltIsDuelOwnerForeign()) return; } catch (_) {}
    try { if (typeof window.voltClaimDuelOwner === 'function') window.voltClaimDuelOwner(); } catch (_) {}
    const voltSmartStartEpochMs = Date.now();
    voltClearLocalDuelTerminal();
    _voltAttemptCount++;
    voltUpdateDeathCounter();
    if (m || e1(), S || (S = document.querySelector("#timer-display"), i1 = S ? S.querySelector(".time-main") : null,
        Y = S ? S.querySelector(".time-decimals") : null), !V) {
      V = !0, m && (m.style.display = "block");
      try {
        B1();
      } catch {}
    }
    voltCancelTimerLoop(), N1 = performance.now(), F = 0, voltLastTimerUiRender = 0, voltLastOvertakeScan = 0, L = "running", voltLocalRunEpochMs = voltSmartStartEpochMs, voltRunSubmissionLocked = false,
      S.className = "timer-running", B(), s1("0", ".00"), Q1 = !1, d1 = v.stats_no_coin_record || 0,
      ke.clear(), nt(), voltNotifyLocalRunStartedForDuelGuards("smart_timer_audio", voltSmartStartEpochMs), T({
        action: "startRun",
        source: "smart_timer_audio",
        smartTimer: true,
        smartGuard: voltSmartGuardEnabled(v),
        clientStartedAtMs: voltSmartStartEpochMs,
        runStartedAtIso: new Date(voltSmartStartEpochMs).toISOString(),
        duelVisibleActiveAtMs: Number(window.__voltDuelActiveVisibleSinceMs || 0) || 0
      }), window._voltHeartbeat && clearInterval(window._voltHeartbeat), window._voltHeartbeat = setInterval(() => {
        L === "running" && T({
          action: "gameHeartbeat"
        });
      }, voltHeartbeatDelayMs());
    const e = () => {
      L === "running" && (Me(), voltScheduleTimerLoop(e));
    };
    voltScheduleTimerLoop(e);
  }

  function p0() {
    if (m || e1(), V = !V, m.style.display = V ? "block" : "none", V)
      if (L === "running") Me();
      else {
        const e = L === "paused" ? F : 0,
          { mainPart: t, decimalPart: o } = w1(e);
        s1(t, "." + o);
      }
    B1();
  }

  function setTimerVisibilityExplicit(e) {
    e = !!e, e !== V && p0();
    return V;
  }

  function V1() {
    if (!y) return;
    const r = v.advancedStyleV2?.fps || {},
      e = C.mode === "minimal",
      t = C.showBg ? r.bgColor || "rgba(0, 0, 0, 0.7)" : "transparent",
      o = r.textColor || C.color || "#FFFFFF",
      n = r.fontScale ? 36 * r.fontScale : C.fontSize || 36,
      p = r.labelColor || o,
      l = r.labelScale ? 10 * r.labelScale : 10,
      d = r.labelOpacity ?? .8;
    Q("volt-fps-settings", `\n    #fps-monitor-overlay {\n        background-color: ${e && !C.showBg ? "transparent" : t} !important;\n        color: ${o} !important;\n        pointer-events: ${e ? "none" : "auto"} !important;\n    }\n    #fps-monitor-overlay .fps-value {\n        font-size: ${n}px !important;\n        color: ${o} !important;\n    }\n    #fps-monitor-overlay .fps-label {\n        display: ${e ? "none" : "block"} !important;\n    }\n  `);
    const s = y.querySelector(".fps-label");
    s && (s.style.color = p, s.style.fontSize = `${l}px`, s.style.opacity = d);
    const i = C.position || (e ? {
      x: 0,
      y: 0
    } : {
      x: 20,
      y: 100
    });
    y.style.left = (typeof i.x == "number" ? i.x : 20) + "px", y.style.top = (typeof i.y == "number" ? i.y : 100) + "px",
      y.style.display = I ? "flex" : "none", e ? y.classList.add("minimal-mode") : y.classList.remove("minimal-mode"),
      I ? at() : (Se(), f0(null));
  }

  function voltPostFpsControl(command) {
    try {
      window.postMessage({ source: "VOLT_FPS_CHANNEL", type: "VOLT_FPS_CONTROL", command }, window.location.origin);
    } catch (_) {}
  }

  function m0() {
    const e = document.documentElement;
    if (!e) {
      document.addEventListener("DOMContentLoaded", m0, {
        once: !0
      });
      return;
    }
    if (e.dataset?.fpsInjected === "true") return;
    const t = document.createElement("script");
    t.type = "text/javascript", t.src = chrome.runtime.getURL("fpsInjected.js"), t.dataset.channel = "VOLT_FPS_CHANNEL",
      t.addEventListener("load", () => {
        t.remove();
        if (I) setTimeout(() => voltPostFpsControl("start"), 0);
      }), e.appendChild(t), e.dataset && (e.dataset.fpsInjected = "true");
  }

  function at() {
    m0(), I = !0, y || v1(), y.style.display = "flex", voltPostFpsControl("start");
  }

  function Se() {
    I = !1, y && (y.style.display = "none"), voltPostFpsControl("stop");
  }
  window.addEventListener("message", e => {
    e.source !== window || e.origin !== window.location.origin || !e.data || e.data.source !== "VOLT_FPS_CHANNEL" || e.data.type === "VOLT_FPS_UPDATE" && I && f0(e.data.fps);
  });

  function f0(e) {
    if (!y || ((!o1 || !o1.isConnected) && (o1 = y.querySelector(".fps-value")), !o1)) return;
    let t, o, n;
    typeof e != "number" || !isFinite(e) ? (o = "--", n = "medium") : (t = Math.max(0, Math.round(e)),
      o = t.toString(), n = t >= 55 ? "high" : t >= 30 ? "medium" : "low"), o !== He && (o1.textContent = o,
      He = o), n !== $e && (o1.classList.remove("low", "medium", "high"), o1.classList.add(n),
      $e = n);
  }

  function lt() {
    if (y) {
      if (y.style.display !== "none") {
        const e = y.getBoundingClientRect();
        C.position = {
          x: Math.round(e.left),
          y: Math.round(e.top)
        }, C.size = {
          width: Math.round(e.width),
          height: Math.round(e.height)
        };
      }
      T({
        action: "saveFpsSettings",
        position: C.position,
        size: C.size,
        visible: I
      }, () => {});
    }
  }
  let A = null;
  // SEC C1: validate SoundCloud playlist URL — extension-controlled but defense-in-depth.
  function _voltIsSoundCloudUrl(u) {
    if (typeof u !== "string" || !u) return false;
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "https:") return false;
      const h = parsed.hostname.toLowerCase();
      return h === "soundcloud.com" || h.endsWith(".soundcloud.com");
    } catch (_) { return false; }
  }

  function ct(e) {
    if (!_voltIsSoundCloudUrl(e)) return;
    if (A) {
      y0(e), A.style.display = "block";
      return;
    }
    A = document.createElement("div"), A.id = "volt-soundcloud-root", A.style.cssText = `\n    position: fixed !important;\n    top: 50px;\n    right: 20px;\n    width: 360px;\n    height: 250px;\n    z-index: 2147483647 !important;\n    background: transparent;\n    user-select: none;\n    pointer-events: auto;\n  `;
    const t = A.attachShadow({
        mode: "open"
      }),
      o = document.createElement("style");
    o.textContent = `\n    .player-container {\n      width: 100%;\n      height: 100%;\n      background: #0f172a;\n      border-radius: 12px;\n      overflow: hidden;\n      display: flex;\n      flex-direction: column;\n      box-shadow: 0 10px 40px rgba(0,0,0,0.5);\n      border: 1px solid rgba(255,255,255,0.1);\n      position: relative;\n    }\n    .header {\n      padding: 10px 14px;\n      background: rgba(255,255,255,0.05);\n      display: flex;\n      justify-content: space-between;\n      align-items: center;\n      cursor: move;\n      border-bottom: 1px solid rgba(255,255,255,0.05);\n    }\n    .title {\n      font-size: 11px;\n      font-weight: 800;\n      color: #6366f1;\n      text-transform: uppercase;\n      letter-spacing: 1.5px;\n      pointer-events: none;\n    }\n    .close-btn {\n      color: #94a3b8;\n      cursor: pointer;\n      font-size: 18px;\n      line-height: 1;\n      transition: color 0.1s;\n    }\n    .close-btn:hover { color: #f43f5e; }\n    \n    .player-body {\n      flex: 1;\n      position: relative;\n      background: #000;\n    }\n    iframe {\n      width: 100%;\n      height: 100%;\n      border: none;\n    }\n    \n    .footer {\n      padding: 10px 14px;\n      background: rgba(0,0,0,0.3);\n      border-top: 1px solid rgba(255,255,255,0.05);\n      display: flex;\n      align-items: center;\n      gap: 12px;\n    }\n    .nav-btn {\n      color: #fff;\n      cursor: pointer;\n      font-size: 14px;\n      opacity: 0.7;\n      transition: all 0.2s;\n    }\n    .nav-btn:hover { opacity: 1; color: #6366f1; }\n    \n    .vol-slider {\n      flex: 1;\n      height: 4px;\n      background: rgba(255,255,255,0.1);\n      border-radius: 2px;\n      appearance: none;\n      outline: none;\n    }\n    .vol-slider::-webkit-slider-thumb {\n      appearance: none;\n      width: 12px;\n      height: 12px;\n      background: #6366f1;\n      border-radius: 50%;\n      cursor: pointer;\n    }\n  `;
    const n = document.createElement("div");
    n.className = "player-container";
    const i = document.createElement("div");
    i.className = "header", i.innerHTML = `\n    <span class="title">SoundCloud Control</span>\n    <span class="close-btn" id="sc-close">&times;</span>\n  `;
    const r = document.createElement("div");
    r.className = "player-body";
    const l = document.createElement("iframe");
    l.id = "sc-iframe", l.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(e)}&color=%236366f1&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&enable_api=true`,
      l.allow = "autoplay", r.appendChild(l);
    const d = document.createElement("div");
    d.className = "footer", d.innerHTML = `\n    <div class="nav-btn" id="sc-prev" title="Précédent">◀◀</div>\n    <div class="nav-btn" id="sc-next" title="Suivant">▶▶</div>\n    <input type="range" class="vol-slider" id="sc-vol" min="0" max="100" value="100">\n  `,
      n.appendChild(i), n.appendChild(r), n.appendChild(d), t.appendChild(o), t.appendChild(n),
      document.documentElement.appendChild(A);
    const p = (k, E) => {
      l.contentWindow && l.contentWindow.postMessage({
        method: k,
        value: E
      }, "https://w.soundcloud.com");
    };
    d.querySelector("#sc-prev").onclick = () => p("prev"), d.querySelector("#sc-next").onclick = () => p("next"),
      d.querySelector("#sc-vol").oninput = k => p("setVolume", k.target.value), i.querySelector("#sc-close").onclick = () => {
        A.remove(), A = null;
      };
    let s, a, f, u, w = k => {
        s = k.clientX, a = k.clientY, f = parseInt(A.style.left) || 20, u = parseInt(A.style.top) || 50,
          document.addEventListener("mousemove", h), document.addEventListener("mouseup", g);
      },
      h = k => {
        const E = k.clientX - s,
          x = k.clientY - a;
        A.style.left = f + E + "px", A.style.top = u + x + "px", A.style.right = "auto";
      },
      g = () => {
        document.removeEventListener("mousemove", h), document.removeEventListener("mouseup", g);
      };
    i.addEventListener("mousedown", w);
  }

  function y0(e) {
    if (!A) return;
    if (!_voltIsSoundCloudUrl(e)) return;
    const t = A.shadowRoot.getElementById("sc-iframe");
    t && (t.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(e)}&color=%236366f1&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`);
  }
  const h0 = {
    arrows: {
      rows: [
        [{
          id: "key-up",
          label: "↑",
          matches: ["arrowup"]
        }],
        [{
          id: "key-left",
          label: "←",
          matches: ["arrowleft"]
        }, {
          id: "key-down",
          label: "↓",
          matches: ["arrowdown"]
        }, {
          id: "key-right",
          label: "→",
          matches: ["arrowright"]
        }]
      ]
    },
    wasd: {
      rows: [
        [{
          id: "key-up",
          label: "W",
          matches: ["w", "keyw", "z", "keyz", "arrowup"]
        }],
        [{
          id: "key-left",
          label: "A",
          matches: ["a", "keya", "q", "keyq", "arrowleft"]
        }, {
          id: "key-down",
          label: "S",
          matches: ["s", "keys", "arrowdown"]
        }, {
          id: "key-right",
          label: "D",
          matches: ["d", "keyd", "arrowright"]
        }]
      ]
    },
    zqsd: {
      rows: [
        [{
          id: "key-up",
          label: "Z",
          matches: ["z", "keyz", "w", "keyw", "arrowup"]
        }],
        [{
          id: "key-left",
          label: "Q",
          matches: ["q", "keyq", "a", "keya", "arrowleft"]
        }, {
          id: "key-down",
          label: "S",
          matches: ["s", "keys", "arrowdown"]
        }, {
          id: "key-right",
          label: "D",
          matches: ["d", "keyd", "arrowright"]
        }]
      ]
    }
  };

  function dt(e = b.layout) {
    const t = typeof e == "string" ? e.toLowerCase() : b.layout || "arrows";
    if (t !== "custom" && h0[t]) return h0[t];
    const o = v.customKeys || v.zqsdKeys || {},
      n = (l, d) => {
        const p = String(o?.[l] || d).trim();
        return p.length === 1 ? p.toUpperCase() : p || d;
      },
      i = {
        up: n("up", "Z"),
        left: n("left", "Q"),
        down: n("down", "S"),
        right: n("right", "D")
      },
      r = (l, d) => {
        const p = String(l || "").toLowerCase(),
          s = [p, d];
        p.length === 1 && s.push("key" + p);
        return [...new Set(s.filter(Boolean))];
      };
    return {
      rows: [
        [{
          id: "key-up",
          label: i.up,
          matches: r(i.up, "arrowup")
        }],
        [{
          id: "key-left",
          label: i.left,
          matches: r(i.left, "arrowleft")
        }, {
          id: "key-down",
          label: i.down,
          matches: r(i.down, "arrowdown")
        }, {
          id: "key-right",
          label: i.right,
          matches: r(i.right, "arrowright")
        }]
      ]
    };
  }
  const ut = {
      default: {
        label: "Default"
      }
    },
    je = {
      neon: "block",
      ocean: "classic",
      sunset: "retro",
      frost: "minimal",
      carbon: "block",
      cyber: "classic",
      pastel: "minimal",
      circular: "classic",
      capsule: "classic",
      holo: "classic",
      split: "classic"
    };

  function Re(e) {
    if (!e || typeof e != "string") return "default";
    const t = e.toLowerCase();
    return ut[t] ? t : je[t] ? je[t] : ["default", "classic", "minimal", "block", "block-white", "retro", "split"].includes(t) ? t : "default";
  }

  function ee(e) {
    return e ? e.toLowerCase() : "";
  }

  function re(e) {
    const t = typeof e == "number" ? e : parseFloat(e);
    return Number.isNaN(t) ? 1 : Math.min(1.6, Math.max(.6, t));
  }

  function pt(e = b.size) {
    const t = typeof e == "number" ? e : b.size;
    return Math.round(Math.min(1.6, Math.max(.6, t)) * 100);
  }

  function Ie(e) {
    m1 && (m1.textContent = pt(e) + "%");
  }

  function K1(e = {}) {
    let t = Object.keys(h0),
      o = typeof e.layout == "string" ? e.layout.toLowerCase() : b.layout,
      n = t.includes(o) ? o : b.layout,
      i = typeof e.size == "number" ? re(e.size) : b.size,
      r = typeof e.visible == "boolean" ? e.visible : b.visible,
      l = typeof e.theme == "string" ? e.theme : b.theme,
      d = Re(l),
      p = b.position;
    if (e.position && typeof e.position == "object") {
      const f = Number(e.position.x),
        u = Number(e.position.y);
      Number.isFinite(f) && Number.isFinite(u) && (p = {
        x: Math.round(f),
        y: Math.round(u)
      });
    }
    const s = {
        action: "saveKeypressSettings",
        visible: r,
        size: i,
        layout: n,
        theme: d,
        position: p ? {
          x: p.x,
          y: p.y
        } : null
      },
      a = (f, u) => !f && !u ? !0 : !f || !u ? !1 : f.x === u.x && f.y === u.y;
    u1.visible === s.visible && u1.size === s.size && u1.layout === s.layout && u1.theme === s.theme && a(u1.position, s.position) || (u1 = {
        visible: s.visible,
        size: s.size,
        layout: s.layout,
        theme: s.theme,
        position: s.position ? {
          x: s.position.x,
          y: s.position.y
        } : null
      }, b.visible = s.visible, b.size = s.size, b.layout = s.layout, b.theme = s.theme,
      b.position = s.position ? {
        x: s.position.x,
        y: s.position.y
      } : null, T(s, () => {}));
  }

  function te() {
    if (c) {
      if (!c.querySelector(".key-resize-circle")) {
        const e = document.createElement("div");
        e.className = "key-resize-circle", c.appendChild(e);
      }
      m1 || (m1 = document.createElement("div"), m1.className = "key-size-indicator",
        c.appendChild(m1)), Ie(), mt(c);
    }
  }

  function mt(e) {
    let t = e.querySelector(".key-resize-circle"),
      o = e.querySelector(".key-size-indicator"),
      n = !1,
      i = 0,
      r = 0,
      l = 0,
      d = 0,
      p = 1;
    t && t.addEventListener("mousedown", s);

    function s(u) {
      u.preventDefault(), u.stopPropagation();
      const w = e.getBoundingClientRect();
      e.style.left = w.left + "px", e.style.top = w.top + "px", e.style.right = "auto",
        e.style.bottom = "auto", n = !0, i = u.clientX, r = u.clientY, l = w.width, d = w.height,
        p = b.size || 1, e.classList.add("resizing"), o && (o.style.opacity = "1"), document.addEventListener("mousemove", a),
        document.addEventListener("mouseup", f);
    }

    function a(u) {
      if (!n) return;
      u.preventDefault();
      const w = u.clientX - i,
        h = u.clientY - r,
        g = Math.max(50, l + w),
        k = Math.max(50, d + h),
        E = Math.max(g / l, k / d),
        x = re(p * E);
      ae(x), o && (o.textContent = Math.round(x * 100) + "%");
    }

    function f() {
      n = !1, e.classList.remove("resizing"), o && (o.style.opacity = "0"), document.removeEventListener("mousemove", a),
        document.removeEventListener("mouseup", f), g0(), K1({
          size: b.size
        });
    }
  }

  function se() {
    if (!c) return {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0
    };
    let e = window.getComputedStyle(c),
      t = null;
    if (e.display === "none") {
      const n = c.style.display,
        i = c.style.visibility;
      c.style.visibility = "hidden", c.style.display = "block", t = () => {
        c.style.display = n, c.style.visibility = i;
      };
    }
    const o = c.getBoundingClientRect();
    return t && t(), o;
  }

  function ft(e) {
    const t = e || se(),
      o = t.width || 180,
      n = t.height || 180,
      i = Math.max(10, Math.round(window.innerWidth - o - 30)),
      r = Math.max(10, Math.round(window.innerHeight - n - 30));
    return {
      x: i,
      y: r
    };
  }

  function Oe(e) {
    if (!c) return;
    let t = se(),
      o = t.width || c.offsetWidth || 0,
      n = t.height || c.offsetHeight || 0,
      i = window.innerWidth,
      r = window.innerHeight,
      l = null;
    e && Number.isFinite(e.x) && Number.isFinite(e.y) ? l = {
      x: e.x,
      y: e.y
    } : l = ft(t);
    const d = {
      x: Math.max(0, Math.min(i - o, l.x)),
      y: Math.max(0, Math.min(r - n, l.y))
    };
    c.style.left = Math.round(d.x) + "px", c.style.top = Math.round(d.y) + "px", c.style.right = "auto",
      c.style.bottom = "auto", c.style.width = "auto", c.style.height = "auto", c.style.transform = "none",
      b.position = {
        ...d
      };
  }

  function g0() {
    if (!c) return;
    let e = parseFloat(c.style.left),
      t = parseFloat(c.style.top);
    if (!Number.isFinite(e) || !Number.isFinite(t)) {
      const n = se();
      Number.isFinite(e) || (e = n.left), Number.isFinite(t) || (t = n.top);
    }
    if (!Number.isFinite(e) || !Number.isFinite(t)) return;
    const o = {
      x: Math.max(0, Math.round(e)),
      y: Math.max(0, Math.round(t))
    };
    b.position = {
      ...o
    }, K1({
      position: o
    });
  }

  function H1(e) {
    if (!c) return;
    const t = e || "default";
    c.className = c.className.replace(/key-theme-\S+/g, ""), c.classList.add("key-theme-" + t),
      c.dataset.theme = t;
  }

  function yt(e, t = {}) {
    const o = Re(e),
      n = b.theme !== o;
    return b.theme = o, c && H1(o), t.persist && n && K1({
      theme: o
    }), o;
  }

  function Ee() {
    D1.clear();
    for (const e in r1)
      if (Object.prototype.hasOwnProperty.call(r1, e)) {
        const t = r1[e];
        t && t.classList.remove("active");
      }
  }
  async function Te(e = b.layout) {
    if (!c) return;
    const t = c.querySelector(".key-container");
    if (!t) return;
    const o = await dt(e);
    b1 = {}, r1 = Object.create(null), D1.clear(), t.innerHTML = "", o.rows.forEach(n => {
      const i = document.createElement("div");
      i.className = "key-row", n.forEach(r => {
        const l = document.createElement("div");
        l.className = "key", l.id = r.id;
        const d = document.createElement("span");
        d.textContent = r.label, l.appendChild(d);
        const p = r.matches.map(s => s.toLowerCase());
        l.dataset.matches = p.join(","), p.forEach(s => {
          b1[s] = r.id;
        }), r1[r.id] = l, i.appendChild(l);
      }), t.appendChild(i);
    }), Ee(), v.advancedStyleV2 && G1(v.advancedStyleV2);
    // Re-apply per-key colors and images after layout rebuild
    if (voltKeyColors && Object.keys(voltKeyColors).length > 0) voltApplyKeyColors(voltKeyColors);
    if (voltKeyImages && Object.keys(voltKeyImages).length > 0) voltApplyKeyImages(voltKeyImages);
  }

  function ae(e) {
    const t = re(e);
    b.size = t, c && (c.style.setProperty("--key-scale", String(t)), P && k1()), Ie(t);
  }

  function le(e) {
    const o = typeof e == "string" ? e.toLowerCase() : "arrows",
      n = h0[o] || o === "custom" ? o : "arrows",
      i = b.layout !== n;
    b.layout = n, c && (i || c.dataset.layout !== n) && (Te(n), P && k1());
  }

  function ht(e) {
    if (j0(e) && Y0(), !P || !c) return;
    let t = ee(e.key),
      o = e.code ? ee(e.code) : null,
      n = b1[t];
    if (!n && o && (n = b1[o]), !n || D1.has(n)) return;
    const i = r1[n];
    i && (D1.add(n), i.classList.add("active"));
  }

  function gt(e) {
    if (!P || !c) return;
    let t = b1[ee(e.key)];
    if (!t && e.code && (t = b1[ee(e.code)]), !t) return;
    D1.delete(t);
    const o = r1[t];
    o && o.classList.remove("active");
  }

  function b0() {
    return c || (Q("volt-keypress-core", `\n        #key-display-overlay {\n            position: fixed;\n            z-index: 2147483647 !important;\n            user-select: none;\n            cursor: move;\n            display: none;\n            padding: 15px;\n            margin: 0;\n            background: transparent !important;\n            border: none !important;\n            box-shadow: none !important;\n            backdrop-filter: none !important;\n            overflow: visible;\n            animation: keyOverlayFadeIn 0.3s cubic-bezier(0.23, 1, 0.32, 1);\n            pointer-events: auto;\n            --key-scale: 1;\n            --key-base-size: 60px;\n            --key-gap: 10px;\n            --key-radius: calc(10px * var(--key-scale));\n            --key-bg: linear-gradient(145deg, #2b2b2b, #191919);\n            --key-border: rgba(255, 255, 255, 0.1);\n            --key-active-bg: linear-gradient(145deg, #4bc277, #328f56);\n            --key-active-border: #6fe49d;\n            --key-color: #ffffff;\n            --key-border-width: 1px;\n            --key-shadow: none;\n            --key-active-shadow: 0 0 15px rgba(73, 194, 119, 0.4);\n            --key-width-scale: 1;\n            --key-height-scale: 1;\n            --key-text-size: 22px;\n            --key-font-weight: 700;\n            --key-press-scale: 0.96;\n            --key-tilt: 0deg;\n            --key-text-transform: none;\n            --key-label-opacity: 1;\n            --key-font: inherit;\n        }\n        #key-display-overlay .key-container {\n            display: flex;\n            flex-direction: column;\n            align-items: center; /* Center the top key over the middle key */\n            gap: calc(var(--key-gap) * var(--key-scale));\n            pointer-events: none;\n        }\n        #key-display-overlay .key-row {\n            display: flex;\n            justify-content: center;\n            gap: calc(var(--key-gap) * var(--key-scale));\n        }\n\n        #key-display-overlay .key {\n            width: calc(var(--key-base-size) * var(--key-scale) * var(--key-width-scale));\n            height: calc(var(--key-base-size) * var(--key-scale) * var(--key-height-scale));\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            border-radius: var(--key-radius);\n            background: var(--key-bg);\n            border: var(--key-border-width) solid var(--key-border);\n            color: var(--key-color);\n            box-sizing: border-box;\n            box-shadow: var(--key-shadow);\n            position: relative;\n            transform: rotate(var(--key-tilt));\n            transition: transform .08s ease, box-shadow .12s ease, background .12s ease, border-color .12s ease;\n            pointer-events: none;\n        }\n        #key-display-overlay.key-preset-nohboard-3d .key::before {\n            content: "";\n            position: absolute;\n            inset: calc(5px * var(--key-scale)) calc(6px * var(--key-scale)) calc(11px * var(--key-scale));\n            border-radius: calc(var(--key-radius) * .68);\n            background: linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,.035));\n            border: 1px solid rgba(255,255,255,.10);\n            pointer-events: none;\n            z-index: 0;\n        }\n        #key-display-overlay.key-preset-nohboard-3d .key::after {\n            content: "";\n            position: absolute;\n            left: calc(7px * var(--key-scale));\n            right: calc(7px * var(--key-scale));\n            bottom: calc(-8px * var(--key-scale));\n            height: calc(10px * var(--key-scale));\n            border-radius: 0 0 calc(var(--key-radius) * .72) calc(var(--key-radius) * .72);\n            background: linear-gradient(180deg, rgba(0,0,0,.34), rgba(0,0,0,.58));\n            border: 1px solid rgba(0,0,0,.25);\n            border-top: 0;\n            pointer-events: none;\n            z-index: -1;\n        }\n        #key-display-overlay .key span {\n            font-size: calc(var(--key-text-size) * var(--key-scale));\n            font-weight: var(--key-font-weight);\n            text-transform: var(--key-text-transform);\n            opacity: var(--key-label-opacity);\n            line-height: 1;\n            font-family: var(--key-font, inherit);\n            position: relative;\n            z-index: 1;\n            text-shadow: none;\n        }\n        #key-display-overlay .key.active {\n            background: var(--key-active-bg);\n            border-color: var(--key-active-border);\n            box-shadow: var(--key-active-shadow);\n            transform: rotate(var(--key-tilt)) scale(var(--key-press-scale));
        }
        #key-display-overlay.key-preset-nohboard-3d .key {
            transform: perspective(220px) rotateX(12deg) rotate(var(--key-tilt));
            transform-style: preserve-3d;
            isolation: isolate;
        }
        #key-display-overlay.key-preset-nohboard-3d .key span {
            text-shadow: 0 1px 0 rgba(0,0,0,.45);
        }
        #key-display-overlay.key-preset-nohboard-3d .key.active {
            transform: perspective(220px) rotateX(12deg) rotate(var(--key-tilt)) scale(var(--key-press-scale)) translateY(calc(5px * var(--key-scale)));\n        }\n        #key-display-overlay.key-preset-nohboard-3d .key.active::after {\n            bottom: calc(-4px * var(--key-scale));\n            height: calc(5px * var(--key-scale));\n        }\n\n        #key-display-overlay .key-resize-circle {\n            position: absolute;\n            bottom: -6px;\n            right: -6px;\n            width: 14px;\n            height: 14px;\n            background: #fff;\n            border: 2px solid #2b2b2b;\n            border-radius: 50%;\n            cursor: nwse-resize;\n            box-shadow: 0 2px 8px rgba(0,0,0,0.5);\n            z-index: 2147483648;\n            opacity: 0;\n            transition: opacity 0.2s ease, transform 0.2s ease;\n        }\n        #key-display-overlay:hover .key-resize-circle { opacity: 1; }\n        #key-display-overlay .key-resize-circle:hover { transform: scale(1.2); background: #4bc277; }\n\n\n        #key-display-overlay .key-size-indicator {\n            position: absolute;\n            bottom: calc(100% + 12px);\n            left: 50%;\n            transform: translateX(-50%);\n            padding: 4px 10px;\n            border-radius: 6px;\n            background: rgba(0, 0, 0, 0.9);\n            color: #fff;\n            font-size: 11px;\n            opacity: 0;\n            pointer-events: none;\n            transition: opacity 0.2s;\n            border: 1px solid rgba(255,255,255,0.1);\n        }\n        #key-display-overlay.resizing .key-size-indicator { opacity: 1; }\n        \n        @keyframes keyOverlayFadeIn {\n            from { opacity: 0; transform: scale(0.95); }\n            to { opacity: 1; transform: scale(1); }\n        }\n  `),
      c = document.createElement("div"), c.id = "key-display-overlay", c.innerHTML = `\n    <div class="key-container"></div>\n    <div class="key-resize-circle"></div>\n  `,
      document.documentElement.appendChild(c), H1(b.theme || "default"), le(b.layout || "arrows"),
      ae(b.size || 1), te(), Oe(b.position), (() => {
        const e = v.timerFont || "default",
          t = {
            monospace: "'Courier New', Courier, monospace",
            "'Roboto Mono', monospace": "'Roboto Mono', 'Courier New', monospace",
            "'Press Start 2P', cursive": "'Press Start 2P', Impact, fantasy",
            "'Inter', sans-serif": "Inter, Arial, sans-serif",
            "'Orbitron', sans-serif": "Orbitron, Rajdhani, Arial, sans-serif"
          },
          o = e === "default" ? "" : t[e] || e;
        o && c && (c.style.setProperty("--key-font", o), c.querySelectorAll(".key span").forEach(n => n.style.fontFamily = o));
      })(), Ae(c, {
        onChange: g0
      }), setTimeout(() => {
        v.advancedStyleV2 && G1(v.advancedStyleV2);
      }, 0), c);
  }

  function bt() {
    if (!c) return;
    let e = se(),
      t = window.innerWidth,
      o = window.innerHeight,
      n = e.left,
      i = e.top,
      r = !1;
    e.right > t && (n = Math.max(0, t - e.width - 10), r = !0), e.left < 0 && (n = 10,
      r = !0), e.bottom > o && (i = Math.max(0, o - e.height - 10), r = !0), e.top < 0 && (i = 10,
      r = !0), r && (c.style.left = Math.round(n) + "px", c.style.top = Math.round(i) + "px",
      c.style.right = "auto", c.style.bottom = "auto", c.style.transform = "none", b.position = {
        x: Math.round(n),
        y: Math.round(i)
      }, K1({
        position: b.position
      }));
  }

  function k1() {
    c && ue === null && (ue = requestAnimationFrame(() => {
      ue = null, bt();
    }));
  }

  function vt() {
    return c || b0(), P = !P, b.visible = P, z("Keypress display toggled:", /** @type {any} */ (P)), P ? (H1(b.theme),
      le(b.layout), ae(b.size), c.style.display = "block", Oe(b.position), k1(), te(),
      Ie(), Ee(), z("Keypress display is now active using layout " + b.layout + ".")) : (c.style.display = "none",
      Ee()), voltUpdateKeypressListeners(), K1({
      visible: P,
      size: b.size,
      layout: b.layout,
      theme: b.theme,
      position: b.position
    }), P;
  }

  function applyKeypressSettingsObject(e = {}) {
    if (typeof e.visible == "boolean" && e.visible !== P) vt();
    else voltUpdateKeypressListeners();
    return P;
  }
  window.addEventListener("resize", () => {
    P && c && k1();
  });
  document.addEventListener("fullscreenchange", () => {
    P && c && k1();
  });
  chrome.runtime.onMessage.addListener((e, t, o) => {
    switch (e.action) {
    case "toggleModMenu":
      window.voltGui && window.voltGui.toggleModMenu(), o({
        success: !0
      });
      break;

    case "restoreAudio":
      // Audio resume is gated behind a same-origin postMessage
      // (audioHook.js listens for 'VOLT_AUDIO_RESUME_REMOTE') so the
      // resume function is no longer exposed on window for any page
      // script to call. Keep the legacy direct call as a fallback for
      // older audioHook builds still cached in installed clients.
      try { window.postMessage({ type: "VOLT_AUDIO_RESUME_REMOTE" }, window.location.origin); } catch (_) {}
      if (typeof window._volt_resume_all == "function") { try { window._volt_resume_all(); } catch (_) {} }
      o({
        success: !0
      });
      break;

    case "ping":
      o({
        pong: !0,
        version: "16.5"
      });
      return;

    case "getVoltLocalRunState":
      try {
        const snap = typeof window.__voltGetLocalRunState === "function" ? window.__voltGetLocalRunState() : {};
        o({ success: true, state: snap || {} });
      } catch (err) {
        o({ success: false, error: err?.message || String(err) });
      }
      return;

    case "updateCustomFont":
      s0(e.dataUrl), o({
        success: !0
      });
      break;

    case "reapplySettingsFromCloud":
      // CLOUD SYNC: triggered after popup runs syncFromCloud. Reload all
      // overlay settings from the freshly merged chrome.storage.local.
      try {
        if (typeof c1 === "function") c1();
        if (typeof V1 === "function") V1();
        if (typeof k1 === "function") k1();
        if (typeof window.__voltApplyAdvancedStyles === "function") window.__voltApplyAdvancedStyles();
      } catch (_) {}
      o({ success: !0 });
      break;

    case "newDmReceived":
      ze(e.from_pseudo, e.message);
      o({ success: !0 });
      break;

    case "newBroadcastReceived":
      Ge(e.from_pseudo, e.text);
      o({ success: !0 });
      break;

    case "newAnnouncementReceived":
      Ge(e.from_pseudo, e.text);
      o({ success: !0 });
      break;

    case "refreshAdvancedStyles":
      return c1().then(() => {
        v.advancedStyleV2 && G1(v.advancedStyleV2), o({
          success: !0
        });
      }), !0;

    case "toggleTimer":
      p0(), o({
        success: !0
      });
      break;

    case "setTimerVisibility":
      setTimerVisibilityExplicit(e.visible), o({
        success: !0,
        visible: V
      });
      break;

    case "toggleKeypressDisplay":
      vt(), o({
        success: !0,
        visible: P
      });
      break;

    case "setKeypressVisibility":
      applyKeypressSettingsObject({
        visible: e.visible
      }), o({
        success: !0,
        visible: P
      });
      break;

    case "updateKeypressLayout":
      le(e.layout), te(), c && Te(b.layout), window.wasdZqsdHandler && (deactivateZqsd(),
        _1()), o({
        success: !0,
        layout: b.layout
      });
      break;

    case "updateKeypressTheme":
      const n = yt(e.theme);
      te(), P && k1(), o({
        success: !0,
        theme: n
      });
      break;

    case "updateCustomKeys":
      return e.keys && (v.customKeys = e.keys, v.zqsdKeys = e.keys), b.layout = "custom", v.keypressSettings = {
        ...(v.keypressSettings || {}),
        layout: "custom"
      }, c ? Te("custom").then(() => {
        P && k1(), K1({
          layout: "custom"
        }), o({
          success: !0,
          layout: b.layout
        });
      }) : (K1({
        layout: "custom"
      }), o({
        success: !0,
        layout: b.layout
      })), !0;
      break;

    case "setFpsSettings":
      e.settings && (e.settings.visible !== void 0 && (I = e.settings.visible, C.visible = I),
        e.settings.mode !== void 0 && (C.mode = e.settings.mode), e.settings.showBg !== void 0 && (C.showBg = e.settings.showBg),
        I && !y && v1(), V1()), o({
        success: !0,
        visible: I,
        mode: C.mode
      });
      break;

    case "updateKeyColors":
      voltKeyColors = e.colors || {};
      voltApplyKeyColors(voltKeyColors);
      o({ success: !0 });
      break;

    case "updateKeyImages":
      voltKeyImages = e.images || {};
      voltApplyKeyImages(voltKeyImages);
      o({ success: !0 });
      break;

    case "updateOverlaySnapGrid":
      voltOverlaySnapGrid = !!e.enabled;
      o({ success: !0 });
      break;

    case "resetOverlayPositions":
      M.local.remove('overlayPositions');
      o({ success: !0 });
      break;

    case "updateHotkey":
      N = e.hotkey, o({
        success: !0
      });
      break;

    case "updateLiveSplitTheme":
      window.livesplitThemeEnabled = !!e.enabled, B(), o({
        success: !0
      });
      break;

    case "updateTimerColors":
      v.timerColors = e.colors, B(), o({
        success: !0
      });
      break;

    case "updateTimerWatermark":
      voltUpdateTimerWatermark(typeof e.text === "string" ? e.text : "");
      o({ success: !0 });
      break;

    case "updateDeathCounterVisibility":
      v.showDeathCounter = e.visible !== false;
      voltUpdateDeathCounter();
      o({ success: !0 });
      break;

    case "activateZqsd":
      _1(), T({
        action: "saveZqsdState",
        active: !0
      }), o({
        success: !0
      });
      break;

    case "deactivateZqsd":
      window.wasdZqsdHandler && (document.removeEventListener("keydown", window.wasdZqsdHandler, !0),
        document.removeEventListener("keyup", window.wasdZqsdHandler, !0), window.wasdZqsdHandler = null,
        be = null), T({
        action: "saveZqsdState",
        active: !1
      }), o({
        success: !0
      });
      break;

    case "updateZqsdKeys":
      window.wasdZqsdHandler && (document.removeEventListener("keydown", window.wasdZqsdHandler, !0),
        document.removeEventListener("keyup", window.wasdZqsdHandler, !0), window.wasdZqsdHandler = null,
        be = null), _1(), o({
        success: !0
      });
      break;

    case "toggleResolution":
      let i = e.blackBarsEnabled !== !1,
        r = typeof e.mode == "string" && (z1[e.mode] || /^\d{2,4}x\d{2,4}$/i.test(e.mode)) ? e.mode : "608x1080",
        l = typeof e.barsColor == "string" && e.barsColor ? e.barsColor : "#000000",
        d = e.barsImage || null,
        p = !1;
      if (e.activate === !1) T1 && (G0(), p = !0);
      else {
        const s = T1 && L1 && L1 !== r;
        we(r, i, l, d), p = s;
      }
      o({
        success: !0,
        enabled: T1,
        mode: L1,
        reloaded: p
      }), p && setTimeout(() => window.location.reload(), 100);
      break;

    case "resetData":
      return E0().then(() => {
        o({
          success: !0
        }), setTimeout(() => window.location.reload(), 500);
      }).catch(s => {
        o({
          success: !1,
          error: s?.message || String(s)
        });
      }), !0;

    case "setGlobalVolume":
      if (typeof e.volume == "number" && !Number.isNaN(e.volume)) {
        const s = Math.min(1, Math.max(0, e.volume));
        D = s, M.local.set({
          globalVolumeLevel: s
        }, () => {
          Math.abs(s - 1) > .001 && a0(), window.postMessage({
            type: "EXT_SET_VOLUME",
            volume: s
          }, window.location.origin), Le("EXT_SET_VOLUME", {
            volume: s
          }), o({
            success: !0,
            volume: s
          });
        });
      } else o({
        success: !1
      });
      return !0;

    case "updateTripleClick":
      M1 = e.active;
      voltUpdateMouseTracking();
      break;

    case "updateTripleClickKey":
      R1 = e.key;
      break;

    case "updateTripleClickX":
      I1 = e.x !== null && e.x !== void 0 ? Number(e.x) : null;
      break;

    case "updateTripleClickY":
      O1 = e.y !== null && e.y !== void 0 ? Number(e.y) : null;
      break;

    case "startPickTripleClickPos":
      $0();
      break;

    case "startScreenRecording":
      wt(), o({
        success: !0,
        recording: !0
      });
      break;

    case "stopScreenRecording":
      xt(), o({
        success: !0
      });
      break;

    case "getRecordingState":
      o({
        recording: X1
      });
      break;

    case "launchSoundCloudPlayer":
      ct(e.url), o({
        success: !0
      });
      break;

    case "applyAdvancedStyle":
      if (e.settings) {
        const s = e.settings,
          a = m ? m.style.display : "none",
          f = y ? y.style.display : "none",
          u = c ? c.style.display : "none";
        if (m && (m.style.borderRadius = s.borderRadius || "0px", m.style.opacity = s.bgOpacity !== void 0 ? s.bgOpacity : 1,
            m.style.display = a, S)) {
          S.style.color = s.textColor || "#FFFFFF", s.fontFamily && (S.style.fontFamily = s.fontFamily);
          const w = 43,
            h = m.getBoundingClientRect(),
            g = h.width / 225,
            k = h.height / 50,
            E = Math.min(g, k),
            O = Math.max(18, Math.min(120, w * E)) * (s.fontScale || 1);
          S.style.fontSize = `${O}px`;
        }
        if (y) {
          y.style.borderRadius = s.borderRadius || "4px", y.style.opacity = s.bgOpacity !== void 0 ? s.bgOpacity : 1,
            y.style.display = f;
          const w = y.querySelector(".fps-value");
          w && (w.style.color = s.textColor || "#FFFFFF", s.fontFamily && (w.style.fontFamily = s.fontFamily));
        }
        c && (c.style.setProperty("--key-radius", s.borderRadius || "12px"), c.style.setProperty("--key-color", s.textColor || "#ffffff"),
          c.style.opacity = s.bgOpacity !== void 0 ? s.bgOpacity : 1, c.style.display = u,
          s.fontFamily && c.style.setProperty("--key-font", s.fontFamily));
      }
      o({
        success: !0
      });
      break;

    case "resetAllCustomization":
      if (m) {
        const s = m.style.display,
          a = {
            left: m.style.left,
            top: m.style.top
          },
          f = {
            width: m.style.width,
            height: m.style.height
          };
        c0(), m.style.display = s, m.style.left = a.left, m.style.top = a.top, m.style.width = f.width,
          m.style.height = f.height;
      }
      if (y) {
        const s = y.style.display,
          a = {
            left: y.style.left,
            top: y.style.top
          };
        y.style.display = s, y.style.left = a.left, y.style.top = a.top;
      }
      if (c) {
        const s = c.style.display,
          a = {
            left: c.style.left,
            top: c.style.top
          };
        H1("default"), c.style.display = s, c.style.left = a.left, c.style.top = a.top;
      }
      o({
        success: !0
      });
      break;

    case "applyColorLab":
      Y1(e.settings || {}), o({
        success: !0
      });
      break;

    case "setColorLab":
      Y1(e.settings || {}), o({
        success: !0
      });
      break;

    case "updateKeySoundSettings":
      ve(e.settings || {}), o({
        success: !0
      });
      break;

    case "setKeySoundEnabled": {
      const s = v.keySoundSettings || $ || Fe;
      ve({
        ...s,
        enabled: !!e.enabled
      }), o({
        success: !0
      });
      break;
    }

    case "updateBackground":
      W = e.background, U(m, W), U(y, W), U(c, W), o({
        success: !0
      });
      break;

    case "updateBackgroundActive":
      W1 = e.background, o({
        success: !0
      });
      break;

    case "resetSpecificBackground":
      return c1().then(() => {
        v.advancedStyleV2 && G1(v.advancedStyleV2), o({
          success: !0
        });
      }), !0;

    case "updateSpecificBackground": {
      const s = e.targetType,
        a = e.background;
      s === "timer" && m && U(m, a), s === "fps" && y && U(y, a), s === "keys" && c && U(c, a),
        s === "keysActive" && (W1 = a, c && Z1(v.advancedStyleV2?.keys?.activeBgColor || "#4bc277", v.advancedStyleV2?.keys?.activeTextColor || "#ffffff", v.advancedStyleV2?.keys?.activeBorderColor || "#6fe49d")), o({
          success: !0
        });
      break;
    }

    case "applyAdvancedStyleV2":
      e.settings && (v.advancedStyleV2 = e.settings, G1(e.settings));
      o({
        success: !0
      });
      break;

    case "updateTimerFont": {
      const s = e.font || "default",
        a = {
          monospace: "'Courier New', Courier, monospace",
          "'Roboto Mono', monospace": "'Roboto Mono', 'Courier New', monospace",
          "'Press Start 2P', cursive": "'Press Start 2P', Impact, fantasy",
          "'Inter', sans-serif": "Inter, Arial, sans-serif",
          "'Orbitron', sans-serif": "Orbitron, Rajdhani, Arial, sans-serif"
        },
        f = s === "default" ? "" : a[s] || s,
        u = S || document.getElementById("timer-display"),
        w = document.getElementById("key-display-overlay");
      u && (f ? u.style.fontFamily = f : u.style.removeProperty("font-family")), w && (f ? (w.style.setProperty("--key-font", f), w.querySelectorAll(".key span").forEach(h => h.style.fontFamily = f)) : (w.style.removeProperty("--key-font"), w.querySelectorAll(".key span").forEach(h => h.style.removeProperty("font-family")))), M.local.set({
        timerFont: s
      }), o({
        success: !0
      });
      break;
    }

    case "updateTimerRgbMode": {
      const s = e.mode || {};
      s.enabled ? v0(s.speed || 5) : w0(), o({
        success: !0
      });
      break;
    }

    case "backupGameData": {
      const s = {
        indexedDB: {},
        localStorage: {},
        timestamp: Date.now()
      };
      try {
        for (let f = 0; f < localStorage.length; f++) {
          const u = localStorage.key(f);
          u && (u.includes("SaveData") || u.includes("Unity") || u.includes("subway")) && (s.localStorage[u] = localStorage.getItem(u));
        }
      } catch (f) {
        console.warn("[VOLT] LS Backup error:", f);
      }
      if (!window.indexedDB) return o({
        success: !0,
        data: JSON.stringify(s)
      }), !0;
      const a = indexedDB.open("/idbfs");
      return a.onerror = () => o({
        success: !0,
        data: JSON.stringify(s)
      }), a.onsuccess = f => {
        const u = f.target.result;
        if (!u.objectStoreNames.contains("FILE_DATA")) {
          u.close(), o({
            success: !0,
            data: JSON.stringify(s)
          });
          return;
        }
        const g = u.transaction(["FILE_DATA"], "readonly").objectStore("FILE_DATA").openCursor();
        g.onsuccess = k => {
          const E = k.target.result;
          if (E) {
            const x = E.value;
            x && x.contents instanceof Uint8Array ? x.contents = Array.from(x.contents) : x && x.contents && x.contents.type === "Buffer" && (x.contents = Array.from(x.contents.data)),
              s.indexedDB[E.key] = x, E.continue();
          } else u.close(), o({
            success: !0,
            data: JSON.stringify(s)
          });
        }, g.onerror = () => {
          u.close(), o({
            success: !0,
            data: JSON.stringify(s)
          });
        };
      }, !0;
    }

    case "restoreGameData": {
      try {
        const s = JSON.parse(e.data);
        if (s.localStorage && Object.keys(s.localStorage).forEach(a => {
            localStorage.setItem(a, s.localStorage[a]);
          }), s.indexedDB && window.indexedDB) {
          const a = indexedDB.open("/idbfs");
          a.onsuccess = f => {
            const u = f.target.result;
            if (!u.objectStoreNames.contains("FILE_DATA")) {
              u.close(), location.reload();
              return;
            }
            const w = u.transaction(["FILE_DATA"], "readwrite"),
              h = w.objectStore("FILE_DATA");
            h.clear().onsuccess = () => {
              for (const g in s.indexedDB) {
                const k = s.indexedDB[g];
                k && k.contents && (k.contents = new Uint8Array(k.contents)), h.put(k, g);
              }
              w.oncomplete = () => {
                u.close(), o({
                  success: !0
                }), setTimeout(() => location.reload(), 100);
              };
            }, w.onerror = g => {
              u.close(), o({
                success: !1,
                error: "Transaction restore failed"
              });
            };
          }, a.onerror = () => o({
            success: !1,
            error: "IDB open failed"
          });
        } else o({
          success: !0
        }), location.reload();
      } catch (s) {
        o({
          success: !1,
          error: "Restore parsing error: " + String(s)
        });
      }
      return !0;
    }

    case "unlockAllData": {
      const s = new Uint8Array([20, 0, 0, 0, 55, 184, 96, 95, 206, 193, 223, 78, 61, 74, 221, 146, 171, 190, 81, 134, 224, 7, 189, 197, 111, 54, 0, 0, 111, 54, 0, 0, 16, 111, 98, 102, 117, 115, 99, 97, 116, 101, 100, 67, 111, 105, 110, 115, 0, 113, 96, 89, 59, 16, 111, 98, 102, 117, 115, 99, 97, 116, 101, 100, 75, 101, 121, 115, 0, 50, 155, 125, 0, 16, 111, 98, 102, 117, 115, 99, 97, 116, 101, 100, 85, 110, 114, 101, 119, 97, 114, 100, 101, 100, 67, 111, 105, 110, 115, 0, 3, 0, 0, 0, 3, 112, 111, 119, 101, 114, 117, 112, 115, 0, 58, 0, 0, 0, 16, 104, 111, 118, 101, 114, 98, 111, 97, 114, 100, 0, 56, 37, 0, 0, 16, 104, 101, 97, 100, 115, 116, 97, 114, 116, 50, 48, 48, 48, 0, 46, 193, 154, 59, 16, 115, 99, 111, 114, 101, 98, 111, 111, 115, 116, 101, 114, 0, 209, 0, 0, 0, 0, 3, 117, 112, 103, 114, 97, 100, 101, 115, 0, 75, 0, 0, 0, 16, 106, 101, 116, 112, 97, 99, 107, 0, 0, 0, 0, 0, 16, 115, 117, 112, 101, 114, 115, 110, 101, 97, 107, 101, 114, 115, 0, 0, 0, 0, 0, 16, 99, 111, 105, 110, 109, 97, 103, 110, 101, 116, 0, 0, 0, 0, 0, 16, 100, 111, 117, 98, 108, 101, 77, 117, 108, 116, 105, 112, 108, 105, 101, 114, 0, 0, 0, 0, 0, 0, 4, 112, 101, 110, 100, 105, 110, 103, 82, 101, 119, 97, 114, 100, 115, 0, 5, 0, 0, 0, 0, 3, 98, 111, 97, 114, 100, 84, 104, 101, 109, 101, 68, 97, 116, 97, 0, 22, 5, 0, 0, 3, 115, 110, 111, 119, 98, 111, 97, 114, 100, 0, 119, 0, 0, 0, 3, 115, 110, 111, 119, 98, 111, 97, 114, 100, 84, 104, 101, 109, 101, 49, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 3, 115, 110, 111, 119, 98, 111, 97, 114, 100, 84, 104, 101, 109, 101, 50, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 0, 3, 115, 107, 117, 108, 108, 102, 105, 114, 101, 0, 120, 0, 0, 0, 3, 115, 107, 117, 108, 108, 102, 105, 114, 101, 84, 104, 101, 109, 101, 49, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 3, 115, 107, 117, 108, 108, 102, 105, 114, 101, 84, 104, 101, 109, 101, 48, 50, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 0, 3, 115, 116, 97, 114, 98, 111, 97, 114, 100, 0, 121, 0, 0, 0, 3, 115, 116, 97, 114, 98, 111, 97, 114, 100, 84, 104, 101, 109, 101, 48, 49, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 3, 104, 101, 114, 111, 98, 111, 97, 114, 100, 84, 104, 101, 109, 101, 48, 50, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 0, 3, 103, 114, 101, 97, 116, 87, 104, 105, 116, 101, 87, 97, 107, 101, 98, 111, 97, 114, 100, 0, 123, 0, 0, 0, 3, 103, 114, 101, 97, 116, 87, 104, 105, 116, 101, 84, 104, 101, 109, 101, 48, 49, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 3, 103, 114, 101, 97, 116, 87, 104, 105, 116, 101, 84, 104, 101, 109, 101, 48, 50, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 1, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 0, 3, 114, 111, 109, 101, 0, 111, 0, 0, 0, 3, 114, 111, 109, 101, 84, 104, 101, 109, 101, 48, 49, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 3, 114, 111, 109, 101, 84, 104, 101, 109, 101, 48, 50, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 0, 3, 116, 114, 101, 101, 104, 117, 103, 103, 101, 114, 0, 123, 0, 0, 0, 3, 108, 117, 109, 98, 101, 114, 106, 97, 99, 107, 84, 104, 101, 109, 101, 48, 49, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 3, 108, 117, 109, 98, 101, 114, 106, 97, 99, 107, 84, 104, 101, 109, 101, 48, 50, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 0, 3, 116, 104, 101, 111, 114, 105, 103, 105, 110, 97, 108, 0, 121, 0, 0, 0, 3, 104, 101, 114, 111, 98, 111, 97, 114, 100, 84, 104, 101, 109, 101, 48, 49, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 3, 104, 101, 114, 111, 98, 111, 97, 114, 100, 84, 104, 101, 109, 101, 48, 50, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 0, 3, 115, 117, 114, 102, 98, 111, 97, 114, 100, 0, 121, 0, 0, 0, 3, 115, 117, 114, 102, 98, 111, 97, 114, 100, 84, 104, 101, 109, 101, 48, 49, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 3, 115, 117, 114, 102, 98, 111, 97, 114, 100, 84, 104, 101, 109, 101, 48, 50, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 0, 3, 109, 111, 110, 115, 116, 101, 114, 0, 115, 0, 0, 0, 3, 109, 111, 110, 115, 116, 101, 114, 84, 104, 101, 109, 101, 50, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 3, 109, 111, 110, 115, 116, 101, 114, 84, 104, 101, 109, 101, 49, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 0, 3, 109, 105, 97, 109, 105, 0, 111, 0, 0, 0, 3, 109, 105, 97, 109, 105, 84, 104, 101, 109, 101, 49, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 3, 109, 105, 97, 109, 105, 84, 104, 101, 109, 101, 50, 0, 40, 0, 0, 0, 8, 105, 115, 79, 119, 110, 101, 100, 0, 1, 8, 105, 115, 65, 99, 116, 105, 118, 101, 0, 0, 8, 104, 97, 115, 66, 101, 101, 110, 83, 101, 101, 110, 0, 1, 0, 0, 0, 4, 117, 110, 108, 111, 99, 107, 101, 100, 67, 104, 97, 114, 97, 99, 116, 101, 114, 115, 0, 204, 0, 0, 0, 2, 48, 0, 6, 0, 0, 0, 115, 108, 105, 99, 107, 0, 2, 49, 0, 7, 0, 0, 0, 102, 114, 105, 122, 122, 121, 0, 2, 50, 0, 8, 0, 0, 0, 112, 114, 105, 110, 99, 101, 107, 0, 2, 51, 0, 6, 0, 0, 0, 98, 114, 111, 100, 121, 0, 2, 52, 0, 4, 0, 0, 0, 122, 111, 101, 0, 2, 53, 0, 6, 0, 0, 0, 110, 105, 110, 106, 97, 0, 2, 54, 0, 4, 0, 0, 0, 116, 97, 103, 0, 2, 55, 0, 7, 0, 0, 0, 116, 114, 105, 99, 107, 121, 0, 2, 56, 0, 5, 0, 0, 0, 108, 117, 99, 121, 0, 2, 57, 0, 6, 0, 0, 0, 102, 114, 101, 115, 104, 0, 2, 49, 48, 0, 6, 0, 0, 0, 102, 114, 97, 110, 107, 0, 2, 49, 49, 0, 5, 0, 0, 0, 107, 105, 110, 103, 0, 2, 49, 50, 0, 6, 0, 0, 0, 116, 97, 115, 104, 97, 0, 2, 49, 51, 0, 6, 0, 0, 0, 115, 112, 105, 107, 101, 0, 2, 49, 52, 0, 7, 0, 0, 0, 121, 117, 116, 97, 110, 105, 0, 0, 3, 99, 111, 108, 108, 101, 99, 116, 101, 100, 67, 104, 97, 114, 97, 99, 116, 101, 114, 84, 111, 107, 101, 110, 115, 0, 51, 0, 0, 0, 16, 116, 114, 105, 99, 107, 121, 0, 2, 0, 0, 0, 16, 102, 114, 101, 115, 104, 0, 20, 9, 0, 0, 16, 121, 117, 116, 97, 110, 105, 0, 244, 1, 0, 0, 16, 115, 112, 105, 107, 101, 0, 200, 0, 0, 0, 0, 3, 115, 101, 108, 101, 99, 116, 101, 100, 79, 117, 116, 102, 105, 116, 115, 0, 135, 0, 0, 0, 16, 112, 114, 105, 110, 99, 101, 107, 0, 2, 0, 0, 0, 16, 122, 111, 101, 0, 1, 0, 0, 0, 16, 116, 97, 103, 0, 2, 0, 0, 0, 16, 116, 114, 105, 99, 107, 121, 0, 1, 0, 0, 0, 16, 108, 117, 99, 121, 0, 2, 0, 0, 0, 16, 102, 114, 101, 115, 104, 0, 1, 0, 0, 0, 16, 115, 108, 105, 99, 107, 0, 2, 0, 0, 0, 16, 102, 114, 97, 110, 107, 0, 2, 0, 0, 0, 16, 102, 114, 105, 122, 122, 121, 0, 2, 0, 0, 0, 16, 107, 105, 110, 103, 0, 2, 0, 0, 0, 16, 116, 97, 115, 104, 97, 0, 2, 0, 0, 0, 16, 98, 114, 111, 100, 121, 0, 2, 0, 0, 0, 0, 3, 117, 110, 108, 111, 99, 107, 101, 100, 79, 117, 116, 102, 105, 116, 115, 0, 111, 1, 0, 0, 4, 115, 108, 105, 99, 107, 0, 19, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 112, 114, 105, 110, 99, 101, 107, 0, 19, 0, 0, 0, 16, 48, 0, 2, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 0, 4, 122, 111, 101, 0, 19, 0, 0, 0, 16, 48, 0, 2, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 0, 4, 116, 97, 103, 0, 19, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 102, 114, 101, 115, 104, 0, 19, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 116, 114, 105, 99, 107, 121, 0, 19, 0, 0, 0, 16, 48, 0, 2, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 0, 4, 108, 117, 99, 121, 0, 19, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 98, 114, 111, 100, 121, 0, 19, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 102, 114, 97, 110, 107, 0, 19, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 102, 114, 105, 122, 122, 121, 0, 19, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 107, 105, 110, 103, 0, 19, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 110, 105, 110, 106, 97, 0, 19, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 116, 97, 115, 104, 97, 0, 19, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 115, 112, 105, 107, 101, 0, 19, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 0, 4, 117, 110, 108, 111, 99, 107, 101, 100, 66, 111, 97, 114, 100, 115, 0, 26, 1, 0, 0, 2, 48, 0, 10, 0, 0, 0, 115, 116, 97, 114, 98, 111, 97, 114, 100, 0, 2, 49, 0, 10, 0, 0, 0, 115, 110, 111, 119, 98, 111, 97, 114, 100, 0, 2, 50, 0, 8, 0, 0, 0, 98, 111, 117, 110, 99, 101, 114, 0, 2, 51, 0, 7, 0, 0, 0, 104, 111, 116, 114, 111, 100, 0, 2, 52, 0, 10, 0, 0, 0, 116, 101, 108, 101, 98, 111, 97, 114, 100, 0, 2, 53, 0, 10, 0, 0, 0, 115, 107, 117, 108, 108, 102, 105, 114, 101, 0, 2, 54, 0, 9, 0, 0, 0, 108, 111, 119, 114, 105, 100, 101, 114, 0, 2, 55, 0, 11, 0, 0, 0, 115, 112, 101, 101, 100, 98, 111, 97, 114, 100, 0, 2, 56, 0, 12, 0, 0, 0, 103, 108, 105, 100, 101, 114, 98, 111, 97, 114, 100, 0, 2, 57, 0, 20, 0, 0, 0, 103, 114, 101, 97, 116, 87, 104, 105, 116, 101, 87, 97, 107, 101, 98, 111, 97, 114, 100, 0, 2, 49, 48, 0, 5, 0, 0, 0, 114, 111, 109, 101, 0, 2, 49, 49, 0, 11, 0, 0, 0, 116, 114, 101, 101, 104, 117, 103, 103, 101, 114, 0, 2, 49, 50, 0, 12, 0, 0, 0, 116, 104, 101, 111, 114, 105, 103, 105, 110, 97, 108, 0, 2, 49, 51, 0, 10, 0, 0, 0, 115, 117, 114, 102, 98, 111, 97, 114, 100, 0, 2, 49, 52, 0, 6, 0, 0, 0, 109, 105, 97, 109, 105, 0, 2, 49, 53, 0, 8, 0, 0, 0, 109, 111, 110, 115, 116, 101, 114, 0, 0, 4, 104, 97, 115, 83, 107, 105, 112, 112, 101, 100, 77, 105, 115, 115, 105, 111, 110, 115, 0, 17, 0, 0, 0, 8, 48, 0, 0, 8, 49, 0, 0, 8, 50, 0, 0, 0, 16, 114, 117, 110, 115, 67, 111, 109, 112, 108, 101, 116, 101, 100, 73, 110, 67, 117, 114, 114, 101, 110, 116, 77, 105, 115, 115, 105, 111, 110, 83, 101, 116, 0, 194, 3, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 77, 105, 115, 115, 105, 111, 110, 83, 101, 116, 0, 1, 0, 0, 0, 4, 99, 117, 114, 114, 101, 110, 116, 77, 105, 115, 115, 105, 111, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 20, 0, 0, 0, 16, 50, 0, 2, 0, 0, 0, 0, 16, 109, 105, 115, 115, 105, 111, 110, 83, 101, 116, 67, 111, 109, 112, 108, 101, 116, 101, 100, 67, 111, 117, 110, 116, 0, 2, 0, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 83, 107, 105, 112, 70, 111, 114, 86, 105, 100, 101, 111, 77, 105, 115, 115, 105, 111, 110, 73, 110, 100, 101, 120, 0, 0, 0, 0, 0, 9, 99, 117, 114, 114, 101, 110, 116, 83, 107, 105, 112, 70, 111, 114, 86, 105, 100, 101, 111, 73, 110, 100, 101, 120, 83, 101, 116, 65, 116, 0, 164, 160, 241, 173, 154, 1, 0, 0, 9, 108, 97, 115, 116, 84, 105, 109, 101, 77, 105, 115, 115, 105, 111, 110, 87, 97, 115, 83, 107, 105, 112, 112, 101, 100, 70, 111, 114, 86, 105, 100, 101, 111, 0, 128, 243, 119, 238, 124, 199, 255, 255, 8, 104, 97, 115, 83, 107, 105, 112, 112, 101, 100, 77, 105, 115, 115, 105, 111, 110, 70, 111, 114, 86, 105, 100, 101, 111, 84, 104, 105, 115, 83, 101, 116, 0, 0, 4, 97, 99, 104, 105, 101, 118, 101, 109, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 0, 5, 0, 0, 0, 0, 16, 117, 110, 114, 101, 112, 111, 114, 116, 101, 100, 71, 97, 109, 101, 115, 0, 0, 0, 0, 0, 9, 117, 110, 114, 101, 112, 111, 114, 116, 101, 100, 71, 97, 109, 101, 115, 84, 105, 109, 101, 83, 116, 97, 109, 112, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 104, 105, 103, 104, 83, 99, 111, 114, 101, 0, 193, 105, 130, 0, 4, 117, 110, 108, 111, 99, 107, 101, 100, 84, 114, 111, 112, 104, 105, 101, 115, 0, 37, 0, 0, 0, 8, 48, 0, 0, 8, 49, 0, 0, 8, 50, 0, 0, 8, 51, 0, 0, 8, 52, 0, 0, 8, 53, 0, 0, 8, 54, 0, 0, 8, 55, 0, 0, 0, 3, 97, 119, 97, 114, 100, 115, 80, 114, 111, 103, 114, 101, 115, 115, 0, 160, 15, 0, 0, 3, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 76, 65, 78, 69, 0, 238, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101, 100, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 237, 186, 92, 53, 146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 0, 0, 3, 79, 80, 69, 78, 95, 88, 95, 83, 85, 80, 69, 82, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 13, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 34, 0, 0, 0, 16, 83, 117, 112, 101, 114, 77, 121, 115, 116, 101, 114, 121, 66, 111, 120, 101, 115, 79, 112, 101, 110, 101, 100, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 87, 73, 78, 95, 88, 95, 74, 65, 67, 75, 80, 79, 84, 83, 0, 2, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 83, 105, 108, 118, 101, 114, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 12, 0, 0, 0, 67, 111, 108, 108, 101, 99, 116, 105, 98, 108, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 186, 72, 120, 175, 154, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 22, 0, 0, 0, 16, 74, 97, 99, 107, 112, 111, 116, 115, 87, 111, 110, 0, 1, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 74, 85, 77, 80, 95, 79, 82, 95, 82, 79, 76, 76, 0, 238, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101, 100, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 22, 220, 92, 53, 146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 0, 0, 3, 79, 80, 69, 78, 95, 88, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 8, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 12, 0, 0, 0, 67, 111, 108, 108, 101, 99, 116, 105, 98, 108, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101, 100, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 218, 173, 20, 99, 146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 29, 0, 0, 0, 16, 77, 121, 115, 116, 101, 114, 121, 66, 111, 120, 101, 115, 79, 112, 101, 110, 101, 100, 0, 244, 1, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 80, 73, 67, 75, 95, 88, 95, 75, 69, 89, 83, 95, 73, 78, 71, 65, 77, 69, 0, 3, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 24, 0, 0, 0, 16, 75, 101, 121, 115, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 67, 79, 76, 76, 69, 67, 84, 95, 67, 79, 73, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 240, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 0, 0, 3, 72, 65, 86, 69, 95, 83, 85, 80, 69, 82, 83, 78, 73, 67, 75, 69, 82, 83, 95, 65, 67, 84, 73, 86, 69, 95, 88, 95, 77, 73, 78, 95, 73, 78, 95, 65, 95, 82, 79, 87, 0, 240, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 0, 0, 3, 67, 79, 77, 80, 76, 69, 84, 69, 95, 77, 73, 83, 83, 73, 79, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 240, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 83, 105, 108, 118, 101, 114, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 83, 105, 108, 118, 101, 114, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 130, 36, 67, 48, 146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 0, 0, 3, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 67, 79, 73, 78, 83, 0, 238, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101, 100, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 251, 13, 93, 53, 146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 0, 0, 3, 80, 73, 67, 75, 85, 80, 95, 80, 79, 87, 69, 82, 85, 80, 83, 0, 4, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 83, 105, 108, 118, 101, 114, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 12, 0, 0, 0, 67, 111, 108, 108, 101, 99, 116, 105, 98, 108, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 104, 170, 29, 99, 146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 24, 0, 0, 0, 16, 80, 105, 99, 107, 117, 112, 80, 111, 119, 101, 114, 117, 112, 0, 100, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 67, 79, 77, 80, 76, 69, 84, 69, 95, 88, 95, 77, 73, 83, 83, 73, 79, 78, 83, 0, 6, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 27, 0, 0, 0, 16, 77, 105, 115, 115, 105, 111, 110, 67, 111, 109, 112, 108, 101, 116, 101, 100, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95, 77, 66, 0, 49, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 83, 105, 108, 118, 101, 114, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 12, 0, 0, 0, 67, 111, 108, 108, 101, 99, 116, 105, 98, 108, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 158, 145, 52, 173, 154, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 69, 0, 0, 0, 16, 71, 111, 108, 100, 67, 104, 97, 105, 110, 67, 108, 111, 99, 107, 0, 1, 0, 0, 0, 16, 72, 101, 97, 100, 112, 104, 111, 110, 101, 115, 0, 1, 0, 0, 0, 16, 84, 97, 112, 101, 66, 108, 97, 99, 107, 0, 1, 0, 0, 0, 16, 76, 112, 66, 108, 97, 99, 107, 0, 1, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95, 83, 77, 66, 0, 46, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 67, 0, 0, 0, 16, 71, 111, 108, 100, 67, 104, 97, 105, 110, 68, 111, 108, 108, 97, 114, 0, 0, 0, 0, 0, 16, 71, 111, 108, 100, 83, 107, 117, 108, 108, 0, 0, 0, 0, 0, 16, 71, 111, 108, 100, 98, 97, 114, 0, 0, 0, 0, 0, 16, 68, 105, 97, 109, 111, 110, 100, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 0, 9, 119, 101, 101, 107, 108, 121, 71, 105, 102, 116, 85, 110, 108, 111, 99, 107, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 4, 115, 116, 97, 116, 86, 97, 108, 117, 101, 115, 0, 35, 1, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 0, 0, 0, 0, 16, 50, 0, 0, 0, 0, 0, 16, 51, 0, 1, 0, 0, 0, 16, 52, 0, 0, 0, 0, 0, 16, 53, 0, 0, 0, 0, 0, 16, 54, 0, 1, 0, 0, 0, 16, 55, 0, 1, 0, 0, 0, 16, 56, 0, 1, 0, 0, 0, 16, 57, 0, 0, 0, 0, 0, 16, 49, 48, 0, 0, 0, 0, 0, 16, 49, 49, 0, 0, 0, 0, 0, 16, 49, 50, 0, 0, 0, 0, 0, 16, 49, 51, 0, 5, 0, 0, 0, 16, 49, 52, 0, 0, 0, 0, 0, 16, 49, 53, 0, 0, 0, 0, 0, 16, 49, 54, 0, 0, 0, 0, 0, 16, 49, 55, 0, 0, 0, 0, 0, 16, 49, 56, 0, 0, 0, 0, 0, 16, 49, 57, 0, 0, 0, 0, 0, 16, 50, 48, 0, 0, 0, 0, 0, 16, 50, 49, 0, 0, 0, 0, 0, 16, 50, 50, 0, 0, 0, 0, 0, 16, 50, 51, 0, 0, 0, 0, 0, 16, 50, 52, 0, 0, 0, 0, 0, 16, 50, 53, 0, 165, 3, 0, 0, 16, 50, 54, 0, 0, 0, 0, 0, 16, 50, 55, 0, 3, 0, 0, 0, 16, 50, 56, 0, 0, 0, 0, 0, 16, 50, 57, 0, 44, 41, 0, 0, 16, 51, 48, 0, 0, 0, 0, 0, 16, 51, 49, 0, 0, 0, 0, 0, 16, 51, 50, 0, 1, 0, 0, 0, 16, 51, 51, 0, 1, 0, 0, 0, 16, 51, 52, 0, 0, 0, 0, 0, 16, 51, 53, 0, 0, 0, 0, 0, 16, 51, 54, 0, 0, 0, 0, 0, 0, 4, 109, 121, 115, 116, 101, 114, 121, 66, 111, 120, 101, 115, 79, 112, 101, 110, 101, 100, 0, 26, 0, 0, 0, 16, 48, 0, 43, 41, 0, 0, 16, 49, 0, 0, 0, 0, 0, 16, 50, 0, 0, 0, 0, 0, 0, 16, 99, 111, 109, 112, 108, 101, 116, 101, 100, 82, 117, 110, 67, 111, 117, 110, 116, 0, 26, 4, 0, 0, 2, 99, 117, 114, 114, 101, 110, 116, 67, 104, 97, 114, 97, 99, 116, 101, 114, 73, 100, 0, 6, 0, 0, 0, 110, 105, 110, 106, 97, 0, 2, 99, 117, 114, 114, 101, 110, 116, 66, 111, 97, 114, 100, 73, 100, 0, 7, 0, 0, 0, 110, 111, 114, 109, 97, 108, 0, 2, 112, 114, 101, 118, 105, 111, 117, 115, 66, 111, 97, 114, 100, 73, 100, 0, 7, 0, 0, 0, 110, 111, 114, 109, 97, 108, 0, 3, 97, 119, 97, 114, 100, 73, 115, 78, 101, 119, 0, 145, 1, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95, 77, 66, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95, 83, 77, 66, 0, 0, 8, 67, 79, 77, 80, 76, 69, 84, 69, 95, 88, 95, 77, 73, 83, 83, 73, 79, 78, 83, 0, 0, 8, 80, 73, 67, 75, 85, 80, 95, 80, 79, 87, 69, 82, 85, 80, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 67, 79, 73, 78, 83, 0, 0, 8, 67, 79, 77, 80, 76, 69, 84, 69, 95, 77, 73, 83, 83, 73, 79, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 0, 8, 72, 65, 86, 69, 95, 83, 85, 80, 69, 82, 83, 78, 73, 67, 75, 69, 82, 83, 95, 65, 67, 84, 73, 86, 69, 95, 88, 95, 77, 73, 78, 95, 73, 78, 95, 65, 95, 82, 79, 87, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 67, 79, 73, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 0, 8, 80, 73, 67, 75, 95, 88, 95, 75, 69, 89, 83, 95, 73, 78, 71, 65, 77, 69, 0, 0, 8, 79, 80, 69, 78, 95, 88, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 74, 85, 77, 80, 95, 79, 82, 95, 82, 79, 76, 76, 0, 0, 8, 87, 73, 78, 95, 88, 95, 74, 65, 67, 75, 80, 79, 84, 83, 0, 0, 8, 79, 80, 69, 78, 95, 88, 95, 83, 85, 80, 69, 82, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 76, 65, 78, 69, 0, 0, 0, 3, 97, 119, 97, 114, 100, 72, 97, 115, 80, 97, 121, 101, 100, 79, 117, 116, 0, 145, 1, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95, 77, 66, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95, 83, 77, 66, 0, 0, 8, 67, 79, 77, 80, 76, 69, 84, 69, 95, 88, 95, 77, 73, 83, 83, 73, 79, 78, 83, 0, 0, 8, 80, 73, 67, 75, 85, 80, 95, 80, 79, 87, 69, 82, 85, 80, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 67, 79, 73, 78, 83, 0, 1, 8, 67, 79, 77, 80, 76, 69, 84, 69, 95, 77, 73, 83, 83, 73, 79, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 1, 8, 72, 65, 86, 69, 95, 83, 85, 80, 69, 82, 83, 78, 73, 67, 75, 69, 82, 83, 95, 65, 67, 84, 73, 86, 69, 95, 88, 95, 77, 73, 78, 95, 73, 78, 95, 65, 95, 82, 79, 87, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 67, 79, 73, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 0, 8, 80, 73, 67, 75, 95, 88, 95, 75, 69, 89, 83, 95, 73, 78, 71, 65, 77, 69, 0, 0, 8, 79, 80, 69, 78, 95, 88, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 74, 85, 77, 80, 95, 79, 82, 95, 82, 79, 76, 76, 0, 1, 8, 87, 73, 78, 95, 88, 95, 74, 65, 67, 75, 80, 79, 84, 83, 0, 0, 8, 79, 80, 69, 78, 95, 88, 95, 83, 85, 80, 69, 82, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 76, 65, 78, 69, 0, 1, 0, 8, 97, 119, 97, 114, 100, 115, 70, 105, 114, 115, 116, 76, 111, 97, 100, 101, 100, 0, 1, 2, 119, 101, 101, 107, 108, 121, 72, 117, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 86, 101, 114, 115, 105, 111, 110, 0, 4, 0, 0, 0, 49, 46, 48, 0, 4, 104, 97, 115, 76, 111, 103, 103, 101, 100, 87, 101, 101, 107, 108, 121, 72, 117, 110, 116, 80, 101, 114, 105, 111, 100, 0, 21, 0, 0, 0, 8, 48, 0, 1, 8, 49, 0, 1, 8, 50, 0, 1, 8, 51, 0, 1, 0, 3, 119, 101, 101, 107, 108, 121, 72, 117, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 68, 97, 116, 97, 0, 95, 0, 0, 0, 2, 104, 117, 110, 116, 83, 116, 97, 114, 116, 86, 101, 114, 115, 105, 111, 110, 0, 20, 0, 0, 0, 48, 57, 47, 49, 51, 47, 50, 48, 49, 56, 32, 48, 48, 58, 48, 48, 58, 48, 48, 0, 4, 116, 111, 107, 101, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 33, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 0, 0, 0, 0, 16, 50, 0, 0, 0, 0, 0, 16, 51, 0, 0, 0, 0, 0, 0, 0, 16, 119, 111, 114, 100, 72, 117, 110, 116, 87, 111, 114, 100, 115, 73, 110, 82, 111, 119, 0, 1, 0, 0, 0, 8, 119, 111, 114, 100, 72, 117, 110, 116, 80, 97, 121, 101, 100, 79, 117, 116, 0, 0, 16, 119, 111, 114, 100, 72, 117, 110, 116, 85, 110, 108, 111, 99, 107, 101, 100, 77, 97, 115, 107, 0, 1, 0, 0, 0, 16, 119, 111, 114, 100, 72, 117, 110, 116, 76, 97, 115, 116, 80, 97, 121, 111, 117, 116, 68, 97, 121, 79, 102, 89, 101, 97, 114, 0, 70, 1, 0, 0, 3, 99, 104, 97, 114, 97, 99, 116, 101, 114, 78, 97, 109, 101, 69, 118, 101, 110, 116, 68, 97, 116, 97, 0, 221, 0, 0, 0, 2, 99, 117, 114, 114, 101, 110, 116, 67, 104, 97, 114, 97, 99, 116, 101, 114, 0, 6, 0, 0, 0, 115, 108, 105, 99, 107, 0, 16, 99, 111, 108, 108, 101, 99, 116, 101, 100, 76, 101, 116, 116, 101, 114, 73, 110, 100, 101, 120, 0, 255, 255, 255, 255, 16, 115, 107, 105, 112, 112, 101, 100, 67, 104, 97, 114, 97, 99, 116, 101, 114, 115, 0, 0, 0, 0, 0, 8, 119, 97, 115, 76, 97, 115, 116, 67, 104, 97, 114, 97, 99, 116, 101, 114, 67, 111, 109, 112, 108, 101, 116, 101, 100, 0, 0, 16, 99, 111, 109, 112, 108, 101, 116, 101, 100, 67, 104, 97, 114, 97, 99, 116, 101, 114, 115, 0, 0, 0, 0, 0, 4, 99, 104, 97, 114, 97, 99, 116, 101, 114, 115, 76, 105, 115, 116, 0, 5, 0, 0, 0, 0, 4, 99, 97, 116, 101, 103, 111, 114, 121, 87, 111, 114, 100, 115, 76, 105, 115, 116, 0, 5, 0, 0, 0, 0, 18, 101, 118, 101, 110, 116, 73, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 101, 118, 101, 110, 116, 67, 97, 116, 101, 103, 111, 114, 121, 0, 5, 0, 0, 0, 67, 97, 116, 49, 0, 0, 18, 108, 97, 115, 116, 69, 118, 101, 110, 116, 73, 68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 108, 97, 115, 116, 84, 105, 109, 101, 65, 110, 69, 118, 101, 110, 116, 72, 97, 115, 66, 101, 101, 110, 84, 114, 105, 101, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 108, 97, 115, 116, 84, 105, 109, 101, 65, 110, 69, 118, 101, 110, 116, 87, 97, 115, 83, 116, 97, 114, 116, 101, 100, 0, 213, 111, 239, 102, 0, 0, 0, 0, 18, 108, 97, 115, 116, 84, 105, 109, 101, 69, 118, 101, 110, 116, 80, 111, 112, 117, 112, 87, 97, 115, 70, 111, 114, 99, 101, 83, 104, 111, 119, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 108, 97, 115, 116, 69, 118, 101, 110, 116, 73, 116, 101, 109, 73, 68, 0, 1, 0, 0, 0, 0, 8, 115, 104, 111, 117, 108, 100, 82, 101, 115, 116, 111, 114, 101, 73, 116, 101, 109, 65, 102, 116, 101, 114, 69, 118, 101, 110, 116, 0, 0, 2, 119, 111, 114, 100, 72, 117, 110, 116, 68, 97, 105, 108, 121, 87, 111, 114, 100, 0, 6, 0, 0, 0, 83, 75, 65, 84, 69, 0, 9, 119, 111, 114, 100, 72, 117, 110, 116, 69, 120, 112, 105, 114, 101, 84, 105, 109, 101, 0, 62, 254, 40, 179, 154, 1, 0, 0, 2, 115, 121, 98, 111, 65, 110, 97, 108, 121, 116, 105, 99, 115, 83, 97, 109, 112, 108, 101, 83, 116, 97, 116, 101, 0, 10, 0, 0, 0, 85, 110, 115, 97, 109, 112, 108, 101, 100, 0, 2, 115, 121, 98, 111, 65, 110, 97, 108, 121, 116, 105, 99, 115, 85, 115, 101, 114, 73, 100, 0, 1, 0, 0, 0, 0, 2, 115, 121, 98, 111, 65, 103, 103, 114, 101, 103, 97, 116, 101, 100, 68, 97, 116, 97, 83, 116, 114, 105, 110, 103, 0, 1, 0, 0, 0, 0, 3, 115, 121, 98, 111, 65, 110, 97, 108, 121, 116, 105, 99, 115, 85, 110, 104, 97, 110, 100, 108, 101, 100, 65, 98, 84, 101, 115, 116, 68, 97, 116, 97, 0, 5, 0, 0, 0, 0, 16, 115, 121, 98, 111, 65, 110, 97, 108, 121, 116, 105, 99, 115, 67, 117, 114, 114, 101, 110, 116, 83, 101, 115, 115, 105, 111, 110, 0, 255, 255, 255, 255, 8, 107, 105, 108, 111, 111, 65, 110, 97, 108, 121, 116, 105, 99, 115, 72, 97, 115, 76, 111, 103, 103, 101, 100, 83, 121, 98, 111, 85, 115, 101, 114, 73, 100, 0, 0, 16, 112, 101, 114, 115, 105, 115, 116, 101, 100, 83, 101, 115, 115, 105, 111, 110, 69, 118, 101, 110, 116, 78, 117, 109, 98, 101, 114, 0, 255, 255, 255, 255, 3, 109, 97, 110, 97, 103, 101, 114, 68, 97, 116, 97, 0, 111, 0, 0, 0, 9, 108, 97, 115, 116, 83, 117, 98, 109, 105, 116, 116, 101, 100, 83, 99, 111, 114, 101, 83, 116, 97, 114, 116, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 9, 108, 97, 115, 116, 83, 117, 98, 109, 105, 116, 116, 101, 100, 83, 99, 111, 114, 101, 69, 110, 100, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 117, 110, 115, 117, 98, 109, 105, 116, 116, 101, 100, 83, 99, 111, 114, 101, 78, 111, 84, 111, 117, 114, 110, 97, 109, 101, 110, 116, 0, 0, 0, 0, 0, 0, 2, 108, 97, 115, 116, 84, 111, 112, 82, 117, 110, 82, 101, 115, 117, 108, 116, 65, 119, 97, 114, 100, 101, 100, 73, 68, 0, 1, 0, 0, 0, 0, 2, 112, 101, 110, 100, 105, 110, 103, 84, 111, 112, 82, 117, 110, 82, 101, 115, 117, 108, 116, 73, 68, 0, 1, 0, 0, 0, 0, 16, 112, 101, 110, 100, 105, 110, 103, 84, 111, 112, 82, 117, 110, 82, 101, 115, 117, 108, 116, 115, 83, 99, 111, 114, 101, 0, 255, 255, 255, 255, 16, 112, 101, 110, 100, 105, 110, 103, 84, 111, 112, 82, 117, 110, 82, 101, 115, 117, 108, 116, 115, 82, 97, 110, 107, 0, 255, 255, 255, 255, 16, 112, 101, 110, 100, 105, 110, 103, 84, 111, 112, 82, 117, 110, 82, 101, 115, 117, 108, 116, 115, 87, 101, 101, 107, 0, 255, 255, 255, 255, 16, 112, 101, 110, 100, 105, 110, 103, 84, 111, 112, 82, 117, 110, 66, 101, 97, 116, 101, 110, 70, 114, 105, 101, 110, 100, 115, 65, 119, 97, 114, 100, 0, 0, 0, 0, 0, 8, 98, 101, 104, 97, 118, 105, 111, 114, 97, 108, 65, 100, 115, 65, 108, 108, 111, 119, 101, 100, 0, 1, 3, 105, 110, 116, 101, 114, 115, 116, 105, 116, 105, 97, 108, 83, 116, 97, 116, 115, 0, 159, 0, 0, 0, 3, 108, 105, 115, 116, 86, 101, 114, 115, 105, 111, 110, 70, 111, 114, 73, 68, 0, 41, 0, 0, 0, 2, 104, 111, 109, 101, 95, 105, 110, 116, 101, 114, 115, 116, 105, 116, 105, 97, 108, 115, 95, 108, 105, 115, 116, 0, 7, 0, 0, 0, 110, 111, 116, 115, 101, 116, 0, 0, 16, 115, 101, 101, 110, 84, 104, 105, 115, 72, 111, 117, 114, 0, 1, 0, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 72, 111, 117, 114, 0, 5, 215, 14, 1, 16, 115, 101, 101, 110, 84, 104, 105, 115, 68, 97, 121, 0, 1, 0, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 68, 97, 121, 0, 245, 72, 11, 0, 8, 104, 97, 115, 83, 101, 101, 110, 70, 105, 114, 115, 116, 73, 110, 116, 101, 114, 115, 116, 105, 116, 105, 97, 108, 0, 0, 0, 3, 99, 111, 110, 115, 117, 109, 97, 98, 108, 101, 83, 101, 101, 110, 86, 105, 100, 101, 111, 115, 67, 111, 117, 110, 116, 0, 5, 0, 0, 0, 0, 3, 99, 111, 110, 115, 117, 109, 97, 98, 108, 101, 86, 105, 100, 101, 111, 83, 101, 101, 110, 65, 116, 0, 5, 0, 0, 0, 0, 3, 99, 111, 111, 108, 100, 111, 119, 110, 115, 0, 27, 0, 0, 0, 3, 97, 99, 116, 105, 118, 101, 67, 111, 111, 108, 100, 111, 119, 110, 115, 0, 5, 0, 0, 0, 0, 0, 16, 105, 110, 65, 112, 112, 76, 101, 103, 97, 99, 121, 80, 117, 114, 99, 104, 97, 115, 101, 67, 111, 117, 110, 116, 0, 0, 0, 0, 0, 16, 105, 110, 65, 112, 112, 67, 111, 110, 115, 117, 109, 97, 98, 108, 101, 80, 117, 114, 99, 104, 97, 115, 101, 67, 111, 117, 110, 116, 0, 0, 0, 0, 0, 16, 105, 110, 65, 112, 112, 82, 101, 115, 116, 111, 114, 101, 100, 80, 117, 114, 99, 104, 97, 115, 101, 67, 111, 117, 110, 116, 0, 0, 0, 0, 0, 16, 105, 110, 65, 112, 112, 78, 111, 110, 67, 111, 110, 115, 117, 109, 97, 98, 108, 101, 80, 117, 114, 99, 104, 97, 115, 101, 67, 111, 117, 110, 116, 0, 0, 0, 0, 0, 8, 105, 115, 70, 114, 101, 115, 104, 73, 110, 115, 116, 97, 108, 108, 0, 1, 8, 104, 97, 115, 85, 115, 101, 114, 82, 117, 110, 65, 112, 112, 66, 101, 102, 111, 114, 101, 0, 1, 9, 108, 97, 115, 116, 68, 97, 105, 108, 121, 79, 110, 108, 105, 110, 101, 76, 111, 103, 0, 128, 243, 119, 238, 124, 199, 255, 255, 9, 108, 97, 115, 116, 80, 108, 97, 121, 68, 97, 116, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 9, 108, 97, 115, 116, 81, 117, 105, 116, 68, 97, 116, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 2, 108, 97, 115, 116, 80, 117, 114, 99, 104, 97, 115, 101, 100, 66, 117, 110, 100, 108, 101, 0, 5, 0, 0, 0, 78, 111, 110, 101, 0, 8, 104, 97, 115, 80, 97, 105, 100, 79, 117, 116, 70, 97, 99, 101, 98, 111, 111, 107, 82, 101, 119, 97, 114, 100, 0, 0, 8, 104, 97, 115, 83, 101, 101, 110, 70, 114, 111, 110, 116, 83, 99, 114, 101, 101, 110, 70, 105, 114, 115, 116, 84, 105, 109, 101, 0, 1, 8, 104, 97, 115, 77, 97, 100, 101, 79, 110, 101, 86, 97, 108, 105, 100, 80, 117, 114, 99, 104, 97, 115, 101, 0, 0, 2, 102, 105, 114, 115, 116, 73, 110, 115, 116, 97, 108, 108, 101, 100, 86, 101, 114, 115, 105, 111, 110, 0, 1, 0, 0, 0, 0, 9, 102, 105, 114, 115, 116, 73, 110, 115, 116, 97, 108, 108, 68, 97, 116, 101, 0, 54, 218, 76, 23, 146, 1, 0, 0, 8, 104, 97, 115, 68, 111, 117, 98, 108, 101, 67, 111, 105, 110, 115, 85, 112, 103, 114, 97, 100, 101, 0, 0, 8, 104, 97, 115, 65, 100, 82, 101, 109, 111, 118, 97, 108, 85, 112, 103, 114, 97, 100, 101, 0, 0, 3, 104, 97, 115, 67, 104, 97, 114, 97, 99, 116, 101, 114, 66, 101, 101, 110, 83, 101, 101, 110, 0, 5, 0, 0, 0, 0, 3, 104, 97, 115, 66, 111, 97, 114, 100, 66, 101, 101, 110, 83, 101, 101, 110, 0, 205, 0, 0, 0, 8, 115, 110, 111, 119, 98, 111, 97, 114, 100, 0, 1, 8, 98, 111, 117, 110, 99, 101, 114, 0, 1, 8, 104, 111, 116, 114, 111, 100, 0, 1, 8, 116, 101, 108, 101, 98, 111, 97, 114, 100, 0, 1, 8, 115, 107, 117, 108, 108, 102, 105, 114, 101, 0, 1, 8, 110, 111, 114, 109, 97, 108, 0, 1, 8, 108, 111, 119, 114, 105, 100, 101, 114, 0, 1, 8, 115, 116, 97, 114, 98, 111, 97, 114, 100, 0, 1, 8, 115, 112, 101, 101, 100, 98, 111, 97, 114, 100, 0, 1, 8, 103, 114, 101, 97, 116, 87, 104, 105, 116, 101, 87, 97, 107, 101, 98, 111, 97, 114, 100, 0, 1, 8, 103, 108, 105, 100, 101, 114, 98, 111, 97, 114, 100, 0, 1, 8, 114, 111, 109, 101, 0, 1, 8, 116, 114, 101, 101, 104, 117, 103, 103, 101, 114, 0, 1, 8, 116, 104, 101, 111, 114, 105, 103, 105, 110, 97, 108, 0, 1, 8, 115, 117, 114, 102, 98, 111, 97, 114, 100, 0, 1, 8, 109, 105, 97, 109, 105, 0, 1, 8, 109, 111, 110, 115, 116, 101, 114, 0, 1, 0, 3, 99, 104, 97, 114, 97, 99, 116, 101, 114, 79, 117, 116, 102, 105, 116, 115, 83, 101, 101, 110, 0, 209, 1, 0, 0, 4, 110, 105, 110, 106, 97, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 16, 50, 0, 2, 0, 0, 0, 0, 4, 112, 114, 105, 110, 99, 101, 107, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 16, 50, 0, 1, 0, 0, 0, 0, 4, 102, 114, 97, 110, 107, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 16, 50, 0, 2, 0, 0, 0, 0, 4, 107, 105, 110, 103, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 16, 50, 0, 2, 0, 0, 0, 0, 4, 102, 114, 105, 122, 122, 121, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 16, 50, 0, 2, 0, 0, 0, 0, 4, 115, 108, 105, 99, 107, 0, 26, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0, 16, 49, 0, 0, 0, 0, 0, 16, 50, 0, 2, 0, 0, 0, 0, 4, 122, 111, 101, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 16, 50, 0, 1, 0, 0, 0, 0, 4, 98, 114, 111, 100, 121, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 16, 50, 0, 2, 0, 0, 0, 0, 4, 116, 97, 103, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 16, 50, 0, 2, 0, 0, 0, 0, 4, 116, 97, 115, 104, 97, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 16, 50, 0, 2, 0, 0, 0, 0, 4, 108, 117, 99, 121, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 16, 50, 0, 2, 0, 0, 0, 0, 4, 116, 114, 105, 99, 107, 121, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 16, 50, 0, 1, 0, 0, 0, 0, 4, 102, 114, 101, 115, 104, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 16, 50, 0, 1, 0, 0, 0, 0, 4, 115, 112, 105, 107, 101, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 16, 50, 0, 2, 0, 0, 0, 0, 0, 4, 99, 111, 108, 108, 101, 99, 116, 67, 111, 105, 110, 115, 68, 117, 109, 109, 121, 68, 97, 116, 97, 0, 35, 4, 0, 0, 3, 48, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 49, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 0, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 0, 0, 0, 0, 0, 3, 49, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 50, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 0, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 0, 0, 0, 0, 0, 3, 50, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 51, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 0, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 0, 0, 0, 0, 0, 3, 51, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 49, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 24, 0, 0, 0, 0, 3, 52, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 53, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 22, 0, 0, 0, 0, 3, 53, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 54, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 19, 0, 0, 0, 0, 3, 54, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 55, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 15, 0, 0, 0, 0, 3, 55, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 51, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 14, 0, 0, 0, 0, 3, 56, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 56, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 10, 0, 0, 0, 0, 3, 57, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 49, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 7, 0, 0, 0, 0, 3, 49, 48, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 57, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 0, 0, 0, 0, 3, 49, 49, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 52, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 0, 0, 0, 0, 3, 49, 50, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 50, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 1, 0, 0, 0, 0, 3, 49, 51, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65, 77, 69, 95, 51, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67, 111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107, 101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 0, 0, 0, 0, 0, 0, 3, 101, 97, 114, 110, 67, 117, 114, 114, 101, 110, 99, 121, 68, 97, 116, 97, 0, 5, 0, 0, 0, 0, 3, 105, 110, 65, 112, 112, 80, 117, 114, 99, 104, 97, 115, 101, 72, 105, 115, 116, 111, 114, 121, 0, 5, 0, 0, 0, 0, 16, 110, 117, 109, 98, 101, 114, 79, 102, 66, 114, 101, 97, 100, 67, 114, 117, 109, 98, 115, 83, 104, 111, 119, 110, 79, 110, 70, 114, 111, 110, 116, 80, 97, 103, 101, 0, 168, 7, 0, 0, 16, 97, 103, 101, 82, 101, 115, 116, 114, 105, 99, 116, 105, 111, 110, 73, 110, 112, 117, 116, 86, 101, 114, 115, 105, 111, 110, 0, 0, 0, 0, 0, 16, 97, 103, 101, 82, 101, 115, 116, 114, 105, 99, 116, 105, 111, 110, 73, 110, 112, 117, 116, 77, 111, 110, 116, 104, 0, 12, 0, 0, 0, 16, 97, 103, 101, 82, 101, 115, 116, 114, 105, 99, 116, 105, 111, 110, 73, 110, 112, 117, 116, 89, 101, 97, 114, 0, 207, 7, 0, 0, 3, 98, 114, 101, 97, 100, 99, 114, 117, 109, 98, 115, 0, 91, 0, 0, 0, 2, 108, 97, 115, 116, 68, 97, 105, 108, 121, 87, 111, 114, 100, 0, 6, 0, 0, 0, 66, 82, 79, 78, 88, 0, 18, 119, 101, 101, 107, 108, 121, 72, 117, 110, 116, 80, 101, 114, 105, 111, 100, 69, 120, 112, 105, 114, 101, 68, 97, 116, 101, 84, 105, 99, 107, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 108, 97, 115, 116, 77, 105, 115, 115, 105, 111, 110, 83, 101, 116, 0, 2, 0, 0, 0, 0, 2, 108, 97, 115, 116, 69, 118, 101, 110, 116, 84, 121, 112, 101, 83, 104, 111, 119, 110, 0, 5, 0, 0, 0, 78, 111, 110, 101, 0, 9, 108, 97, 115, 116, 69, 118, 101, 110, 116, 83, 104, 111, 119, 110, 84, 105, 109, 101, 115, 116, 97, 109, 112, 0, 128, 243, 119, 238, 124, 199, 255, 255, 2, 108, 97, 115, 116, 83, 101, 101, 110, 66, 117, 110, 100, 108, 101, 86, 101, 114, 115, 105, 111, 110, 0, 4, 0, 0, 0, 49, 46, 48, 0, 9, 108, 97, 115, 116, 84, 105, 109, 101, 65, 86, 105, 100, 101, 111, 70, 111, 114, 75, 101, 121, 115, 87, 97, 115, 83, 101, 101, 110, 0, 128, 243, 119, 238, 124, 199, 255, 255, 9, 119, 101, 108, 99, 111, 109, 101, 80, 97, 99, 107, 83, 116, 97, 114, 116, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 99, 117, 114, 114, 101, 110, 116, 73, 110, 116, 114, 111, 86, 105, 100, 101, 111, 65, 100, 80, 114, 105, 122, 101, 73, 110, 100, 101, 120, 0, 0, 0, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 82, 97, 110, 100, 111, 109, 86, 105, 100, 101, 111, 65, 100, 80, 114, 105, 122, 101, 73, 110, 100, 101, 120, 0, 0, 0, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 86, 105, 100, 101, 111, 65, 100, 80, 114, 105, 122, 101, 83, 101, 101, 100, 0, 240, 128, 25, 56, 16, 118, 105, 100, 101, 111, 115, 87, 97, 116, 99, 104, 101, 100, 83, 105, 110, 99, 101, 68, 97, 105, 108, 121, 75, 101, 121, 115, 0, 0, 0, 0, 0, 3, 102, 114, 105, 101, 110, 100, 83, 116, 97, 116, 117, 115, 0, 5, 0, 0, 0, 0, 8, 97, 108, 108, 111, 119, 83, 101, 108, 108, 72, 101, 97, 100, 115, 116, 97, 114, 116, 68, 117, 114, 105, 110, 103, 82, 117, 110, 0, 1, 8, 97, 108, 108, 111, 119, 83, 101, 108, 108, 83, 99, 111, 114, 101, 98, 111, 111, 115, 116, 101, 114, 68, 117, 114, 105, 110, 103, 82, 117, 110, 0, 1, 8, 104, 97, 115, 67, 111, 108, 108, 101, 99, 116, 101, 100, 70, 114, 111, 109, 70, 114, 105, 101, 110, 100, 115, 0, 0, 8, 104, 97, 115, 83, 104, 111, 119, 110, 67, 111, 108, 108, 101, 99, 116, 80, 111, 112, 117, 112, 0, 0, 8, 104, 97, 115, 83, 104, 111, 119, 110, 70, 97, 99, 101, 98, 111, 111, 107, 80, 111, 112, 117, 112, 0, 0, 8, 104, 97, 115, 83, 104, 111, 119, 110, 72, 111, 118, 101, 114, 98, 111, 97, 114, 100, 80, 111, 112, 117, 112, 0, 0, 8, 104, 97, 115, 83, 104, 111, 119, 110, 77, 105, 115, 115, 105, 111, 110, 73, 110, 116, 114, 111, 80, 111, 112, 117, 112, 0, 0, 8, 104, 97, 115, 83, 104, 111, 119, 110, 69, 110, 100, 71, 97, 109, 101, 77, 105, 115, 115, 105, 111, 110, 80, 111, 112, 117, 112, 0, 0, 8, 105, 115, 84, 117, 116, 111, 114, 105, 97, 108, 67, 111, 109, 112, 108, 101, 116, 101, 100, 0, 1, 8, 115, 104, 111, 117, 108, 100, 83, 104, 111, 119, 67, 111, 108, 108, 101, 99, 116, 80, 111, 112, 117, 112, 0, 0, 8, 115, 104, 111, 117, 108, 100, 83, 104, 111, 119, 70, 97, 99, 101, 98, 111, 111, 107, 80, 111, 112, 117, 112, 0, 0, 8, 115, 104, 111, 117, 108, 100, 83, 104, 111, 119, 72, 111, 118, 101, 114, 98, 111, 97, 114, 100, 80, 111, 112, 117, 112, 0, 1, 8, 115, 104, 111, 117, 108, 100, 83, 104, 111, 119, 77, 105, 115, 115, 105, 111, 110, 73, 110, 116, 114, 111, 100, 117, 99, 116, 105, 111, 110, 80, 111, 112, 117, 112, 0, 0, 8, 115, 104, 111, 117, 108, 100, 83, 104, 111, 119, 69, 110, 100, 71, 97, 109, 101, 77, 105, 115, 115, 105, 111, 110, 80, 111, 112, 117, 112, 0, 0, 16, 108, 97, 115, 116, 83, 104, 111, 119, 110, 84, 111, 112, 82, 117, 110, 73, 110, 116, 114, 111, 80, 111, 112, 117, 112, 86, 101, 114, 115, 105, 111, 110, 78, 117, 109, 98, 101, 114, 0, 0, 0, 0, 0, 8, 110, 101, 118, 101, 114, 65, 115, 107, 70, 111, 114, 82, 97, 116, 105, 110, 103, 0, 0, 2, 108, 97, 110, 103, 117, 97, 103, 101, 0, 1, 0, 0, 0, 0, 8, 115, 111, 117, 110, 100, 69, 102, 102, 101, 99, 116, 115, 69, 110, 97, 98, 108, 101, 100, 0, 1, 8, 109, 117, 115, 105, 99, 69, 110, 97, 98, 108, 101, 100, 0, 0, 8, 116, 111, 112, 82, 117, 110, 67, 104, 97, 108, 108, 101, 110, 103, 101, 114, 115, 69, 110, 97, 98, 108, 101, 100, 0, 1, 8, 114, 101, 109, 111, 116, 101, 78, 111, 116, 105, 102, 105, 99, 97, 116, 105, 111, 110, 115, 69, 110, 97, 98, 108, 101, 100, 0, 1, 16, 108, 111, 99, 97, 108, 78, 111, 116, 105, 102, 105, 99, 97, 116, 105, 111, 110, 115, 69, 110, 97, 98, 108, 101, 100, 0, 255, 255, 255, 255, 8, 104, 97, 115, 76, 111, 103, 103, 101, 100, 83, 116, 97, 116, 105, 99, 68, 97, 116, 97, 0, 0, 9, 108, 97, 115, 116, 76, 111, 103, 103, 101, 100, 68, 97, 105, 108, 121, 68, 97, 116, 97, 0, 128, 243, 119, 238, 124, 199, 255, 255, 1, 97, 110, 97, 108, 121, 116, 105, 99, 115, 83, 97, 109, 112, 108, 105, 110, 103, 75, 101, 121, 0, 0, 0, 0, 32, 175, 182, 224, 63, 9, 97, 98, 84, 101, 115, 116, 76, 97, 115, 116, 68, 97, 105, 108, 121, 69, 118, 101, 110, 116, 115, 82, 101, 112, 111, 114, 116, 68, 97, 116, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 2, 97, 98, 84, 101, 115, 116, 80, 108, 97, 121, 101, 114, 83, 101, 101, 100, 0, 11, 0, 0, 0, 50, 50, 51, 53, 54, 55, 53, 56, 57, 51, 0, 2, 97, 98, 84, 101, 115, 116, 84, 97, 103, 68, 97, 116, 97, 0, 1, 0, 0, 0, 0, 2, 102, 108, 117, 114, 114, 121, 85, 115, 101, 114, 73, 100, 0, 1, 0, 0, 0, 0, 8, 104, 97, 115, 76, 111, 103, 103, 101, 100, 71, 97, 109, 101, 67, 101, 110, 116, 101, 114, 76, 111, 103, 105, 110, 0, 0, 8, 104, 97, 115, 76, 111, 103, 103, 101, 100, 70, 97, 99, 101, 98, 111, 111, 107, 76, 111, 103, 105, 110, 0, 0, 3, 104, 97, 115, 76, 111, 103, 103, 101, 100, 70, 108, 117, 114, 114, 121, 68, 97, 105, 108, 121, 69, 118, 101, 110, 116, 83, 111, 99, 105, 97, 108, 0, 5, 0, 0, 0, 0, 0]);
      if (!window.indexedDB) {
        o({
          success: !1,
          error: "No IndexedDB"
        });
        break;
      }
      const a = indexedDB.open("/idbfs");
      return a.onerror = () => o({
        success: !1,
        error: "IDB open failed"
      }), a.onsuccess = f => {
        const u = f.target.result;
        if (!u.objectStoreNames.contains("FILE_DATA")) {
          u.close(), o({
            success: !1,
            error: "No FILE_DATA store"
          });
          return;
        }
        const h = u.transaction(["FILE_DATA"], "readwrite").objectStore("FILE_DATA");
        h.getAllKeys().onsuccess = g => {
          const k = g.target.result,
            x = k.find(H => H.includes("/Save/cloud")) || k.find(H => H.includes("/Save/SaveData")) || k.find(H => H.includes("Save") && H.includes("/idbfs/")) || k.find(H => H.includes("UserData") && H.includes(".dat")) || "/idbfs/5bc32e1a17c4bdfdd5da57ab99ff0a2c/Save/cloud",
            O = {
              timestamp: new Date(1759601884673),
              mode: 33206,
              contents: s
            },
            K = h.put(O, x);
          K.onsuccess = () => {
            u.close(), o({
              success: !0,
              key: x
            }), setTimeout(() => location.reload(), 300);
          }, K.onerror = H => {
            u.close(), o({
              success: !1,
              error: String(H)
            });
          };
        };
      }, !0;
    }

    case "resetFpsSettings": {
      C = {
        ...{
          position: {
            x: 20,
            y: 100
          },
          visible: !0,
          mode: "normal",
          color: "#FFFFFF",
          showBg: !0,
          fontSize: 36
        }
      }, I = !0, M.local.set({
        fpsSettings: C
      }), y || v1(), V1(), o({
        success: !0
      });
      break;
    }

    case "cleanGameData": {
      try {
        indexedDB.deleteDatabase("/idbfs"), localStorage.clear(), o({
          success: !0
        }), setTimeout(() => location.reload(), 200);
      } catch (s) {
        o({
          success: !1,
          error: String(s)
        });
      }
      break;
    }

    default:
      o({
        success: !1,
        error: "Unknown action"
      });
      break;
    }
    return !0;
  });
  document.addEventListener("keydown", e => {
    if (e.repeat) return;
    const _activeEl = document.activeElement;
    if (_activeEl && _activeEl.closest?.('#volt-duel-game-root, #volt-chat-panel, #volt-chat-root, #volt-social-root')) {
      e.stopImmediatePropagation();
      return;
    }
    if (voltIsTypingTarget(e) || voltIsTypingTarget(_activeEl)) return;
    M1 && e.code === R1 && H0();
    let t = !1;
    if (N === "Space" ? (e.key === " " || e.code === "Space" || e.keyCode === 32) && (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey ? t = !0 : e.shiftKey && !e.ctrlKey && !e.altKey && e.metaKey) : (N === "Control" && e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey || N === "Shift" && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey || N === "Alt" && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey || N === "Meta" && e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey || N === e.code && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) && (t = !0),
      t && (e.preventDefault(), e.stopPropagation(), e.stopImmediatePropagation(), ["Shift", "Control", "Alt", "Meta"].includes(N) || !e.shiftKey)) {
      if (v.smartTimer) {
        t1("%c[VOLT] Manuel bloqué car Smart Timer est ON", "color: #94a3b8; font-size: 10px;");
        return;
      }
      d0();
    }
    let o = !1;
    (N === "Space" && (e.key === " " || e.code === "Space" || e.keyCode === 32) && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey || !["Shift", "Control", "Alt", "Meta"].includes(N) && N === e.code && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) && (o = !0),
    o && (e.preventDefault(), e.stopPropagation(), e.stopImmediatePropagation(), p0());
  }, !0);
  z("Volt Extension Complete - Content script prêt");
  var j = null,
    q1 = [],
    X1 = !1;
  async function wt() {
    try {
      const e = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: 1920,
            height: 1080,
            frameRate: 60
          },
          audio: !1
        }),
        o = ["video/webm;codecs=h264", "video/webm;codecs=vp8", "video/webm"].find(n => MediaRecorder.isTypeSupported(n)) || "video/webm";
      j = new MediaRecorder(e, {
        mimeType: o,
        videoBitsPerSecond: 5e6
      }), q1 = [], X1 = !0, j.ondataavailable = n => {
        n.data.size > 0 && q1.push(n.data);
      }, j.onstop = () => {
        X1 = !1;
        const n = new Blob(q1, {
            type: o
          }),
          i = URL.createObjectURL(n),
          r = document.createElement("a"),
          l = new Date,
          d = `Run_${l.getHours()}h${l.getMinutes()}_${l.getSeconds()}.webm`;
        r.style.display = "none", r.href = i, r.download = d, document.body.appendChild(r),
          r.click(), setTimeout(() => {
            document.body.removeChild(r), window.URL.revokeObjectURL(i), q1 = [];
          }, 1e3), e.getTracks().forEach(p => p.stop());
      }, e.getVideoTracks()[0].onended = () => {
        j.state !== "inactive" && j.stop();
      }, j.start(1e3);
    } catch (e) {
      console.error("Erreur REC:", e), X1 = !1;
    }
  }

  function xt() {
    j && j.state !== "inactive" && j.stop();
  }
  let y1 = null,
    fe = 0;

  function v0(e = 5) {
    w0();
    const t = e * .5;

    function o() {
      fe = (fe + t) % 360;
      const n = S || document.getElementById("timer-display");
      if (!n) {
        y1 = null;
        return;
      }
      n.style.color = `hsl(${fe}, 100%, 60%)`, y1 = requestAnimationFrame(o);
    }
    y1 = requestAnimationFrame(o);
  }

  function w0() {
    y1 !== null && (cancelAnimationFrame(y1), y1 = null), B();
  }
  (async () => {
    const e = v,
      t = {
        monospace: "'Courier New',Courier,monospace",
        "'Roboto Mono', monospace": "'Roboto Mono',monospace",
        "'Press Start 2P', cursive": "'Press Start 2P',cursive",
        "'Inter', sans-serif": "'Inter',sans-serif",
        "'Orbitron', sans-serif": "'Orbitron',sans-serif"
      },
      o = i => {
        e.timerFont && e.timerFont !== "default" && (i.style.fontFamily = t[e.timerFont] || e.timerFont), document.getElementById("key-display-overlay") && (e.timerFont && e.timerFont !== "default" ? document.getElementById("key-display-overlay").style.setProperty("--key-font", t[e.timerFont] || e.timerFont) : document.getElementById("key-display-overlay").style.removeProperty("--key-font")),
          e.timerRgbMode && e.timerRgbMode.enabled && v0(e.timerRgbMode.speed || 5);
      },
      n = S || document.getElementById("timer-display");
    if (n) o(n);
    else {
      const i = new MutationObserver((r, l) => {
        const d = document.getElementById("timer-display");
        d && (o(d), l.disconnect());
      });
      i.observe(document.documentElement, {
        childList: !0,
        subtree: !0
      }), setTimeout(() => i.disconnect(), 1e4);
    }
    if (e.stretchedResActive && e.stretchedResFactor > 1) {
      const i = e.stretchedResFactor,
        r = () => document.querySelectorAll("canvas").length > 0 ? (x0(i),
          !0) : !1;
      if (!r()) {
        const l = new MutationObserver(() => {
          r() && l.disconnect();
        });
        l.observe(document.documentElement, {
          childList: !0,
          subtree: !0
        }), setTimeout(() => l.disconnect(), 15e3);
      }
    }
  })();

  function x0(e) {
    (typeof e != "number" || e < 1 || e > 2) && (e = 1);
    const t = n => {
      n.style.setProperty("max-width", "none", "important"), n.style.setProperty("max-height", "none", "important"),
        n.style.setProperty("min-width", "0", "important"), n.style.setProperty("min-height", "0", "important"),
        n.style.setProperty("padding", "0", "important"), n.style.setProperty("margin", "0", "important"),
        n.style.setProperty("border", "none", "important"), n.style.setProperty("transform", "none", "important");
    };
    document.querySelectorAll("canvas").forEach(n => {
      let i = n.parentElement;
      for (; i && i !== document.documentElement;) t(i), i.style.setProperty("width", "100vw", "important"),
        i.style.setProperty("height", "100vh", "important"), i.style.setProperty("position", "fixed", "important"),
        i.style.setProperty("top", "0", "important"), i.style.setProperty("left", "0", "important"),
        i.style.setProperty("overflow", "hidden", "important"), i = i.parentElement;
      const r = 100 / e,
        l = (100 - r) / 2;
      n.style.setProperty("position", "fixed", "important"), n.style.setProperty("top", "0", "important"),
        n.style.setProperty("height", "100vh", "important"), n.style.setProperty("width", r + "vw", "important"),
        n.style.setProperty("left", l + "vw", "important"), n.style.setProperty("transform", "scaleX(" + e + ")", "important"),
        n.style.setProperty("object-fit", "fill", "important"), n.style.setProperty("z-index", "2147483647", "important"),
        n.style.setProperty("display", "block", "important");
      try {
        n.width = window.innerWidth, n.height = window.innerHeight;
        const d = {
          width: r + "vw",
          height: "100vh",
          left: l + "vw",
          top: "0px",
          position: "fixed",
          transform: "scaleX(" + e + ")",
          "object-fit": "fill"
        };
        for (const p in d) Object.prototype.hasOwnProperty.call(d, p) && Object.defineProperty(n.style, p, {
          value: d[p],
          writable: !1,
          configurable: !0
        });
      } catch {}
    }), document.querySelectorAll('[class*="overlay"], [class*="ads"], .poki-sdk-container').forEach(n => {
      n.style.setProperty("display", "none", "important");
    }), document.body.style.setProperty("overflow", "hidden", "important"), document.documentElement.style.setProperty("overflow", "hidden", "important");
  }
  const Lt = q.log;

  function t1(...e) {
    if (!A1 || (v && v.voltDebugLogs === true)) q.log(...e);
  }
  chrome.storage.onChanged.addListener((e, t) => {
    if (t === "local" && (e.performanceMode !== void 0 && Ce(e.performanceMode.newValue === !0),
        e.musicPlaylistUrl && e.musicPlaylistUrl.newValue && A && y0(e.musicPlaylistUrl.newValue),
        e.stretchedResActive !== void 0 || e.stretchedResFactor !== void 0)) {
      const o = e.stretchedResActive !== void 0 ? e.stretchedResActive.newValue : v.stretchedResActive,
        n = e.stretchedResFactor !== void 0 ? e.stretchedResFactor.newValue : v.stretchedResFactor;
      if (o) { x0(typeof n === 'number' && n >= 1 ? n : 1); } else {
        // Anti-loop: skip reload if we already reloaded in last 5s.
        // syncFromCloud (bg/scores.js) can re-write stretchedResActive after page
        // reload before popup push to cloud completes, retriggering reload forever.
        try {
          const last = parseInt(sessionStorage.getItem('voltStretchLastReload') || '0', 10);
          if (Date.now() - last < 5000) return;
          sessionStorage.setItem('voltStretchLastReload', String(Date.now()));
        } catch (_) {}
        location.reload();
      }
    }
  });
  chrome.runtime.onMessage.addListener((e, t, o) => {
    if (e.action === "setPerformanceMode") {
      A1 = !!e.enabled;
      const n = window.location.href.includes("yell0wsuit.page/assets/games/subway-surfers-unity") || window.location.href.includes("localhost:3007");
      A1 ? (typeof Se == "function" && Se(), v && v.voltDebugLogs === true && q.log(`%c[VOLT] FPS MAX ON ${n ? "(ULTRA UNITY)" : "(EXTRA)"}`, "background:#10b981;color:white;font-weight:bold;padding:2px 6px;border-radius:3px;"),
        Ce(!0)) : Ce(!1);
    }
  });

  function Ce(e) {
    A1 = e;
    v && (v.performanceMode = !!e);
    try { document.documentElement.classList.toggle("volt-performance-mode", !!e); } catch (_) {}
    voltTimerUiMinIntervalMs = e ? 50 : 33;
    const t = window.location.href.includes("yell0wsuit.page/assets/games/subway-surfers-unity") || window.location.href.includes("localhost:3007");
    e ? (console.log = () => {}, console.info = () => {}, console.debug = () => {},
      v && v.voltDebugLogs === true && q.log(`%c[VOLT] FPS MAX ON ${t ? "(ULTRA UNITY)" : "(EXTRA)"}`, "background:#10b981;color:white;font-weight:bold;padding:2px 6px;border-radius:3px;"),
      kt(), We(!0), t && (j1 = 5e3)) : (console.log = q.log, console.info = q.info, console.warn = q.warn,
      console.debug = q.debug, v && v.voltDebugLogs === true && q.log("%c[VOLT] Performance Mode OFF", "background:#6366f1;color:white;font-weight:bold;padding:2px 6px;border-radius:3px;"),
      We(!1)), e && t ? j1 = 5e3 : j1 = e ? 2e3 : 500;
  }

  function kt() {
    const e = document.getElementById("keypress-container");
    e && e.classList.add("perf-mode-active");
  }

  function We(e) {
    const t = "volt-perf-ultra";
    e ? Q(t, `
      html.volt-performance-mode [id*="timer"],
      html.volt-performance-mode [id*="fps"],
      html.volt-performance-mode [id*="keypress"],
      html.volt-performance-mode .status-toast,
      html.volt-performance-mode .nav-item,
      html.volt-performance-mode .volt-status-toast,
      html.volt-performance-mode #volt-duel-game-root,
      html.volt-performance-mode #volt-duel-game-root *,
      html.volt-performance-mode #volt-chat-panel,
      html.volt-performance-mode #volt-chat-panel * {
        box-shadow: none !important;
        text-shadow: none !important;
        filter: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        transition-property: opacity, transform !important;
        animation: none !important;
      }
      html.volt-performance-mode #timer-display,
      html.volt-performance-mode #fps-monitor-overlay .fps-value {
        font-variant-numeric: tabular-nums;
      }
      html.volt-performance-mode #key-display-overlay .key {
        transition: none !important;
        transform: rotate(var(--key-tilt)) !important;
        box-shadow: none !important;
      }
      html.volt-performance-mode #key-display-overlay .key.active {
        transform: rotate(var(--key-tilt)) !important;
      }
      html.volt-performance-mode #volt-duel-game-root .volt-duel-fab,
      html.volt-performance-mode #volt-duel-game-root .volt-duel-mini,
      html.volt-performance-mode #volt-duel-game-root .volt-duel-panel,
      html.volt-performance-mode #volt-chat-panel {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      html.volt-performance-mode * {
        scroll-behavior: auto !important;
      }
    `) : Q(t, "");
  }
  var oe = 0,
    _ = !1,
    E1 = 0,
    ne = null,
    k0 = 0,
    voltLastDuelStartRetryAt = 0,
    Ye = ["Escape", "F1", "F2", "F3", "Alt", "Tab", "Meta", "Pause", "KeyP", "p", "P"],
    St = 167183,
    voltStartAudioLengths = new Set([167183, 166069]),
    Et = new Set(["https://yell0wsuit.page", "https://surfmap-run.vercel.app", "http://localhost:3007"]);
  let voltLastRandomQueueCancelAt = 0;

  function voltClearLocalDuelTerminal() {
    try { window.__voltLastLocalDuelTerminal = null; } catch (_) {}
  }

  function voltNotifyLocalRunStartedForDuelGuards(e = "unknown", t = 0) {
    try {
      const o = Date.now();
      if (o - voltLastRandomQueueCancelAt > 1500) {
        voltLastRandomQueueCancelAt = o;
        T({
          action: "leaveRandomDuelQueue",
          reason: "local_run_started",
          source: String(e || "unknown"),
          clientStartedAtMs: Number(t || 0) || o
        }).catch(() => {});
      }
      window.dispatchEvent(new CustomEvent("volt:local-run-started", {
        detail: {
          source: String(e || "unknown"),
          startedAtMs: Number(t || 0) || o,
          at: o
        }
      }));
    } catch (_) {}
  }

  function voltMarkLocalDuelTerminal(e = "dead", t = 0, o = 0) {
    try {
      const n = Math.max(0, Math.min(43200000, Math.floor(Number(t) || 0)));
      const i = Math.floor(Number(o) || 0) || (n > 0 ? Date.now() - n : 0);
      window.__voltLastLocalDuelTerminal = {
        state: String(e || "dead").toLowerCase(),
        elapsedMs: n,
        startedAtMs: i,
        duelMatchId: String(window.__voltDuelActiveVisibleId || ""),
        duelContextKey: String(window.__voltDuelActiveContextKey || ""),
        markedAt: Date.now()
      };
      window.dispatchEvent(new CustomEvent("volt:duel-local-terminal", { detail: window.__voltLastLocalDuelTerminal }));
    } catch (_) {}
  }

  function voltGetLocalDuelTerminal() {
    try {
      const e = window.__voltLastLocalDuelTerminal;
      if (!e || Date.now() - Number(e.markedAt || 0) > 120000) return null;
      return e;
    } catch (_) { return null; }
  }

  function voltPublishLocalRunState() {
    try {
      window.__voltGetLocalRunState = () => {
        let manualElapsed = 0,
          audioElapsed = 0;
        const audioActive = !!_;
        const manualActive = L === "running";
        const audioStartedAtMs = Number(oe || 0) || 0;
        const manualStartedAtMs = Number(voltLocalRunEpochMs || 0) || 0;
        try {
          if (manualActive && typeof N1 === "number" && N1 > 0) manualElapsed = Math.max(manualElapsed, performance.now() - N1);
          if (typeof F === "number" && F > 0) manualElapsed = Math.max(manualElapsed, F);
          if (audioActive && audioStartedAtMs > 0) audioElapsed = Math.max(0, Date.now() - audioStartedAtMs);
        } catch (_) {}
        const active = !!(audioActive || manualActive);
        const source = audioActive ? "smart_timer_audio" : (manualActive ? "manual_timer" : "idle");
        const startedAtMs = audioActive && audioStartedAtMs > 0 ?
          audioStartedAtMs :
          (manualActive && manualStartedAtMs > 0 ? manualStartedAtMs : 0);
        const elapsedMs = Math.max(0, Math.round(Math.max(Number(audioElapsed) || 0, Number(manualElapsed) || 0)));
        return {
          // Shared source-of-truth for 1v1: the duel panel should not keep
          // separate manual/Smart Timer clocks. It consumes these fields first,
          // then falls back to the legacy fields below.
          active,
          source,
          startedAtMs,
          elapsedMs,
          smartTimerEquivalent: audioActive || voltSmartGuardEnabled(v),
          audioActive,
          audioStartedAtMs,
          manualActive,
          manualStartedAtMs,
          manualElapsedMs: Math.max(0, Math.round(Number(manualElapsed) || 0)),
          terminal: voltGetLocalDuelTerminal()
        };
      };
      try { Object.defineProperty(window, '__voltGetLocalRunState', { value: window.__voltGetLocalRunState, writable: false, configurable: false }); } catch (_) {}
    } catch (_) {}
  }
  voltPublishLocalRunState();

  function voltIsTypingTarget(e) {
    try {
      const t = e && (e.target || e);
      return !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/i.test(t.tagName || "") || t.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"], #volt-duel-game-root, #volt-chat-panel, #volt-chat-root, #volt-social-root')));
    } catch (_) { return false; }
  }

  function voltManualRunActive() {
    try { return typeof L !== "undefined" && L === "running"; } catch (_) { return false; }
  }

  function voltGetSharedRunSnapshot() {
    try {
      return typeof window.__voltGetLocalRunState === "function" ? (window.__voltGetLocalRunState() || {}) : {};
    } catch (_) { return {}; }
  }

  function voltAnyLocalRunActive() {
    const snap = voltGetSharedRunSnapshot();
    return !!(snap.active || _ || voltManualRunActive());
  }

  function voltCurrentRunStartedAtMs(fallbackElapsedMs = 0) {
    const snap = voltGetSharedRunSnapshot();
    const shared = Number(snap.startedAtMs || 0);
    if (shared > 0) return shared;
    if (typeof oe === "number" && oe > 0) return oe;
    if (typeof voltLocalRunEpochMs === "number" && voltLocalRunEpochMs > 0) return voltLocalRunEpochMs;
    const elapsed = Math.max(0, Number(fallbackElapsedMs || snap.elapsedMs || snap.manualElapsedMs || 0));
    return elapsed > 0 ? Math.max(0, Date.now() - elapsed) : Date.now();
  }

  function voltCurrentRunSourceForScore() {
    const snap = voltGetSharedRunSnapshot();
    const source = String(snap.source || "").toLowerCase();
    if (source === "smart_timer_audio" || source === "audio_detected") return "smart_timer_audio";
    if (snap.audioActive || (typeof _ !== "undefined" && _)) return "smart_timer_audio";
    return "manual_timer";
  }

  function voltStopRunForInvalidAction(reason = "PAUSE FAIL") {
    try {
      if (_) h1(reason);
      else if (voltManualRunActive() && Number(window.__voltDuelActiveVisibleSinceMs || 0) > 0) u0("dead");
    } catch (_) {}
  }

  function voltPausePointerIntent(e) {
    try {
      if (!voltAnyLocalRunActive() || voltIsTypingTarget(e)) return false;
      if (e?.target?.closest?.('#speedrun-timer-overlay, #fps-monitor-overlay, #key-display-overlay, #volt-duel-game-root, #volt-notifications-container')) return false;
      const touch = e?.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : (e?.touches && e.touches[0] ? e.touches[0] : e);
      const x = Number(touch?.clientX);
      const y = Number(touch?.clientY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
      const vw = Math.max(1, window.innerWidth || document.documentElement?.clientWidth || 0);
      const vh = Math.max(1, window.innerHeight || document.documentElement?.clientHeight || 0);
      const edge = Math.min(96, Math.max(56, Math.round(Math.min(vw, vh) * 0.12)));
      return y >= 0 && y <= edge && (x <= edge || x >= vw - edge);
    } catch (_) { return false; }
  }

  function voltIsStartAudio(e) {
    const t = Number(e && e.length) || 0,
      o = Number(e && e.duration) || 0;
    if (t === 182787) return false;
    return voltStartAudioLengths.has(t) || (t > 150000 && o >= 3.6 && o <= 4.1);
  }

  function voltSendDuelStartRetry(e = {}) {
    const t = Date.now();
    if (t - voltLastDuelStartRetryAt < 600) return;
    voltLastDuelStartRetryAt = t;
    const n = Number(e.clientStartedAtMs || 0) || (typeof oe === "number" && oe > 0 ? oe : Date.now());
    voltNotifyLocalRunStartedForDuelGuards(e.source || "audio_detected", n);
    T({
      action: "startRun",
      source: e.source || "audio_detected",
      smartTimer: voltAudioDetectionEnabled(v),
      smartGuard: voltSmartGuardEnabled(v),
      manualTimerAlreadyRunning: !!e.manualTimerAlreadyRunning,
      duelStartRetry: !!e.duelStartRetry,
      clientStartedAtMs: n,
      runStartedAtIso: new Date(n).toISOString(),
      duelVisibleActiveAtMs: Number(window.__voltDuelActiveVisibleSinceMs || 0) || 0
    }).catch(() => {});
  }

  function Tt() {}
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", Tt) : void 0;

  function h1(e = "FAIL") {
    if (!_) return;
    const t = typeof L < "u" && L === "running";
    // Only auto-stop the visible manual timer when smart timer is driving the run,
    // OR when a 1v1 duel is active (must stop to keep opponent's view consistent).
    // When smart timer is OFF the manual timer must only obey the user's hotkey —
    // audio events and blur/tab-switch must not stop it.
    const _h1DuelActive = Number(window.__voltDuelActiveVisibleSinceMs || 0) > 0;
    if (t && ((v && v.smartTimer) || _h1DuelActive)) u0("dead");
    t1(`%c[No-Coin] STOP: ${e}`, "background: #f87171; color: white; padding: 2px 5px; font-weight: bold;"),
      _ = !1, E1 = 0, ne && clearInterval(ne), window._voltNoCoinHeartbeat && (clearInterval(window._voltNoCoinHeartbeat),
        window._voltNoCoinHeartbeat = null);
    const o = oe;
    if (oe = 0, !v.smartTimer && o > 0) {
      const n = Date.now() - o;
      n > 1e3 && voltMarkLocalDuelTerminal("dead", n, o);
      n > 1e3 && T({
        action: "updateDuelRunState",
        state: "finished",
        elapsedMs: n,
        runStartedAt: new Date(o).toISOString(),
        forceDuelStart: true,
        lookupActiveBeforeStart: true,
        allowServerStartFallback: true,
        allowPreDuelStartFallback: true,
        duelVisibleActiveAtMs: Number(window.__voltDuelActiveVisibleSinceMs || 0) || 0
      }).catch(() => {}), n > 1e3 && !voltRunSubmissionLocked && (voltRunSubmissionLocked = true, T({
        action: "saveRunScore",
        time: n,
        resultState: "finished",
        source: "audio_detected",
        clientStartedAtMs: o,
        runStartedAtIso: new Date(o).toISOString(),
        duelVisibleActiveAtMs: Number(window.__voltDuelActiveVisibleSinceMs || 0) || 0
      }));
    }
    g1 && (clearTimeout(g1), g1 = null), Ne();
  }

  function Ct(e) {
    const isFatalCollision = (length = 0, knownFatalLength = 35665) => length === 44582 || length === knownFatalLength;
    const t = Number(e && e.length) || 0,
      o = t === 423531 || t === 40124 || t === 22291,
      n = isFatalCollision(t),
      i = t === 27863 || t === 3343 || t === 6687,
      a = Date.now() - oe;
    if (voltIsStartAudio(e)) {
      if (!voltCanStartTrustedRun()) return;
      const timerAlreadyRunning = typeof L < "u" && L === "running";
      if (_) {
        // Ne reset pas le timer local, mais retente le START 1v1.
        // Corrige les cas intermittents où le premier RPC live-start
        // est arrivé trop tôt, a été throttlé, ou le duel actif venait
        // juste d'apparaître côté Supabase.
        voltSendDuelStartRetry({
          source: "audio_detected",
          manualTimerAlreadyRunning: timerAlreadyRunning && !(v && v.smartTimer),
          duelStartRetry: true
        });
        t1("%c[No-Coin] START déjà active: retry start 1v1", "background:#64748b;color:white;");
        return;
      }
      const r = v && v.smartTimer ? 100 : 2e3;
      if (Date.now() - k0 < r) {
        t1("%c[No-Coin] START bloque - forbidden key guard actif", "background:#f97316;color:white;");
        return;
      }
      if (timerAlreadyRunning && !(v && v.smartTimer)) {
        // Timer manuel déjà lancé: ne pas reset l'affichage, mais valider
        // quand même le vrai START audio pour le 1v1.
        voltClearLocalDuelTerminal(), oe = Date.now(), _ = !0, E1 = 0, ne && clearInterval(ne);
        if (window._voltNoCoinHeartbeat) {
          clearInterval(window._voltNoCoinHeartbeat);
          window._voltNoCoinHeartbeat = null;
        }
        if (!window._voltHeartbeat) {
          window._voltNoCoinHeartbeat = setInterval(() => {
            _ ? T({
              action: "gameHeartbeat"
            }).catch(() => {}) : (clearInterval(window._voltNoCoinHeartbeat), window._voltNoCoinHeartbeat = null);
          }, voltHeartbeatDelayMs());
        }
        voltSendDuelStartRetry({
          source: "audio_detected",
          manualTimerAlreadyRunning: true,
          duelStartRetry: false
        });
        t1("%c[No-Coin] START: audio validé sur timer manuel", "background: #10b981; color: white; padding: 2px 5px; font-weight: bold;");
        zt("stats_pogo");
        return;
      }
      if (timerAlreadyRunning) {
        t1("%c[No-Coin] START ignore: timer déjà actif", "background:#64748b;color:white;");
        return;
      }
      voltClearLocalDuelTerminal(), oe = Date.now(), _ = !0, E1 = 0, ne && clearInterval(ne), v.smartTimer ? (window._voltNoCoinHeartbeat && (clearInterval(window._voltNoCoinHeartbeat),
        window._voltNoCoinHeartbeat = null), st(), t1("%c[No-Coin] START: Auto", "background: #10b981; color: white; padding: 2px 5px; font-weight: bold;")) : (window._voltNoCoinHeartbeat && clearInterval(window._voltNoCoinHeartbeat),
        window._voltNoCoinHeartbeat = setInterval(() => {
          _ ? T({
            action: "gameHeartbeat"
          }).catch(() => {}) : (clearInterval(window._voltNoCoinHeartbeat), window._voltNoCoinHeartbeat = null);
        }, voltHeartbeatDelayMs()), voltSendDuelStartRetry({
          source: "audio_detected",
          manualTimerAlreadyRunning: false,
          duelStartRetry: false
        })), zt("stats_pogo");
      return;
    }
    if (o) {
      const r = Date.now(),
        l = r - E1,
        d = r - oe;
      _ && d < 5e3 ? h1("EARLY HIT <5s") : E1 > 0 && l >= 20 && l <= 5e3 ? h1("DOUBLE HIT") : E1 = r;
      return;
    }
    if (n || i) {
      if (_ && a >= 0 && a < 1200) {
        t1("%c[No-Coin] STOP ignore: bruit initial", "background:#64748b;color:white;");
        return;
      }
      // Stage 8 fix: a death/coin/fatal audio event must stop the local 1v1 timer
      // even when the visible Smart Timer is OFF. Otherwise the local manual
      // timer can keep overriding the terminal duel state and the 1v1 UI keeps
      // counting after the player is dead.
      // Only auto-stop the manual timer when a 1v1 duel is currently active —
      // outside of duels the manual chrono must obey the user (Smart Timer OFF
      // means no audio-driven auto-stop).
      if (_) h1(t === 27863 ? "COIN" : "FATAL");
      else if (typeof L !== "undefined" && L === "running" && Number(window.__voltDuelActiveVisibleSinceMs || 0) > 0) u0("dead");
      else if (v && v.smartTimer) u0("dead");
      return;
    }
  }

  window.addEventListener("message", e => {
    if (!voltSmartGuardEnabled(v) && !(v && v.smartTimer) && !_ && L !== "running") return;
    const t = e.data && e.data.type === "GAME_AUDIO_PLAYED",
      o = e.source === window,
      n = t && e.data._isForwardedByContent === !0 && Et.has(e.origin);
    if (!(!t || !o && !n) && t) {
      if (v.audioDebug && !A1 && z(`[Audio Debug] len=${e.data.length} dur=${e.data.duration?.toFixed(3)}`),
        window !== window.top) {
        window.top.postMessage({
          ...e.data,
          _isForwardedByContent: !0
        }, window.location.origin);
        return;
      }
      Ct(e.data);
    }
  });
  window.addEventListener("keydown", e => {
    if (!(Ye.includes(e.key) || Ye.includes(e.code))) return;
    k0 = Date.now();
    if (voltIsTypingTarget(e) || !voltAnyLocalRunActive()) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    voltStopRunForInvalidAction("PAUSE FAIL");
    t1(`%c[No-Coin] STOP: Forbidden key ${e.key} used`, "background: #f87171; color: white; padding: 2px 5px;");
    if (v && v.smartTimer) try {
      m || e1(), V = !0, m && (m.style.display = "block"), B1();
    } catch {}
  }, !0);
  ["pointerdown", "mousedown", "touchstart"].forEach(voltPauseEventType => {
    window.addEventListener(voltPauseEventType, e => {
      if (!voltPausePointerIntent(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      voltStopRunForInvalidAction("PAUSE FAIL");
      t1("%c[No-Coin] STOP: Pause-zone click/touch", "background: #f87171; color: white; padding: 2px 5px;");
    }, true);
  });
  let ye = !1;

  function S0(e) {
    ye || (ye = !0, voltStopRunForInvalidAction(e), setTimeout(() => {
      ye = !1;
    }, 100));
  }
  window.addEventListener("blur", () => {
    voltAnyLocalRunActive() && (S0("TAB FAIL"), t1("%c[No-Coin] STOP: Window lost focus (Alt-Tab)", "background: #f87171; color: white; padding: 2px 5px;"));
  });
  document.addEventListener("visibilitychange", () => {
    document.hidden && voltAnyLocalRunActive() && (S0("TAB FAIL"), t1("%c[No-Coin] STOP: Page hidden (Tab switch)", "background: #f87171; color: white; padding: 2px 5px;"));
  });
  window.addEventListener("pagehide", () => {
    voltAnyLocalRunActive() && voltStopRunForInvalidAction("PAGE_UNLOAD");
  }, {
    once: !0
  });
  var F1 = {},
    g1 = null,
    j1 = 5e3;

  function Ne() {
    const e = Object.keys(F1);
    e.length !== 0 && M.local.get(e, t => {
      const o = {};
      for (const n of e) o[n] = (t[n] || 0) + (F1[n] || 0), delete F1[n];
      M.local.set(o);
    });
  }

  function zt(e) {
    F1[e] = (F1[e] || 0) + 1, !g1 && (g1 = setTimeout(() => {
      g1 = null, Ne();
    }, j1));
  }
  window.addEventListener("beforeunload", Ne);

  function ze(e, t, o = null, n = !1) {
    let i = "volt-notifications-container",
      r = document.getElementById(i);
    r || (r = document.createElement("div"), r.id = i, r.style.cssText = `\n            position: fixed; bottom: 20px; right: 20px; \n            display: flex; flex-direction: column; gap: 10px; \n            z-index: 2147483647; pointer-events: none;\n        `,
      (document.documentElement || document.body).appendChild(r));
    const l = document.createElement("div");
    l.className = "volt-status-toast", l.style.cssText = `\n    display: flex; align-items: center; gap: 12px;\n    background: rgba(10, 10, 15, 0.85); \n    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);\n    border: 1px solid rgba(255, 255, 255, 0.1);\n    color: white; padding: 12px 16px; border-radius: 16px;\n    min-width: 280px; max-width: 380px; \n    box-shadow: 0 10px 40px rgba(0,0,0,0.5);\n    transform: translateX(120%); transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);\n    pointer-events: auto; cursor: pointer;\n  `;
    const d = o && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(o) && String(o).length <= 700000,
      p = o && o.startsWith("https://api.webtvmedia.net/storage/v1/object/public/"),
      s = d || p ? o : null;
    if (s) {
      const x = document.createElement("div");
      x.style.position = "relative";
      const O = document.createElement("img");
      O.src = s, O.style.cssText = `width:44px; height:44px; border-radius:50%; object-fit:cover; border: 2px solid ${n ? "#ef4444" : "#818cf8"};`,
        x.appendChild(O);
      const K = document.createElement("div");
      K.style.cssText = "position:absolute; bottom:0; right:0; width:12px; height:12px; background:#10b981; border:2px solid #0a0a0f; border-radius:50%;",
        x.appendChild(K), l.appendChild(x);
    } else {
      const x = document.createElement("div");
      x.style.cssText = `width:44px; height:44px; border-radius:50%; background: ${n ? "linear-gradient(135deg, #ef4444, #991b1b)" : "linear-gradient(135deg, #818cf8, #4f46e5)"}; color:white; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); flex-shrink:0;`,
        x.textContent = e ? e.charAt(0).toUpperCase() : "?", l.appendChild(x);
    }
    const a = document.createElement("div");
    a.style.cssText = "flex:1; overflow:hidden;";
    const f = document.createElement("div");
    f.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;";
    const u = document.createElement("div");
    u.style.cssText = `font-size:10px; font-weight:900; color:${n ? "#f87171" : "#a5b4fc"}; text-transform:uppercase; letter-spacing:1.5px;`,
      u.textContent = n ? " Broadcast Admin" : "✉ Message Privé";
    const w = document.createElement("div");
    w.style.cssText = "font-size:9px; color:rgba(255,255,255,0.4); font-weight:600;",
      w.textContent = "Maintenant", f.appendChild(u), f.appendChild(w);
    const h = document.createElement("div");
    h.style.cssText = "font-size:14px; font-weight:700; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:1px;",
      h.textContent = e;
    const g = document.createElement("div");
    g.style.cssText = "font-size:13px; color:rgba(255,255,255,0.7); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:400;",
      g.textContent = t, a.appendChild(f), a.appendChild(h), a.appendChild(g), l.appendChild(a),
      r.appendChild(l), setTimeout(() => {
        l.style.transform = "translateX(0)";
      }, 100);
    const k = () => {
        l.style.transform = "translateX(120%)", setTimeout(() => l.remove(), 500);
      },
      E = setTimeout(k, 7e3);
    l.onclick = () => {
      clearTimeout(E), k();
    };
  }

  function Ge(e, t) {
    const o = document.getElementById("volt-admin-announcement-popup");
    o && o.remove();
    const n = document.createElement("div");
    n.id = "volt-admin-announcement-popup", n.style.cssText = `\n    position: fixed;\n    bottom: 24px;\n    right: 24px;\n    z-index: 2147483647;\n    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);\n    border: 2px solid #e74c3c;\n    border-radius: 16px;\n    padding: 24px 28px;\n    max-width: 380px;\n    box-shadow: 0 10px 40px rgba(231,76,60,0.3), 0 8px 30px rgba(0,0,0,0.8);\n    animation: volt-ann-slidein 0.4s cubic-bezier(0.2,0.8,0.2,1);\n    display: flex;\n    flex-direction: column;\n    align-items: flex-start;\n  `;
    const i = document.createElement("div");
    i.style.cssText = "display: flex; align-items: center; gap: 12px; margin-bottom: 14px;";
    const r = document.createElement("div");
    r.style.cssText = "font-size:28px; line-height: 1;", r.textContent = "";
    const l = document.createElement("div");
    l.style.cssText = `\n    background: rgba(231,76,60,0.2); border: 1px solid #e74c3c;\n    color: #e74c3c; font-size: 10px; font-weight: 800;\n    padding: 4px 10px; border-radius: 20px;\n    text-transform: uppercase; letter-spacing: 0.5px;\n  `;
    // SEC FIX: ne plus deduire admin status depuis "@" dans pseudo (spoofable).
    // Toujours afficher "Admin" comme label fixe — broadcast est validé serveur via RLS.
    const d = "Admin";
    l.textContent = ` ${d}`, i.appendChild(r), i.appendChild(l);
    const p = document.createElement("div");
    p.style.cssText = `\n    color: #ffffff; font-size: 15px; line-height: 1.5;\n    font-weight: 500; margin-bottom: 20px;\n    font-family: Inter, sans-serif;\n  `,
      p.textContent = t;
    const s = document.createElement("button");
    s.style.cssText = `\n    background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2);\n    padding: 8px 24px; border-radius: 8px; font-size: 13px;\n    font-weight: 600; cursor: pointer; transition: all 0.2s;\n    align-self: flex-end;\n  `,
      s.textContent = "Fermer", s.onmouseenter = () => s.style.background = "rgba(255,255,255,0.2)",
      s.onmouseleave = () => s.style.background = "rgba(255,255,255,0.1)";
    const a = document.createElement("style");
    a.textContent = `\n    @keyframes volt-ann-slidein { from { transform:scale(0.85) translateX(30px); opacity:0 } to { transform:scale(1) translateX(0); opacity:1 } }\n    @keyframes volt-ann-fadeout { from { transform:scale(1) translateX(0); opacity:1 } to { transform:scale(0.85) translateX(30px); opacity:0 } }\n  `;
    const f = () => {
      n.style.animation = "volt-ann-fadeout 0.3s cubic-bezier(0.8,0.2,1,0.2)", setTimeout(() => n.remove(), 290);
    };
    s.onclick = f, setTimeout(f, 12e3), n.appendChild(a), n.appendChild(i), n.appendChild(p),
      n.appendChild(s), document.documentElement.appendChild(n);
  }
  async function E0() {
      try {
        if (window.VOLT_DEBUG_LOGS) console.log(" [VOLT] Starting Nuclear Reset...");
        localStorage.clear(), sessionStorage.clear(),
          await new Promise(n => M.local.clear(n)), await new Promise(n => {
            try {
              const i = indexedDB.open("/idbfs");
              i.onblocked = () => n(), i.onerror = () => n(), i.onsuccess = r => {
                const l = r.target.result;
                if (l.objectStoreNames.contains("FILE_DATA")) {
                  const d = l.transaction(["FILE_DATA"], "readwrite");
                  d.objectStore("FILE_DATA").clear(), d.oncomplete = () => {
                    l.close(), n();
                  }, d.onerror = () => {
                    l.close(), n();
                  };
                } else l.close(), n();
              };
            } catch {
              n();
            }
          });
        const t = ["/idbfs", "unity-data", "PlayerPrefs"];
        for (const n of t) indexedDB.deleteDatabase(n);
        if (indexedDB.databases) try {
          const n = await indexedDB.databases();
          for (const i of n) indexedDB.deleteDatabase(i.name);
        } catch {}
        return ["#reset-data", ".reset-data", 'button[id*="reset"]', 'button[class*="reset"]', "#erase-progress", "#clear-save"].forEach(n => {
          document.querySelectorAll(n).forEach(i => {
            typeof i.click == "function" && i.click();
          });
        }), console.log(" [VOLT] Nuclear data wipe completed."), !0;
      } catch (e) {
        throw console.error("[VOLT] Nuclear Reset Failed:", e), e;
      }
    }
    (async () => setTimeout(async () => {
      try {
        const e = [navigator.userAgent, navigator.language, screen.width, screen.height, navigator.hardwareConcurrency || 1, navigator.deviceMemory || 1, navigator.platform].join("|"),
          t = await crypto.subtle.digest("SHA-256", (new TextEncoder).encode(e)),
          o = Array.from(new Uint8Array(t)).map(n => n.toString(16).padStart(2, "0")).join("");
        if (window.VOLT_DEBUG_LOGS) console.log(`[VOLT Security] Current HWID: ${o}`);
        T({
          action: "checkBanForGameReset",
          hwid: o
        }, async n => {
          if (chrome.runtime.lastError) {
            console.warn("[VOLT Security] Ban check failed (service worker asleep?):", chrome.runtime.lastError?.message);
            return;
          }
          n && n.isBanned && (console.warn("%c[VOLT Security] BANNISSEMENT DÉTECTÉ.", "color:#ef4444; font-weight:bold; font-size:18px;"),
            console.warn("%cRéinitialisation de sécurité et blocage immédiat...", "color:#f87171;"),
            setTimeout(async () => {
              await E0(), window.addEventListener("keydown", r => {
                r.stopImmediatePropagation(), r.preventDefault();
              }, !0), window.addEventListener("mousedown", r => {
                r.stopImmediatePropagation(), r.preventDefault();
              }, !0);
              const i = document.createElement("div");
              i.id = "volt-nuclear-ban-overlay", i.style.cssText = `\n              position:fixed; top:0; left:0; width:100vw; height:100vh;\n              background:radial-gradient(circle at center, #220000 0%, #000 100%);\n              display:flex; flex-direction:column; align-items:center; justify-content:center;\n              z-index:2147483647; color:white; font-family:sans-serif; text-align:center;\n              animation: voltBanFadeIn 0.5s ease-out;\n            `,
                i.innerHTML = `\n              <div style="background: rgba(255,0,0,0.1); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,0,0,0.2); backdrop-filter: blur(10px);">\n                <h1 style="color:#ef4444; font-size:48px; margin-bottom:10px; text-shadow: 0 0 20px rgba(239,68,68,0.5);">ACCÈS RÉVOQUÉ</h1>\n                <p style="font-size:20px; opacity:0.8;">Bannissement persistant détecté pour cet équipement.</p>\n                <div style="margin-top:20px; font-size:12px; opacity:0.3; font-family:monospace;">ID: ${o}</div>\n                <div style="margin-top:30px; font-size:14px; color:#666;">Application des mesures de sécurité...</div>\n              </div>\n              <style>\n                @keyframes voltBanFadeIn { from { opacity: 0; transform: scale(1.1); } to { opacity: 1; transform: scale(1); } }\n              </style>\n            `,
                document.documentElement.appendChild(i), console.error(" [VOLT] Équipement blacklisté. Toutes les données ont été purgées."),
                setTimeout(() => location.reload(), 1500);
            }, 1200));
        });
      } catch {}
    }, 500))();
  let voltResetWorldEnabled = false,
    voltResetWorldHotkey = "",
    voltResetWorldListenerActive = false;

  function voltResetWorldKeyHandler(e) {
    if (!voltResetWorldEnabled || !voltResetWorldHotkey) return;
    if (e.key.toUpperCase() === voltResetWorldHotkey) {
      if (voltIsTypingTarget(e) || voltIsTypingTarget(document.activeElement)) return;
      if (!A1 || (typeof v !== "undefined" && v && v.voltDebugLogs === true)) console.log("[VOLT] Reset World Hotkey Triggered!");
      T({
        action: "triggerUnlockAllAcrossTabs"
      }).catch(() => {});
    }
  }

  function voltUpdateResetWorldListener() {
    const shouldListen = !!(voltResetWorldEnabled && voltResetWorldHotkey);
    if (shouldListen && !voltResetWorldListenerActive) {
      window.addEventListener("keydown", voltResetWorldKeyHandler, true);
      voltResetWorldListenerActive = true;
    } else if (!shouldListen && voltResetWorldListenerActive) {
      window.removeEventListener("keydown", voltResetWorldKeyHandler, true);
      voltResetWorldListenerActive = false;
    }
  }
  M.local.get(["resetWorldEnabled", "resetWorldHotkey"], t => {
    voltResetWorldEnabled = !!t.resetWorldEnabled;
    voltResetWorldHotkey = String(t.resetWorldHotkey || "").toUpperCase();
    voltUpdateResetWorldListener();
  });
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.resetWorldEnabled) voltResetWorldEnabled = !!changes.resetWorldEnabled.newValue;
      if (changes.resetWorldHotkey) voltResetWorldHotkey = String(changes.resetWorldHotkey.newValue || "").toUpperCase();
      if (changes.resetWorldEnabled || changes.resetWorldHotkey) voltUpdateResetWorldListener();
    });
  } catch (_) {}
  try {
    window.__voltPerfSnapshot = () => {
      if (!(v && v.voltDebugPerf === true)) return { enabled: false };
      return {
        enabled: true,
        timestamp: Date.now(),
        documentHidden: !!document.hidden,
        timerState: L,
        timerUiMinIntervalMs: voltTimerUiMinIntervalMs,
        smartTimerEnabled: !!v.smartTimer,
        fpsOverlayVisible: !!I,
        keyDisplayVisible: !!P,
        keypressListenersActive: !!voltKeypressListenersActive,
        resetWorldListenerActive: !!voltResetWorldListenerActive,
        domAdblockEnabled: !!J,
        domAdblockObserverActive: !!voltAdblockHeadObserver,
        duelPanelEnabled: !!window.__voltDuelGamePanelV24
      };
    };
    try { Object.defineProperty(window, '__voltPerfSnapshot', { value: window.__voltPerfSnapshot, writable: false, configurable: false }); } catch (_) {}
  } catch (_) {}
})();

// VOLT 1v1 opponent notifications overlay
(function () {
  if (window.__voltDuelNotifyOverlayV2) return;
  window.__voltDuelNotifyOverlayV2 = true;
  try { Object.defineProperty(window, '__voltDuelNotifyOverlayV2', { value: true, writable: false, configurable: false }); } catch (_) {}
  if (window.top !== window) return;

  function escapeDuelToastText(value) {
    return String(value || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    } [ch]));
  }

  function duelToastT(key) {
    const lang = (() => {
      try { return String(localStorage.getItem('volt_lang') || localStorage.getItem('voltLanguage') || navigator.language || 'fr'); } catch (_) { return 'fr'; }
    })();
    const dict = lang.startsWith('en') ? {
      update: '1v1 update',
      scoreSaved: 'Your score was recorded for the duel.'
    } : lang.startsWith('pt') ? {
      update: 'Atualização 1v1',
      scoreSaved: 'Sua pontuação foi registrada para o duelo.'
    } : lang.startsWith('zh') ? {
      update: '1v1 更新',
      scoreSaved: '你的分数已记录到 duel。'
    } : {
      update: 'Mise à jour 1v1',
      scoreSaved: 'Ton score a été enregistré pour le duel.'
    };
    return dict[key] || key;
  }

  function showDuelToast(title, body, kind) {
    try {
      let wrap = document.getElementById('volt-duel-notify-wrap');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'volt-duel-notify-wrap';
        wrap.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483647;display:flex;flex-direction:column;gap:10px;pointer-events:none;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';
        (document.documentElement || document.body).appendChild(wrap);
      }
      const el = document.createElement('div');
      const accent = kind === 'finished' ? '#4a8c6f' : (kind === 'result' ? '#6da3ff' : '#c4965c');
      el.style.cssText = `pointer-events:auto;min-width:250px;max-width:330px;padding:10px 12px;border-radius:12px;background:rgba(12,14,18,.92);color:#fff;border:1px solid rgba(255,255,255,.10);box-shadow:0 10px 24px rgba(0,0,0,.34);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transform:translateX(120%);transition:transform .28s cubic-bezier(.2,.8,.2,1),opacity .22s;opacity:0;`;
      el.innerHTML = `<div style="display:flex;align-items:flex-start;gap:10px;"><div style="width:3px;align-self:stretch;border-radius:999px;background:${accent};flex-shrink:0;"></div><div style="min-width:0;flex:1;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.9px;color:${accent};font-weight:900;margin-bottom:4px;">${escapeDuelToastText(title || '1v1')}</div><div style="font-size:12px;line-height:1.35;color:rgba(255,255,255,.88);font-weight:650;">${escapeDuelToastText(body || duelToastT('update'))}</div></div></div>`;
      wrap.appendChild(el);
      requestAnimationFrame(() => { el.style.transform = 'translateX(0)';
        el.style.opacity = '1'; });
      const close = () => { el.style.transform = 'translateX(120%)';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 330); };
      el.addEventListener('click', close);
      setTimeout(close, kind === 'finished' ? 7000 : 5500);
    } catch (_) {}
  }

  const voltDuelToastSeen = new Map();

  function shouldShowDuelToast(key, ttl = 120000) {
    const now = Date.now();
    for (const [k, ts] of voltDuelToastSeen.entries()) {
      if (now - ts > ttl) voltDuelToastSeen.delete(k);
    }
    if (voltDuelToastSeen.has(key)) return false;
    voltDuelToastSeen.set(key, now);
    return true;
  }

  // Hidden-tab event queue: while document.visibilityState is "hidden",
  // duel events are queued instead of immediately rendered. When the user
  // returns to the tab, the queued events fire so they don't miss them.
  // Without this, an opponent finishing while the tab is hidden would only
  // be reflected after the next manual refresh.
  const _voltHiddenDuelQueue = [];
  const _VOLT_HIDDEN_DUEL_QUEUE_MAX = 50;

  function _voltDispatchDuelMessage(message) {
    if (!message) return;
    if (message.action === 'duelOpponentRunEvent') {
      const live = message.live || {};
      const key = `opp:${message.matchId || live.match_id || ''}:${message.userId || live.user_id || ''}:${message.kind || ''}:${live.run_started_at || live.state || ''}:${message.kind === 'finished' || message.kind === 'dead' ? Math.floor(Number(live.elapsed_ms || 0) / 1000) : ''}`;
      if (shouldShowDuelToast(key)) showDuelToast(message.title, message.body, message.kind);
    }
    if (message.action === 'duelResultRecorded' || message.action === 'duelAbandoned') {
      const duel = message.duel || {};
      const key = `self:${duel.match_id || ''}:${message.action === 'duelAbandoned' ? 'abandoned' : (duel.completed ? 'completed' : 'recorded')}`;
      const body = message.action === 'duelAbandoned' ? '1v1 mis à jour.' : duelToastT('scoreSaved');
      if (shouldShowDuelToast(key)) showDuelToast('1v1', body, 'result');
    }
  }

  function _voltFlushHiddenDuelQueue() {
    while (_voltHiddenDuelQueue.length) {
      const msg = _voltHiddenDuelQueue.shift();
      try { _voltDispatchDuelMessage(msg); } catch (_) {}
    }
  }

  try {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'hidden') _voltFlushHiddenDuelQueue();
    });
  } catch (_) {}

  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (!message) return;
      const isDuelEvent = message.action === 'duelOpponentRunEvent' ||
        message.action === 'duelResultRecorded' ||
        message.action === 'duelAbandoned';
      if (!isDuelEvent) return;
      if (document.visibilityState === 'hidden') {
        if (_voltHiddenDuelQueue.length >= _VOLT_HIDDEN_DUEL_QUEUE_MAX) {
          _voltHiddenDuelQueue.shift();
        }
        _voltHiddenDuelQueue.push(message);
        return;
      }
      _voltDispatchDuelMessage(message);
    });
  } catch (_) {}

  // Cross-tab coordination via BroadcastChannel: when more than one tab of a
  // supported game is open at once, only one tab is allowed to own the
  // active 1v1 timer. Other tabs see a sentinel that prevents `d0`/`st` from
  // double-submitting the same run.
  try {
    if (typeof BroadcastChannel !== 'undefined' && !window.__voltDuelTabChannel) {
      const ch = new BroadcastChannel('volt-duel-tabs');
      window.__voltDuelTabChannel = ch;
      try { Object.defineProperty(window, '__voltDuelTabChannel', { value: ch, writable: false, configurable: false }); } catch (_) {}
      const myId = (crypto?.randomUUID?.() || (Date.now() + '_' + Math.random())).toString();
      window.__voltDuelTabId = myId;
      try { Object.defineProperty(window, '__voltDuelTabId', { value: myId, writable: false, configurable: false }); } catch (_) {}

      const _validTabId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^\d+_0\.\d+$/i;
      ch.addEventListener('message', (ev) => {
        const data = ev?.data || {};
        const tid = typeof data.tabId === 'string' ? data.tabId : '';
        if (data.type === 'claim_owner' && tid && tid !== myId && _validTabId.test(tid)) {
          window.__voltDuelTabOwner = tid;
        }
        if (data.type === 'release_owner' && tid === window.__voltDuelTabOwner) {
          window.__voltDuelTabOwner = null;
        }
      });

      window.addEventListener('pagehide', () => {
        try { ch.postMessage({ type: 'release_owner', tabId: myId });
          ch.close(); } catch (_) {}
      }, { once: true });

      window.voltClaimDuelOwner = () => {
        try { ch.postMessage({ type: 'claim_owner', tabId: myId }); } catch (_) {}
        window.__voltDuelTabOwner = myId;
      };
      window.voltIsDuelOwnerForeign = () => {
        const owner = window.__voltDuelTabOwner;
        return !!(owner && owner !== myId);
      };
    }
  } catch (_) {}
})();

// VOLT auth-link bridge: if Supabase returns tokens in the page URL hash/query,
// forward them to the MV3 background so the extension session is restored.
(function () {
  try {
    if (window.__voltAuthLinkBridgeV184) return;
    window.__voltAuthLinkBridgeV184 = true;
    try { Object.defineProperty(window, '__voltAuthLinkBridgeV184', { value: true, writable: false, configurable: false }); } catch (_) {}
    if (window.top !== window) return;
    const raw = String(window.location.href || '');
    if (!raw.includes('access_token=') && !raw.includes('code=')) return;
    // SEC: strip everything except auth-relevant fragments/query. Never forward full URL (may contain user PII).
    let safe = '';
    try {
      const u = new URL(raw);
      const keep = ['access_token', 'refresh_token', 'expires_in', 'token_type', 'type', 'code', 'state', 'provider_token', 'provider_refresh_token'];
      const out = new URLSearchParams();
      const sources = [];
      try { sources.push(new URLSearchParams(u.search)); } catch (_) {}
      try { sources.push(new URLSearchParams((u.hash || '').replace(/^#/, ''))); } catch (_) {}
      for (const sp of sources)
        for (const k of keep) { const v = sp.get(k); if (v) out.set(k, v); }
      const qs = out.toString();
      safe = qs ? `${u.origin}${u.pathname}#${qs}` : '';
    } catch (_) { safe = ''; }
    if (!safe) return;
    chrome.runtime.sendMessage({ action: 'captureSupabaseAuthLink', url: safe }, () => void chrome.runtime.lastError);
  } catch (_) {}
})();

// VOLT 1v1 live opponent panel + in-game lobby
(function () {
  if (window.__voltDuelGamePanelV24) return;
  window.__voltDuelGamePanelV24 = true;
  try { Object.defineProperty(window, '__voltDuelGamePanelV24', { value: true, writable: false, configurable: false }); } catch (_) {}
  if (window.top !== window) return;

  const ACTION_URLS = [
    'https://ss.randomkzn.com/*',
    'https://yell0wsuit.page/*',
    'http://localhost:8512/*',
    'http://localhost:3007/*'
  ];

  const state = {
    open: false,
    enabled: true,
    hydrated: false,
    loading: false,
    actionBusy: false,
    refreshQueued: false,
    refreshQueuedWithLobby: false,
    duels: [],
    lobby: [],
    randomQueue: null,
    tokens: null,
    myId: null,
    query: '',
    wager: '0',
    seriesWins: '1',
    error: '',
    lastRefresh: 0,
    refreshTimer: null,
    searchTimer: null,
    scheduledRefreshTimer: null,
    scheduledRefreshWithLobby: false,
    presenceTimer: null,
    activeTypingUntil: 0,
    inputShieldInstalled: false,
    timerRaf: 0,
    noStartClaiming: new Set(),
    botClaimInFlight: false,
    botClaimedQueueKey: '',
    queueCancelForRunInFlight: false,
    lastActiveDuelId: '',
    lastDuelContextKey: '',
    liveNodes: [],
    queueNodes: [],
    liveDataCache: new WeakMap(),
    refreshErrorCount: 0
  };

  function getVoltLocalRunState() {
    try {
      if (typeof window.__voltGetLocalRunState === 'function') {
        const snapshot = window.__voltGetLocalRunState();
        if (snapshot && typeof snapshot === 'object') return snapshot;
      }
    } catch (_) {}
    return {};
  }

  function duelContextKey(d) {
    if (!d || !d.id) return '';
    const round = Math.max(1, Math.floor(Number(d.current_round || 1) || 1));
    const started = d.started_at || d.accepted_at || d.bot_generated_at || d.created_at || '';
    return `${String(d.id)}:${round}:${String(started)}`;
  }

  function clearLocalDuelTerminal() {
    try { window.__voltLastLocalDuelTerminal = null; } catch (_) {}
  }

  function resetDuelDisplayRuntime(reason = 'context_changed') {
    clearLocalDuelTerminal();
    state.liveNodes = [];
    state.queueNodes = [];
    state.liveDataCache = new WeakMap();
    stopTimerRaf();
    try {
      window.dispatchEvent(new CustomEvent('volt:duel-display-reset', { detail: { reason } }));
    } catch (_) {}
  }

  function getVoltLocalDuelTerminal(d = null) {
    try {
      const snapshot = getVoltLocalRunState();
      const terminal = snapshot && snapshot.terminal ? snapshot.terminal : window.__voltLastLocalDuelTerminal;
      if (!terminal || Date.now() - Number(terminal.markedAt || 0) > 120000) return null;
      const expectedContext = duelContextKey(d);
      if (expectedContext && terminal.duelContextKey && terminal.duelContextKey !== expectedContext) return null;
      if (d?.id && terminal.duelMatchId && String(terminal.duelMatchId) !== String(d.id)) return null;
      return terminal;
    } catch (_) { return null; }
  }

  function duelPresenceIntervalMs() {
    try {
      return document.documentElement && document.documentElement.classList.contains('volt-performance-mode') ? 60000 : 45000;
    } catch (_) { return 60000; }
  }

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  } [ch]));

  function bg(action, payload = {}) {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ action, ...payload }, res => {
          if (chrome.runtime.lastError) {
            const msg = chrome.runtime.lastError?.message || '';
            resolve({ success: false, error: /context invalidated/i.test(msg) ? 'extension_context_invalidated' : msg });
          } else resolve(res || { success: false, error: 'empty_response' });
        });
      } catch (e) {
        const msg = e?.message || String(e);
        resolve({ success: false, error: /context invalidated/i.test(msg) ? 'extension_context_invalidated' : msg });
      }
    });
  }

  function storageGetSafe(keys, fallback = {}) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get(keys, res => {
          if (chrome.runtime?.lastError) { resolve(fallback); return; }
          resolve(res || fallback);
        });
      } catch (_) {
        resolve(fallback);
      }
    });
  }

  function fmtMs(ms, precise = false) {
    const totalMs = Math.max(0, Math.floor(Number(ms || 0)));
    const total = Math.floor(totalMs / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const cs = Math.floor((totalMs % 1000) / 10);
    const suffix = precise ? `.${String(cs).padStart(2, '0')}` : '';
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${suffix}`;
    if (m > 0) return `${m}:${String(s).padStart(2, '0')}${suffix}`;
    return `${s}${suffix}`;
  }

  function dateMs(value) {
    const n = new Date(value || 0).getTime();
    return n && !Number.isNaN(n) ? n : 0;
  }

  function isFresh(value, maxAge = 90000) {
    const n = dateMs(value);
    return !!n && Date.now() - n >= 0 && Date.now() - n <= maxAge;
  }

  function enrichLive(live) {
    if (!live || typeof live !== 'object') return live || null;
    const now = Date.now();
    const copy = { ...live };
    if (!copy._client_received_at) copy._client_received_at = now;
    if (copy._client_elapsed_at_receive == null) {
      let base = Math.max(0, Number(copy.elapsed_ms || 0));
      if (String(copy.state || '').toLowerCase() === 'running') {
        const updated = dateMs(copy.updated_at || copy.last_seen_at);
        if (updated) base = Math.max(base, base + Math.max(0, Math.min(30000, now - updated)));
        const start = dateMs(copy.run_started_at);
        if (start) base = Math.max(base, now - start);
      }
      copy._client_elapsed_at_receive = base;
    }
    return copy;
  }

  function enrichDuels(duels) {
    return (Array.isArray(duels) ? duels : []).map(d => {
      if (!d || typeof d !== 'object') return d;
      return {
        ...d,
        challenger_live: enrichLive(d.challenger_live),
        opponent_live: enrichLive(d.opponent_live)
      };
    });
  }

  function liveUpdatedMs(live) {
    return dateMs(live?.updated_at || live?.last_seen_at) || Number(live?._client_received_at || 0) || 0;
  }

  function chooseFreshLive(previous, incoming) {
    if (!previous) return incoming || null;
    if (!incoming) return previous;
    const prevState = String(previous.state || '').toLowerCase();
    const nextState = String(incoming.state || '').toLowerCase();
    if (['finished', 'failed', 'dead'].includes(nextState)) return incoming;
    if (['finished', 'failed', 'dead'].includes(prevState) && !['finished', 'failed', 'dead'].includes(nextState)) return previous;
    if (prevState === 'running' && (!nextState || nextState === 'idle') && Date.now() - liveUpdatedMs(previous) < 20000) return previous;
    if (liveUpdatedMs(previous) > liveUpdatedMs(incoming) + 750) return previous;
    return incoming;
  }

  function preserveKnownLive(nextDuels) {
    const previousById = new Map((Array.isArray(state.duels) ? state.duels : []).filter(Boolean).map(d => [d.id, d]));
    return (Array.isArray(nextDuels) ? nextDuels : []).map(d => {
      const prev = previousById.get(d?.id);
      if (!prev || !d) return d;
      return {
        ...d,
        challenger_live: enrichLive(chooseFreshLive(prev.challenger_live, d.challenger_live)),
        opponent_live: enrichLive(chooseFreshLive(prev.opponent_live, d.opponent_live))
      };
    });
  }

  function liveElapsedMs(live) {
    if (!live) return 0;
    const st = String(live.state || '').toLowerCase();
    const base = Math.max(0, Number(live._client_elapsed_at_receive ?? live.elapsed_ms ?? 0));
    const cap = Number(live._bot_target_elapsed_ms || live.bot_target_elapsed_ms || 0);
    const clampBot = (value) => (Number.isFinite(cap) && cap > 0 ? Math.min(cap, Math.max(0, value)) : Math.max(0, value));
    if (st === 'running') {
      const received = Number(live._client_received_at || 0);
      const byReceive = received ? base + Math.max(0, Date.now() - received) : base;
      const start = dateMs(live.run_started_at);
      const byStart = start ? Math.max(0, Date.now() - start) : 0;
      return clampBot(Math.max(base, byReceive, byStart));
    }
    return clampBot(base);
  }

  function timerText(live, score = 0, precise = false) {
    const st = String(live?.state || '').toLowerCase();
    const scoreMs = Number(score) > 0 ? Number(score) * 1000 : 0;
    if (st === 'running') return fmtMs(liveElapsedMs(live), true);
    if (scoreMs > 0) return fmtMs(scoreMs, precise);
    if (live) return fmtMs(liveElapsedMs(live), precise);
    return '—';
  }

  function liveLabel(live, score) {
    const st = String(live?.state || '').toLowerCase();
    if (st === 'running') return `En run · ${timerText(live, score, true)}`;
    if (st === 'dead' || st === 'failed') return `Mort · ${timerText(live, score, true)}`;
    if (Number(score) > 0) return `Score · ${timerText(live, score, true)}`;
    if (st === 'finished') return `Terminé · ${timerText(live, score, true)}`;
    return 'Pas encore lancé';
  }

  function liveClass(live, score) {
    const st = String(live?.state || '').toLowerCase();
    if (st === 'running') return 'is-running';
    if (st === 'dead' || st === 'failed') return 'is-dead';
    if (Number(score) > 0) return 'is-done';
    return '';
  }

  function statusTone(live, score, online = false) {
    const cls = liveClass(live, score);
    if (cls === 'is-running') return 'running';
    if (cls === 'is-dead') return 'danger';
    if (cls === 'is-done') return 'done';
    return online ? 'online' : 'idle';
  }

  function duelWager(d) {
    return Math.max(0, Number(d?.wager_tokens ?? d?.wager_credits ?? 0) || 0);
  }

  function cleanSeriesWins(value) {
    const wins = Math.floor(Number(value) || 1);
    return wins === 1 || wins === 2 || wins === 3 ? wins : 1;
  }

  function duelSeriesLabel(d) {
    return `BO${cleanSeriesWins(d?.series_wins_required ?? d?.seriesWins)}`;
  }

  function duelSeriesScoreLabel(d) {
    const ch = Math.max(0, Math.floor(Number(d?.challenger_round_wins || 0) || 0));
    const op = Math.max(0, Math.floor(Number(d?.opponent_round_wins || 0) || 0));
    return `${duelSeriesLabel(d)} · ${ch}-${op}`;
  }

  const DUEL_FAKE_OPPONENT_NAMES = [
    'Nexo', 'Kaori', 'Riven', 'Aksel', 'Milo', 'Sora', 'Kairo', 'Nyx',
    'Zayn', 'Eden', 'Luna', 'Orion', 'Rafa', 'Ilyas', 'Noa', 'Tao'
  ];

  function stableIndexFromText(value, max) {
    const text = String(value || 'volt');
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = ((hash * 31) + text.charCodeAt(i)) >>> 0;
    return max > 0 ? hash % max : 0;
  }

  function duelDisplayOpponentName(d, user) {
    const raw = String(user?.pseudo || '').trim();
    if (raw && !/bot|volt\s*bot/i.test(raw)) return raw;
    return DUEL_FAKE_OPPONENT_NAMES[stableIndexFromText(d?.id || d?.bot_generated_at || raw, DUEL_FAKE_OPPONENT_NAMES.length)];
  }

  function duelDisplayUser(d, side, user) {
    const u = { ...(user || {}) };
    if (side === 'opponent' && isBotDuel(d)) {
      u.pseudo = duelDisplayOpponentName(d, u);
      // Bot matches must look like normal opponents in the UI: no robot icon,
      // no bot grade, no special avatar. The first letter fallback then renders
      // exactly like a real player without a profile picture.
      u.profilePic = null;
      u.profile_pic = null;
      u.is_bot = false;
      u.grade = u.grade === 'bot' ? 'free' : u.grade;
    }
    return u;
  }

  function resetLocalRunForDuelStart(matchId) {
    try { if (!matchId) return; } catch (_) { return; }
    try {
      if (typeof R !== 'undefined' && R) { cancelAnimationFrame(R);
        R = null; }
    } catch (_) {}
    try {
      if (typeof window._voltHeartbeat !== 'undefined' && window._voltHeartbeat) { clearInterval(window._voltHeartbeat);
        window._voltHeartbeat = null; }
    } catch (_) {}
    try {
      if (typeof window._voltNoCoinHeartbeat !== 'undefined' && window._voltNoCoinHeartbeat) { clearInterval(window._voltNoCoinHeartbeat);
        window._voltNoCoinHeartbeat = null; }
    } catch (_) {}
    try { if (typeof ne !== 'undefined' && ne) { clearInterval(ne);
        ne = null; } } catch (_) {}
    try { if (typeof L !== 'undefined') L = 'stopped'; } catch (_) {}
    try { if (typeof F !== 'undefined') F = 0; } catch (_) {}
    try { if (typeof N1 !== 'undefined') N1 = 0; } catch (_) {}
    try { if (typeof voltLocalRunEpochMs !== 'undefined') voltLocalRunEpochMs = 0; } catch (_) {}
    try { if (typeof oe !== 'undefined') oe = 0; } catch (_) {}
    try { if (typeof _ !== 'undefined') _ = false; } catch (_) {}
    try { if (typeof E1 !== 'undefined') E1 = 0; } catch (_) {}
    try { if (typeof voltRunSubmissionLocked !== 'undefined') voltRunSubmissionLocked = true; } catch (_) {}
    try { if (S) { S.className = 'timer-stopped'; if (typeof B === 'function') B(); } } catch (_) {}
    try { if (typeof s1 === 'function') s1('0', '.00'); } catch (_) {}
    try { bg('resetRunSession', { reason: 'duel_started_reset', matchId }).catch(() => {}); } catch (_) {}
    try {
      const now = Date.now();
      state.error = 'Nouvel 1v1 actif : run remise à zéro. Lance une nouvelle run pour ce duel.';
      setTimeout(() => {
        if (state.error === 'Nouvel 1v1 actif : run remise à zéro. Lance une nouvelle run pour ce duel.') {
          state.error = '';
          render();
        }
      }, 4500);
    } catch (_) {}
  }

  function stopLocalRunForDuelAbandon(matchId) {
    try { if (!matchId) return; } catch (_) { return; }
    try { if (typeof R !== 'undefined' && R) { cancelAnimationFrame(R);
        R = null; } } catch (_) {}
    try { if (typeof window._voltHeartbeat !== 'undefined' && window._voltHeartbeat) { clearInterval(window._voltHeartbeat);
        window._voltHeartbeat = null; } } catch (_) {}
    try { if (typeof window._voltNoCoinHeartbeat !== 'undefined' && window._voltNoCoinHeartbeat) { clearInterval(window._voltNoCoinHeartbeat);
        window._voltNoCoinHeartbeat = null; } } catch (_) {}
    try { if (typeof ne !== 'undefined' && ne) { clearInterval(ne);
        ne = null; } } catch (_) {}
    try { if (typeof L !== 'undefined') L = 'stopped'; } catch (_) {}
    try { if (typeof F !== 'undefined') F = 0; } catch (_) {}
    try { if (typeof N1 !== 'undefined') N1 = 0; } catch (_) {}
    try { if (typeof voltLocalRunEpochMs !== 'undefined') voltLocalRunEpochMs = 0; } catch (_) {}
    try { if (typeof oe !== 'undefined') oe = 0; } catch (_) {}
    try { if (typeof _ !== 'undefined') _ = false; } catch (_) {}
    try { if (typeof E1 !== 'undefined') E1 = 0; } catch (_) {}
    try { if (typeof voltRunSubmissionLocked !== 'undefined') voltRunSubmissionLocked = true; } catch (_) {}
    try { if (S) { S.className = 'timer-stopped'; if (typeof B === 'function') B(); } } catch (_) {}
    try { if (typeof s1 === 'function') s1('0', '.00'); } catch (_) {}
    try { bg('resetRunSession', { reason: 'duel_abandoned', matchId }).catch(() => {}); } catch (_) {}
  }

  function resetRunIfActiveDuelChanged(duels) {
    const active = (Array.isArray(duels) ? duels : []).find(d => d?.status === 'active');
    const activeId = active?.id ? String(active.id) : '';
    const activeContext = active ? duelContextKey(active) : '';
    try {
      if (activeId) {
        const prevVisibleId = String(window.__voltDuelActiveVisibleId || '');
        const prevContext = String(window.__voltDuelActiveContextKey || '');
        if (prevVisibleId !== activeId || prevContext !== activeContext) {
          window.__voltDuelActiveVisibleId = activeId;
          window.__voltDuelActiveContextKey = activeContext;
          window.__voltDuelActiveVisibleSinceMs = Date.now();
        }
      }
    } catch (_) {}
    if (activeContext && state.lastDuelContextKey && state.lastDuelContextKey !== activeContext) {
      resetDuelDisplayRuntime('active_duel_context_changed');
    }
    if (activeId && localRunStartedBeforeDuel(active)) {
      state.lastActiveDuelId = activeId;
      state.lastDuelContextKey = activeContext;
      try { chrome.storage.local.set({ voltDuelLastActiveId: activeId, voltDuelLastContextKey: activeContext }); } catch (_) {}
      resetLocalRunForDuelStart(activeId);
      return;
    }
    if (!activeId) {
      try { window.__voltDuelActiveVisibleId = '';
        window.__voltDuelActiveContextKey = '';
        window.__voltDuelActiveVisibleSinceMs = 0; } catch (_) {}
      if (state.lastActiveDuelId || state.lastDuelContextKey) {
        resetDuelDisplayRuntime('no_active_duel');
        state.lastActiveDuelId = '';
        state.lastDuelContextKey = '';
        try { chrome.storage.local.remove(['voltDuelLastActiveId', 'voltDuelLastContextKey']); } catch (_) {}
      }
      return;
    }
    if (!state.lastActiveDuelId) {
      state.lastActiveDuelId = activeId;
      state.lastDuelContextKey = activeContext;
      try { chrome.storage.local.set({ voltDuelLastActiveId: activeId, voltDuelLastContextKey: activeContext }); } catch (_) {}
      let localRunActive = false;
      try { localRunActive = (typeof L !== 'undefined' && L === 'running') || (typeof _ !== 'undefined' && _ === true); } catch (_) {}
      if (localRunActive && localRunStartedBeforeDuel(active)) resetLocalRunForDuelStart(activeId);
      return;
    }
    if (state.lastActiveDuelId !== activeId || state.lastDuelContextKey !== activeContext) {
      state.lastActiveDuelId = activeId;
      state.lastDuelContextKey = activeContext;
      try { chrome.storage.local.set({ voltDuelLastActiveId: activeId, voltDuelLastContextKey: activeContext }); } catch (_) {}
      if (localRunStartedBeforeDuel(active)) resetLocalRunForDuelStart(activeId);
    }
  }

  function queueKey(queue) {
    if (!queue) return '';
    return `${queue.created_at || ''}:${Number(queue.wager_tokens ?? queue.wager_credits ?? 0) || 0}:bo${cleanSeriesWins(queue.series_wins_required ?? queue.seriesWins)}`;
  }

  function queueDeadlineMs(queue) {
    const created = dateMs(queue?.created_at || queue?.createdAt);
    if (!created) return 0;
    return created + 60000;
  }

  function queueSecondsRemaining(queue) {
    if (!queue) return 0;
    const deadline = queueDeadlineMs(queue);
    if (deadline) return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    const serverRemaining = Number(queue.bot_seconds_remaining);
    if (Number.isFinite(serverRemaining) && serverRemaining >= 0 && serverRemaining <= 60) return Math.ceil(serverRemaining);
    return 60;
  }

  function queueCountdownText(queue) {
    const wager = Number(queue?.wager_tokens ?? queue?.wager_credits ?? 0) || 0;
    const series = duelSeriesLabel(queue);
    const remaining = queueSecondsRemaining(queue);
    if (state.botClaimInFlight) return `Préparation adversaire · ${series} · ${wager} tokens`;
    if (remaining <= 0) return `Adversaire prêt · ${series} · ${wager} tokens`;
    return `Adversaire garanti dans ${remaining}s · ${series} · ${wager} tokens`;
  }

  function isBotDuel(d) {
    return !!(d?.is_bot_match || d?.opponent?.is_bot || d?.challenger?.is_bot || d?.bot_user_id);
  }

  async function cancelRandomQueueBecauseRunStarted(detail = {}) {
    const queue = state.randomQueue;
    if (!queue || state.queueCancelForRunInFlight) return false;
    state.queueCancelForRunInFlight = true;
    state.error = 'Recherche random annulée : une run a commencé. Relance Random après avoir reset/terminé la run.';
    state.randomQueue = null;
    state.botClaimedQueueKey = '';
    render();
    try {
      await bg('leaveRandomDuelQueue', {
        reason: 'local_run_started',
        source: detail?.source || 'local_run',
        clientStartedAtMs: Number(detail?.startedAtMs || 0) || 0,
        knownQueueActive: true,
        queueKey: queueKey(queue)
      });
      await refresh(true);
      return true;
    } catch (_) {
      return false;
    } finally {
      state.queueCancelForRunInFlight = false;
      render();
    }
  }

  async function claimBotIfDue(source = 'timeout') {
    if (state.randomQueue && localRunIsActuallyRunning()) {
      await cancelRandomQueueBecauseRunStarted({ source });
      return false;
    }
    const queue = state.randomQueue;
    if (!queue || state.botClaimInFlight) return false;
    if (queueSecondsRemaining(queue) > 0) return false;
    const key = queueKey(queue);
    if (state.botClaimedQueueKey === key) return false;
    state.botClaimInFlight = true;
    state.botClaimedQueueKey = key;
    try {
      const res = await bg('claimRandomDuelBot', { source, wagerTokens: queue?.wager_tokens ?? queue?.wager_credits ?? 0, seriesWins: cleanSeriesWins(queue?.series_wins_required ?? queue?.seriesWins) });
      if (!res?.success) {
        state.error = cleanError(res?.error || res?.reason || 'bot_match_failed');
        state.botClaimedQueueKey = '';
      } else if (res.status === 'queued' || res.reason === 'too_early') {
        state.randomQueue = res.random_queue || state.randomQueue;
        state.botClaimedQueueKey = '';
      }
      await refresh(true);
      return true;
    } finally {
      state.botClaimInFlight = false;
      render();
    }
  }

  function shortStatus(live, score, online = false) {
    const st = String(live?.state || '').toLowerCase();
    if (st === 'running') return 'En run';
    if (st === 'dead' || st === 'failed') return 'Mort';
    if (Number(score) > 0) return 'Score reçu';
    if (st === 'finished') return 'Terminé';
    return online ? 'En ligne' : 'En attente';
  }

  function currentDuel() {
    const list = Array.isArray(state.duels) ? state.duels : [];
    return list.find(d => d?.status === 'active') || list.find(d => d?.status === 'pending') || null;
  }

  function sideFor(d, uid) {
    if (!d || !uid) return null;
    if (sameDuelId(d.challenger_uid, uid)) return 'challenger';
    if (sameDuelId(d.opponent_uid, uid)) return 'opponent';
    return null;
  }

  function sameDuelId(a, b) {
    return !!(a && b && String(a) === String(b));
  }

  function isPendingForMe(d) {
    return !!(d && d.status === 'pending' && sameDuelId(d.opponent_uid, state.myId));
  }

  function canCancelPendingDuel(d) {
    return !!(d && d.status === 'pending' && sameDuelId(d.challenger_uid, state.myId));
  }

  function canAbandonActiveDuel(d) {
    return !!(d && d.status === 'active' && (sameDuelId(d.challenger_uid, state.myId) || sameDuelId(d.opponent_uid, state.myId)));
  }

  function botLiveForDuel(d, scoreSeconds = 0) {
    const targetMs = Math.max(1000, Math.round(Number(scoreSeconds || d?.bot_score || 0) * 1000));
    if (!Number.isFinite(targetMs) || targetMs <= 0) return null;
    const startMs = dateMs(d?.bot_started_at || d?.started_at || d?.accepted_at || d?.bot_generated_at || d?.created_at) || Date.now();
    const now = Date.now();
    const elapsed = Math.max(0, Math.min(targetMs, now - startMs));
    const done = elapsed >= targetMs;
    const startIso = new Date(startMs).toISOString();
    const nowIso = new Date(now).toISOString();
    return enrichLive({
      state: done ? 'finished' : 'running',
      elapsed_ms: elapsed,
      run_started_at: startIso,
      last_seen_at: nowIso,
      updated_at: nowIso,
      _bot_simulated: true,
      _bot_target_elapsed_ms: targetMs,
      _client_received_at: now,
      _client_elapsed_at_receive: elapsed
    });
  }

  function dataForSide(d, side) {
    if (!d || !side) return { user: {}, live: null, score: 0, online: false, lastSeen: null, isBot: false };
    const isCh = side === 'challenger';
    const rawUser = isCh ? d.challenger : d.opponent;
    const user = duelDisplayUser(d, side, rawUser);
    const botId = d.bot_user_id || null;
    const sideUserId = isCh ? d.challenger_uid : d.opponent_uid;
    const isBot = !!((rawUser && rawUser.is_bot) || (!isCh && d.is_bot_match && (!botId || botId === sideUserId)));
    let live = isCh ? d.challenger_live : d.opponent_live;
    let score = Number(isCh ? d.challenger_score : d.opponent_score) || 0;

    // Bot opponents have a fixed final score server-side, but the UI must not
    // reveal it instantly. Locally simulate a normal live timer from duel start
    // until that final score is reached. The stored bot score remains unchanged
    // for server-side result resolution.
    if (isBot && Number(d.bot_score) > 0) {
      const botLive = botLiveForDuel(d, Number(d.bot_score));
      if (botLive) {
        live = botLive;
        score = String(botLive.state || '').toLowerCase() === 'finished' ? Number(d.bot_score) : 0;
      }
    }

    const online = isBot || !!(isCh ? d.challenger_online : d.opponent_online) || isFresh(live?.last_seen_at, 90000);
    const lastSeen = isCh ? d.challenger_last_seen_at : d.opponent_last_seen_at;
    return { user: user || {}, live, score, online, lastSeen, isBot };
  }

  function localNoCoinAudioRunActive() {
    try {
      const snapshot = getVoltLocalRunState();
      return !!(snapshot.audioActive && Number(snapshot.audioStartedAtMs || 0) > 0);
    } catch (_) { return false; }
  }

  function localManualTimerRunActive() {
    try {
      const snapshot = getVoltLocalRunState();
      return !!snapshot.manualActive;
    } catch (_) { return false; }
  }

  function localRunIsActuallyRunning() {
    // Do not read the visual timer DOM here. A player may have the timer overlay
    // hidden or Smart Timer disabled. The 1v1 panel follows the shared local
    // run snapshot exported by the core script.
    try {
      const snapshot = getVoltLocalRunState();
      if (Object.prototype.hasOwnProperty.call(snapshot, 'active')) return !!snapshot.active;
    } catch (_) {}
    return localNoCoinAudioRunActive() || localManualTimerRunActive();
  }

  function localRunElapsedMs() {
    if (!localRunIsActuallyRunning()) return 0;
    let elapsed = 0;
    try {
      const snapshot = getVoltLocalRunState();
      if (Number(snapshot.elapsedMs || 0) > 0) elapsed = Math.max(elapsed, Number(snapshot.elapsedMs));
      if (snapshot.audioActive && Number(snapshot.audioStartedAtMs || 0) > 0) {
        elapsed = Math.max(elapsed, Date.now() - Number(snapshot.audioStartedAtMs));
      }
      if (snapshot.manualActive && Number(snapshot.manualElapsedMs || 0) > 0) {
        elapsed = Math.max(elapsed, Number(snapshot.manualElapsedMs));
      }
    } catch (_) {}
    return Number.isFinite(elapsed) && elapsed > 0 ? Math.min(43200000, Math.round(elapsed)) : 0;
  }

  function localRunEpochMs() {
    try {
      const snapshot = getVoltLocalRunState();
      if (Number(snapshot.startedAtMs || 0) > 0) return Number(snapshot.startedAtMs);
      if (snapshot.audioActive && Number(snapshot.audioStartedAtMs || 0) > 0) return Number(snapshot.audioStartedAtMs);
      if (snapshot.manualActive && Number(snapshot.manualStartedAtMs || 0) > 0) return Number(snapshot.manualStartedAtMs);
      const elapsed = localRunElapsedMs();
      return elapsed > 0 ? Date.now() - elapsed : 0;
    } catch (_) { return 0; }
  }

  function localRunStartedBeforeDuel(d) {
    try {
      if (!d || d.status !== 'active' || !localRunIsActuallyRunning()) return false;
      const duelStarted = dateMs(d.started_at || d.accepted_at || d.bot_generated_at || d.created_at);
      const localStarted = localRunEpochMs();
      // Strict guard: if the local run started before the duel was active,
      // reset it locally so it cannot be counted as a 1v1 run later.
      const raceGraceMs = 3500;
      // Stage 10: if the player starts exactly when the UI shows 'accepted',
      // Supabase may stamp started_at/accepted_at a few seconds after the local
      // audio/timer start. Keep only a short network-race margin; older runs are
      // reset so they cannot become 1v1 scores after matchmaking completes.
      return !!(duelStarted && localStarted && localStarted < duelStarted - raceGraceMs);
    } catch (_) { return false; }
  }

  function guardDuelActionDuringLocalRun(actionLabel = '1v1') {
    try {
      if (!localRunIsActuallyRunning()) return false;
      const elapsed = localRunElapsedMs();
      const suffix = elapsed > 1000 ? ` Run locale en cours (${fmtMs(elapsed, true)}).` : ' Run locale en cours.';
      state.error = `${actionLabel} bloqué pendant une run.${suffix} Termine ou reset la run, puis lance le 1v1 sur une nouvelle run.`;
      render();
      return true;
    } catch (_) {
      return false;
    }
  }

  function withLocalPendingRun(d, side, data) {
    const currentState = String(data?.live?.state || '').toLowerCase();
    if (!d || d.status !== 'active' || !side || Number(data?.score || 0) > 0) return data;
    const isMine = side === sideFor(d, state.myId);
    const localTimerRunning = isMine && localRunIsActuallyRunning();
    const localElapsed = localTimerRunning ? localRunElapsedMs() : 0;
    const localTerminal = isMine ? getVoltLocalDuelTerminal(d) : null;

    // Stage 9: if death/coin/fatal was detected locally, never let an old
    // server "running" live row reanimate the 1v1 UI while the final RPC/result
    // is still being recorded. This is display-safe and does not invent a score.
    if (localTerminal && !localTimerRunning && !Number(data?.score || 0) && (currentState === 'running' || !currentState || currentState === 'idle')) {
      const nowIso = new Date().toISOString();
      return {
        ...data,
        live: enrichLive({
          ...(data.live || {}),
          state: localTerminal.state || 'dead',
          elapsed_ms: Math.max(0, Number(localTerminal.elapsedMs || 0)),
          run_started_at: localTerminal.startedAtMs ? new Date(localTerminal.startedAtMs).toISOString() : data.live?.run_started_at,
          updated_at: nowIso,
          last_seen_at: nowIso,
          _client_received_at: Date.now(),
          _client_elapsed_at_receive: Math.max(0, Number(localTerminal.elapsedMs || 0)),
          _local_terminal_pending: true
        }),
        online: true
      };
    }

    // The local player must see the real content timer, not a stale Supabase live
    // row that can be reset to 0.xx by a rejected pre-duel start fallback.
    const serverAlreadyTerminal = ['finished', 'failed', 'dead'].includes(currentState) || Number(data?.score || 0) > 0;

    if (localTimerRunning && localElapsed > 0 && !serverAlreadyTerminal && !localRunStartedBeforeDuel(d)) {
      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const startMs = localRunEpochMs() || (now - Math.max(0, localElapsed));
      const startIso = new Date(startMs).toISOString();
      return {
        ...data,
        live: enrichLive({
          ...(data.live || {}),
          state: 'running',
          elapsed_ms: localElapsed,
          run_started_at: startIso,
          updated_at: nowIso,
          last_seen_at: nowIso,
          _client_received_at: now,
          _client_elapsed_at_receive: localElapsed,
          _local_pending: true
        }),
        online: true
      };
    }

    if (isMine && ['finished', 'failed', 'dead'].includes(currentState) && Number(data?.live?.elapsed_ms || 0) < 1000 && localElapsed > 1000) {
      const nowIso = new Date().toISOString();
      return {
        ...data,
        live: enrichLive({
          ...(data.live || {}),
          state: currentState,
          elapsed_ms: localElapsed,
          updated_at: data.live?.updated_at || nowIso,
          last_seen_at: data.live?.last_seen_at || nowIso,
          _client_received_at: Date.now(),
          _client_elapsed_at_receive: localElapsed,
          _local_terminal_fallback: true
        }),
        online: true
      };
    }
    if (['running', 'finished', 'failed', 'dead'].includes(currentState)) return data;
    return data;
  }

  function activeMeta(d) {
    const mySide = sideFor(d, state.myId);
    const oppSide = mySide === 'challenger' ? 'opponent' : mySide === 'opponent' ? 'challenger' : null;
    return {
      mySide,
      oppSide,
      me: withLocalPendingRun(d, mySide, dataForSide(d, mySide)),
      opp: dataForSide(d, oppSide)
    };
  }

  function liveHasStarted(live) {
    const st = String(live?.state || '').toLowerCase();
    return !!(live?.run_started_at || ['running', 'finished', 'failed', 'dead'].includes(st));
  }

  function canClaimNoStartWin(d) {
    if (!d || d.status !== 'active' || !d.id || !state.myId) return false;
    const startedAt = dateMs(d.started_at || d.accepted_at || d.created_at);
    if (!startedAt || Date.now() - startedAt < 120000) return false;
    const meta = activeMeta(d);
    if (!meta.mySide || !meta.oppSide) return false;
    const iStarted = Number(meta.me.score || 0) > 0 || liveHasStarted(meta.me.live);
    const oppStarted = Number(meta.opp.score || 0) > 0 || liveHasStarted(meta.opp.live);
    return iStarted && !oppStarted;
  }

  async function claimNoStartWinsIfNeeded() {
    const list = Array.isArray(state.duels) ? state.duels : [];
    for (const d of list) {
      if (!canClaimNoStartWin(d) || state.noStartClaiming.has(d.id)) continue;
      state.noStartClaiming.add(d.id);
      const res = await bg('claimDuelNoStartWin', { matchId: d.id });
      if (res?.success && res?.claimed) {
        state.error = 'Victoire automatique : adversaire inactif pendant 2 minutes.';
        scheduleRefresh(true, 300);
      }
      setTimeout(() => state.noStartClaiming.delete(d.id), 15000);
    }
  }

  function ensureRoot() {
    let root = document.getElementById('volt-duel-game-root');
    if (root) return root;

    const style = document.createElement('style');
    style.id = 'volt-duel-game-style';
    style.textContent = `
      #volt-duel-game-root, #volt-duel-game-root * { box-sizing: border-box; }
      #volt-duel-game-root { position: fixed; right: 18px; top: 78px; z-index: 2147483639; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #f8fafc; pointer-events: none; letter-spacing:0; }
      .volt-duel-fab, .volt-duel-panel, .volt-duel-mini { pointer-events: auto; }
      #volt-duel-game-root input, #volt-duel-game-root select, #volt-duel-game-root button { pointer-events:auto; user-select:text; -webkit-user-select:text; }
      #volt-duel-game-root button { user-select:none; -webkit-user-select:none; }
      .volt-duel-fab { min-width: 92px; height: 38px; border: 1px solid rgba(94,234,212,.42); border-radius: 999px; background: rgba(9,13,18,.90); color: #f8fafc; box-shadow: 0 12px 28px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.08); backdrop-filter: blur(14px); display:flex; align-items:center; justify-content:center; gap:8px; font-size: 12px; font-weight: 900; cursor:pointer; margin-left:auto; transition: transform .14s ease, border-color .14s ease, background .14s ease; }
      .volt-duel-fab:hover { transform: translateY(-1px); border-color: rgba(94,234,212,.78); background: rgba(13,18,25,.96); }
      .volt-duel-dot { width:7px; height:7px; border-radius:50%; background: #737373; box-shadow: 0 0 0 transparent; flex:0 0 auto; }
      .volt-duel-dot.is-online, .volt-duel-dot.is-running { background:#2dd4bf; box-shadow:0 0 12px rgba(45,212,191,.75); }
      .volt-duel-dot.is-done { background:#22c55e; box-shadow:0 0 12px rgba(34,197,94,.62); }
      .volt-duel-dot.is-dead { background:#fb7185; box-shadow:0 0 12px rgba(251,113,133,.62); }
      .volt-duel-mini { width: 320px; margin-top: 10px; border: 1px solid rgba(255,255,255,.12); border-radius: 8px; background: rgba(9,13,18,.94); box-shadow: 0 18px 42px rgba(0,0,0,.42); backdrop-filter: blur(16px); overflow:hidden; cursor:pointer; }
      .volt-duel-mini-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.035); }
      .volt-duel-kicker { color:#5eead4; font-size:10px; font-weight:900; letter-spacing:.5px; text-transform:uppercase; }
      .volt-duel-mini-body { padding: 11px 12px; display:grid; gap:8px; }
      .volt-duel-mini-row, .volt-duel-inline { display:flex; align-items:center; justify-content:space-between; gap:10px; min-width:0; }
      .volt-duel-identity { display:flex; align-items:center; gap:9px; min-width:0; }
      .volt-duel-copy { min-width:0; }
      .volt-duel-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; font-weight:850; color:#ffffff; }
      .volt-duel-sub { font-size:10.5px; color:rgba(226,232,240,.66); font-weight:700; line-height:1.35; }
      .volt-duel-time { font-variant-numeric: tabular-nums; font-size: 18px; font-weight: 950; color:#67e8f9; white-space:nowrap; }
      .volt-duel-panel { width: 420px; max-height: min(720px, calc(100vh - 106px)); margin-top: 10px; border:1px solid rgba(255,255,255,.13); border-radius: 8px; background: rgba(8,11,16,.97); box-shadow: 0 22px 70px rgba(0,0,0,.55); backdrop-filter: blur(18px); overflow:hidden; display:none; }
      .volt-duel-panel.is-open { display:flex; flex-direction:column; }
      .volt-duel-panel-head { padding:14px; display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.035); }
      .volt-duel-title { font-size: 15px; font-weight:950; letter-spacing:0; }
      .volt-duel-head-actions { display:flex; align-items:center; gap:6px; }
      .volt-duel-icon-btn { width:32px; height:32px; border-radius:8px; border:1px solid rgba(255,255,255,.11); background:rgba(255,255,255,.055); color:#f8fafc; cursor:pointer; font-weight:900; font-size:15px; }
      .volt-duel-icon-btn:hover { border-color:rgba(45,212,191,.50); background:rgba(45,212,191,.10); }
      .volt-duel-icon-btn.is-small-abandon { width:auto; min-width:76px; padding:0 9px; font-size:11px; color:#fecaca; background:rgba(127,29,29,.16); border-color:rgba(248,113,113,.28); }
      .volt-duel-icon-btn.is-head-accept, .volt-duel-icon-btn.is-head-decline { width:auto; min-width:64px; padding:0 9px; font-size:11px; }
      .volt-duel-icon-btn.is-head-accept { background:rgba(45,212,191,.14); border-color:rgba(45,212,191,.34); }
      .volt-duel-icon-btn.is-head-decline { color:#ffe4e6; background:rgba(251,113,133,.12); border-color:rgba(251,113,133,.30); }
      .volt-duel-panel-body { padding: 12px; overflow:auto; display:grid; gap:10px; }
      .volt-duel-card { border:1px solid rgba(255,255,255,.10); border-radius:8px; background: rgba(255,255,255,.035); overflow:hidden; }
      .volt-duel-card-pad { padding:12px; }
      .volt-duel-section-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px; }
      .volt-duel-chip { display:inline-flex; align-items:center; gap:6px; border-radius:999px; padding:5px 8px; background:rgba(255,255,255,.055); border:1px solid rgba(255,255,255,.10); font-size:10px; font-weight:900; color:rgba(226,232,240,.78); text-transform:uppercase; letter-spacing:.35px; white-space:nowrap; }
      .volt-duel-chip.is-active { color:#99f6e4; background:rgba(45,212,191,.13); border-color:rgba(45,212,191,.36); }
      .volt-duel-chip.is-danger { color:#ffe4e6; background:rgba(251,113,133,.12); border-color:rgba(251,113,133,.32); }
      .volt-duel-chip.is-done { color:#dcfce7; background:rgba(34,197,94,.12); border-color:rgba(34,197,94,.30); }
      .volt-duel-player { display:grid; grid-template-columns: 34px minmax(0,1fr) auto; align-items:center; gap:10px; padding:10px; border:1px solid rgba(255,255,255,.08); border-radius:8px; background: rgba(0,0,0,.20); }
      .volt-duel-player + .volt-duel-player { margin-top:8px; }
      .volt-duel-avatar { width:34px; height:34px; border-radius:8px; overflow:hidden; background: linear-gradient(145deg, rgba(45,212,191,.20), rgba(103,232,249,.10)), rgba(255,255,255,.05); color:#99f6e4; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:950; border:1px solid rgba(45,212,191,.26); box-shadow: inset 0 1px 0 rgba(255,255,255,.07), 0 1px 0 rgba(0,0,0,.18); }
      .volt-duel-avatar img { width:100%; height:100%; object-fit:cover; display:block; border-radius:inherit; }
      .volt-duel-player-time { text-align:right; font-variant-numeric: tabular-nums; font-size:14px; font-weight:950; color:#f4f1ec; }
      .volt-duel-player.is-running .volt-duel-player-time { color:#67e8f9; }
      .volt-duel-player.is-dead .volt-duel-player-time { color:#fb7185; }
      .volt-duel-player.is-done .volt-duel-player-time { color:#86efac; }
      .volt-duel-scoreboard { display:grid; gap:8px; }
      .volt-duel-live-clock { margin:0 0 10px; padding:12px; border:1px solid rgba(45,212,191,.26); border-radius:8px; background: linear-gradient(135deg, rgba(45,212,191,.13), rgba(255,255,255,.035)); display:flex; align-items:center; justify-content:space-between; gap:12px; }
      .volt-duel-live-copy { min-width:0; }
      .volt-duel-live-label { color:rgba(226,232,240,.68); font-size:10px; font-weight:900; letter-spacing:.5px; text-transform:uppercase; }
      .volt-duel-live-name { margin-top:2px; color:#ffffff; font-size:12px; font-weight:900; max-width:190px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .volt-duel-live-time { font-variant-numeric: tabular-nums; font-size:30px; line-height:1; font-weight:950; color:#67e8f9; text-shadow:0 0 18px rgba(103,232,249,.18); }
      .volt-duel-live-time.is-idle { color:rgba(226,232,240,.58); text-shadow:none; }
      .volt-duel-muted { color:rgba(226,232,240,.58); font-size:11px; font-weight:700; line-height:1.35; }
      .volt-duel-meta-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:7px; margin:10px 0; }
      .volt-duel-meta { min-height:48px; border:1px solid rgba(255,255,255,.08); border-radius:8px; background:rgba(0,0,0,.18); padding:8px; }
      .volt-duel-meta-label { color:rgba(226,232,240,.52); font-size:9.5px; font-weight:900; text-transform:uppercase; letter-spacing:.35px; }
      .volt-duel-meta-value { margin-top:3px; color:#f8fafc; font-size:12px; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .volt-duel-form { display:grid; grid-template-columns: minmax(0,1fr) 86px 72px; gap:8px; }
      .volt-duel-input { width:100%; min-width:0; border:1px solid rgba(255,255,255,.11); background: rgba(0,0,0,.24); color:#f8fafc; border-radius:8px; padding:10px 11px; outline:none; font-size:12px; font-weight:800; }
      .volt-duel-input:focus { border-color:rgba(45,212,191,.58); box-shadow:0 0 0 2px rgba(45,212,191,.12); }
      .volt-duel-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
      .volt-duel-pending-actions { margin:10px 0; padding:10px; border:1px solid rgba(148,163,184,.22); border-radius:8px; background:rgba(255,255,255,.045); display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap:8px; }
      .volt-duel-btn { border:1px solid rgba(255,255,255,.11); background:rgba(255,255,255,.055); color:#f8fafc; border-radius:8px; padding:8px 10px; font-size:11px; font-weight:900; cursor:pointer; transition: transform .12s ease, border-color .12s ease, background .12s ease; }
      .volt-duel-btn:hover { transform: translateY(-1px); border-color:rgba(45,212,191,.48); background:rgba(45,212,191,.08); }
      .volt-duel-btn.is-primary { background:rgba(45,212,191,.16); color:#ccfbf1; border-color:rgba(45,212,191,.38); }
      .volt-duel-btn.is-danger { background:rgba(251,113,133,.13); color:#ffe4e6; border-color:rgba(251,113,133,.34); }
      .volt-duel-btn.is-abandon { background:rgba(127,29,29,.25); color:#fee2e2; border-color:rgba(248,113,113,.40); margin-left:auto; font-weight:900; }
      .volt-duel-btn.is-abandon:hover { background:rgba(127,29,29,.35); border-color:rgba(248,113,113,.55); }
      .volt-duel-actions.is-split { align-items:center; }
      .volt-duel-pending-actions .volt-duel-btn { width:100%; min-height:36px; }
      .volt-duel-btn[disabled] { opacity:.45; cursor:not-allowed; }
      .volt-duel-lobby { display:grid; gap:7px; max-height:240px; overflow:auto; padding:0 12px 12px; }
      .volt-duel-lobby-row { display:grid; grid-template-columns: 30px minmax(0,1fr) auto; align-items:center; gap:9px; padding:8px; border-radius:8px; background:rgba(0,0,0,.18); border:1px solid rgba(255,255,255,.08); }
      .volt-duel-lobby-row.is-busy { opacity:.72; }
      .volt-duel-small-avatar { width:30px; height:30px; border-radius:8px; overflow:hidden; background: linear-gradient(145deg, rgba(45,212,191,.16), rgba(103,232,249,.08)), rgba(255,255,255,.05); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:950; color:#99f6e4; border:1px solid rgba(45,212,191,.18); box-shadow: inset 0 1px 0 rgba(255,255,255,.06); }
      .volt-duel-small-avatar img { width:100%; height:100%; object-fit:cover; border-radius:inherit; }
      .volt-duel-empty { padding:13px; text-align:center; color:rgba(226,232,240,.60); font-size:12px; font-weight:800; }
      .volt-duel-error { color:#ffe4e6; background:rgba(251,113,133,.10); border:1px solid rgba(251,113,133,.24); border-radius:8px; padding:8px 9px; font-size:11px; font-weight:800; }
      .volt-duel-note { margin-top:8px; }

      /* Minimal 1v1 visual pass: muted, readable, no neon glow. */
      #volt-duel-game-root .volt-duel-fab,
      #volt-duel-game-root .volt-duel-panel,
      #volt-duel-game-root .volt-duel-mini { border-color: rgba(148,163,184,.22); background: rgba(10,12,16,.96); box-shadow: 0 18px 42px rgba(0,0,0,.42); }
      #volt-duel-game-root .volt-duel-fab:hover,
      #volt-duel-game-root .volt-duel-icon-btn:hover,
      #volt-duel-game-root .volt-duel-btn:hover { border-color: rgba(203,213,225,.34); background: rgba(255,255,255,.07); }
      #volt-duel-game-root .volt-duel-btn.is-abandon { color:#fee2e2; background:rgba(127,29,29,.24); border-color:rgba(248,113,113,.35); font-weight:900; }
      #volt-duel-game-root .volt-duel-btn.is-abandon:hover { background:rgba(127,29,29,.32); border-color:rgba(248,113,113,.50); }
      #volt-duel-game-root .volt-duel-kicker,
      #volt-duel-game-root .volt-duel-chip.is-active,
      #volt-duel-game-root .volt-duel-btn.is-primary { color: #e5e7eb; background: rgba(148,163,184,.12); border-color: rgba(148,163,184,.26); }
      #volt-duel-game-root .volt-duel-time,
      #volt-duel-game-root .volt-duel-live-time,
      #volt-duel-game-root .volt-duel-player.is-running .volt-duel-player-time { color: #e5e7eb; text-shadow: none; }
      #volt-duel-game-root .volt-duel-dot.is-online,
      #volt-duel-game-root .volt-duel-dot.is-running,
      #volt-duel-game-root .volt-duel-dot.is-done { background: #94a3b8; box-shadow: none; }
      #volt-duel-game-root .volt-duel-avatar,
      #volt-duel-game-root .volt-duel-small-avatar { background: rgba(255,255,255,.06); color: #e5e7eb; border-color: rgba(148,163,184,.24); box-shadow: inset 0 1px 0 rgba(255,255,255,.05); }
      #volt-duel-game-root .volt-duel-live-clock { border-color: rgba(148,163,184,.20); background: rgba(255,255,255,.035); }

      /* V19.16 compact duel panel */
      #volt-duel-game-root { color:#eef1f4; }
      #volt-duel-game-root .volt-duel-fab {
        min-width: 76px;
        height: 34px;
        border-radius: 8px;
        border-color: rgba(232,238,247,.16);
        background: rgba(18,21,26,.96);
        box-shadow: 0 8px 22px rgba(0,0,0,.30);
        backdrop-filter: none;
        font-size: 12px;
        font-weight: 800;
      }
      #volt-duel-game-root .volt-duel-fab:hover {
        transform: none;
        border-color: rgba(232,238,247,.26);
        background: rgba(24,28,35,.98);
      }
      #volt-duel-game-root .volt-duel-panel,
      #volt-duel-game-root .volt-duel-mini {
        border-radius: 8px;
        border-color: rgba(232,238,247,.13);
        background: rgba(16,18,23,.98);
        box-shadow: 0 14px 34px rgba(0,0,0,.42);
        backdrop-filter: none;
      }
      #volt-duel-game-root .volt-duel-panel {
        width: 400px;
      }
      #volt-duel-game-root .volt-duel-panel-head,
      #volt-duel-game-root .volt-duel-mini-head {
        padding: 11px 12px;
        background: rgba(255,255,255,.035);
        border-bottom-color: rgba(232,238,247,.09);
      }
      #volt-duel-game-root .volt-duel-panel-body {
        padding: 10px;
        gap: 8px;
      }
      #volt-duel-game-root .volt-duel-title {
        font-size: 14px;
        font-weight: 850;
      }
      #volt-duel-game-root .volt-duel-muted,
      #volt-duel-game-root .volt-duel-sub {
        color: rgba(238,241,244,.62);
        font-weight: 650;
      }
      #volt-duel-game-root .volt-duel-kicker,
      #volt-duel-game-root .volt-duel-live-label,
      #volt-duel-game-root .volt-duel-meta-label {
        color: rgba(238,241,244,.58);
        text-transform: none;
        letter-spacing: 0;
      }
      #volt-duel-game-root .volt-duel-card {
        background: rgba(255,255,255,.035);
        border-color: rgba(232,238,247,.10);
      }
      #volt-duel-game-root .volt-duel-card-pad {
        padding: 10px;
      }
      #volt-duel-game-root .volt-duel-section-head {
        align-items: center;
        margin-bottom: 8px;
      }
      #volt-duel-game-root .volt-duel-chip {
        border-radius: 7px;
        padding: 4px 7px;
        background: rgba(255,255,255,.05);
        border-color: rgba(232,238,247,.10);
        color: rgba(238,241,244,.76);
        text-transform: none;
        letter-spacing: 0;
      }
      #volt-duel-game-root .volt-duel-chip.is-active,
      #volt-duel-game-root .volt-duel-btn.is-primary,
      #volt-duel-game-root .volt-duel-icon-btn.is-head-accept {
        background: rgba(106,166,147,.16);
        border-color: rgba(106,166,147,.34);
        color: #dff4ed;
      }
      #volt-duel-game-root .volt-duel-chip.is-danger,
      #volt-duel-game-root .volt-duel-btn.is-danger,
      #volt-duel-game-root .volt-duel-icon-btn.is-head-decline {
        background: rgba(219,105,112,.12);
        border-color: rgba(219,105,112,.30);
        color: #ffdfe2;
      }
      #volt-duel-game-root .volt-duel-live-clock {
        padding: 10px;
        border-color: rgba(232,238,247,.11);
        background: rgba(255,255,255,.035);
      }
      #volt-duel-game-root .volt-duel-live-time {
        color: #eef1f4;
        font-size: 27px;
        text-shadow: none;
      }
      #volt-duel-game-root .volt-duel-player,
      #volt-duel-game-root .volt-duel-meta,
      #volt-duel-game-root .volt-duel-lobby-row,
      #volt-duel-game-root .volt-duel-pending-actions {
        background: rgba(0,0,0,.18);
        border-color: rgba(232,238,247,.09);
        border-radius: 8px;
      }
      #volt-duel-game-root .volt-duel-meta-grid {
        grid-template-columns: repeat(4, minmax(0,1fr));
        gap: 6px;
        margin: 8px 0;
      }
      #volt-duel-game-root .volt-duel-meta {
        min-height: 44px;
        padding: 7px;
      }
      #volt-duel-game-root .volt-duel-player {
        padding: 8px;
      }
      #volt-duel-game-root .volt-duel-avatar,
      #volt-duel-game-root .volt-duel-small-avatar {
        background: rgba(255,255,255,.06);
        border-color: rgba(232,238,247,.13);
        color: #eef1f4;
      }
      #volt-duel-game-root .volt-duel-dot.is-online,
      #volt-duel-game-root .volt-duel-dot.is-running,
      #volt-duel-game-root .volt-duel-dot.is-done {
        background: #6aa693;
      }
      #volt-duel-game-root .volt-duel-dot.is-dead {
        background: #db6970;
      }
      #volt-duel-game-root .volt-duel-player-time,
      #volt-duel-game-root .volt-duel-time,
      #volt-duel-game-root .volt-duel-player.is-running .volt-duel-player-time {
        color: #eef1f4;
      }
      #volt-duel-game-root .volt-duel-player.is-dead .volt-duel-player-time {
        color: #ffb8bd;
      }
      #volt-duel-game-root .volt-duel-player.is-done .volt-duel-player-time {
        color: #bdebdc;
      }
      #volt-duel-game-root .volt-duel-input {
        height: 34px;
        padding: 8px 9px;
        border-radius: 7px;
        background: rgba(0,0,0,.22);
        border-color: rgba(232,238,247,.11);
        color: #eef1f4;
      }
      #volt-duel-game-root .volt-duel-input:focus {
        border-color: rgba(106,166,147,.58);
        box-shadow: 0 0 0 3px rgba(106,166,147,.14);
      }
      #volt-duel-game-root .volt-duel-btn,
      #volt-duel-game-root .volt-duel-icon-btn {
        border-radius: 7px;
        background: rgba(255,255,255,.055);
        border-color: rgba(232,238,247,.11);
        color: #eef1f4;
        transition: background .14s ease, border-color .14s ease, opacity .14s ease;
      }
      #volt-duel-game-root .volt-duel-btn:hover,
      #volt-duel-game-root .volt-duel-icon-btn:hover {
        transform: none;
        background: rgba(255,255,255,.08);
        border-color: rgba(232,238,247,.20);
      }
      #volt-duel-game-root .volt-duel-btn.is-abandon,
      #volt-duel-game-root .volt-duel-icon-btn.is-small-abandon {
        background: rgba(127,29,29,.24);
        border-color: rgba(219,105,112,.36);
        color: #ffe0e3;
      }
      #volt-duel-game-root .volt-duel-lobby {
        gap: 6px;
        max-height: 210px;
        padding: 0 10px 10px;
      }
      #volt-duel-game-root .volt-duel-error {
        border-radius: 7px;
        background: rgba(219,105,112,.12);
        border-color: rgba(219,105,112,.30);
      }

      @media (max-width: 520px) {
        #volt-duel-game-root { right: 10px; left: 10px; top: 70px; }
        .volt-duel-fab { margin-left:auto; }
        .volt-duel-panel, .volt-duel-mini { width: min(420px, calc(100vw - 20px)); margin-left:auto; }
        .volt-duel-panel { max-height: calc(100vh - 92px); }
        .volt-duel-live-time { font-size:26px; }
        .volt-duel-meta-grid { grid-template-columns: 1fr; }
        .volt-duel-form { grid-template-columns: minmax(0,1fr) 78px; }
        .volt-duel-pending-actions { grid-template-columns: 1fr; }
      }
    `;
    (document.head || document.documentElement).appendChild(style);

    root = document.createElement('div');
    root.id = 'volt-duel-game-root';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Panneau 1v1 live');
    (document.documentElement || document.body).appendChild(root);
    root.addEventListener('click', onRootClick);
    root.addEventListener('input', onRootInput);
    root.addEventListener('change', onRootInput);
    root.addEventListener('keydown', onRootKeydown);
    root.addEventListener('keypress', shieldPanelTyping);
    root.addEventListener('keyup', shieldPanelTyping);
    root.addEventListener('beforeinput', shieldPanelTyping);
    root.addEventListener('compositionstart', shieldPanelTyping);
    root.addEventListener('compositionupdate', shieldPanelTyping);
    root.addEventListener('compositionend', shieldPanelTyping);
    root.addEventListener('pointerdown', focusPanelField, true);
    root.addEventListener('mousedown', focusPanelField, true);
    root.addEventListener('mouseup', shieldPanelPointer, true);
    return root;
  }

  function safeDuelMediaSrc(value) {
    const raw = String(value || '').trim();
    if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(raw)) return raw.length <= 700000 ? raw : '';
    try {
      const parsed = new URL(raw);
      const isAllowed = parsed.protocol === 'https:' &&
        parsed.hostname === 'api.webtvmedia.net' &&
        parsed.pathname.startsWith('/storage/v1/object/public/');
      return isAllowed ? raw : '';
    } catch (_) {
      return '';
    }
  }

  function avatarHTML(user, small = false) {
    const pseudo = user?.pseudo || 'A';
    const pic = user?.is_bot ? '' : safeDuelMediaSrc(user?.profilePic || user?.profile_pic || '');
    const cls = small ? 'volt-duel-small-avatar' : 'volt-duel-avatar';
    if (!user?.is_bot && pic) return `<div class="${cls}"><img src="${esc(pic)}" alt=""></div>`;
    return `<div class="${cls}">${esc(pseudo.charAt(0).toUpperCase() || '?')}</div>`;
  }

  function miniHTML(d) {
    if (!d || state.open) return '';
    const meta = activeMeta(d);
    const opp = meta.opp;
    const oppName = opp.user?.pseudo || 'Adversaire';
    const cls = liveClass(opp.live, opp.score);
    const dotCls = cls || (opp.online ? 'is-online' : '');
    const status = d.status === 'pending' ? 'Invitation en attente' : liveLabel(opp.live, opp.score);
    const time = timerText(opp.live, opp.score, true);
    return `
      <div class="volt-duel-mini" data-action="toggle-panel" title="Ouvrir 1v1">
        <div class="volt-duel-mini-head">
          <div class="volt-duel-kicker">1v1 live</div>
          <div class="volt-duel-chip ${d.status === 'active' ? 'is-active' : ''}">${esc(d.status === 'active' ? `Actif · ${duelSeriesScoreLabel(d)}` : `Pending · ${duelSeriesLabel(d)}`)}</div>
        </div>
        <div class="volt-duel-mini-body">
          <div class="volt-duel-mini-row">
            <div class="volt-duel-identity">
              <span class="volt-duel-dot ${dotCls}"></span>
              <div class="volt-duel-copy">
                <div class="volt-duel-name">${esc(oppName)}</div>
                <div class="volt-duel-sub">${esc(opp.online ? 'En ligne' : 'Hors ligne')} · ${esc(status)}</div>
              </div>
            </div>
            <div class="volt-duel-time" data-volt-duel-live="${esc(JSON.stringify({ live: opp.live, score: opp.score }))}">${esc(time)}</div>
          </div>
        </div>
      </div>`;
  }

  function playerRowHTML(label, data, isOpponent = false) {
    const user = data.user || {};
    const cls = liveClass(data.live, data.score);
    const dotCls = cls || (data.online ? 'is-online' : '');
    const text = shortStatus(data.live, data.score, data.online);
    const timer = timerText(data.live, data.score, true);
    const selfLiveAttr = !isOpponent ? ' data-volt-duel-self-live="1"' : '';
    return `
      <div class="volt-duel-player ${cls}">
        ${avatarHTML(user)}
        <div class="volt-duel-copy">
          <div class="volt-duel-identity">
            <span class="volt-duel-dot ${dotCls}"></span>
            <div class="volt-duel-name">${esc(user.pseudo || label)}</div>
          </div>
          <div class="volt-duel-sub">${esc(label)}${isOpponent ? ` · ${data.online ? 'En ligne' : 'Hors ligne'}` : ''} · ${esc(text)}</div>
        </div>
        <div class="volt-duel-player-time"${selfLiveAttr} data-volt-duel-live="${esc(JSON.stringify({ live: data.live, score: data.score }))}">${esc(timer)}</div>
      </div>`;
  }

  function opponentClockHTML(meta) {
    const opp = meta?.opp || {};
    const name = opp.user?.pseudo || 'Adversaire';
    const running = String(opp.live?.state || '').toLowerCase() === 'running';
    const value = timerText(opp.live, opp.score, true);
    const label = running ? 'Timer adversaire en direct' : (opp.score > 0 ? 'Score adversaire reçu' : 'Timer adversaire');
    const liveAttr = esc(JSON.stringify({ live: opp.live, score: opp.score }));
    return `
      <div class="volt-duel-live-clock">
        <div class="volt-duel-live-copy">
          <div class="volt-duel-live-label">${esc(label)}</div>
          <div class="volt-duel-live-name">${esc(name)} · ${esc(opp.online ? 'En ligne' : 'Hors ligne')}</div>
        </div>
        <div class="volt-duel-live-time ${running ? '' : 'is-idle'}" data-volt-duel-live="${liveAttr}">${esc(value)}</div>
      </div>`;
  }

  function activeHTML(d) {
    if (!d) {
      return `<div class="volt-duel-card"><div class="volt-duel-empty">Aucun 1v1 actif. Cherche un adversaire ou lance une recherche random.</div></div>`;
    }
    const meta = activeMeta(d);
    const pendingForMe = isPendingForMe(d);
    const canCancel = canCancelPendingDuel(d);
    const canAbandon = canAbandonActiveDuel(d);
    const oppName = meta.opp?.user?.pseudo || 'Ton adversaire';
    const pendingInfo = pendingForMe ?
      `${oppName} te défie. Accepte avant de lancer ta run.` :
      `Invitation envoyée à ${oppName}. Attends l'acceptation : une run lancée maintenant ne compte pas en 1v1.`;
    const progress = d.status === 'pending' ? pendingInfo : progressText(meta);
    const kicker = d.status === 'pending' ? 'Invitation en attente' : 'Duel en cours';
    const chipText = d.status === 'active' ? 'Actif' : 'En attente';
    const wager = duelWager(d);
    const myTone = statusTone(meta.me?.live, meta.me?.score, meta.me?.online);
    const oppTone = statusTone(meta.opp?.live, meta.opp?.score, meta.opp?.online);
    return `
      <div class="volt-duel-card">
        <div class="volt-duel-card-pad">
          <div class="volt-duel-section-head">
            <div>
              <div class="volt-duel-kicker">${esc(kicker)}</div>
              <div class="volt-duel-muted">${esc(progress)}</div>
            </div>
            <div class="volt-duel-chip ${d.status === 'active' ? 'is-active' : ''}">${esc(`${chipText} · ${duelSeriesScoreLabel(d)}`)}</div>
          </div>
          ${pendingForMe ? `
            <div class="volt-duel-pending-actions">
              <button class="volt-duel-btn is-primary" data-action="accept-duel" data-id="${esc(d.id)}" ${state.actionBusy ? 'disabled' : ''}>Accepter</button>
              <button class="volt-duel-btn is-danger" data-action="decline-duel" data-id="${esc(d.id)}" ${state.actionBusy ? 'disabled' : ''}>Refuser</button>
            </div>` : ''}
          ${d.status === 'active' ? opponentClockHTML(meta) : ''}
          <div class="volt-duel-meta-grid">
            <div class="volt-duel-meta"><div class="volt-duel-meta-label">Mise</div><div class="volt-duel-meta-value">${esc(wager)} tokens</div></div>
            <div class="volt-duel-meta"><div class="volt-duel-meta-label">Format</div><div class="volt-duel-meta-value">${esc(duelSeriesScoreLabel(d))}</div></div>
            <div class="volt-duel-meta"><div class="volt-duel-meta-label">Toi</div><div class="volt-duel-meta-value">${esc(shortStatus(meta.me?.live, meta.me?.score, meta.me?.online))}</div></div>
            <div class="volt-duel-meta"><div class="volt-duel-meta-label">Adversaire</div><div class="volt-duel-meta-value">${esc(shortStatus(meta.opp?.live, meta.opp?.score, meta.opp?.online))}</div></div>
          </div>
          <div class="volt-duel-scoreboard" data-me="${esc(myTone)}" data-opponent="${esc(oppTone)}">
            ${playerRowHTML('Toi', meta.me, false)}
            ${playerRowHTML('Adversaire', meta.opp, true)}
          </div>
          <div class="volt-duel-actions is-split">
            ${canCancel ? `<button class="volt-duel-btn" data-action="cancel-duel" data-id="${esc(d.id)}" ${state.actionBusy ? 'disabled' : ''}>Annuler</button>` : ''}
            <button class="volt-duel-btn" data-action="refresh" ${state.loading ? 'disabled' : ''}>Actualiser</button>
            ${canAbandon ? `<button class="volt-duel-btn is-abandon" data-action="abandon-duel" data-id="${esc(d.id)}" ${state.actionBusy ? 'disabled' : ''}>Forfait / Abandonner</button>` : ''}
          </div>
        </div>
      </div>`;
  }

  function progressText(meta) {
    const myRunning = meta.me?.live?.state === 'running';
    const oppRunning = meta.opp?.live?.state === 'running';
    const myFinishedPending = meta.me?.live?.state === 'finished' && !(Number(meta.me?.score || 0) > 0);
    const oppFinishedPending = meta.opp?.live?.state === 'finished' && !(Number(meta.opp?.score || 0) > 0);
    if (meta.me.score > 0 && meta.opp.score > 0) {
      if (meta.opp?.isBot) {
        const name = meta.opp.user?.pseudo || 'Adversaire';
        if (meta.me.score > meta.opp.score) return `Tu es devant : ${timerText(meta.me.live, meta.me.score, true)} contre ${timerText(meta.opp.live, meta.opp.score, true)}.`;
        if (meta.opp.score > meta.me.score) return `${name} est devant : ${timerText(meta.opp.live, meta.opp.score, true)} contre ${timerText(meta.me.live, meta.me.score, true)}.`;
        return 'Égalité exacte : match nul.';
      }
      return 'Les deux scores sont reçus.';
    }
    if (myFinishedPending && oppFinishedPending) return 'Les deux runs sont terminées. Validation du résultat en cours.';
    if (myFinishedPending && meta.opp.score <= 0) return 'Ta run est terminée. En attente de validation/adversaire.';
    if (oppFinishedPending && meta.me.score <= 0 && !myRunning) return `${meta.opp.user?.pseudo || 'Adversaire'} a terminé : ${timerText(meta.opp.live, meta.opp.score, true)}. Lance ou termine ta run pour comparer.`;
    if (meta.me.score > 0 && oppRunning) return `Ton score est sauvé. ${meta.opp.user?.pseudo || 'Adversaire'} continue : ${timerText(meta.opp.live, meta.opp.score, true)}.`;
    if (oppRunning) return `${meta.opp.user?.pseudo || 'Adversaire'} est en run : ${timerText(meta.opp.live, meta.opp.score, true)}.`;
    if (myRunning && meta.opp.score > 0) return `Ton adversaire a fini. Continue ta run : ${timerText(meta.me.live, meta.me.score, true)}.`;
    if (myRunning) return `Tu es en run : ${timerText(meta.me.live, meta.me.score, true)}.`;
    if (meta.opp.score > 0) return `${meta.opp.user?.pseudo || 'Adversaire'} a fini : ${timerText(meta.opp.live, meta.opp.score, true)}.`;
    if (meta.me.score > 0) return 'Ton score est reçu. En attente adversaire.';
    return 'Lance une run No-Coin. Les infos adversaire restent visibles ici.';
  }

  function lobbyHTML() {
    const players = Array.isArray(state.lobby) ? state.lobby : [];
    return `
      <div class="volt-duel-card">
          <div class="volt-duel-card-pad">
          <div class="volt-duel-section-head">
            <div>
              <div class="volt-duel-kicker">Trouver un adversaire</div>
              <div class="volt-duel-muted">Défie un pseudo ou lance une recherche random.</div>
            </div>
            <div class="volt-duel-chip">${state.tokens === null ? 'Tokens —' : `${esc(state.tokens)} tokens`}</div>
          </div>
          <div class="volt-duel-form">
            <input id="volt-duel-search-input" class="volt-duel-input" data-volt-duel-field="1" value="${esc(state.query)}" placeholder="Pseudo exact ou recherche..." maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false">
            <input id="volt-duel-wager-input" class="volt-duel-input" data-volt-duel-field="1" value="${esc(state.wager)}" type="number" inputmode="numeric" min="0" max="10000" step="1" title="Mise tokens">
            <select id="volt-duel-series-select" class="volt-duel-input" data-volt-duel-field="1" title="Format 1v1">
              <option value="1" ${cleanSeriesWins(state.seriesWins) === 1 ? 'selected' : ''}>BO1</option>
              <option value="2" ${cleanSeriesWins(state.seriesWins) === 2 ? 'selected' : ''}>BO2</option>
              <option value="3" ${cleanSeriesWins(state.seriesWins) === 3 ? 'selected' : ''}>BO3</option>
            </select>
          </div>
          <div class="volt-duel-actions">
            <button class="volt-duel-btn is-primary" data-action="challenge-query" ${state.actionBusy ? 'disabled' : ''}>Défier</button>
            <button class="volt-duel-btn" data-action="random-duel" ${state.actionBusy ? 'disabled' : ''}>Random</button>
            ${state.randomQueue ? `<button class="volt-duel-btn is-danger" data-action="leave-random" ${state.actionBusy ? 'disabled' : ''}>Quitter random</button>` : ''}
          </div>
          ${state.randomQueue ? `<div class="volt-duel-muted volt-duel-note" data-volt-duel-queue-countdown="1">${esc(queueCountdownText(state.randomQueue))}</div>` : ''}
          ${state.error ? `<div class="volt-duel-error volt-duel-note">${esc(state.error)}</div>` : ''}
        </div>
        <div class="volt-duel-lobby">
          ${players.length ? players.map(playerRowLobbyHTML).join('') : `<div class="volt-duel-empty">Aucun joueur trouvé.</div>`}
        </div>
      </div>`;
  }

  function playerRowLobbyHTML(p) {
    const online = !!p.online;
    const busy = !!p.has_open_duel;
    const running = !!p.is_running;
    const cls = running ? 'is-running' : online ? 'is-online' : '';
    const status = running ? 'En run' : online ? 'En ligne' : 'Hors ligne';
    return `
      <div class="volt-duel-lobby-row ${busy ? 'is-busy' : ''}">
        ${avatarHTML(p, true)}
        <div class="volt-duel-copy">
          <div class="volt-duel-identity">
            <span class="volt-duel-dot ${cls}"></span>
            <div class="volt-duel-name">${esc(p.pseudo || 'Anonyme')}</div>
          </div>
          <div class="volt-duel-sub">${esc(status)}${busy ? ' · occupé' : ''}</div>
        </div>
        <button class="volt-duel-btn ${busy ? '' : 'is-primary'}" data-action="challenge-uid" data-uid="${esc(p.id)}" ${busy || state.actionBusy ? 'disabled' : ''}>Défier</button>
      </div>`;
  }

  function captureFieldSnapshot() {
    try {
      const active = document.activeElement;
      if (!isPanelField(active)) return null;
      const id = active.id || '';
      if (id === 'volt-duel-search-input') state.query = active.value || '';
      if (id === 'volt-duel-wager-input') state.wager = String(active.value || '0');
      if (id === 'volt-duel-series-select') state.seriesWins = String(cleanSeriesWins(active.value || 1));
      return {
        id,
        value: active.value,
        start: typeof active.selectionStart === 'number' ? active.selectionStart : null,
        end: typeof active.selectionEnd === 'number' ? active.selectionEnd : null
      };
    } catch (_) { return null; }
  }

  function restoreFieldSnapshot(snapshot) {
    if (!snapshot || !snapshot.id) return;
    setTimeout(() => {
      try {
        const el = document.getElementById(snapshot.id);
        if (!el) return;
        if (typeof snapshot.value === 'string' && el.value !== snapshot.value) el.value = snapshot.value;
        el.focus({ preventScroll: true });
        if (snapshot.start !== null && typeof el.setSelectionRange === 'function') {
          const len = String(el.value || '').length;
          const start = Math.max(0, Math.min(len, snapshot.start));
          const end = Math.max(0, Math.min(len, snapshot.end ?? snapshot.start));
          el.setSelectionRange(start, end);
        }
      } catch (_) {}
    }, 0);
  }

  function render() {
    if (!state.enabled) { removeRoot(); return; }
    const snapshot = captureFieldSnapshot();
    const root = ensureRoot();
    const d = currentDuel();
    const hasLive = !!d;
    if (!state.open) {
      removePanelInputShield();
      root.innerHTML = `
      <button class="volt-duel-fab" data-action="toggle-panel"><span class="volt-duel-dot ${hasLive ? 'is-online' : ''}"></span><span>1v1</span></button>
      ${miniHTML(d)}`;
      state.liveNodes = Array.from(root.querySelectorAll('[data-volt-duel-live]'));
      state.queueNodes = [];
      if (d || state.randomQueue) startTimerRaf();
      else stopTimerRaf();
      return;
    }
    installPanelInputShield();
    const canHeaderAccept = isPendingForMe(d);
    const canHeaderAbandon = canAbandonActiveDuel(d);
    root.innerHTML = `
      <button class="volt-duel-fab" data-action="toggle-panel"><span class="volt-duel-dot ${hasLive ? 'is-online' : ''}"></span><span>1v1</span></button>
      ${miniHTML(d)}
      <div class="volt-duel-panel is-open">
        <div class="volt-duel-panel-head">
          <div>
            <div class="volt-duel-title">1v1 live</div>
            <div class="volt-duel-muted">Duel actif et recherche.</div>
          </div>
          <div class="volt-duel-head-actions">
            ${canHeaderAccept ? `<button class="volt-duel-icon-btn is-head-accept" data-action="accept-duel" data-id="${esc(d.id)}" title="Accepter le 1v1" ${state.actionBusy ? 'disabled' : ''}>Accepter</button>` : ''}
            ${canHeaderAccept ? `<button class="volt-duel-icon-btn is-head-decline" data-action="decline-duel" data-id="${esc(d.id)}" title="Refuser le 1v1" ${state.actionBusy ? 'disabled' : ''}>Refuser</button>` : ''}
            ${canHeaderAbandon ? `<button class="volt-duel-icon-btn is-small-abandon" data-action="abandon-duel" data-id="${esc(d.id)}" title="Déclarer forfait (Abandonner le 1v1)" ${state.actionBusy ? 'disabled' : ''}>Forfait / Abandon</button>` : ''}
            <button class="volt-duel-icon-btn" data-action="refresh" title="Actualiser">↻</button>
            <button class="volt-duel-icon-btn" data-action="toggle-panel" title="Fermer">×</button>
          </div>
        </div>
        <div class="volt-duel-panel-body">
          ${activeHTML(d)}
          ${lobbyHTML()}
        </div>
      </div>`;
    state.liveNodes = Array.from(root.querySelectorAll('[data-volt-duel-live]'));
    state.queueNodes = Array.from(root.querySelectorAll('[data-volt-duel-queue-countdown]'));
    restoreFieldSnapshot(snapshot);
    if (d || state.randomQueue) startTimerRaf();
    else stopTimerRaf();
  }

  function isPanelField(el) {
    try {
      const root = document.getElementById('volt-duel-game-root');
      return !!(el && root && root.contains(el) && (el.matches?.('input, textarea, select, [contenteditable="true"]') || el.hasAttribute?.('data-volt-duel-field')));
    } catch (_) { return false; }
  }

  function shieldPanelTyping(e) {
    if (!isPanelField(e.target)) return;
    e.stopPropagation();
  }

  function focusPanelField(e) {
    const field = e.target?.closest?.('[data-volt-duel-field], input, textarea, select');
    if (!field || !field.closest?.('#volt-duel-game-root')) return;
    state.activeTypingUntil = Date.now() + 1500;
    try { field.focus({ preventScroll: true }); } catch (_) { try { field.focus(); } catch (_) {} }
  }

  function shieldPanelPointer(e) {
    if (e.target?.closest?.('#volt-duel-game-root')) {
      state.activeTypingUntil = Date.now() + 1500;
      e.stopPropagation();
    }
  }

  function eventInsidePanel(e) {
    try {
      const root = document.getElementById('volt-duel-game-root');
      if (!root) return false;
      if (e.target && root.contains(e.target)) return true;
      const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
      return path.includes(root) || root.contains(document.activeElement);
    } catch (_) { return false; }
  }

  function globalPanelKeyShield(e) {
    if (!eventInsidePanel(e) && !isPanelField(document.activeElement)) return;
    const active = document.activeElement;
    if (!isPanelField(active)) return;
    if (isPanelField(e.target)) {
      state.activeTypingUntil = Date.now() + 1500;
      if (e.key === 'Enter' && e.target?.id === 'volt-duel-search-input' && e.type === 'keydown') {
        e.preventDefault();
        try { state.query = e.target.value || ''; } catch (_) {}
        challengeByQuery();
        e.stopImmediatePropagation();
        return;
      }
      if (e.key === 'Escape' && e.type === 'keydown') {
        e.preventDefault();
        try { e.target.blur(); } catch (_) {}
        e.stopImmediatePropagation();
        return;
      }
      // Shield the game from overlay typing while preserving native input
      // behavior for IME, paste, selection shortcuts and browser editing keys.
      e.stopImmediatePropagation();
      return;
    }
    state.activeTypingUntil = Date.now() + 1500;
    if (e.key === 'Enter' && active.id === 'volt-duel-search-input') {
      e.preventDefault();
      try { state.query = active.value || ''; } catch (_) {}
      challengeByQuery();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      try { active.blur(); } catch (_) {}
    }
    e.stopImmediatePropagation();
  }

  function installPanelInputShield() {
    if (state.inputShieldInstalled) return;
    state.inputShieldInstalled = true;
    ['keydown', 'keypress', 'keyup'].forEach(type => {
      try { window.addEventListener(type, globalPanelKeyShield, true); } catch (_) {}
    });
  }

  function removePanelInputShield() {
    if (!state.inputShieldInstalled) return;
    ['keydown', 'keypress', 'keyup'].forEach(type => {
      try { window.removeEventListener(type, globalPanelKeyShield, true); } catch (_) {}
    });
    state.inputShieldInstalled = false;
  }

  function removeRoot() {
    const root = document.getElementById('volt-duel-game-root');
    if (root) root.remove();
    removePanelInputShield();
    stopTimerRaf();
  }

  function onRootInput(e) {
    const el = e.target;
    if (!el) return;
    state.activeTypingUntil = Date.now() + 1200;
    if (el.id === 'volt-duel-search-input') {
      state.query = el.value || '';
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => refresh(true), 650);
    } else if (el.id === 'volt-duel-wager-input') {
      const n = Math.max(0, Math.min(10000, Math.floor(Number(el.value || 0) || 0)));
      state.wager = String(n);
    } else if (el.id === 'volt-duel-series-select') {
      state.seriesWins = String(cleanSeriesWins(el.value || 1));
    }
  }

  function onRootKeydown(e) {
    if (!isPanelField(e.target)) return;
    state.activeTypingUntil = Date.now() + 1500;
    if (manuallyApplyPanelKey(e, e.target)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    e.stopPropagation();
    if (e.key === 'Enter' && e.target?.id === 'volt-duel-search-input') {
      e.preventDefault();
      state.query = e.target.value || '';
      challengeByQuery();
    }
  }

  async function onRootClick(e) {
    if (e.target?.closest?.('#volt-duel-game-root')) e.stopPropagation();
    const field = e.target?.closest?.('[data-volt-duel-field], input, textarea, select');
    if (field && field.closest?.('#volt-duel-game-root')) {
      try { field.focus({ preventScroll: true }); } catch (_) { try { field.focus(); } catch (_) {} }
    }
    const btn = e.target?.closest?.('[data-action]');
    if (!btn) return;
    if (btn.disabled) return;
    const action = btn.dataset.action;
    if (action === 'toggle-panel') {
      state.open = !state.open;
      try { chrome.storage.local.set({ voltDuelPanelOpen: state.open }); } catch (_) {}
      render();
      if (state.open) refresh(true);
      return;
    }
    if (action === 'refresh') return refresh(true);
    if (action === 'challenge-query') return challengeByQuery();
    if (action === 'challenge-uid') return challengeUid(btn.dataset.uid);
    if (action === 'random-duel') return randomDuel();
    if (action === 'leave-random') return callAndRefresh('leaveRandomDuelQueue', { knownQueueActive: !!state.randomQueue, queueKey: queueKey(state.randomQueue) });
    if (action === 'accept-duel') return respondDuel(btn.dataset.id, true);
    if (action === 'decline-duel') return respondDuel(btn.dataset.id, false);
    if (action === 'cancel-duel') return callAndRefresh('cancelDuel', { matchId: btn.dataset.id });
    if (action === 'abandon-duel') return abandonDuel(btn.dataset.id);
  }

  async function callAndRefresh(action, payload = {}) {
    if (state.actionBusy) return;
    state.actionBusy = true;
    state.error = '';
    render();
    try {
      const res = await bg(action, payload);
      if (!res?.success) state.error = cleanError(res?.error || 'action_failed');
      await refresh(true);
    } finally {
      state.actionBusy = false;
      render();
    }
  }

  function wagerTokens() {
    return Math.max(0, Math.min(10000, Math.floor(Number(state.wager || 0) || 0)));
  }

  function seriesWins() {
    return cleanSeriesWins(state.seriesWins);
  }

  async function abandonDuel(matchId) {
    if (state.actionBusy) return;
    const id = String(matchId || '').trim();
    if (!id) return;
    const d = currentDuel();
    const hasStarted = !!(d && d.status === 'active');
    const message = hasStarted ?
      'Déclarer forfait pour ce 1v1 ? Si la run est lancée, l’adversaire gagne immédiatement.' :
      'Annuler ce 1v1 ?';
    try {
      if (typeof window.confirm === 'function' && !window.confirm(message)) return;
    } catch (_) {}
    state.actionBusy = true;
    state.error = '';
    render();
    try {
      stopLocalRunForDuelAbandon(id);
      const res = await bg('abandonDuel', { matchId: id });
      if (!res?.success) {
        state.error = cleanError(res?.error || res?.reason || 'duel_abandon_failed');
      } else if (res.cancelled) {
        state.error = '1v1 annulé proprement.';
      } else {
        state.error = '1v1 abandonné. Victoire donnée à l’adversaire.';
      }
      await refresh(true);
      scheduleRefresh(true, 300);
    } catch (e) {
      state.error = cleanError(e?.message || 'duel_abandon_failed');
    } finally {
      state.actionBusy = false;
      render();
    }
  }

  function cleanError(err) {
    const map = {
      not_logged_in: 'Connecte-toi dans l’extension.',
      not_authenticated: 'Connecte-toi dans l’extension.',
      target_not_found: 'Joueur introuvable.',
      target_unavailable: 'Joueur indisponible.',
      open_duel_exists: 'Un des deux joueurs a déjà un duel ouvert.',
      insufficient_tokens: 'Tokens insuffisants.',
      invalid_target_pseudo: 'Pseudo invalide.',
      queue_waiting: 'Recherche random lancée.',
      run_active: 'Action 1v1 bloquée : une run est déjà en cours.',
      run_started_before_duel: 'Départ reçu trop tôt. Le 1v1 garde maintenant une marge réseau : relance seulement si le chrono est vraiment arrêté.',
      duel_abandon_failed: 'Abandon impossible pour le moment. Réessaie dans quelques secondes.',
      abandon_in_progress: 'Abandon déjà en cours.',
      duel_not_active: 'Ce 1v1 n’est plus actif.',
      duel_already_closed: 'Ce 1v1 est déjà terminé.',
      verified_game_start_required: 'Lance une vraie run No-Coin pour valider ce 1v1.',
      score_exceeds_server_elapsed: 'Synchronisation 1v1 en cours : réessaie après actualisation du duel.',
      live_start_required: 'Le duel attend le départ réel de la run.',
      too_early: 'Adversaire garanti après 60 secondes de recherche.',
      not_queued: 'Aucune recherche random active.',
      bot_match_failed: 'Impossible de préparer un adversaire pour le moment.',
      extension_context_invalidated: 'Extension rechargée : actualise l’onglet du jeu.'
    };
    return map[err] || String(err || 'Erreur inconnue');
  }

  async function challengeByQuery() {
    if (state.actionBusy) return;
    if (guardDuelActionDuringLocalRun('Défi 1v1')) return;
    const targetPseudo = String(state.query || '').trim();
    if (targetPseudo.length < 2) {
      state.error = 'Pseudo trop court.';
      render();
      return;
    }
    state.actionBusy = true;
    state.error = '';
    render();
    try {
      const res = await bg('createDuel', { targetPseudo, mode: 'no_coin', wagerTokens: wagerTokens(), seriesWins: seriesWins() });
      if (!res?.success) state.error = cleanError(res?.error || 'create_failed');
      await refresh(true);
    } finally {
      state.actionBusy = false;
      render();
    }
  }

  async function challengeUid(uid) {
    if (!uid || state.actionBusy) return;
    if (guardDuelActionDuringLocalRun('Défi 1v1')) return;
    state.actionBusy = true;
    state.error = '';
    render();
    try {
      const res = await bg('createDuel', { targetUid: uid, mode: 'no_coin', wagerTokens: wagerTokens(), seriesWins: seriesWins() });
      if (!res?.success) state.error = cleanError(res?.error || 'create_failed');
      await refresh(true);
    } finally {
      state.actionBusy = false;
      render();
    }
  }

  async function randomDuel() {
    if (state.actionBusy) return;
    if (guardDuelActionDuringLocalRun('Recherche random')) return;
    state.actionBusy = true;
    state.error = '';
    render();
    try {
      const res = await bg('joinRandomDuel', { mode: 'no_coin', wagerTokens: wagerTokens(), seriesWins: seriesWins() });
      if (!res?.success) state.error = cleanError(res?.error || 'queue_failed');
      await refresh(true);
      claimBotIfDue('join_refresh').catch(() => {});
    } finally {
      state.actionBusy = false;
      render();
    }
  }

  async function respondDuel(matchId, accept) {
    if (!matchId || state.actionBusy) return;
    if (accept && guardDuelActionDuringLocalRun('Acceptation 1v1')) return;
    state.actionBusy = true;
    state.error = '';
    render();
    try {
      const res = await bg('respondDuel', { matchId, accept });
      if (!res?.success) state.error = cleanError(res?.error || 'respond_failed');
      await refresh(true);
    } finally {
      state.actionBusy = false;
      render();
    }
  }

  async function refresh(withLobby = false) {
    if (state.loading) {
      state.refreshQueued = true;
      state.refreshQueuedWithLobby = !!(state.refreshQueuedWithLobby || withLobby);
      return;
    }
    state.loading = true;
    try {
      if (!state.myId) {
        const idRes = await bg('getCurrentUserId');
        if (idRes?.userId) state.myId = idRes.userId;
      }
      const needsPanelData = !!(withLobby || state.open);
      const jobs = [
        bg('getMyDuels', { limit: 20 }),
        needsPanelData ? bg('getVoltTokens') : Promise.resolve(null)
      ];
      if (needsPanelData) jobs.push(bg('getDuelLobby', { query: state.query, limit: 12 }));
      const [duelsRes, tokenRes, lobbyRes] = await Promise.all(jobs);
      if (duelsRes?.success) {
        state.refreshErrorCount = 0;
        state.error = '';
        state.duels = preserveKnownLive(enrichDuels(Array.isArray(duelsRes.duels) ? duelsRes.duels : []));
        resetRunIfActiveDuelChanged(state.duels);
        state.randomQueue = duelsRes.random_queue || null;
        if (!state.randomQueue) state.botClaimedQueueKey = '';
        if (state.randomQueue && localRunIsActuallyRunning()) {
          cancelRandomQueueBecauseRunStarted({ source: 'refresh' }).catch(() => {});
        }
        claimNoStartWinsIfNeeded().catch(() => {});
        claimBotIfDue('refresh').catch(() => {});
      } else if (duelsRes?.error && duelsRes.error !== 'not_logged_in') {
        state.refreshErrorCount = Math.min(5, (state.refreshErrorCount || 0) + 1);
        state.error = cleanError(duelsRes.error);
      }
      if (tokenRes?.success) state.tokens = Math.max(0, Number(tokenRes.balance || 0));
      if (lobbyRes) {
        if (lobbyRes.success) state.lobby = Array.isArray(lobbyRes.players) ? lobbyRes.players : [];
        else if (String(lobbyRes.error || '').includes('get_duel_lobby')) state.lobby = [];
      }
      state.lastRefresh = Date.now();
    } catch (e) {
      state.refreshErrorCount = Math.min(5, (state.refreshErrorCount || 0) + 1);
      state.error = cleanError(e?.message || 'network_error');
    } finally {
      state.loading = false;
      if (Date.now() < (state.activeTypingUntil || 0)) {
        setTimeout(() => render(), (state.activeTypingUntil || 0) - Date.now() + 50);
      } else {
        render();
      }
      if (state.refreshQueued) {
        const queuedWithLobby = !!state.refreshQueuedWithLobby;
        state.refreshQueued = false;
        state.refreshQueuedWithLobby = false;
        scheduleRefresh(queuedWithLobby, 80);
      }
    }
  }

  function scheduleRefresh(withLobby = false, delay = 900) {
    state.scheduledRefreshWithLobby = !!(state.scheduledRefreshWithLobby || withLobby);
    clearTimeout(state.scheduledRefreshTimer);
    state.scheduledRefreshTimer = setTimeout(() => {
      const includeLobby = !!state.scheduledRefreshWithLobby;
      state.scheduledRefreshWithLobby = false;
      refresh(includeLobby);
    }, delay);
  }

  function tickTimers() {
    const nodes = (state.liveNodes || []).filter(node => node && node.isConnected);
    if (nodes.length !== (state.liveNodes || []).length) state.liveNodes = nodes;
    nodes.forEach(node => {
      try {
        let next = '';
        const raw = node.getAttribute('data-volt-duel-live') || '{}';
        let cached = state.liveDataCache.get(node);
        if (!cached || cached.raw !== raw) {
          // PERF FIX: per-node try so one bad attribute does not kill tickTimers for all nodes.
          let parsed = {};
          try { parsed = JSON.parse(raw); } catch (_) { parsed = {}; }
          cached = { raw, data: parsed };
          state.liveDataCache.set(node, cached);
        }
        const data = cached.data || {};
        const live = data.live || null;
        const score = Number(data.score || 0) || 0;
        const liveState = String(live?.state || '').toLowerCase();
        const serverTerminal = ['finished', 'failed', 'dead'].includes(liveState) || score > 0;
        const isSelfLive = node.getAttribute('data-volt-duel-self-live') === '1';
        const localTerminal = isSelfLive ? getVoltLocalDuelTerminal(currentDuel()) : null;

        // Stage 9 fix: after local death, freeze the 1v1 timer immediately even if
        // the server live row is still a stale "running" row while Supabase catches up.
        if (isSelfLive && localTerminal && !localRunIsActuallyRunning()) {
          const elapsed = Math.max(0, Number(localTerminal.elapsedMs || 0));
          next = elapsed > 0 ? fmtMs(elapsed, true) : '';
        }

        // Stage 8 fix: local self timer is only a temporary display fallback while
        // the server/live row has not reached a terminal state. Once Supabase says
        // dead/failed/finished or a score exists, never let a stale local timer keep
        // incrementing in the 1v1 panel.
        if (!next && isSelfLive && localRunIsActuallyRunning() && !serverTerminal) {
          const elapsed = localRunElapsedMs();
          next = elapsed > 0 ? fmtMs(elapsed, true) : '';
        }
        if (!next) next = timerText(live, score, true);
        if (node.textContent !== next) node.textContent = next;
      } catch (_) {}
    });
    const queueNodes = (state.queueNodes || []).filter(node => node && node.isConnected);
    if (queueNodes.length !== (state.queueNodes || []).length) state.queueNodes = queueNodes;
    queueNodes.forEach(node => {
      const next = queueCountdownText(state.randomQueue);
      if (node.textContent !== next) node.textContent = next;
    });
    if (state.randomQueue) claimBotIfDue('countdown').catch(() => {});
    return nodes.length + queueNodes.length;
  }

  function mergeLivePayload(live) {
    if (!live || !live.match_id || !live.user_id) return false;
    const list = Array.isArray(state.duels) ? state.duels : [];
    const d = list.find(item => item && item.id === live.match_id);
    if (!d) return false;
    const side = d.challenger_uid === live.user_id ? 'challenger' : (d.opponent_uid === live.user_id ? 'opponent' : null);
    if (!side) return false;
    const key = `${side}_live`;
    const mergedLive = { ...(d[key] || {}), ...live };
    delete mergedLive._client_received_at;
    delete mergedLive._client_elapsed_at_receive;
    d[key] = enrichLive(mergedLive);
    d[`${side}_online`] = true;
    d[`${side}_last_seen_at`] = live.last_seen_at || live.updated_at || new Date().toISOString();
    return true;
  }

  function stopTimerRaf() {
    if (state.timerRaf) {
      clearInterval(state.timerRaf);
      state.timerRaf = 0;
    }
  }

  function startTimerRaf() {
    if (state.timerRaf) return;
    if (!tickTimers()) return;
    state.timerRaf = setInterval(() => {
      if (document.hidden) return;
      const d = currentDuel();
      const count = tickTimers();
      if (!count && !d && !state.randomQueue) stopTimerRaf();
    }, state.open ? 1000 : 2000);
  }

  function stopLoops() {
    clearInterval(state.refreshTimer);
    clearInterval(state.presenceTimer);
    clearTimeout(state.scheduledRefreshTimer);
    stopTimerRaf();
    state.refreshTimer = null;
    state.presenceTimer = null;
    state.scheduledRefreshTimer = null;
  }

  function startLoops() {
    if (!state.enabled) return;
    clearInterval(state.refreshTimer);
    clearInterval(state.presenceTimer);
    const shouldPoll = () => {
      const d = currentDuel();
      return !!(state.enabled && (state.open || d?.status === 'active' || d?.status === 'pending' || state.randomQueue || !document.hidden));
    };
    const pollTiming = () => {
      const d = currentDuel();
      const activeOrQueued = !!(d?.status === 'active' || state.randomQueue);
      const pending = d?.status === 'pending';
      return {
        basePollMs: state.open ? 5000 : (activeOrQueued ? 8000 : (pending ? 12000 : 15000)),
        wakeMs: state.open ? 3500 : (activeOrQueued ? 5000 : 5000)
      };
    };
    state.refreshTimer = setInterval(() => {
      if (document.hidden || !shouldPoll()) return;
      const { basePollMs } = pollTiming();
      const backoffMs = Math.min(90000, basePollMs * Math.pow(1.6, Math.min(4, state.refreshErrorCount || 0)));
      if (Date.now() - state.lastRefresh < backoffMs - 100) return;
      refresh(state.open);
    }, pollTiming().wakeMs);
    startTimerRaf();
    state.presenceTimer = setInterval(() => {
      if (!document.hidden && shouldPoll()) bg('updateVoltPresence', { context: 'game' });
    }, duelPresenceIntervalMs());
    bg('updateVoltPresence', { context: 'game' });
  }

  function boot() {
    try {
      storageGetSafe(['id', 'voltDuelPanelOpen', 'voltDuelPanelEnabled', 'voltDuelLastActiveId', 'voltDuelLastContextKey']).then(res => {
        state.myId = res?.id || null;
        state.open = false;
        state.enabled = res?.voltDuelPanelEnabled !== false;
        state.lastActiveDuelId = String(res?.voltDuelLastActiveId || '');
        state.lastDuelContextKey = String(res?.voltDuelLastContextKey || '');
        if (state.enabled) ensureRoot();
        render();
        if (state.enabled) {
          refresh(state.open).then(() => {
            startLoops();
          });
        }
      });
      chrome.runtime.onMessage.addListener(message => {
        if (!message) return;
        if (message.action === 'duelOpponentRunEvent' || message.action === 'duelLiveStateUpdated' || message.action === 'duelAccepted' || message.action === 'duelNoStartWinClaimed' || message.action === 'duelBotMatched' || message.action === 'duelAbandoned') {
          const merged = mergeLivePayload(message.live || message);
          if (merged) render();
          scheduleRefresh(!merged && state.open, merged ? 5000 : 700);
        }
        if (message.action === 'duelResultRecorded' || message.action === 'duelAbandoned') {
          const duel = message.duel || {};
          if (duel.status === 'completed' || duel.completed || duel.series_completed || message.action === 'duelAbandoned') {
            resetDuelDisplayRuntime(message.action);
          }
          scheduleRefresh(state.open, 250);
        }
        if (message.action === 'duelAccepted' || message.action === 'duelNoStartWinClaimed' || message.action === 'duelBotMatched' || message.action === 'duelAbandoned') {
          scheduleRefresh(true, 250);
        }
        if (message.action === 'duelRandomQueueCancelledForRun') {
          state.randomQueue = null;
          state.botClaimedQueueKey = '';
          state.error = message.message || 'Recherche random annulée : une run a commencé.';
          render();
          scheduleRefresh(true, 300);
        }
      });
      try {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area !== 'local' || !changes.voltDuelPanelEnabled) return;
          state.enabled = changes.voltDuelPanelEnabled.newValue !== false;
          if (!state.enabled) { removeRoot();
            stopLoops(); } else { ensureRoot();
            render();
            refresh(state.open).then(() => startLoops()); }
        });
      } catch (_) {}
      try {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) stopTimerRaf();
          else {
            if (!state.refreshTimer) startLoops();
            startTimerRaf();
          }
        });
        window.addEventListener('pagehide', stopLoops, { once: true });
        window.addEventListener('volt:duel-local-terminal', () => {
          try { render();
            startTimerRaf();
            scheduleRefresh(state.open, 250); } catch (_) {}
        });
        window.addEventListener('volt:local-run-started', (event) => {
          try { cancelRandomQueueBecauseRunStarted(event?.detail || {}).catch(() => {}); } catch (_) {}
        });
      } catch (_) {}
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  // ═══════════════════════════════════════════════════════════════
  // VOLT QUICK-TOGGLE TRAY — Floating overlay control bar on game pages
  // ═══════════════════════════════════════════════════════════════
  (function _voltInitQuickTray() {
    try {
      if (document.getElementById('volt-quick-tray')) return;

      const tray = document.createElement('div');
      tray.id = 'volt-quick-tray';
      tray.setAttribute('role', 'toolbar');
      tray.setAttribute('aria-label', 'Volt Quick Controls');

      const css = `
      #volt-quick-tray {
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        z-index: 2147483640;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 6px 4px;
        background: rgba(12,13,18,0.92);
        border: 1px solid rgba(255,255,255,0.1);
        border-right: none;
        border-radius: 10px 0 0 10px;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        box-shadow: -2px 0 16px rgba(0,0,0,0.4);
        cursor: grab;
        user-select: none;
        -webkit-user-select: none;
        transition: opacity 0.2s;
      }
      #volt-quick-tray:hover { opacity: 1 !important; }
      #volt-quick-tray.volt-tray-dragging { cursor: grabbing; opacity: 0.85; }
      .volt-tray-btn {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.04);
        color: rgba(255,255,255,0.5);
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        position: relative;
      }
      .volt-tray-btn.volt-tray-active {
        background: rgba(193,127,89,0.2);
        color: #c17f59;
        border-color: rgba(193,127,89,0.4);
      }
      .volt-tray-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
      .volt-tray-sep { height: 1px; background: rgba(255,255,255,0.08); margin: 2px 0; }
      .volt-tray-tooltip {
        position: absolute;
        right: calc(100% + 8px);
        top: 50%;
        transform: translateY(-50%);
        background: rgba(12,13,18,0.95);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 10px;
        font-family: Inter, system-ui, sans-serif;
        color: #fff;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s;
        z-index: 1;
      }
      .volt-tray-btn:hover .volt-tray-tooltip { opacity: 1; }
    `;
      const styleEl = document.createElement('style');
      styleEl.textContent = css;
      document.head.appendChild(styleEl);

      function mkBtn(icon, label, key) {
        const btn = document.createElement('button');
        btn.className = 'volt-tray-btn';
        btn.dataset.key = key;
        btn.innerHTML = `<i class="${icon}"></i><span class="volt-tray-tooltip">${label}</span>`;
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
        return btn;
      }

      const btnTimer = mkBtn('fa-solid fa-stopwatch', 'Timer', 'timer');
      const btnFps = mkBtn('fa-solid fa-gauge-high', 'FPS', 'fps');
      const btnKeys = mkBtn('fa-solid fa-keyboard', 'Touches', 'keys');
      const sep = document.createElement('div');
      sep.className = 'volt-tray-sep';
      const btnPerf = mkBtn('fa-solid fa-bolt', 'FPS Max', 'perf');

      tray.appendChild(btnTimer);
      tray.appendChild(btnFps);
      tray.appendChild(btnKeys);
      tray.appendChild(sep);
      tray.appendChild(btnPerf);
      document.documentElement.appendChild(tray);

      // Load initial state from real feature flags (V=timer, I=FPS, P=keypress)
      function _trayRefreshState() {
        btnTimer.classList.toggle('volt-tray-active', !!V);
        btnFps.classList.toggle('volt-tray-active', !!I);
        btnKeys.classList.toggle('volt-tray-active', !!P);
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['performanceMode'], function (r) {
            btnPerf.classList.toggle('volt-tray-active', !!r.performanceMode);
          });
        }
      }
      _trayRefreshState();

      btnTimer.addEventListener('click', function (e) {
        e.stopPropagation();
        typeof p0 === 'function' && p0();
        btnTimer.classList.toggle('volt-tray-active', !!V);
      });
      btnFps.addEventListener('click', function (e) {
        e.stopPropagation();
        const _newFps = !I;
        if (_newFps) { typeof at === 'function' && at(); }
        else { typeof Se === 'function' && Se(); }
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['fpsSettings'], function (r) {
            const _s = Object.assign({}, r.fpsSettings || {}, { visible: _newFps });
            chrome.storage.local.set({ fpsSettings: _s });
          });
        }
        btnFps.classList.toggle('volt-tray-active', _newFps);
      });
      // Keys button: simple click = toggle, long press (>400ms) = layout panel
      let _keysLongPressTimer = null;
      let _keysLongPressed = false;

      function _openKeyLayoutPanel() {
        const existing = document.getElementById('volt-key-layout-panel');
        if (existing) { existing.remove(); return; }

        const panel = document.createElement('div');
        panel.id = 'volt-key-layout-panel';
        panel.style.cssText = 'position:fixed;z-index:2147483647;background:#1a1a1a;border:1px solid rgba(193,127,89,0.4);border-radius:12px;padding:10px;width:170px;box-shadow:0 8px 24px rgba(0,0,0,0.6);font-family:Inter,sans-serif;';

        const btnRect = btnKeys.getBoundingClientRect();
        panel.style.right = (window.innerWidth - btnRect.left + 6) + 'px';
        panel.style.top = Math.max(8, btnRect.top - 20) + 'px';

        panel.innerHTML = `
        <div style="font-size:9px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;">Layout clavier</div>
        <div style="display:flex;gap:4px;margin-bottom:10px;">
          <button data-layout="arrows" style="flex:1;padding:5px 2px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;font-size:9px;cursor:pointer;">↑←↓→</button>
          <button data-layout="wasd" style="flex:1;padding:5px 2px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;font-size:9px;cursor:pointer;">WASD</button>
          <button data-layout="zqsd" style="flex:1;padding:5px 2px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;font-size:9px;cursor:pointer;">ZQSD</button>
        </div>
        <div style="font-size:9px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Taille</div>
        <input type="range" id="volt-key-size-slider" min="60" max="160" value="100" style="width:100%;accent-color:#c17f59;">`;

        document.body.appendChild(panel);

        chrome.storage.local.get(['keypressSettings'], function (r) {
          const ks = r.keypressSettings || {};
          const curLayout = ks.layout || 'arrows';
          const curSize = Math.round((ks.size || 1) * 100);
          panel.querySelectorAll('[data-layout]').forEach(b => {
            if (b.dataset.layout === curLayout) b.style.background = 'rgba(193,127,89,0.3)', b.style.borderColor = 'rgba(193,127,89,0.6)';
          });
          const slider = panel.querySelector('#volt-key-size-slider');
          if (slider) slider.value = curSize;
        });

        panel.querySelectorAll('[data-layout]').forEach(btn => {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const layout = btn.dataset.layout;
            panel.querySelectorAll('[data-layout]').forEach(b => {
              b.style.background = 'rgba(255,255,255,0.08)';
              b.style.borderColor = 'rgba(255,255,255,0.15)';
            });
            btn.style.background = 'rgba(193,127,89,0.3)';
            btn.style.borderColor = 'rgba(193,127,89,0.6)';
            chrome.storage.local.get('keypressSettings', function (rs) {
              const ks = Object.assign({}, rs.keypressSettings || {}, { layout });
              chrome.storage.local.set({ keypressSettings: ks });
              chrome.runtime.sendMessage({ action: 'saveKeypressSettings', visible: ks.visible, layout, size: ks.size, theme: ks.theme });
            });
          });
        });

        const sizeSlider = panel.querySelector('#volt-key-size-slider');
        if (sizeSlider) {
          sizeSlider.addEventListener('change', function () {
            const size = parseInt(sizeSlider.value) / 100;
            chrome.storage.local.get('keypressSettings', function (r) {
              const ks = Object.assign({}, r.keypressSettings || {}, { size });
              chrome.storage.local.set({ keypressSettings: ks });
              chrome.runtime.sendMessage({ action: 'saveKeypressSettings', visible: ks.visible, layout: ks.layout, size, theme: ks.theme });
            });
          });
        }

        const closePanel = function (e) {
          if (!panel.contains(e.target)) { panel.remove();
            document.removeEventListener('click', closePanel, true); }
        };
        setTimeout(() => document.addEventListener('click', closePanel, true), 50);
      }

      btnKeys.addEventListener('mousedown', function () {
        _keysLongPressed = false;
        _keysLongPressTimer = setTimeout(function () {
          _keysLongPressed = true;
          _openKeyLayoutPanel();
        }, 400);
      });
      btnKeys.addEventListener('mouseup', function () { clearTimeout(_keysLongPressTimer); });
      btnKeys.addEventListener('mouseleave', function () { clearTimeout(_keysLongPressTimer); });
      btnKeys.addEventListener('click', function (e) {
        e.stopPropagation();
        if (_keysLongPressed) { _keysLongPressed = false; return; }
        typeof vt === 'function' && vt();
        btnKeys.classList.toggle('volt-tray-active', !!P);
      });
      btnPerf.addEventListener('click', function (e) {
        e.stopPropagation();
        if (typeof chrome === 'undefined' || !chrome.storage) return;
        chrome.storage.local.get(['performanceMode'], function (r) {
          const _newPerf = !r.performanceMode;
          chrome.storage.local.set({ performanceMode: _newPerf });
          btnPerf.classList.toggle('volt-tray-active', _newPerf);
          try { chrome.runtime.sendMessage({ action: 'setPerformanceMode', enabled: _newPerf }); } catch (_) {}
        });
      });

      // Drag to reposition vertically
      let _trayDragging = false,
        _trayStartY = 0,
        _trayStartTop = 0;
      tray.addEventListener('mousedown', function (e) {
        if (e.target !== tray && !e.target.classList.contains('volt-tray-sep')) return;
        _trayDragging = true;
        _trayStartY = e.clientY;
        _trayStartTop = tray.getBoundingClientRect().top;
        tray.classList.add('volt-tray-dragging');
        e.preventDefault();
      });
      document.addEventListener('mousemove', function (e) {
        if (!_trayDragging) return;
        const delta = e.clientY - _trayStartY;
        const newTop = Math.max(0, Math.min(window.innerHeight - tray.offsetHeight, _trayStartTop + delta));
        tray.style.top = newTop + 'px';
        tray.style.transform = 'none';
      });
      document.addEventListener('mouseup', function () {
        if (!_trayDragging) return;
        _trayDragging = false;
        tray.classList.remove('volt-tray-dragging');
      });

      // Auto-hide after 3s inactivity, show on hover
      let _trayHideTimer = null;

      function _trayScheduleHide() {
        clearTimeout(_trayHideTimer);
        _trayHideTimer = setTimeout(() => { tray.style.opacity = '0.25'; }, 3000);
      }
      tray.addEventListener('mouseenter', function () {
        clearTimeout(_trayHideTimer);
        tray.style.opacity = '1';
      });
      tray.addEventListener('mouseleave', _trayScheduleHide);
      _trayScheduleHide();

      // Listen for storage changes to keep tray state in sync with real feature state
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.addListener(function (changes) {
          if (changes.timerSettings) btnTimer.classList.toggle('volt-tray-active', !!changes.timerSettings.newValue?.visible);
          if (changes.fpsSettings) btnFps.classList.toggle('volt-tray-active', !!changes.fpsSettings.newValue?.visible);
          if (changes.keypressSettings) btnKeys.classList.toggle('volt-tray-active', !!changes.keypressSettings.newValue?.visible);
          if (changes.performanceMode) btnPerf.classList.toggle('volt-tray-active', !!changes.performanceMode.newValue);
        });
      }
    } catch (_) {}
  })();

  // ============================================================
  // Wave 5 — Feature 7: Drag individuel par touche (keyPositions)
  // ============================================================
  (function _voltIndividualKeyDrag() {
    'use strict';

    var _voltKeyPositions = {};

    function _voltLoadKeyPositions() {
      if (typeof chrome === 'undefined' || !chrome.storage) return;
      chrome.storage.local.get(['keyPositions'], function (r) {
        _voltKeyPositions = r.keyPositions || {};
        _voltApplyKeyPositions();
      });
    }

    function _voltApplyKeyPositions() {
      var keyIds = ['key-up', 'key-down', 'key-left', 'key-right'];
      var overlay = document.getElementById('key-display-overlay');
      if (!overlay) return;
      keyIds.forEach(function (keyId) {
        var el = overlay.querySelector('#' + keyId);
        if (!el) return;
        var pos = _voltKeyPositions[keyId];
        if (pos) {
          el.style.position = 'absolute';
          el.style.left = pos.x + 'px';
          el.style.top = pos.y + 'px';
          el.style.zIndex = '1';
        } else {
          el.style.position = '';
          el.style.left = '';
          el.style.top = '';
        }
        // Wire drag if not already done
        if (!el._voltKeyDragInit) {
          el._voltKeyDragInit = true;
          el.addEventListener('mousedown', function (e) {
            // Only drag when holding Shift to avoid interfering with game controls
            if (!e.shiftKey) return;
            e.stopPropagation();
            e.preventDefault();
            var curPos = _voltKeyPositions[keyId] || { x: 0, y: 0 };
            var startX = e.clientX - curPos.x;
            var startY = e.clientY - curPos.y;

            function onMove(mv) {
              var x = mv.clientX - startX;
              var y = mv.clientY - startY;
              el.style.position = 'absolute';
              el.style.left = x + 'px';
              el.style.top = y + 'px';
            }

            function onUp(mu) {
              document.removeEventListener('mousemove', onMove, true);
              document.removeEventListener('mouseup', onUp, true);
              var x = mu.clientX - startX;
              var y = mu.clientY - startY;
              _voltKeyPositions[keyId] = { x: x, y: y };
              if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set({ keyPositions: _voltKeyPositions });
              }
            }
            document.addEventListener('mousemove', onMove, true);
            document.addEventListener('mouseup', onUp, true);
          });
        }
      });
    }

    // Re-apply when overlay appears (MutationObserver)
    var _keyDragObserver = new MutationObserver(function () {
      var overlay = document.getElementById('key-display-overlay');
      if (overlay) _voltApplyKeyPositions();
    });
    _keyDragObserver.observe(document.documentElement, { childList: true, subtree: true });

    // Listen for storage changes
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === 'local' && changes.keyPositions) {
          _voltKeyPositions = changes.keyPositions.newValue || {};
          _voltApplyKeyPositions();
        }
      });
    }

    // Listen for reset message from popup
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(function (msg) {
        if (msg && msg.action === 'resetKeyPositions') {
          _voltKeyPositions = {};
          var keyIds = ['key-up', 'key-down', 'key-left', 'key-right'];
          var overlay = document.getElementById('key-display-overlay');
          if (overlay) {
            keyIds.forEach(function (id) {
              var el = overlay.querySelector('#' + id);
              if (el) { el.style.position = '';
                el.style.left = '';
                el.style.top = ''; }
            });
          }
        }
      });
    }

    // Initial load
    _voltLoadKeyPositions();
  }());

  // ============================================================
  // Wave 5 — Feature 8: Input lag estimé dans FPS overlay
  // ============================================================
  (function _voltInputLag() {
    'use strict';

    var _voltShowInputLag = false;
    var _voltInputLagSamples = [];
    var _voltAvgInputLag = null;
    var _voltPendingKeyTime = null;
    var _voltInputLagEl = null;

    function _voltEnsureLagEl() {
      var fpsOverlay = document.getElementById('fps-monitor-overlay');
      if (!fpsOverlay) { _voltInputLagEl = null; return; }
      if (!_voltInputLagEl || !_voltInputLagEl.isConnected) {
        _voltInputLagEl = fpsOverlay.querySelector('#volt-input-lag-display');
        if (!_voltInputLagEl) {
          _voltInputLagEl = document.createElement('div');
          _voltInputLagEl.id = 'volt-input-lag-display';
          _voltInputLagEl.style.cssText = 'font-size:9px;opacity:0.8;text-align:center;pointer-events:none;margin-top:2px;';
          fpsOverlay.appendChild(_voltInputLagEl);
        }
      }
    }

    function _voltUpdateLagDisplay() {
      _voltEnsureLagEl();
      if (!_voltInputLagEl) return;
      if (!_voltShowInputLag) {
        _voltInputLagEl.style.display = 'none';
        return;
      }
      _voltInputLagEl.style.display = '';
      _voltInputLagEl.textContent = _voltAvgInputLag !== null ?
        'Lag: ' + Math.round(_voltAvgInputLag) + 'ms' :
        'Lag: …';
    }

    // Record keydown timestamp
    document.addEventListener('keydown', function () {
      _voltPendingKeyTime = performance.now();
    }, true);

    // Sample lag via rAF
    // PERF: only schedule when the overlay is enabled. The previous code
    // ran 60 callbacks/sec on every game tab forever, even when disabled.
    var _voltLagRafId = null;
    function _voltLagRafLoop() {
      if (!_voltShowInputLag) { _voltLagRafId = null; return; }
      if (_voltPendingKeyTime !== null) {
        var lag = performance.now() - _voltPendingKeyTime;
        _voltPendingKeyTime = null;
        if (lag > 0 && lag < 200) {
          _voltInputLagSamples.push(lag);
          if (_voltInputLagSamples.length > 10) _voltInputLagSamples.shift();
          _voltAvgInputLag = _voltInputLagSamples.reduce(function (a, b) { return a + b; }, 0) / _voltInputLagSamples.length;
          _voltUpdateLagDisplay();
        }
      }
      _voltLagRafId = requestAnimationFrame(_voltLagRafLoop);
    }
    function _voltLagEnsureRunning() {
      if (_voltShowInputLag && _voltLagRafId === null) {
        _voltLagRafId = requestAnimationFrame(_voltLagRafLoop);
      }
    }

    // Init from storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['showInputLag'], function (v) {
        _voltShowInputLag = !!v.showInputLag;
        _voltUpdateLagDisplay();
        _voltLagEnsureRunning();
      });
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === 'local' && changes.showInputLag !== undefined) {
          _voltShowInputLag = !!changes.showInputLag.newValue;
          if (!_voltShowInputLag) { _voltAvgInputLag = null;
            _voltInputLagSamples = []; }
          _voltUpdateLagDisplay();
          _voltLagEnsureRunning();
        }
      });
    }

    // Listen for popup toggle message
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(function (msg) {
        if (msg && msg.action === 'setShowInputLag') {
          _voltShowInputLag = !!msg.val;
          if (!_voltShowInputLag) { _voltAvgInputLag = null;
            _voltInputLagSamples = []; }
          _voltUpdateLagDisplay();
          _voltLagEnsureRunning();
        }
      });
    }
  }());

})();
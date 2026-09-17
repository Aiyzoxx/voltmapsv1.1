// @ts-check
// ============================================================
// Volt Extension — Security & Unity Hooks
// Injected into page context (Main World)
// ============================================================

(function () {
  const targetHosts = ["ss.randomkzn.com", "yell0wsuit.page", "surfmap-run.vercel.app", "localhost:3007"];
  // Architecture note: this script runs in the main world. A true nonce requires
  // the content script (isolated world) to inject it before this script loads.
  // Hardening the postMessage channel against page-level forgery therefore
  // requires a content.js change. The current threat model accepts that official
  // game pages do not spoof VOLT_SECURITY messages against their own players.
  const protectedHost = targetHosts.some(host => window.location.hostname.includes(host));
  if (protectedHost && !window.__VOLT_NATIVE_TIME_GUARD__) {
    const nativeDateNow = Date.now;
    const nativePerfNowFn = performance.now;
    const nativePerfNow = nativePerfNowFn.bind(performance);
    const nativeRaf = window.requestAnimationFrame;
    const nativeCancelRaf = window.cancelAnimationFrame;
    // SEC FIX: capture reload reference at boot so page cannot override
    // window.location.reload before our setTimeout fires.
    const nativeReload = window.location.reload.bind(window.location);
    const bootDate = nativeDateNow();
    const bootPerf = nativePerfNow();
    let blocked = false;
    let timeScalePatcherSeen = false;
    /** @param {Function} fn */
    const isNativeFn = (fn) => {
      try { return /\{\s*\[native code\]\s*\}/.test(Function.prototype.toString.call(fn)); }
      catch (_) { return false; }
    };

    const hasTimeScalePatcher = () => {
      if (timeScalePatcherSeen) return true;
      try {
        const patcher = window.__timeScalePatcher;
        if (!patcher) return false;
        if (typeof patcher !== "object") return true;
        const scale = Number(patcher.scale);
        return typeof patcher.undo === "function" || (Number.isFinite(scale) && scale > 0 && scale !== 1);
      } catch (_) {
        return true;
      }
    };

    /** @param {string} reason */
    const reportSpeedhack = (reason) => {
      if (blocked) return;
      blocked = true;
      try {
        Object.defineProperty(window, "__VOLT_SPEEDHACK_BLOCKED__", {
          value: true,
          configurable: false,
          writable: false
        });
      } catch (_) {
        window.__VOLT_SPEEDHACK_BLOCKED__ = true;
      }
      try {
        window.postMessage({
          source: "VOLT_SECURITY",
          type: "SPEEDHACK_DETECTED",
          reason: String(reason || "time_tamper").slice(0, 80)
        }, window.location.origin);
      } catch (_) {}
      setTimeout(() => {
        try { nativeReload(); } catch (_) {}
      }, 120);
    };

    try {
      Object.defineProperty(window, "__VOLT_NATIVE_TIME_GUARD__", {
        value: true,
        configurable: false,
        writable: false
      });
    } catch (_) {
      window.__VOLT_NATIVE_TIME_GUARD__ = true;
    }

    try {
      if (hasTimeScalePatcher()) reportSpeedhack("time_scale_patcher");
      const timeScaleDescriptor = Object.getOwnPropertyDescriptor(window, "__timeScalePatcher");
      if (!timeScaleDescriptor || timeScaleDescriptor.configurable) {
        Object.defineProperty(window, "__timeScalePatcher", {
          configurable: false,
          get: () => undefined,
          set: () => {
            timeScalePatcherSeen = true;
            reportSpeedhack("time_scale_patcher");
          }
        });
      }
    } catch (_) {
      if (hasTimeScalePatcher()) reportSpeedhack("time_scale_patcher");
    }

    const checkTimeGuard = () => {
      try {
        if (hasTimeScalePatcher()) return reportSpeedhack("time_scale_patcher");
        if (!isNativeFn(nativeDateNow) || !isNativeFn(nativePerfNowFn) || !isNativeFn(nativeRaf)) return reportSpeedhack("time_hook_preloaded");
        if (Date.now !== nativeDateNow) return reportSpeedhack("date_now_hooked");
        if (performance.now !== nativePerfNowFn) return reportSpeedhack("performance_now_hooked");
        if (window.requestAnimationFrame !== nativeRaf) return reportSpeedhack("raf_hooked");
        if (window.cancelAnimationFrame !== nativeCancelRaf) return reportSpeedhack("cancel_raf_hooked");
        const realElapsed = nativeDateNow() - bootDate;
        const perfElapsed = nativePerfNow() - bootPerf;
        if (realElapsed > 3000 && Math.abs(realElapsed - perfElapsed) > 750) return reportSpeedhack("clock_drift");
      } catch (_) {
        reportSpeedhack("time_guard_error");
      }
    };

    setInterval(checkTimeGuard, 500);
    setTimeout(checkTimeGuard, 0);
  }

  if (targetHosts.some(host => window.location.hostname.includes(host))) {
    /** @param {string | URL} url */
    const blockRedirect = (url) => {
      if (!url) return false;
      const u = String(url).toLowerCase();
      if (u.includes("supported") || u.includes("redirect")) {
        console.warn("[VOLT] Bypass protection : Redirection bloquée vers", url);
        return true;
      }
      return false;
    };
    try {
      const originalAssign = window.location.assign;
      const originalReplace = window.location.replace;
      window.location.assign = /** @param {string | URL} url */ function (url) {
        if (!blockRedirect(url)) return originalAssign.call(window.location, /** @type {string | URL} */ (url));
      };
      window.location.replace = /** @param {string | URL} url */ function (url) {
        if (!blockRedirect(url)) return originalReplace.call(window.location, /** @type {string | URL} */ (url));
      };
    } catch (_e) { }

    // SEC FIX: force-redefine even if a page-side configurable property already exists.
    try {
      Reflect.defineProperty(window, 'UnityDomainCheck', { get: () => true, set: () => { }, configurable: false });
    } catch (_) {
      try { Object.defineProperty(window, 'UnityDomainCheck', { get: () => true, set: () => { }, configurable: false }); } catch (__) {}
    }
  }

  // Unity engine hooks
  let _u = false;
  const createUnityDescriptor = Object.getOwnPropertyDescriptor(window, 'createUnityInstance');
  if (!createUnityDescriptor || createUnityDescriptor.configurable) {
    Object.defineProperty(window, 'createUnityInstance', {
      get: function () { return window._g_u || undefined; },
      set: /** @param {any} v */ function (v) {
        if (typeof v === 'function' && !_u) {
          _u = true;
          window._g_u = /** @param {any} c @param {any} cfg @param {any} _p */ function (c, cfg, _p) {
            if (cfg) { cfg.devicePixelRatio = 1; }
            return v.apply(this, arguments);
          };
        } else window._g_u = v;
      },
      // SEC FIX: lock once set so attacker cannot redefine + restore real fn.
      configurable: false
    });
  }
})();

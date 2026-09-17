// ============================================================
// bg/settings.js — Volt Extension v16
// Handles: timer, keypress, zqsd, resolution, adblock,
//          volume, fps, performanceMode settings
// ============================================================

/**
 * @param {string} action
 * @param {object} message
 * @param {function} sendResponse
 * @param {object} ctx — { log, incrementBlockCount }
 * @returns {boolean} true if action was handled
 */
self.handleSettings = async function(action, message, sendResponse, ctx) {
  const { log: _log, incrementBlockCount } = ctx;
  const clampNumber = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const sanitizePosition = (position, fallback = { x: 20, y: 20 }) => {
    const x = clampNumber(position?.x, 0, 10000, fallback.x);
    const y = clampNumber(position?.y, 0, 10000, fallback.y);
    return { x: Math.round(x), y: Math.round(y) };
  };
  const sanitizeSize = (size, fallback = { width: 300, height: 80 }) => {
    const width = clampNumber(size?.width, 40, 2000, fallback.width);
    const height = clampNumber(size?.height, 30, 1200, fallback.height);
    return { width: Math.round(width), height: Math.round(height) };
  };
  const sanitizeColor = (color, fallback = "#FFFFFF") => {
    const value = String(color || "").trim();
    return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  };
  const sanitizeResolutionMode = (mode, fallback = "default") => {
    const value = String(mode || "").trim();
    const fixedModes = new Set(["608x1080", "890x1080", "custom", "default", "none"]);
    if (fixedModes.has(value) || /^\d{2,4}x\d{2,4}$/i.test(value)) return value;
    return fallback;
  };
  const storageGet = async (keys, fallback = {}) => {
    try {
      const res = await chrome.storage.local.get(keys);
      return res || fallback;
    } catch (_) {
      return fallback;
    }
  };
  const storageSet = async (values) => {
    try {
      await chrome.storage.local.set(values);
      return true;
    } catch (_) {
      return false;
    }
  };

  switch (action) {

    // ── TIMER ──────────────────────────────────────────────
    case "saveTimerSettings": {
      const ok = await storageSet({
        timerSettings: {
          position: sanitizePosition(message.position),
          size: sanitizeSize(message.size),
          visible: !!message.visible
        },
      });
      sendResponse({ success: ok, ...(ok ? {} : { error: 'storage_failed' }) });
      return true;
    }

    case "getTimerSettings": {
      const { timerSettings } = await storageGet(["timerSettings"]);
      const defaultTimer = { position: { x: 20, y: 20 }, size: { width: 300, height: 80 }, visible: false };
      const stored = timerSettings && typeof timerSettings === "object" ? timerSettings : {};
      const settings = {
        position: sanitizePosition(stored.position, defaultTimer.position),
        size: sanitizeSize(stored.size, defaultTimer.size),
        visible: typeof stored.visible === "boolean" ? stored.visible : defaultTimer.visible
      };
      sendResponse({ settings });
      return true;
    }

    // ── KEYPRESS ───────────────────────────────────────────
    case "saveKeypressSettings": {
      const { keypressSettings: oldSettings } = await storageGet(["keypressSettings"]);
      const defaultSettings = { visible: false, size: 1, layout: "arrows", theme: "default", position: null };
      const currentSettings = oldSettings || defaultSettings;
      const newSize = typeof message.size === "number" ? Math.min(1.6, Math.max(0.6, message.size)) : currentSettings.size;
      const layoutStr = typeof message.layout === "string" ? message.layout.toLowerCase() : null;
      const validLayouts = ["arrows", "wasd", "zqsd", "custom"];
      const newLayout = layoutStr && validLayouts.includes(layoutStr) ? layoutStr : currentSettings.layout;
      const themeStr = typeof message.theme === "string" ? message.theme.toLowerCase() : null;
      const validThemes = ["default", "classic", "minimal", "block", "block-white", "retro"];
      const themeMap = { neon: "block", ocean: "classic", sunset: "retro", frost: "minimal", carbon: "block", cyber: "classic", pastel: "minimal", circular: "classic", capsule: "classic", holo: "classic", split: "classic" };
      let newTheme = currentSettings.theme || "default";
      if (themeStr) {
        if (validThemes.includes(themeStr)) newTheme = themeStr;
        else if (themeMap[themeStr]) newTheme = themeMap[themeStr];
      }
      let newPosition = currentSettings.position || null;
      if (message.position && typeof message.position === "object") {
        const x = Number(message.position.x);
        const y = Number(message.position.y);
        if (Number.isFinite(x) && Number.isFinite(y)) newPosition = { x: Math.round(x), y: Math.round(y) };
      }
      const newSettings = {
        visible: typeof message.visible === "boolean" ? message.visible : currentSettings.visible,
        size: newSize, layout: newLayout, theme: newTheme, position: newPosition,
      };
      const ok = await storageSet({ keypressSettings: newSettings });
      sendResponse({ success: ok, settings: newSettings, ...(ok ? {} : { error: 'storage_failed' }) });
      return true;
    }

    case "getKeypressSettings": {
      const { keypressSettings } = await storageGet(["keypressSettings"]);
      const defaultSettings = { visible: false, size: 1, layout: "arrows", theme: "default", position: null };
      const stored = keypressSettings && typeof keypressSettings === "object" ? keypressSettings : {};
      const validLayouts = ["arrows", "wasd", "zqsd", "custom"];
      const validThemes = ["default", "classic", "minimal", "block", "block-white", "retro"];
      const layout = typeof stored.layout === "string" && validLayouts.includes(stored.layout.toLowerCase()) ? stored.layout.toLowerCase() : defaultSettings.layout;
      const theme = typeof stored.theme === "string" && validThemes.includes(stored.theme.toLowerCase()) ? stored.theme.toLowerCase() : defaultSettings.theme;
      const size = clampNumber(stored.size, 0.6, 1.6, defaultSettings.size);
      const position = stored.position && typeof stored.position === "object" ? sanitizePosition(stored.position, { x: 20, y: 20 }) : null;
      sendResponse({ settings: {
        visible: typeof stored.visible === "boolean" ? stored.visible : defaultSettings.visible,
        size,
        layout,
        theme,
        position
      } });
      return true;
    }

    // ── ZQSD ───────────────────────────────────────────────
    case "saveZqsdState": {
      const ok = await storageSet({ zqsdActive: !!message.active });
      sendResponse({ success: ok, ...(ok ? {} : { error: 'storage_failed' }) });
      return true;
    }

    case "getZqsdState": {
      const { zqsdActive } = await storageGet(["zqsdActive"]);
      sendResponse({ active: zqsdActive || false });
      return true;
    }

    // ── RESOLUTION ─────────────────────────────────────────
    case "saveResolutionState": {
      const mode = sanitizeResolutionMode(message.mode, null);
      const newState = { resolutionActive: !!message.active, resolutionMode: mode };
      if (mode) newState.selectedResolutionMode = mode;
      const ok = await storageSet(newState);
      sendResponse({ success: ok, ...(ok ? {} : { error: 'storage_failed' }) });
      return true;
    }

    case "getResolutionState": {
      const { resolutionActive, resolutionMode } = await storageGet(["resolutionActive", "resolutionMode"]);
      sendResponse({ active: resolutionActive || false, mode: resolutionMode || null });
      return true;
    }

    case "getResolutionSettings": {
      const { selectedResolutionMode, blackBarsEnabled } = await storageGet(["selectedResolutionMode", "blackBarsEnabled"]);
      sendResponse({ selectedResolutionMode, blackBarsEnabled });
      return true;
    }

    case "saveResolutionSettings": {
      const selectedResolutionMode = sanitizeResolutionMode(message.selectedResolutionMode, "default");
      const ok = await storageSet({ selectedResolutionMode, blackBarsEnabled: !!message.blackBarsEnabled });
      sendResponse({ success: ok, ...(ok ? {} : { error: 'storage_failed' }) });
      return true;
    }

    // ── ADBLOCK ────────────────────────────────────────────
    case "enableAdblock": {
      const ok = await storageSet({ adblockActive: true });
      try {
        if (chrome.declarativeNetRequest?.updateEnabledRulesets) {
          await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ['ruleset_1'] });
        }
      } catch (_) {}
      sendResponse({ success: ok, ...(ok ? {} : { error: 'storage_failed' }) });
      return true;
    }

    case "disableAdblock": {
      const ok = await storageSet({ adblockActive: false });
      try {
        if (chrome.declarativeNetRequest?.updateEnabledRulesets) {
          await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ['ruleset_1'] });
        }
      } catch (_) {}
      sendResponse({ success: ok, ...(ok ? {} : { error: 'storage_failed' }) });
      return true;
    }

    case "getAdblockState": {
      const { adblockActive, adblockStats } = await storageGet(["adblockActive", "adblockStats"]);
      sendResponse({ active: adblockActive !== undefined ? adblockActive : false, stats: adblockStats || { today: 0, total: 0 } });
      return true;
    }

    case "resetAdblockStats": {
      const ok = await storageSet({ adblockStats: { today: 0, total: 0, lastReset: new Date().toDateString() }, adsBlocked: 0, sessionBlocked: 0 });
      sendResponse({ success: ok, ...(ok ? {} : { error: 'storage_failed' }) });
      return true;
    }

    case "adBlocked":
      await incrementBlockCount(clampNumber(message.count, 1, 100, 1));
      sendResponse({ success: true });
      return true;

    // ── VOLUME ─────────────────────────────────────────────
    case "saveGlobalVolume": {
      const ok = await storageSet({ globalVolumeLevel: clampNumber(message.globalVolumeLevel, 0, 1, 1) });
      sendResponse({ success: ok, ...(ok ? {} : { error: 'storage_failed' }) });
      return true;
    }

    // ── FPS ────────────────────────────────────────────────
    case "saveFpsSettings": {
      const { fpsSettings: oldFpsSettings } = await storageGet(["fpsSettings"]);
      const current = oldFpsSettings && typeof oldFpsSettings === "object" ? oldFpsSettings : {};
      const fpsSettings = {
        ...current,
        position: message.position ? sanitizePosition(message.position, current.position || { x: 20, y: 100 }) : sanitizePosition(current.position, { x: 20, y: 100 }),
        visible: typeof message.visible === "boolean" ? message.visible : (typeof current.visible === "boolean" ? current.visible : false),
        mode: message.mode !== undefined ? (message.mode === "minimal" ? "minimal" : "normal") : (current.mode === "minimal" ? "minimal" : "normal"),
        color: message.color !== undefined ? sanitizeColor(message.color, current.color || "#FFFFFF") : sanitizeColor(current.color, "#FFFFFF"),
        showBg: message.showBg !== undefined ? message.showBg !== false : current.showBg !== false,
        fontSize: message.fontSize !== undefined ? clampNumber(message.fontSize, 10, 120, current.fontSize || 36) : clampNumber(current.fontSize, 10, 120, 36)
      };
      if (message.size) fpsSettings.size = sanitizeSize(message.size, current.size || { width: 120, height: 70 });
      else if (current.size) fpsSettings.size = sanitizeSize(current.size, { width: 120, height: 70 });
      const ok = await storageSet({ fpsSettings });
      sendResponse({ success: ok, settings: fpsSettings, ...(ok ? {} : { error: 'storage_failed' }) });
      return true;
    }

    case "getFpsSettings": {
      const { fpsSettings } = await storageGet(["fpsSettings"]);
      const defaultFps = { position: { x: 20, y: 100 }, visible: false, mode: 'normal', color: '#FFFFFF', showBg: true, fontSize: 36 };
      const stored = fpsSettings && typeof fpsSettings === "object" ? fpsSettings : {};
      const settings = {
        position: sanitizePosition(stored.position, defaultFps.position),
        visible: typeof stored.visible === "boolean" ? stored.visible : defaultFps.visible,
        mode: stored.mode === "minimal" ? "minimal" : "normal",
        color: sanitizeColor(stored.color, defaultFps.color),
        showBg: stored.showBg !== false,
        fontSize: clampNumber(stored.fontSize, 10, 120, defaultFps.fontSize)
      };
      if (stored.size && typeof stored.size === "object") {
        settings.size = sanitizeSize(stored.size, { width: 120, height: 70 });
      }
      sendResponse({ settings });
      return true;
    }

    // ── PERFORMANCE MODE ───────────────────────────────────
    case "setPerformanceMode": {
      const ok = await storageSet({ performanceMode: !!message.enabled });
      sendResponse({ success: ok, ...(ok ? {} : { error: 'storage_failed' }) });
      return true;
    }

    case "getPerformanceMode": {
      const { performanceMode } = await storageGet(["performanceMode"]);
      sendResponse({ enabled: performanceMode !== false });
      return true;
    }

    default:
      return false; // Not handled by this module
  }
}

const NocoinStorage = {
  DEFAULTS: {
    customHotkey: "Control",
    timerSettings: { position: { x: 20, y: 20 }, size: { width: 320, height: 80 }, visible: false },
    fpsSettings: { position: { x: 20, y: 100 }, visible: false },
    keypressSettings: { visible: false, size: 1, layout: "arrows", theme: "default", position: null },
    timerColors: { stopped: "#FFFFFF", running: "#FFFFFF", paused: "#FFFFFF" },
    globalVolumeLevel: 1,
    zqsdActive: false,
    zqsdKeys: { up: "", down: "", left: "", right: "" },
    resolutionActive: false,
    resolutionMode: null,
    selectedResolutionMode: "608x1080",
    adblockActive: true,
    adsBlocked: 0,
    sessionBlocked: 0,
    adblockStats: { today: 0, total: 0, lastReset: new Date().toDateString() },
    spotifyPlaylistUrl: "https://soundcloud.com/bdwx/sets/u7j3r9nbxpeu",
    language: null,
  },

  get(keys, callback) {
    let result = {};
    if (keys === null || keys === undefined) {
      for (const k of Object.keys(this.DEFAULTS)) {
        const raw = localStorage.getItem('nocoin_' + k);
        if (raw === null) result[k] = this.DEFAULTS[k];
        else { try { result[k] = JSON.parse(raw); } catch { result[k] = raw; } }
      }
    } else if (typeof keys === 'string') {
      const raw = localStorage.getItem('nocoin_' + keys);
      if (raw === null) result[keys] = this.DEFAULTS[keys];
      else { try { result[keys] = JSON.parse(raw); } catch { result[keys] = raw; } }
    } else if (Array.isArray(keys)) {
      for (const k of keys) {
        const raw = localStorage.getItem('nocoin_' + k);
        if (raw === null) result[k] = this.DEFAULTS[k];
        else { try { result[k] = JSON.parse(raw); } catch { result[k] = raw; } }
      }
    } else if (typeof keys === 'object') {
      for (const k of Object.keys(keys)) {
        const raw = localStorage.getItem('nocoin_' + k);
        if (raw === null) result[k] = keys[k] !== undefined ? keys[k] : this.DEFAULTS[k];
        else { try { result[k] = JSON.parse(raw); } catch { result[k] = raw; } }
      }
    }
    
    if (callback) { callback(result); return; }
    return Promise.resolve(result);
  },

  set(items, callback) {
    if (typeof items === 'string') {
      // Not standard, but just in case
      localStorage.setItem('nocoin_' + items, JSON.stringify(arguments[1]));
    } else if (typeof items === 'object') {
      for (const k of Object.keys(items)) {
        localStorage.setItem('nocoin_' + k, JSON.stringify(items[k]));
      }
    }
    
    if (callback) { callback(); return; }
    return Promise.resolve();
  },

  _getSync(key) {
    const raw = localStorage.getItem('nocoin_' + key);
    if (raw === null) return this.DEFAULTS[key] !== undefined ? this.DEFAULTS[key] : null;
    try { return JSON.parse(raw); } catch { return raw; }
  },

  _setSync(key, value) {
    localStorage.setItem('nocoin_' + key, JSON.stringify(value));
  },

  async dispatch(action, payload = {}) {
    switch (action) {
      case "getHotkey": return { hotkey: this._getSync('customHotkey') || "Control" };
      case "saveHotkey": this._setSync('customHotkey', payload.hotkey); return { success: true };
      case "getZqsdKeys": return { keys: this._getSync('zqsdKeys') };
      case "saveZqsdKeys": this._setSync('zqsdKeys', payload.keys); return { success: true };
      case "getTimerColors": return { colors: this._getSync('timerColors') };
      case "saveTimerColors": this._setSync('timerColors', payload.colors); return { success: true };
      case "saveTimerSettings":
        this._setSync('timerSettings', { position: payload.position, size: payload.size, visible: payload.visible });
        return { success: true };
      case "getTimerSettings": return { settings: this._getSync('timerSettings') };
      case "saveFpsSettings":
        this._setSync('fpsSettings', { position: payload.position, visible: payload.visible });
        return { success: true };
      case "getFpsSettings": return { settings: this._getSync('fpsSettings') };
      case "saveKeypressSettings": {
        const old = this._getSync('keypressSettings') || this.DEFAULTS.keypressSettings;
        const validLayouts = ["arrows", "wasd", "zqsd"];
        const validThemes = ["default", "classic", "minimal", "block", "block-white", "retro"];
        const themeMap = { neon:"block", ocean:"classic", sunset:"retro", frost:"minimal", carbon:"block", cyber:"classic", pastel:"minimal" };
        const newSize = typeof payload.size === "number" ? Math.min(1.6, Math.max(0.6, payload.size)) : old.size;
        const layoutStr = typeof payload.layout === "string" ? payload.layout.toLowerCase() : null;
        let newLayout = layoutStr && validLayouts.includes(layoutStr) ? layoutStr : old.layout;
        const themeStr = typeof payload.theme === "string" ? payload.theme.toLowerCase() : null;
        let newTheme = old.theme || "default";
        if (themeStr) {
          if (validThemes.includes(themeStr)) newTheme = themeStr;
          else if (themeMap[themeStr]) newTheme = themeMap[themeStr];
        }
        let newPosition = old.position || null;
        if (payload.position && typeof payload.position === "object") {
          const x = Number(payload.position.x), y = Number(payload.position.y);
          if (Number.isFinite(x) && Number.isFinite(y)) newPosition = { x: Math.round(x), y: Math.round(y) };
        }
        const newSettings = {
          visible: typeof payload.visible === "boolean" ? payload.visible : old.visible,
          size: newSize, layout: newLayout, theme: newTheme, position: newPosition
        };
        this._setSync('keypressSettings', newSettings);
        return { success: true, settings: newSettings };
      }
      case "getKeypressSettings": return { settings: this._getSync('keypressSettings') };
      case "saveZqsdState": this._setSync('zqsdActive', payload.active); return { success: true };
      case "getZqsdState": return { active: this._getSync('zqsdActive') || false };
      case "saveResolutionState": {
        this._setSync('resolutionActive', payload.active);
        if (payload.mode) { this._setSync('resolutionMode', payload.mode); this._setSync('selectedResolutionMode', payload.mode); }
        return { success: true };
      }
      case "getResolutionState": return { active: this._getSync('resolutionActive') || false, mode: this._getSync('resolutionMode') };
      case "enableAdblock": this._setSync('adblockActive', true); return { success: true };
      case "disableAdblock": this._setSync('adblockActive', false); return { success: true };
      case "getAdblockState": return { active: this._getSync('adblockActive') !== false, stats: this._getSync('adblockStats') || { today: 0, total: 0 } };
      case "resetAdblockStats":
        this._setSync('adblockStats', { today: 0, total: 0, lastReset: new Date().toDateString() });
        this._setSync('adsBlocked', 0); this._setSync('sessionBlocked', 0);
        return { success: true };
      case "adBlocked": {
        const stats = this._getSync('adblockStats') || { today: 0, total: 0, lastReset: new Date().toDateString() };
        const today = new Date().toDateString();
        if (stats.lastReset !== today) { stats.today = 0; stats.lastReset = today; }
        stats.today += 1; stats.total += 1;
        this._setSync('adblockStats', stats);
        this._setSync('adsBlocked', (this._getSync('adsBlocked') || 0) + 1);
        return { success: true };
      }
      case "getResolutionSettings": return { selectedResolutionMode: this._getSync('selectedResolutionMode'), blackBarsEnabled: this._getSync('blackBarsEnabled') };
      case "saveResolutionSettings":
        this._setSync('selectedResolutionMode', payload.selectedResolutionMode);
        this._setSync('blackBarsEnabled', payload.blackBarsEnabled);
        return { success: true };
      case "getGlobalVolume": return { globalVolumeLevel: this._getSync('globalVolumeLevel') };
      case "saveGlobalVolume": this._setSync('globalVolumeLevel', payload.globalVolumeLevel); return { success: true };
      default: return null;
    }
  }
};
window.NocoinStorage = NocoinStorage;

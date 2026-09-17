// @ts-check
// ============================================================
// Volt Extension — Copyright (c) 2024-2026 Volt
// Proprietary & Confidential — All rights reserved.
// Unauthorized copying, modification, or distribution is
// strictly prohibited. Official source: Discord
// ============================================================

// ──────────────────────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────────────────────
const DEFAULT_PLAYLIST_URL = "https://soundcloud.com/user-392374797/sets/summer-playlist-2024?utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing";
const STORAGE_KEY = "soundcloudUrl";
const POPUP_PLAYLIST_STORAGE_KEY = "musicPlaylistUrl";

const PLAYER_I18N = {
  fr: {
    "common.cancel": "Annuler",
    "player.activePlaylist": "Playlist active",
    "player.changePlaylist": "Changer la playlist",
    "player.previous": "Précédent",
    "player.next": "Suivant",
    "player.resetPlaylist": "Réinitialiser la playlist",
    "player.changePlaylistTitle": "Changer la playlist",
    "player.urlHelp": "Colle une URL SoundCloud (track, album, ou playlist).<br>La sélection est mémorisée dans l'extension.",
    "player.apply": "Appliquer",
    "player.invalidUrl": "URL invalide — doit commencer par https://soundcloud.com/"
  },
  en: {
    "common.cancel": "Cancel",
    "player.activePlaylist": "Active playlist",
    "player.changePlaylist": "Change playlist",
    "player.previous": "Previous",
    "player.next": "Next",
    "player.resetPlaylist": "Reset playlist",
    "player.changePlaylistTitle": "Change playlist",
    "player.urlHelp": "Paste a SoundCloud URL (track, album, or playlist).<br>The selection is saved in the extension.",
    "player.apply": "Apply",
    "player.invalidUrl": "Invalid URL — must start with https://soundcloud.com/"
  },
  "pt-BR": {
    "common.cancel": "Cancelar",
    "player.activePlaylist": "Playlist ativa",
    "player.changePlaylist": "Alterar playlist",
    "player.previous": "Anterior",
    "player.next": "Próximo",
    "player.resetPlaylist": "Redefinir playlist",
    "player.changePlaylistTitle": "Alterar playlist",
    "player.urlHelp": "Cole uma URL do SoundCloud (faixa, álbum ou playlist).<br>A seleção é salva na extensão.",
    "player.apply": "Aplicar",
    "player.invalidUrl": "URL inválida — deve começar com https://soundcloud.com/"
  },
  zh: {
    "common.cancel": "取消",
    "player.activePlaylist": "当前播放列表",
    "player.changePlaylist": "更改播放列表",
    "player.previous": "上一首",
    "player.next": "下一首",
    "player.resetPlaylist": "重置播放列表",
    "player.changePlaylistTitle": "更改播放列表",
    "player.urlHelp": "粘贴 SoundCloud URL（单曲、专辑或播放列表）。<br>该选择会保存在扩展中。",
    "player.apply": "应用",
    "player.invalidUrl": "URL 无效 — 必须以 https://soundcloud.com/ 开头"
  }
};

let playerLang = "fr";
function playerT(key) {
  return PLAYER_I18N[playerLang]?.[key] || PLAYER_I18N.fr[key] || key;
}

async function initPlayerI18n() {
  const stored = await new Promise((resolve) => {
    try {
      chrome.storage.local.get(["preferredLanguage", "volt_lang", "voltLanguage"], (res) => resolve(res || {}));
    } catch (_) { resolve({}); }
  });
  const raw = String(stored.preferredLanguage || stored.volt_lang || stored.voltLanguage || "fr");
  playerLang = raw === "pt-BR" ? "pt-BR" : raw.startsWith("zh") ? "zh" : raw.startsWith("en") ? "en" : "fr";
  document.querySelectorAll("[data-i18n-key]").forEach((el) => {
    const val = playerT(el.dataset.i18nKey);
    if (val.includes('<')) { el.innerHTML = val; } else { el.textContent = val; }
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = playerT(el.dataset.i18nTitle); });
}

// ──────────────────────────────────────────────────────────────
// SAFE STORAGE HELPERS (extension context may be invalidated)
// ──────────────────────────────────────────────────────────────
const store = {
  get: (key) => new Promise((resolve) => {
    try {
      chrome.storage.local.get([key], (res) => {
        if (chrome.runtime?.lastError) { resolve(null); return; }
        resolve(res?.[key] ?? null);
      });
    } catch (_) { resolve(null); }
  }),
  set: (key, value) => new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [key]: value }, () => {
        void chrome.runtime?.lastError;
        resolve();
      });
    } catch (_) { resolve(); }
  }),
  getMany: (keys) => new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (res) => {
        if (chrome.runtime?.lastError) { resolve({}); return; }
        resolve(res || {});
      });
    } catch (_) { resolve({}); }
  }),
  setMany: (values) => new Promise((resolve) => {
    try {
      chrome.storage.local.set(values, () => {
        void chrome.runtime?.lastError;
        resolve();
      });
    } catch (_) { resolve(); }
  }),
};

// ──────────────────────────────────────────────────────────────
// DOM HELPERS
// ──────────────────────────────────────────────────────────────
/** @param {string} id @returns {any} */
function $(id) { return document.getElementById(id); }

// ──────────────────────────────────────────────────────────────
// SOUNDCLOUD IFRAME BRIDGE
// ──────────────────────────────────────────────────────────────
let iframe = null;

function postToIframe(method, value) {
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage(
      JSON.stringify({ method, value }),
      "https://w.soundcloud.com"
    );
  }
}

function buildIframeUrl(playlistUrl) {
  return (
    "https://w.soundcloud.com/player/?url=" +
    encodeURIComponent(playlistUrl) +
    "&color=%236366f1&auto_play=true&visual=true&show_artwork=true" +
    "&hide_related=true&show_comments=false&enable_api=true"
  );
}

function isValidSoundCloudUrl(url) {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return h === "soundcloud.com" || h.endsWith(".soundcloud.com");
  } catch (_) {
    return false;
  }
}

function mountPlayer(playlistUrl) {
  const container = $("player-container");
  if (!container) return;
  container.innerHTML = "";

  iframe = document.createElement("iframe");
  iframe.id = "sc-widget";
  iframe.allow = "autoplay";
  iframe.src = buildIframeUrl(playlistUrl);
  container.appendChild(iframe);

  // Volume init with race-condition fix
  iframe.onload = () => {
    let retries = 0;
    const poll = setInterval(() => {
      const slider = $("volumeSlider");
      postToIframe("setVolume", parseInt(slider?.value || "100", 10));
      if (++retries > 10) clearInterval(poll);
    }, 500);

    try { window.addEventListener("pagehide", () => clearInterval(poll), { once: true }); } catch (_) {}
    window.addEventListener("message", (e) => {
      if (e.origin === "https://w.soundcloud.com") clearInterval(poll);
    }, { once: true });
  };
}

// ──────────────────────────────────────────────────────────────
// URL EDITOR UI
// ──────────────────────────────────────────────────────────────
function showUrlEditor(currentUrl) {
  const overlay = $("url-editor-overlay");
  const input = $("url-input");
  if (!overlay || !input) return;
  input.value = currentUrl;
  overlay.classList.add("visible");
  input.focus();
  input.select();
}

function hideUrlEditor() {
  $("url-editor-overlay")?.classList.remove("visible");
}

async function applyNewUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return;

  // Basic validation: must look like a SoundCloud link
  if (!isValidSoundCloudUrl(url)) {
    const errorEl = $("url-error");
    if (errorEl) errorEl.textContent = playerT("player.invalidUrl");
    return;
  }
  const errorEl = $("url-error");
  if (errorEl) errorEl.textContent = "";

  await store.setMany({ [STORAGE_KEY]: url, [POPUP_PLAYLIST_STORAGE_KEY]: url });
  mountPlayer(url);
  hideUrlEditor();
  const currentUrlLabel = $("current-url-label");
  if (currentUrlLabel) currentUrlLabel.textContent = url;
}

// ──────────────────────────────────────────────────────────────
// MAIN INIT
// ──────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await initPlayerI18n();
  const params = new URLSearchParams(window.location.search);
  const queryUrl = params.get("url");
  const saved = await store.getMany([STORAGE_KEY, POPUP_PLAYLIST_STORAGE_KEY]);
  const activeUrl = isValidSoundCloudUrl(queryUrl)
    ? queryUrl
    : (saved[STORAGE_KEY] || saved[POPUP_PLAYLIST_STORAGE_KEY] || DEFAULT_PLAYLIST_URL);

  if (isValidSoundCloudUrl(activeUrl)) {
    await store.setMany({ [STORAGE_KEY]: activeUrl, [POPUP_PLAYLIST_STORAGE_KEY]: activeUrl });
  }

  const currentUrlLabel = $("current-url-label");
  if (currentUrlLabel) currentUrlLabel.textContent = activeUrl;
  mountPlayer(activeUrl);

  // ── Volume controls ────────────────────────────────────────
  const volumeSlider = $("volumeSlider");
  const volumeText = $("volumeText");
  const muteBtn = $("muteBtn");
  if (!volumeSlider || !volumeText || !muteBtn) return;

  volumeSlider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    volumeText.textContent = val + "%";
    postToIframe("setVolume", val);
    muteBtn.textContent = val === 0 ? "🔇" : "🔊";
  });

  let savedVolume = 100;
  muteBtn.addEventListener("click", () => {
    const val = parseInt(volumeSlider.value, 10);
    if (val > 0) {
      savedVolume = val;
      volumeSlider.value = 0;
      volumeText.textContent = "0%";
      postToIframe("setVolume", 0);
      muteBtn.textContent = "🔇";
    } else {
      volumeSlider.value = savedVolume;
      volumeText.textContent = savedVolume + "%";
      postToIframe("setVolume", savedVolume);
      muteBtn.textContent = "🔊";
    }
  });

  // ── Track navigation ───────────────────────────────────────
  $("prevBtn")?.addEventListener("click", () => postToIframe("prev"));
  $("nextBtn")?.addEventListener("click", () => postToIframe("next"));

  // ── URL editor ─────────────────────────────────────────────
  $("editUrlBtn")?.addEventListener("click", () => showUrlEditor(activeUrl));
  $("cancel-url-btn")?.addEventListener("click", hideUrlEditor);
  $("confirm-url-btn")?.addEventListener("click", () => applyNewUrl($("url-input")?.value));

  $("url-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyNewUrl($("url-input")?.value);
    if (e.key === "Escape") hideUrlEditor();
  });

  // ── Reset to default ───────────────────────────────────────
  $("resetUrlBtn")?.addEventListener("click", async () => {
    await store.setMany({ [STORAGE_KEY]: DEFAULT_PLAYLIST_URL, [POPUP_PLAYLIST_STORAGE_KEY]: DEFAULT_PLAYLIST_URL });
    const currentUrlLabel = $("current-url-label");
    if (currentUrlLabel) currentUrlLabel.textContent = DEFAULT_PLAYLIST_URL;
    mountPlayer(DEFAULT_PLAYLIST_URL);
  });
});

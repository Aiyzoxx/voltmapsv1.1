// @ts-check
// ============================================================
// Volt Extension - Page volume bridge
// ============================================================
(function () {
  const CHANNEL = "GAMING_TOOLS_VOLUME_CHANNEL";
  const FLAG = "__voltVolumeInjected";

  if (window[FLAG]) return;
  try {
    Object.defineProperty(window, FLAG, { value: true, writable: false, configurable: false });
  } catch (_) {
    window[FLAG] = true;
  }

  if (typeof HTMLMediaElement === "undefined") return;

  let currentVolume = 1;
  let applying = false;
  let observing = false;

  /** @param {unknown} value */
  function clampVolume(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return currentVolume;
    return Math.min(1, Math.max(0, number));
  }

  /**
   * @param {string} type
   * @param {Record<string, any>} [payload]
   */
  function post(type, payload) {
    window.postMessage({ source: CHANNEL, type, payload: payload || {} }, window.location.origin);
  }

  /** @param {HTMLMediaElement | Element | null | undefined} element */
  function applyToMediaElement(element) {
    if (!element || !(element instanceof HTMLMediaElement) || typeof element.volume !== "number") return;
    try {
      applying = true;
      element.volume = currentVolume;
    } catch (_e) {
      // Some game-owned elements may reject volume writes; keep the bridge non-fatal.
    } finally {
      applying = false;
    }
  }

  function applyToAllMedia() {
    document.querySelectorAll("audio, video").forEach(applyToMediaElement);
  }

  const volumeDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
  if (volumeDescriptor && volumeDescriptor.set && volumeDescriptor.get) {
    const origGet = volumeDescriptor.get;
    const origSet = volumeDescriptor.set;
    Object.defineProperty(HTMLMediaElement.prototype, "volume", {
      configurable: true,
      enumerable: volumeDescriptor.enumerable,
      get: function () {
        return origGet.call(this);
      },
      /** @param {number} value */
      set: function (value) {
        const nextVolume = applying ? clampVolume(value) : currentVolume;
        origSet.call(this, nextVolume);
        if (!applying) {
          post("PAGE_VOLUME", { volume: clampVolume(value) });
        }
      }
    });
  }

  const observer = typeof MutationObserver !== "undefined" ? new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(/** @param {Node} node */ (node) => {
        if (node instanceof HTMLMediaElement) {
          applyToMediaElement(node);
        } else {
          const el = /** @type {Element} */ (node);
          if (el && typeof el.querySelectorAll === 'function') {
            el.querySelectorAll("audio, video").forEach(/** @param {Element} m */ (m) => applyToMediaElement(/** @type {HTMLMediaElement} */ (m)));
          }
        }
      });
    }
  }) : null;

  /** @param {boolean} enabled */
  function setObserverEnabled(enabled) {
    if (!observer) return;
    if (!enabled) {
      if (observing) {
        try { observer.disconnect(); } catch (_) {}
        observing = false;
      }
      return;
    }
    if (observing) return;
    try {
      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
      });
      observing = true;
    } catch (_) {}
  }

  function applyVolumeMode() {
    const needsPatch = Math.abs(currentVolume - 1) > 0.001;
    if (needsPatch) applyToAllMedia();
    setObserverEnabled(needsPatch);
  }

  function start() {
    applyVolumeMode();
    post("PAGE_READY", { volume: currentVolume });
  }

  window.addEventListener("message", (event) => {
    if (
      event.source !== window ||
      event.origin !== window.location.origin ||
      !event.data ||
      event.data.source !== CHANNEL
    ) {
      return;
    }

    if (event.data.type === "EXT_SET_VOLUME" || event.data.type === "EXT_INIT_VOLUME") {
      const nextVolume = clampVolume(event.data.payload?.volume);
      if (Math.abs(nextVolume - currentVolume) <= 0.001) return;
      currentVolume = nextVolume;
      applyVolumeMode();
    }
  });

  try {
    window.addEventListener("pagehide", () => {
      try { observer?.disconnect(); } catch (_) {}
    }, { once: true });
  } catch (_) {}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

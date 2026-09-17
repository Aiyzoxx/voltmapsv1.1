if (window.__NOCOIN_INITIALIZED__) {
  console.log("Nocoin already initialized");
} else {
  window.__NOCOIN_INITIALIZED__ = true;

  const isMapPage = () => {
    return (
      typeof window.config !== "undefined" && window.config.unityWebglBuildUrl
    );
  };

  if (isMapPage()) {
    function injectScript(code) {
      const s = document.createElement("script");
      s.textContent = code;
      (document.head || document.documentElement).appendChild(s);
      s.remove();
    }

    const VOLUME_INJECTED_CODE = `(()=>{if(window.GAMING_TOOLS_VOLUME_CHANNEL){window.postMessage({'source':"GAMING_TOOLS_VOLUME_CHANNEL",'type':"PAGE_READY"});return}
window.GAMING_TOOLS_VOLUME_CHANNEL=!0;const _0x57e3b9=(_0x1d06cb,_0xd9f96d={})=>{window.postMessage({'source':"GAMING_TOOLS_VOLUME_CHANNEL",'type':_0x1d06cb,'payload':_0xd9f96d})};const _0x5ebb34=new Set();const _0x40f355=new WeakMap();const _0x286243=new Set();let _0x1764bc=0x1;let _0x2808a8=!1;const _0x3f66fa=_0x596989=>{const _0x35f31d=Number(_0x596989);if(Number.isNaN(_0x35f31d)){return _0x1764bc}
return Math.min(0x1,Math.max(0x0,_0x35f31d))};const _0x40a289=()=>{if(_0x40a289.timeout){return}
_0x40a289.timeout=setTimeout(()=>{_0x57e3b9("PAGE_VOLUME",{'volume':_0x1764bc});_0x40a289.timeout=null},0xc8)};const _0x39c9e1=_0x4da20a=>{if(!_0x2808a8){return}
try{_0x4da20a.__volumeLock=!0;_0x4da20a.volume=_0x1764bc;_0x4da20a.muted=_0x1764bc===0x0}catch(_0x2a939a){}finally{_0x4da20a.__volumeLock=!1}};const _0x3f1956=()=>{_0x286243.forEach(_0xfc0fc9=>{try{_0xfc0fc9.gain.gain.value=_0x1764bc}catch(_0x40fc8c){}});_0x5ebb34.forEach(_0x53985a=>_0x39c9e1(_0x53985a))};const _0x3cbab0=(_0x179450,_0x20a0db,_0x59b29f=[])=>{let _0x399c0f=_0x40f355.get(_0x179450);if(!_0x399c0f){const _0x25ef4a=_0x179450.createGain();_0x25ef4a.gain.value=_0x1764bc;_0x399c0f={'context':_0x179450,'gain':_0x25ef4a,'destinationConnected':!1,'lastDestination':null,'lastSignature':''};_0x40f355.set(_0x179450,_0x399c0f);_0x286243.add(_0x399c0f)}
if(_0x20a0db){const _0x4a1319=''+_0x59b29f.join(':');const _0x2bd394=_0x399c0f.lastDestination!==_0x20a0db||_0x399c0f.lastSignature!==_0x4a1319;if(!_0x399c0f.destinationConnected||_0x2bd394){try{_0x399c0f.gain.disconnect()}catch(_0x4e6a8a){}
try{AudioNode.prototype.__originalConnect.call(_0x399c0f.gain,_0x20a0db,..._0x59b29f);_0x399c0f.destinationConnected=!0;_0x399c0f.lastDestination=_0x20a0db;_0x399c0f.lastSignature=_0x4a1319}catch(_0x12c3ca){_0x399c0f.destinationConnected=!1}}}
return _0x399c0f};const _0x29b9e9=(_0x719b76,_0x4ff951,_0x6f5e50=[])=>{if(!_0x719b76){try{return _0x3cbab0(_0x4ff951?.["context"],_0x4ff951,_0x6f5e50)}catch(_0x3c9e06){return null}}
return _0x3cbab0(_0x719b76,_0x4ff951,_0x6f5e50)};const _0x6ec6c1=()=>{if(AudioNode.prototype.__originalConnect){return}
AudioNode.prototype.__originalConnect=AudioNode.prototype.connect;AudioNode.prototype.connect=function _0xd01187(_0x3d9631,..._0x15a04c){if(_0x3d9631 instanceof AudioDestinationNode){const _0x43ddaa=_0x29b9e9(_0x3d9631.context,_0x3d9631,_0x15a04c);if(_0x43ddaa){return AudioNode.prototype.__originalConnect.call(this,_0x43ddaa.gain,..._0x15a04c)}}
return AudioNode.prototype.__originalConnect.call(this,_0x3d9631,..._0x15a04c)}};const _0x1ea847=_0x9054f7=>{if(!_0x9054f7||_0x5ebb34.has(_0x9054f7)){return}
_0x5ebb34.add(_0x9054f7);_0x39c9e1(_0x9054f7);const _0x2c1f2f=()=>{if(_0x9054f7.__volumeLock){return}
const _0x164113=_0x3f66fa(_0x9054f7.volume);if(_0x164113!==_0x1764bc){_0x1764bc=_0x164113;_0x3f1956();_0x40a289()}};_0x9054f7.addEventListener("volumechange",_0x2c1f2f);_0x9054f7.addEventListener("play",()=>_0x39c9e1(_0x9054f7))};const _0x1000ae=()=>{let _0x3b46b9=null;const _0x5a6602=new MutationObserver(_0x369de3=>{if(_0x3b46b9){return}
_0x3b46b9=setTimeout(()=>{for(const _0x5a3c4a of _0x369de3){_0x5a3c4a.addedNodes.forEach(_0x1c32b7=>{if(_0x1c32b7.nodeType!==Node.ELEMENT_NODE){return}
if(_0x1c32b7.tagName==="AUDIO"||_0x1c32b7.tagName==='VIDEO'){_0x1ea847(_0x1c32b7)}
if(typeof _0x1c32b7.querySelectorAll==="function"){_0x1c32b7.querySelectorAll("audio, video").forEach(_0x4069fd=>{_0x1ea847(_0x4069fd)})}})}
_0x3b46b9=null},0x64)});_0x5a6602.observe(document.documentElement||document,{'childList':!0,'subtree':!0,'attributes':!1,'characterData':!1})};const _0xaddc9=()=>{const _0x42dbca=window.Audio;if(typeof _0x42dbca==="function"&&!_0x42dbca.__patched){const _0x1a20eb=function _0x2f82bf(..._0x5925b2){const _0x2a46b3=Reflect.construct(_0x42dbca,_0x5925b2);_0x1ea847(_0x2a46b3);return _0x2a46b3};_0x1a20eb.prototype=_0x42dbca.prototype;Object.defineProperty(_0x1a20eb,"name",{'value':_0x42dbca.name});Object.setPrototypeOf(_0x1a20eb,_0x42dbca);_0x1a20eb.__patched=!0;window.Audio=_0x1a20eb}
const _0x1198d0=HTMLMediaElement.prototype.play;if(!HTMLMediaElement.prototype.__playPatched){HTMLMediaElement.prototype.play=function _0x18ea39(..._0x58baba){_0x1ea847(this);return _0x1198d0.apply(this,_0x58baba)};HTMLMediaElement.prototype.__playPatched=!0}};const _0x6e9a4e=()=>{document.querySelectorAll("audio, video").forEach(_0x4db9bb=>{_0x1ea847(_0x4db9bb)})};const _0x2710dc=(_0x17f138,_0x237f6e=!0)=>{const _0x4d1a89=_0x3f66fa(_0x17f138);if(_0x4d1a89===_0x1764bc&&_0x2808a8){if(_0x237f6e){_0x40a289()}
return _0x1764bc}
_0x1764bc=_0x4d1a89;_0x2808a8=!0;_0x3f1956();if(_0x237f6e){_0x40a289()}
return _0x1764bc};window.addEventListener("message",_0x5a6d3f=>{if(_0x5a6d3f.source!==window||!_0x5a6d3f.data||_0x5a6d3f.data.source!=="GAMING_TOOLS_VOLUME_CHANNEL"){return}
const{type:_0x3e7e80,payload:_0x1e6937}=_0x5a6d3f.data;if(_0x3e7e80==="EXT_SET_VOLUME"){_0x2710dc(_0x1e6937?.["volume"],!1)}else{if(_0x3e7e80==="EXT_INIT_VOLUME"){_0x2710dc(_0x1e6937?.["volume"],!1)}else if(_0x3e7e80==="EXT_REQUEST_VOLUME"){_0x40a289()}}});_0x6ec6c1();_0xaddc9();_0x1000ae();_0x6e9a4e();_0x57e3b9("PAGE_READY")})()`;
    const AUDIO_HOOK_CODE = `// audioHook.js — Smart Timer Audio Detection for nocoinbzall-v3
// Inspired by Volt v19 audioHook.js — simplified for nocoinbzall-v3
(function () {
    // Known Subway Surfers No-Coin sound buffer lengths (Start, Coin, Death, UI/Pause)
    const INTERESTING_SOUND_LENGTHS = new Set([167183, 423531, 42353, 40124, 22291, 44582, 35665, 27863, 3343, 6687, 166069]);

    let _volt_detect_audio = false; // Off by default — enabled via message from content.js
    let _lastNotifyKey = '';
    let _lastNotifyAt = 0;

    // Listen for config from content.js
    window.addEventListener('message', (e) => {
        if (e.source !== window || e.origin !== window.location.origin || !e.data) return;
        if (e.data.type === 'NOCOIN_SMART_TIMER_CONFIG') {
            _volt_detect_audio = e.data.enabled === true;
        }
    });

    function notify(buffer) {
        if (!_volt_detect_audio || !buffer) return;

        const len = Number(buffer.length || 0) || 0;
        const dur = Number(buffer.duration || 0) || 0;

        const isKnownSound = INTERESTING_SOUND_LENGTHS.has(len);
        const isStartFallback = len !== 182787 && len > 150000 && dur >= 3.6 && dur <= 4.1;
        if (!isKnownSound && !isStartFallback) return;

        const now = Date.now();
        const key = \`\${len}:\${Math.round(dur * 1000)}\`;
        if (key === _lastNotifyKey && now - _lastNotifyAt < 60) return;
        _lastNotifyKey = key;
        _lastNotifyAt = now;

        window.postMessage({
            type: 'NOCOIN_GAME_AUDIO_PLAYED',
            duration: dur,
            length: len
        }, window.location.origin);
    }

    // Hook AudioBufferSourceNode.prototype.start
    const audioBufferSourceProto = window.AudioBufferSourceNode?.prototype;
    if (audioBufferSourceProto?.start) {
        const originalStart = audioBufferSourceProto.start;
        audioBufferSourceProto.start = function (when, offset, duration) {
            const self = this;
            notify(self.buffer || self._nocoin_buffer);
            try {
                return originalStart.apply(this, arguments);
            } catch (e) {
                return null;
            }
        };

        // Hook buffer setter to track buffer before start is called
        const descriptor = Object.getOwnPropertyDescriptor(audioBufferSourceProto, 'buffer');
        if (descriptor && descriptor.set) {
            const originalSetter = descriptor.set;
            Object.defineProperty(audioBufferSourceProto, 'buffer', {
                get: descriptor.get
                    ? function () { return descriptor.get.call(this); }
                    : function () { return this._nocoin_buffer; },
                set: function (val) {
                    this._nocoin_buffer = val;
                    return originalSetter.call(this, val);
                },
                enumerable: descriptor.enumerable,
                configurable: descriptor.configurable
            });
        }
    }
})();
`;

    // SYNCHRONOUS INJECTION OF HOOKS
    injectScript(VOLUME_INJECTED_CODE);
    injectScript(AUDIO_HOOK_CODE);
    if (document.documentElement) {
      document.documentElement.dataset.volumeInjected = "true";
      document.documentElement.dataset.audioHookInjected = "true";
    }

    // MOCK CHROME APIs
    const _chromeListeners = [];
    const chrome = {
      storage: {
        local: {
          get: (keys, cb) => {
            if (cb) {
              NocoinStorage.get(keys, cb);
            } else {
              return NocoinStorage.get(keys);
            }
          },
          set: (items, cb) => {
            if (cb) {
              NocoinStorage.set(items, cb);
            } else {
              return NocoinStorage.set(items);
            }
          },
          remove: (keys, cb) => {
            if (Array.isArray(keys))
              keys.forEach((k) => localStorage.removeItem("nocoin_" + k));
            else localStorage.removeItem("nocoin_" + keys);
            if (cb) cb();
            return Promise.resolve();
          },
        },
        onChanged: { addListener: () => { } },
      },
      runtime: {
        sendMessage: (msg, cb) => {
          if (
            [
              "getHotkey",
              "saveHotkey",
              "getZqsdState",
              "getFpsSettings",
              "getKeypressSettings",
              "getAdblockState",
              "getGlobalVolume",
              "saveResolutionState",
              "getTimerSettings",
              "saveTimerSettings",
              "getTimerColors",
              "saveTimerColors",
              "saveZqsdKeys",
              "getZqsdKeys",
              "saveResolutionSettings",
              "getResolutionSettings",
              "resetAdblockStats",
              "adBlocked",
            ].includes(msg.action)
          ) {
            NocoinStorage.dispatch(msg.action, msg).then((res) => {
              if (cb) cb(res);
            });
          } else {
            _chromeListeners.forEach((l) => l(msg, {}, cb || (() => { })));
          }
          return true;
        },
        onMessage: {
          addListener: (callback) => {
            _chromeListeners.push(callback);
          },
        },
        getURL: (path) => "/volt-assets/" + path,
        lastError: null,
      },
      tabs: {
        query: (queryInfo, cb) => {
          cb([{ id: 1 }]);
        },
        sendMessage: (tabId, msg, cb) => {
          let responseSent = false;
          const sendResponse = (response) => {
            if (!responseSent && cb) {
              responseSent = true;
              cb(response);
            }
          };
          _chromeListeners.forEach((l) => l(msg, {}, sendResponse));
        },
        create: ({ url }) => {
          window.open(url, "_blank");
        },
      },
      scripting: {
        executeScript: ({ target, func }, cb) => {
          const result = func();
          if (cb) cb([{ result }]);
        },
      },
      downloads: {
        download: ({ url, filename, saveAs }) => {
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
        },
      },
      windows: {
        create: ({ url, type, width, height }) => {
          window.open(url, "_blank", `width=${width},height=${height}`);
        },
      },
      extension: { getURL: (path) => "/volt-assets/" + path },
    };

    // PREVENT content.js from running actual chrome window methods
    function initNocoinContent() {
      // --- ANTI-POPUP & ADBLOCK RENFORCÉ v3 ---
      let adblockAllowed = false; // Safe by default
      const adblockSafeMode = false; // Mode agressif mais protégé par des garde-fous

      const POPUP_HOST_PATTERNS = [
        "doubleclick",
        "googlesyndication",
        "adsystem",
        "adservice",
        "adnxs",
        "taboola",
        "outbrain",
        "popads",
        "propellerads",
        "trafficroots",
        "clickadu",
        "spoutable",
        "onclick",
        "interstitial",
        "popunder",
        "redir",
        "redirect",
        "trk.",
        "track.",
        "adzerk",
        "revcontent",
        "megapop",
        "adblade",
        "exoclick",
        "juicyads",
        "adsterra",
        "popcash",
        "admaven",
        "hilltopads",
        "monetag",
        "richads",
        "trafficjunky",
        "mgid",
        "zeroredirect",
        "pubmatic",
        "openx",
        "criteo",
        "smartadserver",
        "amazon-adsystem",
        "media.net",
        "bidvertiser",
        "adcash",
        "adcolony",
        "unity3d",
        "applovin",
        "vungle",
        "inmobi",
        "mopub",
        "ironsrc",
        "chartboost",
        "startapp",
        "fyber",
        "tapjoy",
        "adroll",
        "perfectaudience",
        "retargeter",
        "steelhouse",
        "chango",
        "triggit",
        "ad.",
        "ads.",
        "adv.",
        "banner.",
        "click.",
        "pop.",
        "tracking.",
        "pixel.",
        "syndication",
        "adsrv",
        "adserver",
        "adtech",
        "advertising",
        "sponsor",
      ];

      const POPUP_PATH_PATTERNS = [
        "popup",
        "popunder",
        "interstitial",
        "advert",
        "ads",
        "trk",
        "redirect",
        "click",
        "banner",
        "promo",
        "sponsor",
        "aff",
        "partner",
        "track",
        "pixel",
        "conversion",
        "campaign",
        "landing",
        "offer",
        "deal",
        "cpa",
        "cpc",
        "cpm",
      ];

      const MAX_MUTATIONS_PER_BATCH = 150;
      let adMutationObserverStarted = false;

      const normalizeUrl = (rawUrl) => {
        if (!rawUrl) return "";
        try {
          return new URL(rawUrl, location.href).href;
        } catch (e) {
          return String(rawUrl);
        }
      };

      const shouldBlockUrl = (rawUrl) => {
        const href = normalizeUrl(rawUrl);
        if (!href) return false;

        // Autoriser les liens internes au même host
        try {
          const url = new URL(href);
          if (url.origin === location.origin) return false;

          const host = url.hostname.toLowerCase();
          if (POPUP_HOST_PATTERNS.some((p) => host.includes(p))) return true;
          if (
            POPUP_PATH_PATTERNS.some((p) =>
              url.pathname.toLowerCase().includes(p),
            )
          )
            return true;
          return false;
        } catch (e) {
          return true; // URL malformée => on bloque
        }
      };

      function patchWindowOpen() {
        if (!adblockAllowed) return;
        const originalOpen = window.open;
        if (!originalOpen || originalOpen.__gt_patched) return;

        const wrapped = function patchedOpen(url, target, features) {
          // Bloquer les popups sans URL ou avec URL suspecte
          if (
            !url ||
            url === "about:blank" ||
            url === "" ||
            shouldBlockUrl(url)
          ) {
            chrome.runtime.sendMessage({ action: "adBlocked" });
            return null;
          }
          // Bloquer les popups déclenchés sans interaction utilisateur
          if (!window._userInteracting) {
            chrome.runtime.sendMessage({ action: "adBlocked" });
            return null;
          }
          return originalOpen.apply(this, arguments);
        };

        wrapped.__gt_patched = true;
        window.open = wrapped;

        // Tracker les interactions utilisateur
        ["click", "mousedown", "keydown", "touchstart"].forEach((evt) => {
          document.addEventListener(
            evt,
            () => {
              window._userInteracting = true;
              setTimeout(() => {
                window._userInteracting = false;
              }, 1000);
            },
            true,
          );
        });
      }

      function setupClickPopupGuard() {
        if (!adblockAllowed) return;
        const guard = (event) => {
          if (!event.isTrusted) return;
          const anchor = event.target?.closest?.("a");
          const href = anchor?.href || null;
          if (href && shouldBlockUrl(href)) {
            event.preventDefault();
            event.stopPropagation();
            chrome.runtime.sendMessage({ action: "adBlocked" });
          }
        };
        document.addEventListener("click", guard, true);
      }

      function scanAndRemoveAds(root = document) {
        if (!adblockAllowed) return;
        try {
          const nodes = root.querySelectorAll(adSelectors.join(","));
          nodes.forEach((node) => {
            node.remove();
            chrome.runtime.sendMessage({ action: "adBlocked" });
          });
        } catch (e) {
          // ignore
        }
      }

      function startAdMutationObserver() {
        if (!adblockAllowed || adMutationObserverStarted || adblockSafeMode)
          return;
        adMutationObserverStarted = true;

        try {
          const observer = new MutationObserver((mutations) => {
            let processed = 0;
            for (const mutation of mutations) {
              if (processed > MAX_MUTATIONS_PER_BATCH) break;
              mutation.addedNodes.forEach((node) => {
                if (processed > MAX_MUTATIONS_PER_BATCH) return;
                if (node.nodeType !== 1) return;
                const element = node;

                // Bloquer iframes suspectes
                if (element.tagName === "IFRAME") {
                  const src = element.src || element.getAttribute("src") || "";
                  const name = element.name || "";
                  const id = element.id || "";
                  if (
                    shouldBlockUrl(src) ||
                    /ad|banner|pop|promo|sponsor/i.test(name + id + src)
                  ) {
                    element.remove();
                    chrome.runtime.sendMessage({ action: "adBlocked" });
                    processed += 1;
                    return;
                  }
                }

                // Bloquer scripts de pub
                if (element.tagName === "SCRIPT") {
                  const src = element.src || "";
                  if (shouldBlockUrl(src)) {
                    element.remove();
                    chrome.runtime.sendMessage({ action: "adBlocked" });
                    processed += 1;
                    return;
                  }
                }

                // Bloquer divs/elements avec styles de popup
                const style = element.style;
                if (
                  style &&
                  style.zIndex &&
                  parseInt(style.zIndex) > 999999 &&
                  style.position === "fixed"
                ) {
                  const isOurs =
                    element.id &&
                    (element.id.includes("timer") ||
                      element.id.includes("fps") ||
                      element.id.includes("key"));
                  if (!isOurs) {
                    element.remove();
                    chrome.runtime.sendMessage({ action: "adBlocked" });
                    processed += 1;
                    return;
                  }
                }

                if (element.matches?.(adSelectors.join(","))) {
                  element.remove();
                  chrome.runtime.sendMessage({ action: "adBlocked" });
                  processed += 1;
                  return;
                }

                // Scan des enfants immédiats uniquement pour limiter le coût
                const childMatch = element.querySelector?.(
                  adSelectors.join(","),
                );
                if (childMatch) {
                  childMatch.remove();
                  chrome.runtime.sendMessage({ action: "adBlocked" });
                  processed += 1;
                }
              });
            }
          });

          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
          });
        } catch (e) {
          adMutationObserverStarted = false;
        }
      }

      (async () => {
        const { adblockActive } = await chrome.storage.local.get([
          "adblockActive",
        ]);
        if (adblockActive === false) {
          adblockAllowed = false;
          return; // Adblock désactivé par l'utilisateur
        }
        adblockAllowed = true;

        patchWindowOpen();
        setupClickPopupGuard();
      })();

      let lastMouseX = 0;
      let lastMouseY = 0;
      let tripleClickActive = !1;
      let tripleClickKey = "KeyF";
      let tripleClickX = null;
      let tripleClickY = null;
      let pickingTripleClickPos = !1;
      document.addEventListener(
        "mousemove",
        (_0x2ecf90) => {
          lastMouseX = _0x2ecf90.clientX;
          lastMouseY = _0x2ecf90.clientY;
        },
        { passive: !0 },
      );
      chrome.storage.local.get(
        ["tripleClickActive", "tripleClickKey", "tripleClickX", "tripleClickY"],
        (_0x39f8b2) => {
          if (_0x39f8b2.tripleClickActive !== undefined)
            tripleClickActive = _0x39f8b2.tripleClickActive;
          if (_0x39f8b2.tripleClickKey)
            tripleClickKey = _0x39f8b2.tripleClickKey;
          if (
            _0x39f8b2.tripleClickX !== undefined &&
            _0x39f8b2.tripleClickX !== null
          )
            tripleClickX = Number(_0x39f8b2.tripleClickX);
          if (
            _0x39f8b2.tripleClickY !== undefined &&
            _0x39f8b2.tripleClickY !== null
          )
            tripleClickY = Number(_0x39f8b2.tripleClickY);
        },
      );

      function showClickIndicator(x, y, msg) {
        const dot = document.createElement("div");
        dot.style.cssText =
          "position:fixed;width:30px;height:30px;border-radius:50%;pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);background:#10b981;box-shadow:0 0 15px #10b981;";
        dot.style.left = x + "px";
        dot.style.top = y + "px";
        document.body.appendChild(dot);
        setTimeout(() => dot.remove(), 300);
      }
      function doTripleClick() {
        const useStored = tripleClickX !== null && tripleClickY !== null;
        const clickX = useStored ? tripleClickX : lastMouseX;
        const clickY = useStored ? tripleClickY : lastMouseY;

        showClickIndicator(clickX, clickY);

        const canvas = document.querySelector("canvas");
        if (!canvas) {
          return;
        }

        const rect = canvas.getBoundingClientRect();
        const offsetX = clickX - rect.left;
        const offsetY = clickY - rect.top;

        const simulateClick = () => {
          const eventInit = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: clickX,
            clientY: clickY,
            screenX: clickX + window.screenX,
            screenY: clickY + window.screenY,
            pageX: clickX + window.scrollX,
            pageY: clickY + window.scrollY,
            offsetX: offsetX,
            offsetY: offsetY,
            button: 0,
            buttons: 1,
            detail: 1,
          };

          canvas.dispatchEvent(new MouseEvent("mousedown", eventInit));
          canvas.dispatchEvent(new MouseEvent("mouseup", eventInit));
          canvas.dispatchEvent(new MouseEvent("click", eventInit));
        };

        // 3 clics très rapides pour activer les 3 boosts
        simulateClick();
        setTimeout(simulateClick, 80);
        setTimeout(simulateClick, 160);
      }

      function startPickingTripleClickPosition() {
        if (pickingTripleClickPos) return;
        pickingTripleClickPos = true;
        const overlay = document.createElement("div");
        overlay.id = "triple-click-pick-overlay";
        overlay.style.cssText =
          "position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:rgba(99,102,241,0.15);";
        const indicator = document.createElement("div");
        indicator.id = "triple-click-pick-indicator";
        indicator.style.cssText =
          "position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#6366f1;color:white;padding:12px 24px;border-radius:12px;font-family:Inter,sans-serif;font-size:14px;font-weight:600;z-index:2147483647;box-shadow:0 8px 32px rgba(99,102,241,0.4);pointer-events:none;";
        indicator.textContent =
          "🎯 Cliquez pour définir la position (Échap pour annuler)";
        const cursor = document.createElement("div");
        cursor.id = "triple-click-cursor";
        cursor.style.cssText =
          "position:fixed;width:20px;height:20px;border:3px solid #6366f1;border-radius:50%;pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);box-shadow:0 0 0 2px white,0 4px 12px rgba(0,0,0,0.3);";
        const coords = document.createElement("div");
        coords.id = "triple-click-coords";
        coords.style.cssText =
          "position:fixed;background:#18181b;color:#f4f4f5;padding:6px 12px;border-radius:8px;font-family:monospace;font-size:13px;pointer-events:none;z-index:2147483647;transform:translate(15px,-50%);border:1px solid #3f3f46;";
        document.body.appendChild(overlay);
        document.body.appendChild(indicator);
        document.body.appendChild(cursor);
        document.body.appendChild(coords);
        const updateCursor = (e) => {
          cursor.style.left = e.clientX + "px";
          cursor.style.top = e.clientY + "px";
          coords.style.left = e.clientX + "px";
          coords.style.top = e.clientY + "px";
          coords.textContent = "X: " + e.clientX + " | Y: " + e.clientY;
        };
        const cleanup = () => {
          pickingTripleClickPos = false;
          overlay.remove();
          indicator.remove();
          cursor.remove();
          coords.remove();
          document.removeEventListener("mousemove", updateCursor);
          document.removeEventListener("keydown", handleEscape);
        };
        const handleEscape = (e) => {
          if (e.key === "Escape") {
            cleanup();
          }
        };
        overlay.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const x = e.clientX;
          const y = e.clientY;
          tripleClickX = x;
          tripleClickY = y;
          chrome.storage.local.set({ tripleClickX: x, tripleClickY: y });
          indicator.textContent = "✅ Position: X=" + x + ", Y=" + y;
          indicator.style.background = "#10b981";
          setTimeout(cleanup, 800);
        });
        document.addEventListener("mousemove", updateCursor);
        document.addEventListener("keydown", handleEscape);
      }

      const log = () => { }; // Désactive totalement les logs pour la prod
      log("Gaming Tools Suite Complete - Content script chargé");
      const adSelectors = [
        "[id*='google_ads']",
        "[class*='google-ad']",
        "[id*='ad-']",
        "[class*='ad-']",
        "[class*='advertisement']",
        "iframe[src*='doubleclick']",
        "iframe[src*='googlesyndication']",
        ".adsbygoogle",
        "[id*='banner']",
        "[class*='banner']",
        "[id*='sponsor']",
        "[class*='sponsor']",
        "[class*='AdBox']",
        "[class*='ad_container']",
        "[id*='popup']",
        "[class*='popup-ad']",
        "ins.adsbygoogle",
        "div[data-ad-slot]",
        "div[data-google-query-id]",
        "[id*='dfp-']",
        "[class*='dfp-']",
        "div[data-freestar-ad]",
        "div[id^='div-gpt-ad']",
        "div[class*='pub_']",
        "[id*='advert']",
        "[class*='advert']",
        "[class*='promo']",
        "[id*='promo']",
        "[class*='overlay-ad']",
        "[id*='overlay-ad']",
        "[class*='interstitial']",
        "[id*='interstitial']",
        "[class*='modal-ad']",
        "[class*='splash-ad']",
        "[class*='sticky-ad']",
        "[class*='floating-ad']",
        "[class*='bottom-ad']",
        "[class*='top-ad']",
        "[class*='sidebar-ad']",
        "[class*='leaderboard']",
        "[class*='skyscraper']",
        "[class*='rectangle-ad']",
        "[data-ad]",
        "[data-ads]",
        "[data-adunit]",
        "[aria-label*='advertisement']",
        "[aria-label*='sponsored']",
        ".ad-wrapper",
        ".ad-slot",
        ".ad-unit",
        ".ad-block",
        "aside[class*='ad']",
        "section[class*='ad']",
        "[class*='native-ad']",
        "[class*='promoted']",
        "[class*='taboola']",
        "[class*='outbrain']",
        "[class*='mgid']",
        "a[href*='click.'], a[href*='track.']",
        "iframe[src*='adserver']",
        "iframe[src*='adsrv']",
        "iframe[id*='google_ads']",
        "iframe[name*='google_ads']",
        "div[class*='_ad']",
        "div[id*='_ad']",
        ".pub_300x250",
        ".pub_728x90",
        ".text-ad",
        ".textAd",
        "#carbonads",
        ".carbon-wrap",
        "#ad_top",
        "#ad_bottom",
      ];

      function injectAdblockCSS() {
        const styleId = "gaming-tools-adblock";
        if (document.getElementById(styleId)) return;
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent =
          adSelectors.join(",") +
          " { display: none !important; visibility: hidden !important; pointer-events: none !important; width: 0 !important; height: 0 !important; position: absolute !important; left: -9999px !important; }";
        document.head.appendChild(style);
        log("AdBlock CSS injecté");
      }

      async function initAdblock() {
        if (!adblockAllowed) return; // Mode sûr ou adblock désactivé
        const response = await chrome.runtime.sendMessage({
          action: "getAdblockState",
        });
        if (response && response.active !== false) {
          injectAdblockCSS();
          scanAndRemoveAds();
          startAdMutationObserver();
          // Observer léger juste pour réinjecter si le head change (rare)
          const observer = new MutationObserver(() => {
            if (!document.getElementById("gaming-tools-adblock"))
              injectAdblockCSS();
          });
          observer.observe(document.head, { childList: true });
        }
      }
      initAdblock();
      let timerOverlay = null;
      let timerState = "stopped";
      let startTime = null;
      let currentTime = 0;
      let timerInterval = null;
      let isVisible = !1;
      let timerDisplayEl = null;
      let timerMainEl = null;
      let timerDecimalsEl = null;
      let lastTimerMain = "";
      let lastTimerDecimals = "";
      let currentHotkey = "Control";
      let zqsdHandler = null;
      let isResolutionForced = !1;
      let fpsOverlay = null;
      let fpsVisible = !1;
      let fpsAnimationId = null;
      let fpsLastTimestamp = null;
      let fpsSamples = [];
      let storedCustomBackground = null;
      let storedCustomBackgroundActive = null;
      let fpsSettings = { position: { x: 20, y: 100 }, visible: !1 };
      let currentFpsTheme = "minimal";
      const DEFAULT_KEYPRESS_SETTINGS = {
        visible: !1,
        size: 1,
        layout: "arrows",
        theme: "default",
        position: null,
      };
      let keypressOverlay = null;
      let keypressVisible = !1;
      let keypressSettings = { ...DEFAULT_KEYPRESS_SETTINGS };
      let keypressKeyMap = {};
      let keyResizeHandle = null;
      let keySizeIndicator = null;
      let isKeyResizeActive = !1;
      let keyResizeState = null;
      let keypressElementMap = Object.create(null);
      let keypressActiveKeys = new Set();
      let keypressBoundsHandle = null;
      let lastSavedKeypressSettings = {
        ...DEFAULT_KEYPRESS_SETTINGS,
        position: null,
      };
      (async () => {
        const response = await chrome.runtime.sendMessage({
          action: "getHotkey",
        });
        if (response && response.hotkey) {
          currentHotkey = response.hotkey;
        }
      })();
      document.addEventListener("keydown", handleKeydown, !0);
      document.addEventListener("keyup", handleKeyup, !0);
      (async () => {
        const response = await chrome.runtime.sendMessage({
          action: "getZqsdState",
        });
        if (response && response.active) {
          log("ZQSD était activé - réactivation automatique");
          if (window.wasdZqsdHandler) {
            document.removeEventListener("keydown", window.wasdZqsdHandler, !0);
            document.removeEventListener("keyup", window.wasdZqsdHandler, !0);
            window.wasdZqsdHandler = null;
            zqsdHandler = null;
          }
          setTimeout(() => {
            activateZqsdDirectly();
            setTimeout(() => {
              if (keypressOverlay && keypressVisible) {
                const layout = keypressSettings.layout || "arrows";
                renderKeypressLayout(layout);
              }
            }, 100);
          }, 1000);
        }
      })();
      (async () => {
        const response = await chrome.runtime.sendMessage({
          action: "getFpsSettings",
        });
        if (chrome.runtime.lastError) {
          return;
        }
        if (response && response.settings) {
          const { position, visible } = response.settings;
          if (
            position &&
            typeof position.x === "number" &&
            typeof position.y === "number"
          ) {
            fpsSettings.position = position;
          }
          fpsSettings.visible = !!visible;
          if (fpsSettings.visible) {
            if (!fpsOverlay) createFpsOverlay();
            fpsVisible = !0;
            applyFpsSettings();
          }
        }
      })();
      (async () => {
        const response = await chrome.runtime.sendMessage({
          action: "getKeypressSettings",
        });
        if (chrome.runtime.lastError) {
          return;
        }
        if (response && response.settings) {
          keypressVisible = !!response.settings.visible;
          keypressSettings.visible = keypressVisible;
          keypressSettings.size = clampKeypressScale(
            response.settings.size ?? 1,
          );
          const layout =
            typeof response.settings.layout === "string"
              ? response.settings.layout.toLowerCase()
              : "arrows";
          let needsUpdate = !1;
          let newLayout = "arrows";
          if (KEY_LAYOUTS[layout]) {
            newLayout = layout;
          }
          keypressSettings.layout = newLayout;
          const theme =
            typeof response.settings.theme === "string"
              ? response.settings.theme
              : null;
          const resolvedTheme = resolveThemeKey(theme);
          keypressSettings.theme = resolvedTheme;
          if (
            response.settings.position &&
            typeof response.settings.position === "object"
          ) {
            const { x, y } = response.settings.position;
            if (Number.isFinite(x) && Number.isFinite(y)) {
              keypressSettings.position = {
                x: Math.round(x),
                y: Math.round(y),
              };
            } else {
              keypressSettings.position = null;
            }
          } else {
            keypressSettings.position = null;
          }
          if (needsUpdate) {
            persistKeypressSettings({ layout: newLayout });
          }
          if (theme && resolvedTheme !== theme.toLowerCase()) {
            persistKeypressSettings({ theme: resolvedTheme });
          }
          lastSavedKeypressSettings = {
            visible: keypressSettings.visible,
            size: keypressSettings.size,
            layout: keypressSettings.layout,
            theme: keypressSettings.theme,
            position: keypressSettings.position
              ? { ...keypressSettings.position }
              : null,
          };
          if (keypressVisible) {
            createKeypressOverlay();
            setKeypressLayout(keypressSettings.layout);
            applyKeypressSize(keypressSettings.size);
            applyKeypressTheme(keypressSettings.theme);
            keypressOverlay.style.display = "block";
            applyKeypressPosition(keypressSettings.position);
            scheduleKeypressBoundsCheck();
          }
        }
      })();
      let currentGlobalVolume = 1;
      let volumePageReady = !1;
      function injectVolumeScript() {
        const rootEl =
          document.documentElement || document.head || document.body;
        if (!rootEl) {
          window.addEventListener("DOMContentLoaded", injectVolumeScript, {
            once: !0,
          });
          return;
        }
        if (rootEl.dataset?.["volumeInjected"] === "true") {
          return;
        }
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.textContent = VOLUME_INJECTED_CODE;
        script.dataset.channel = "GAMING_TOOLS_VOLUME_CHANNEL";
        rootEl.appendChild(script);
        script.remove();
        if (rootEl.dataset) {
          rootEl.dataset.volumeInjected = "true";
        }
      }
      function sendVolumeToPage(type, payload = {}) {
        window.postMessage({
          source: "GAMING_TOOLS_VOLUME_CHANNEL",
          type,
          payload,
        });
      }
      async function initGlobalVolumeControl() {
        injectVolumeScript();
        const { globalVolumeLevel } = await chrome.storage.local.get([
          "globalVolumeLevel",
        ]);
        if (globalVolumeLevel !== undefined) {
          currentGlobalVolume = Math.min(1, Math.max(0, globalVolumeLevel));
        }
        if (volumePageReady) {
          sendVolumeToPage("EXT_INIT_VOLUME", { volume: currentGlobalVolume });
        }
        window.addEventListener("message", (event) => {
          if (
            event.source !== window ||
            !event.data ||
            event.data.source !== "GAMING_TOOLS_VOLUME_CHANNEL"
          ) {
            return;
          }
          const { type, payload } = event.data;
          if (type === "PAGE_READY") {
            volumePageReady = !0;
            sendVolumeToPage("EXT_INIT_VOLUME", {
              volume: currentGlobalVolume,
            });
          } else if (type === "PAGE_VOLUME") {
            const volume = Math.min(1, Math.max(0, payload?.["volume"] || 0));
            currentGlobalVolume = volume;
            chrome.storage.local.set({ globalVolumeLevel: volume });
          }
        });
      }
      initGlobalVolumeControl();

      // Charger les styles avancés V2 au démarrage
      (async () => {
        const { advancedStyleV2 } =
          await chrome.storage.local.get("advancedStyleV2");
        if (advancedStyleV2) {
          // On attend que les overlays soient créés
          setTimeout(() => {
            const applyV2 = (s) => {
              const timerOverlay = document.getElementById(
                "speedrun-timer-overlay",
              );
              const timerDisplayEl =
                timerOverlay?.querySelector("#timer-display");
              const fpsOverlay = document.getElementById("fps-monitor-overlay");
              const keypressOverlay =
                document.getElementById("keypress-overlay");

              if (s.timer && timerOverlay) {
                const ts = s.timer;
                timerOverlay.style.backgroundColor = ts.bgColor || "#000000";
                timerOverlay.style.borderRadius = ts.borderRadius || "0px";
                timerOverlay.style.opacity =
                  ts.opacity !== undefined ? ts.opacity : 1;
                timerOverlay.style.borderWidth = ts.borderWidth || "0px";
                timerOverlay.style.borderColor = ts.borderColor || "#6366f1";
                timerOverlay.style.borderStyle =
                  parseInt(ts.borderWidth) > 0 ? "solid" : "none";
                timerOverlay.style.boxShadow =
                  parseInt(ts.shadow) > 0
                    ? `0 0 ${ts.shadow} rgba(0,0,0,0.5)`
                    : "none";
                if (timerDisplayEl) {
                  timerDisplayEl.style.color = ts.textColor || "#FFFFFF";
                  if (ts.fontFamily)
                    timerDisplayEl.style.fontFamily = ts.fontFamily;
                }
              }
              if (s.fps && fpsOverlay) {
                const fs = s.fps;
                fpsOverlay.style.backgroundColor = fs.bgColor || "#000000";
                fpsOverlay.style.borderRadius = fs.borderRadius || "4px";
                fpsOverlay.style.opacity =
                  fs.opacity !== undefined ? fs.opacity : 1;
                fpsOverlay.style.borderWidth = fs.borderWidth || "0px";
                fpsOverlay.style.borderColor = fs.borderColor || "#10b981";
                fpsOverlay.style.borderStyle =
                  parseInt(fs.borderWidth) > 0 ? "solid" : "none";
                fpsOverlay.style.boxShadow =
                  parseInt(fs.shadow) > 0
                    ? `0 0 ${fs.shadow} rgba(0,0,0,0.5)`
                    : "none";
                const valueEl = fpsOverlay.querySelector(".fps-value");
                if (valueEl) {
                  valueEl.style.color = fs.textColor || "#FFFFFF";
                  if (fs.fontFamily) valueEl.style.fontFamily = fs.fontFamily;
                }
              }
              if (s.keys && keypressOverlay) {
                const ks = s.keys;
                keypressOverlay.style.setProperty(
                  "--key-bg",
                  ks.bgColor || "#000000",
                );
                keypressOverlay.style.setProperty(
                  "--key-color",
                  ks.textColor || "#ffffff",
                );
                keypressOverlay.style.setProperty(
                  "--key-border",
                  ks.borderColor || "#3d3d3d",
                );
                keypressOverlay.style.setProperty(
                  "--key-active-bg",
                  ks.activeBgColor || "#4bc277",
                );
                keypressOverlay.style.setProperty(
                  "--key-active-border",
                  ks.activeColor || "#4bc277",
                );
                keypressOverlay.style.setProperty(
                  "--key-radius",
                  ks.borderRadius || "12px",
                );
                keypressOverlay.style.setProperty(
                  "--key-border-width",
                  ks.borderWidth || "2px",
                );
                keypressOverlay.style.setProperty(
                  "--key-gap",
                  ks.gap || "10px",
                );
                keypressOverlay.style.opacity =
                  ks.opacity !== undefined ? ks.opacity : 1;

                const shadowPx = parseInt(ks.shadow) || 0;
                if (shadowPx > 0) {
                  keypressOverlay.style.setProperty(
                    "--key-shadow",
                    `0 ${shadowPx}px ${shadowPx * 2}px rgba(0,0,0,0.3)`,
                  );
                  keypressOverlay.style.setProperty(
                    "--key-active-shadow",
                    `0 ${shadowPx}px ${shadowPx * 2}px rgba(75,194,119,0.4)`,
                  );
                } else {
                  keypressOverlay.style.setProperty("--key-shadow", "none");
                  keypressOverlay.style.setProperty(
                    "--key-active-shadow",
                    "none",
                  );
                }

                const sizeScale = ks.sizeScale || 1;
                keypressOverlay.style.setProperty(
                  "--key-scale",
                  String(sizeScale),
                );

                const keys = keypressOverlay.querySelectorAll(".key");
                const keyContainer =
                  keypressOverlay.querySelector(".key-container");
                if (keyContainer) {
                  keyContainer.style.gap = `calc(${ks.gap || "10px"} * ${sizeScale})`;
                }
                // Add dynamic style for active keys background color
                let activeKeyStyle = document.getElementById(
                  "key-active-dynamic-style",
                );
                if (!activeKeyStyle) {
                  activeKeyStyle = document.createElement("style");
                  activeKeyStyle.id = "key-active-dynamic-style";
                  document.head.appendChild(activeKeyStyle);
                }
                const activeBgColor = ks.activeBgColor || "#4bc277";
                const activeTextColor = ks.activeTextColor || "#ffffff";
                const activeBorderColor = ks.activeColor || "#4bc277";
                activeKeyStyle.textContent = `
                        #key-display-overlay .key.active {
                            background: ${activeBgColor} !important;
                            border-color: ${activeBorderColor} !important;
                        }
                        #key-display-overlay .key.active span {
                            color: ${activeTextColor} !important;
                        }
                    `;

                keys.forEach((key) => {
                  key.style.background = ks.bgColor || "#000000";
                  key.style.borderColor = ks.borderColor || "#3d3d3d";
                  key.style.borderRadius = ks.borderRadius || "12px";
                  key.style.borderWidth = ks.borderWidth || "2px";
                  key.style.borderStyle = "solid";
                  if (shadowPx > 0) {
                    key.style.boxShadow = `0 ${shadowPx}px ${shadowPx * 2}px rgba(0,0,0,0.3)`;
                  } else {
                    key.style.boxShadow = "none";
                  }
                  const span = key.querySelector("span");
                  if (span) span.style.color = ks.textColor || "#ffffff";
                });
              }
            };
            applyV2(advancedStyleV2);
          }, 1500);
        }
      })();
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") {
          return;
        }
        if (
          Object.prototype.hasOwnProperty.call(changes, "globalVolumeLevel")
        ) {
          currentGlobalVolume = Math.min(
            1,
            Math.max(0, changes.globalVolumeLevel.newValue),
          );
          sendVolumeToPage("EXT_SET_VOLUME", { volume: currentGlobalVolume });
        }
      });
      let blackBarsEnabled = !0;
      const RESOLUTION_CONFIGS = {
        "608x1080": { width: 608, height: 1080, indicator: "608×1080 ACTIF" },
        "890x1080": { width: 890, height: 1080, indicator: "890×1080 ACTIF" },
      };
      let currentResolutionMode = null;
      (async () => {
        const data = await chrome.storage.local.get([
          "blackBarsEnabled",
          "forcedResolutionMode",
          "verticalResolutionEnabled",
          "barsColor",
        ]);
        if (data.blackBarsEnabled !== undefined) {
          blackBarsEnabled = data.blackBarsEnabled;
        }
        let forcedResolutionMode = data.forcedResolutionMode;
        if (!forcedResolutionMode && data.verticalResolutionEnabled) {
          forcedResolutionMode = "608x1080";
        }
        // Check for stretched resolution
        if (data.stretchedResActive) {
          const applyStretched = () => {
            if (document.readyState === "complete") {
              setTimeout(() => applyStretchedResolution(), 500);
            } else {
              window.addEventListener(
                "load",
                () => {
                  setTimeout(() => applyStretchedResolution(), 500);
                },
                { once: true },
              );
            }
          };
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", applyStretched, {
              once: true,
            });
          } else {
            applyStretched();
          }
        } else {
          const hasPreset =
            forcedResolutionMode && RESOLUTION_CONFIGS[forcedResolutionMode];
          const isCustom =
            typeof forcedResolutionMode === "string" &&
            /^\d{2,4}x\d{2,4}$/i.test(forcedResolutionMode || "");
          if (forcedResolutionMode && (hasPreset || isCustom)) {
            const resolutionMode = forcedResolutionMode;
            const barsColor =
              typeof data.barsColor === "string" && data.barsColor
                ? data.barsColor
                : "#000000";
            const applyResolution = () => {
              if (document.readyState === "complete") {
                setTimeout(
                  () =>
                    applyForcedResolution(
                      resolutionMode,
                      blackBarsEnabled,
                      barsColor,
                    ),
                  500,
                );
              } else {
                window.addEventListener(
                  "load",
                  () => {
                    setTimeout(
                      () =>
                        applyForcedResolution(
                          resolutionMode,
                          blackBarsEnabled,
                          barsColor,
                        ),
                      500,
                    );
                  },
                  { once: !0 },
                );
              }
            };
            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", applyResolution, {
                once: !0,
              });
            } else {
              applyResolution();
            }
          }
        }
      })();
      function applyForcedResolution(
        resolutionMode = "608x1080",
        enableBlackBars = !0,
        barsColor = "#000000",
      ) {
        let width, height, indicator;
        if (RESOLUTION_CONFIGS[resolutionMode]) {
          const cfg = RESOLUTION_CONFIGS[resolutionMode];
          width = cfg.width;
          height = cfg.height;
          indicator = cfg.indicator;
        } else if (
          typeof resolutionMode === "string" &&
          /^\d{2,4}x\d{2,4}$/i.test(resolutionMode)
        ) {
          const parts = resolutionMode.toLowerCase().split("x");
          width = parseInt(parts[0], 10);
          height = parseInt(parts[1], 10);
          if (!Number.isFinite(width) || !Number.isFinite(height)) {
            width = 608;
            height = 1080;
          }
          indicator = `${width}×${height} ACTIF`;
        } else {
          const cfg = RESOLUTION_CONFIGS["608x1080"];
          width = cfg.width;
          height = cfg.height;
          indicator = cfg.indicator;
          resolutionMode = "608x1080";
        }
        log("Application permanente du mode " + resolutionMode);
        blackBarsEnabled = enableBlackBars;
        currentResolutionMode = resolutionMode;
        isResolutionForced = !0;
        chrome.storage.local.set({
          blackBarsEnabled: enableBlackBars,
          verticalResolutionEnabled: resolutionMode === "608x1080",
          forcedResolutionMode: resolutionMode,
          selectedResolutionMode: resolutionMode,
        });
        chrome.runtime.sendMessage({
          action: "saveResolutionState",
          active: !0,
          mode: resolutionMode,
        });
        let viewportMeta = document.querySelector('meta[name="viewport"]');
        if (!viewportMeta) {
          viewportMeta = document.createElement("meta");
          viewportMeta.name = "viewport";
          document.head.appendChild(viewportMeta);
        }
        viewportMeta.content = "width=" + width + ", user-scalable=no";
        const body = document.body;
        const docElement = document.documentElement;
        const timerOverlay = document.getElementById("speedrun-timer-overlay");
        if (timerOverlay) {
          document.documentElement.appendChild(timerOverlay);
          timerOverlay.style.position = "fixed";
          timerOverlay.style.zIndex = "2147483647";
        }
        ["nocoin-fab", "nocoin-backdrop", "nocoin-modal-wrapper"].forEach(
          (id) => {
            const el = document.getElementById(id);
            if (el && el.parentNode !== document.documentElement) {
              document.documentElement.appendChild(el);
            }
          },
        );
        body.style.cssText = `
        margin: 0 !important;
        padding: 0 !important;
        width: ${width}px !important;
        min-width: ${width}px !important;
        max-width: ${width}px !important;
        height: ${height}px !important;
        min-height: ${height}px !important;
        overflow: hidden !important;
        position: fixed !important;
        left: 50% !important;
        top: 50% !important;
        transform: translate(-50%, -50%) !important;
        box-sizing: border-box !important;
    `;
        const backgroundColor = blackBarsEnabled ? barsColor : "transparent";
        docElement.style.cssText = `
        margin: 0 !important;
        padding: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        overflow: hidden !important;
        background: ${backgroundColor} !important;
        box-sizing: border-box !important;
    `;
        docElement.style.setProperty(
          "background",
          backgroundColor,
          "important",
        );
        document.body.offsetHeight;
        docElement.offsetHeight;
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
          document.body.offsetHeight;
        }, 50);
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
          window.scrollTo(0, 0);
        }, 150);
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
        }, 300);
        setTimeout(() => {
          forceResizeToWidth(width);
        }, 100);
        const indicatorDiv = document.createElement("div");
        indicatorDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: #44ff44;
        color: black;
        padding: 5px 10px;
        border-radius: 3px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 2147483646;
        pointer-events: none;
        opacity: 0.8;
    `;
        indicatorDiv.textContent = indicator;
        indicatorDiv.id = "resolution-indicator-permanent";
        document.body.appendChild(indicatorDiv);
        setTimeout(() => {
          if (indicatorDiv && indicatorDiv.parentNode) {
            indicatorDiv.style.transition = "opacity 0.5s";
            indicatorDiv.style.opacity = "0";
            setTimeout(() => {
              if (indicatorDiv && indicatorDiv.parentNode) {
                indicatorDiv.remove();
              }
            }, 500);
          }
        }, 3000);
        const _forcedGC = () => {
          const gc = document.getElementById("game-container");
          if (!gc) return;
          gc.style.setProperty("width", width + "px", "important");
          gc.style.setProperty("height", height + "px", "important");
          gc.style.setProperty("margin-left", -width / 2 + "px", "important");
          gc.style.setProperty("margin-top", -height / 2 + "px", "important");
          gc.style.setProperty("left", "50%", "important");
          gc.style.setProperty("top", "50%", "important");
          gc.style.setProperty("position", "absolute", "important");
        };
        if (window.__nocoinForcedGC) {
          window.removeEventListener("resize", window.__nocoinForcedGC);
          window.removeEventListener("focus", window.__nocoinForcedGC);
        }
        window.__nocoinForcedGC = _forcedGC;
        window.addEventListener("resize", _forcedGC);
        window.addEventListener("focus", _forcedGC);
        [0, 100, 500, 1500, 3000, 5000].forEach((d) =>
          setTimeout(_forcedGC, d),
        );
        log("Mode " + resolutionMode + " appliqué de manière permanente");
      }
      function restoreNormalResolution() {
        log("Restauration de la résolution normale");
        if (window.__nocoinForcedGC) {
          window.removeEventListener("resize", window.__nocoinForcedGC);
          window.removeEventListener("focus", window.__nocoinForcedGC);
          window.__nocoinForcedGC = null;
        }
        const _gc = document.getElementById("game-container");
        if (_gc) {
          [
            "width",
            "height",
            "margin-left",
            "margin-top",
            "left",
            "top",
            "position",
          ].forEach((p) => _gc.style.removeProperty(p));
        }
        const body = document.body;
        const docElement = document.documentElement;
        body.style.cssText = "";
        docElement.style.cssText = "";
        let viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
          viewportMeta.content = "width=device-width, initial-scale=1.0";
        }
        const permanentIndicator = document.getElementById(
          "resolution-indicator-permanent",
        );
        if (permanentIndicator) {
          permanentIndicator.remove();
        }
        window.dispatchEvent(new Event("resize"));
        const normalModeIndicator = document.createElement("div");
        normalModeIndicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff4444;
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 2147483646;
        pointer-events: none;
        opacity: 0.8;
    `;
        normalModeIndicator.textContent = "MODE NORMAL";
        document.body.appendChild(normalModeIndicator);
        setTimeout(() => {
          if (normalModeIndicator && normalModeIndicator.parentNode) {
            normalModeIndicator.style.transition = "opacity 0.5s";
            normalModeIndicator.style.opacity = "0";
            setTimeout(() => {
              if (normalModeIndicator && normalModeIndicator.parentNode) {
                normalModeIndicator.remove();
              }
            }, 500);
          }
        }, 2000);
        chrome.storage.local.set({
          verticalResolutionEnabled: !1,
          stretchedResActive: !1,
        });
        chrome.storage.local.remove("forcedResolutionMode");
        chrome.runtime.sendMessage({
          action: "saveResolutionState",
          active: !1,
          mode: null,
        });
        log("Résolution normale restaurée");
        currentResolutionMode = null;
        isResolutionForced = !1;
      }
      function forceResizeToWidth(width) {
        const allElements = document.querySelectorAll(
          "div, section, main, article, header, footer, img",
        );
        const nocoinRoots = [
          "nocoin-fab",
          "nocoin-backdrop",
          "nocoin-modal-wrapper",
          "nocoin-modal",
          "speedrun-timer-overlay",
        ];
        allElements.forEach((element) => {
          if (nocoinRoots.includes(element.id)) {
            return;
          }
          if (
            element.closest &&
            element.closest(
              "#nocoin-fab, #nocoin-backdrop, #nocoin-modal-wrapper, #nocoin-modal, #speedrun-timer-overlay",
            )
          ) {
            return;
          }
          const styles = window.getComputedStyle(element);
          if (
            ["div", "section", "main", "article", "header", "footer"].includes(
              element.tagName.toLowerCase(),
            )
          ) {
            if (styles.width === "100%" || element.offsetWidth > width) {
              element.style.width = "100%";
              element.style.maxWidth = width + "px";
            }
          }
          if (element.tagName.toLowerCase() === "img") {
            element.style.maxWidth = "100%";
            element.style.height = "auto";
          }
        });
      }
      function activateZqsdDirectly() {
        if (window.wasdZqsdHandler) {
          log("ZQSD déjà actif");
          return;
        }
        const eventTargets = [
          document,
          window,
          document.activeElement,
          document.querySelector("canvas"),
        ].filter(Boolean);
        chrome.storage.local.get("zqsdKeys", (data) => {
          const zqsdKeys = data.zqsdKeys;
          const keydownHandler = (event) => {
            let key;
            if (event.code === "Space" || event.key === " ") {
              key = "SPACE";
            } else {
              key = event.key.toUpperCase();
            }
            let keyMap;
            const hasValidKeys =
              zqsdKeys &&
              zqsdKeys.up &&
              zqsdKeys.down &&
              zqsdKeys.left &&
              zqsdKeys.right;
            if (hasValidKeys) {
              keyMap = {
                [zqsdKeys.up]: ["ArrowUp", 38],
                [zqsdKeys.left]: ["ArrowLeft", 37],
                [zqsdKeys.down]: ["ArrowDown", 40],
                [zqsdKeys.right]: ["ArrowRight", 39],
              };
            } else {
              keyMap = {
                W: ["ArrowUp", 38],
                A: ["ArrowLeft", 37],
                S: ["ArrowDown", 40],
                D: ["ArrowRight", 39],
                Z: ["ArrowUp", 38],
                Q: ["ArrowLeft", 37],
              };
            }
            if (event.key === "1") {
              event.preventDefault();
              event.stopImmediatePropagation();
              eventTargets.forEach((target) =>
                target.dispatchEvent(
                  new KeyboardEvent(event.type, {
                    key: " ",
                    code: "Space",
                    keyCode: 32,
                    which: 32,
                    bubbles: !0,
                  }),
                ),
              );
              return;
            }
            if (event.key === " " && event.isTrusted) {
              if (currentHotkey === "Space") {
                event.preventDefault();
                event.stopImmediatePropagation();
                controlTimer();
                return;
              }
              const spaceIsMapped =
                zqsdKeys && Object.values(zqsdKeys).includes("SPACE");
              if (!spaceIsMapped) {
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
              }
            }
            const mappedKey = keyMap[key];
            if (mappedKey) {
              event.preventDefault();
              event.stopImmediatePropagation();
              eventTargets.forEach((target) =>
                target.dispatchEvent(
                  new KeyboardEvent(event.type, {
                    key: mappedKey[0],
                    code: mappedKey[0],
                    keyCode: mappedKey[1],
                    which: mappedKey[1],
                    bubbles: !0,
                  }),
                ),
              );
            }
          };
          document.addEventListener("keydown", keydownHandler, !0);
          document.addEventListener("keyup", keydownHandler, !0);
          window.wasdZqsdHandler = keydownHandler;
          zqsdHandler = keydownHandler;
          log("ZQSD activé automatiquement");
        });
      }
      // --- SMART TIMER ---
      let smartTimerEnabled = false;
      let audioHookInjected = false;

      function injectAudioHook() {
        if (audioHookInjected) {
          sendSmartTimerConfig();
          return;
        }
        const rootEl =
          document.documentElement || document.head || document.body;
        if (!rootEl) {
          window.addEventListener("DOMContentLoaded", injectAudioHook, {
            once: true,
          });
          return;
        }
        if (rootEl.dataset && rootEl.dataset.audioHookInjected === "true") {
          audioHookInjected = true;
          sendSmartTimerConfig();
          return;
        }
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.textContent = AUDIO_HOOK_CODE;
        rootEl.appendChild(script);
        script.remove();
        sendSmartTimerConfig();
        if (rootEl.dataset) rootEl.dataset.audioHookInjected = "true";
        audioHookInjected = true;
      }

      function sendSmartTimerConfig() {
        window.postMessage(
          {
            type: "NOCOIN_SMART_TIMER_CONFIG",
            enabled: smartTimerEnabled,
          },
          window.location.origin,
        );
      }

      // Smart timer audio event listener
      window.addEventListener("message", (event) => {
        if (
          event.source !== window ||
          event.origin !== window.location.origin ||
          !event.data
        )
          return;
        if (event.data.type !== "NOCOIN_GAME_AUDIO_PLAYED") return;
        if (!smartTimerEnabled || !isVisible || !timerDisplayEl) return;

        const length = Number(event.data.length || 0);
        const duration = Number(event.data.duration || 0);

        const isStartAudio =
          length === 167183 ||
          length === 166069 ||
          (length > 150000 &&
            duration >= 3.6 &&
            duration <= 4.1 &&
            length !== 182787);

        if (isStartAudio) {
          // Start the timer only if it's currently stopped or paused
          if (timerState === "stopped" || timerState === "paused") {
            startTime = performance.now();
            currentTime = 0;
            timerState = "running";
            timerDisplayEl.className = "timer-running";
            applyTimerColor();
            setTimerText("0", ".00");
            const update = () => {
              if (timerState === "running") {
                updateTimer();
                timerInterval = requestAnimationFrame(update);
              }
            };
            timerInterval = requestAnimationFrame(update);
          }
        } else {
          // Double-hit logic for non-fatal stumbles
          const isStumble =
            length === 423531 ||
            length === 40124 ||
            length === 22291 ||
            length === 35665;
          if (isStumble) {
            const now = Date.now();
            if (now - _lastStumbleTime <= 5000 && _lastStumbleTime > 0) {
              // Double hit confirmed! The guard caught the player. Proceed to stop timer.
            } else {
              // First hit, ignore but record time
              _lastStumbleTime = now;
              return;
            }
          }

          // Stop the timer and keep the final time displayed (paused state)
          if (timerState === "running") {
            cancelAnimationFrame(timerInterval);
            timerInterval = null;
            currentTime = performance.now() - startTime;
            timerState = "paused";
            timerDisplayEl.className = "timer-paused";
            applyTimerColor();
            const { mainPart, decimalPart } = formatTime(currentTime);
            setTimerText(mainPart, "." + decimalPart);
          }
        }
      });

      // Load smart timer setting (default ON if never set)
      (async () => {
        const data = await chrome.storage.local.get(["smartTimer"]);
        if (data.smartTimer === undefined) {
          await chrome.storage.local.set({ smartTimer: true });
          smartTimerEnabled = true;
        } else {
          smartTimerEnabled = data.smartTimer !== false;
        }
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
          ) || "ontouchstart" in window;
        if (isMobile) smartTimerEnabled = false;
        if (smartTimerEnabled) {
          injectAudioHook();
        }
      })();

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (Object.prototype.hasOwnProperty.call(changes, "smartTimer")) {
          const isMobile =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
              navigator.userAgent,
            ) || "ontouchstart" in window;
          smartTimerEnabled = !isMobile && changes.smartTimer.newValue === true;
          if (smartTimerEnabled) {
            injectAudioHook();
          }
          sendSmartTimerConfig();
        }
        if (
          Object.prototype.hasOwnProperty.call(changes, "stretchedResActive")
        ) {
          const active = changes.stretchedResActive.newValue === true;
          if (active) {
            applyStretchedResolution();
          } else {
            restoreNormalResolution();
          }
        }
      });

      // --- STRETCHED RESOLUTION ---
      function applyStretchedResolution() {
        log("Application résolution étirée");
        isResolutionForced = true;
        currentResolutionMode = "stretched";
        chrome.storage.local.set({
          stretchedResActive: true,
          forcedResolutionMode: null,
          verticalResolutionEnabled: false,
        });
        chrome.runtime.sendMessage({
          action: "saveResolutionState",
          active: true,
          mode: "stretched",
        });
        const body = document.body;
        const docElement = document.documentElement;
        // Remove viewport restriction
        let viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta)
          viewportMeta.content = "width=device-width, initial-scale=1.0";
        // Stretch to full viewport
        body.style.cssText = `
        margin: 0 !important;
        padding: 0 !important;
        width: 100vw !important;
        min-width: unset !important;
        max-width: unset !important;
        height: 100vh !important;
        min-height: unset !important;
        overflow: hidden !important;
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        transform: none !important;
        box-sizing: border-box !important;
    `;
        docElement.style.cssText = `
        margin: 0 !important;
        padding: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        overflow: hidden !important;
        background: #000 !important;
        box-sizing: border-box !important;
    `;
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
        }, 50);
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
          window.scrollTo(0, 0);
        }, 150);
        // Show indicator
        const ind = document.createElement("div");
        ind.style.cssText =
          "position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#44ff44;color:black;padding:5px 10px;border-radius:3px;font-family:Arial,sans-serif;font-size:12px;z-index:2147483646;pointer-events:none;opacity:0.8;";
        ind.textContent = "RÉSOLUTION ÉTIRÉE";
        (document.documentElement || document.body).appendChild(ind);
        setTimeout(() => {
          if (ind && ind.parentNode) {
            ind.style.transition = "opacity 0.5s";
            ind.style.opacity = "0";
            setTimeout(() => {
              if (ind && ind.parentNode) ind.remove();
            }, 500);
          }
        }, 3000);
        log("Résolution étirée appliquée");
      }

      let timerColors = {
        stopped: "#FFFFFF",
        running: "#FFFFFF",
        paused: "#FFFFFF",
      };
      chrome.runtime.sendMessage({ action: "getTimerColors" }, (_0xa8dfbd) => {
        if (_0xa8dfbd && _0xa8dfbd.colors) {
          timerColors = _0xa8dfbd.colors;
          applyTimerColor();
        }
      });
      function applyTimerColor() {
        if (!timerDisplayEl) {
          return;
        }
        let _0x384cac = timerColors.stopped;
        if (timerState === "running") {
          _0x384cac = timerColors.running;
        } else {
          if (timerState === "paused") {
            _0x384cac = timerColors.paused;
          }
        }
        timerDisplayEl.style.color = _0x384cac;
      }
      function applyThemeToTimer() {
        if (!timerOverlay || !timerDisplayEl) {
          return;
        }
        Object.assign(timerOverlay.style, {
          background: "#000",
          border: "none",
          borderRadius: "0",
          boxShadow: "none",
          backdropFilter: "none",
          padding: "0",
        });
        Object.assign(timerDisplayEl.style, {
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
          justifyContent: "flex-end",
        });
        applyTimerColor();
        const _0x1bf1e5 = timerOverlay.getBoundingClientRect();
        updateFontSize(_0x1bf1e5.width, _0x1bf1e5.height);
      }
      function createTimerOverlay() {
        if (timerOverlay) {
          return;
        }
        timerOverlay = document.createElement("div");
        timerOverlay.id = "speedrun-timer-overlay";
        timerOverlay.innerHTML =
          '\n        <style>\n            #speedrun-timer-overlay{position:fixed;top:20px;right:20px;width:225px;height:50px;z-index:2147483647;display:none;user-select:none;min-width:180px;min-height:40px;max-width:800px;max-height:200px;overflow:hidden;background:#000;border:none;box-shadow:none;border-radius:0}\n            #timer-content{width:100%;height:100%;position:relative;cursor:move}\n            #timer-display{font-family:\'Calibri\',\'Segoe UI\',Arial,sans-serif;font-weight:bold;font-size:43px;letter-spacing:0;line-height:1;color:#FFF;text-shadow:none;white-space:nowrap;display:flex;align-items:baseline;justify-content:flex-end;width:100%;height:100%;padding:8px 12px;box-sizing:border-box;position:relative}\n            #timer-display .time-main{font-size:1em;line-height:1;display:inline-block}\n            #timer-display .time-decimals{font-size:.7em;line-height:1;display:inline-block;transform:translateY(0.12em)}\n            .timer-stopped,.timer-running,.timer-paused{color:#FFF}\n            .resize-handle{position:absolute;background:transparent;z-index:2147483648;opacity:0;transition:opacity .2s}\n            #speedrun-timer-overlay:hover .resize-handle{opacity:.3;background:rgba(255,255,255,.1)}\n            .resize-handle:hover{opacity:.6!important;background:rgba(255,255,255,.2)!important}\n            .resize-nw{top:0;left:0;width:12px;height:12px;cursor:nw-resize}\n            .resize-ne{top:0;right:0;width:12px;height:12px;cursor:ne-resize}\n            .resize-sw{bottom:0;left:0;width:12px;height:12px;cursor:sw-resize}\n            .resize-se{bottom:0;right:0;width:12px;height:12px;cursor:se-resize}\n            .resize-n{top:0;left:12px;right:12px;height:8px;cursor:n-resize}\n            .resize-s{bottom:0;left:12px;right:12px;height:8px;cursor:s-resize}\n            .resize-w{left:0;top:12px;bottom:12px;width:8px;cursor:w-resize}\n            .resize-e{right:0;top:12px;bottom:12px;width:8px;cursor:e-resize}\n            .size-indicator{position:absolute;top:-35px;right:0;background:rgba(0,0,0,.9);color:#FFF;padding:6px 12px;font-size:12px;opacity:0;pointer-events:none;font-family:\'Segoe UI\',Arial,sans-serif;font-weight:400;transition:opacity .2s;border-radius:3px}\n            #speedrun-timer-overlay.resizing .size-indicator{opacity:1}\n        </style>\n        <div id="timer-content">\n            <div id="timer-display" class="timer-stopped">\n                <span class="time-main">0</span><span class="time-decimals">.00</span>\n            </div>\n        </div>\n        <div class="resize-handle resize-nw" data-direction="nw"></div>\n        <div class="resize-handle resize-ne" data-direction="ne"></div>\n        <div class="resize-handle resize-sw" data-direction="sw"></div>\n        <div class="resize-handle resize-se" data-direction="se"></div>\n        <div class="resize-handle resize-n" data-direction="n"></div>\n        <div class="resize-handle resize-s" data-direction="s"></div>\n        <div class="resize-handle resize-w" data-direction="w"></div>\n        <div class="resize-handle resize-e" data-direction="e"></div>\n        <div class="size-indicator">225px × 50px</div>\n    ';
        timerDisplayEl = timerOverlay.querySelector("#timer-display");
        if (timerDisplayEl) {
          timerDisplayEl.style.cursor = "pointer";
          const handleTimerTap = (e) => {
            // Prevent the click from registering if dragging just occurred
            if (window._isDraggingTimer) return;
            e.preventDefault();
            e.stopPropagation();
            controlTimer();
          };
          timerDisplayEl.addEventListener("touchstart", handleTimerTap, {
            passive: false,
          });
          timerDisplayEl.addEventListener("click", handleTimerTap);
        }
        timerMainEl = timerDisplayEl
          ? timerDisplayEl.querySelector(".time-main")
          : null;
        timerDecimalsEl = timerDisplayEl
          ? timerDisplayEl.querySelector(".time-decimals")
          : null;
        lastTimerMain = timerMainEl ? timerMainEl.textContent : "";
        lastTimerDecimals = timerDecimalsEl ? timerDecimalsEl.textContent : "";
        document.documentElement.appendChild(timerOverlay);
        applyCustomBackground(timerOverlay, storedCustomBackground);
        applyThemeToTimer();
        makeDraggable(timerOverlay);
        makeResizable(timerOverlay);
        loadSettings();
      }
      function initializeOverlays() {
        createTimerOverlay();
        createFpsOverlay();
      }
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeOverlays);
      } else {
        initializeOverlays();
      }
      function loadSettings() {
        chrome.runtime.sendMessage(
          { action: "getTimerSettings" },
          (_0x2a3e2a) => {
            if (_0x2a3e2a && _0x2a3e2a.settings) {
              const _0x392ab7 = _0x2a3e2a.settings;
              if (_0x392ab7.visible) {
                if (!timerOverlay) createTimerOverlay();
                timerOverlay.style.left = _0x392ab7.position.x + "px";
                timerOverlay.style.top = _0x392ab7.position.y + "px";
                timerOverlay.style.width = _0x392ab7.size.width + "px";
                timerOverlay.style.height = _0x392ab7.size.height + "px";
                updateFontSize(_0x392ab7.size.width, _0x392ab7.size.height);
                isVisible = !0;
                timerOverlay.style.display = "block";
              }
            }
          },
        );
      }
      function createThrottledInvoker(_0x4361c0, _0x58d326 = 0xb4) {
        let _0x3ae6c3 = null;
        return {
          trigger() {
            if (_0x3ae6c3 !== null) {
              return;
            }
            _0x3ae6c3 = setTimeout(() => {
              _0x3ae6c3 = null;
              _0x4361c0();
            }, _0x58d326);
          },
          flush() {
            if (_0x3ae6c3 !== null) {
              clearTimeout(_0x3ae6c3);
              _0x3ae6c3 = null;
            }
            _0x4361c0();
          },
        };
      }
      function makeDraggable(_0x2de955, _0x52ae3d = {}) {
        let _0x37da2d = 0x0;
        let _0x5bb844 = 0x0;
        let _0x792d4d = 0x0;
        let _0x219d1f = 0x0;
        let _0x327eeb = !1;
        const _0x5ec8c3 =
          typeof _0x52ae3d.onChange === "function"
            ? _0x52ae3d.onChange
            : saveTimerSettings;
        const _0x3d9c49 = createThrottledInvoker(_0x5ec8c3);
        _0x2de955.addEventListener("mousedown", _0x39e140);
        function _0x39e140(_0xe20437) {
          if (_0xe20437.target.classList.contains("resize-handle")) {
            return;
          }
          _0xe20437.preventDefault();
          _0x327eeb = !0;
          window._isDraggingTimer = true;
          _0x792d4d = _0xe20437.clientX;
          _0x219d1f = _0xe20437.clientY;
          document.addEventListener("mousemove", _0x5d6490);
          document.addEventListener("mouseup", _0x81e50e);
        }
        function _0x5d6490(_0x5aa04a) {
          if (!_0x327eeb) {
            return;
          }
          _0x5aa04a.preventDefault();
          _0x37da2d = _0x792d4d - _0x5aa04a.clientX;
          _0x5bb844 = _0x219d1f - _0x5aa04a.clientY;
          _0x792d4d = _0x5aa04a.clientX;
          _0x219d1f = _0x5aa04a.clientY;
          const _0x3effd1 = Math.max(
            0x0,
            Math.min(
              (_0x2de955.offsetLeft || 0x0) - _0x37da2d,
              window.innerWidth - _0x2de955.offsetWidth,
            ),
          );
          const _0x41180f = Math.max(
            0x0,
            Math.min(
              (_0x2de955.offsetTop || 0x0) - _0x5bb844,
              window.innerHeight - _0x2de955.offsetHeight,
            ),
          );
          _0x2de955.style.left = _0x3effd1 + "px";
          _0x2de955.style.top = _0x41180f + "px";
          _0x3d9c49.trigger();
        }
        function _0x81e50e() {
          _0x327eeb = !1;
          setTimeout(() => (window._isDraggingTimer = false), 50);
          document.removeEventListener("mousemove", _0x5d6490);
          document.removeEventListener("mouseup", _0x81e50e);
          _0x3d9c49.flush();
        }
      }
      function makeResizable(_0x59d0f9) {
        const _0x207d1f = _0x59d0f9.querySelectorAll(".resize-handle");
        const _0x14f677 = _0x59d0f9.querySelector(".size-indicator");
        let _0x48c843 = !1;
        let _0x29f3a9 = "";
        let _0x54f7ff = 0x0;
        let _0x590331 = 0x0;
        let _0x4f51ab = 0x0;
        let _0x548243 = 0x0;
        let _0x38c6df = 0x0;
        let _0xb24c26 = 0x0;
        _0x207d1f.forEach((_0x10bf0d) =>
          _0x10bf0d.addEventListener("mousedown", _0x2e1220),
        );
        function _0x2e1220(_0x19ccb8) {
          _0x19ccb8.preventDefault();
          _0x19ccb8.stopPropagation();
          _0x48c843 = !0;
          _0x29f3a9 = _0x19ccb8.target.dataset.direction;
          _0x54f7ff = _0x19ccb8.clientX;
          _0x590331 = _0x19ccb8.clientY;
          const _0x4918b4 = _0x59d0f9.getBoundingClientRect();
          _0x4f51ab = _0x4918b4.width;
          _0x548243 = _0x4918b4.height;
          _0x38c6df = _0x4918b4.left;
          _0xb24c26 = _0x4918b4.top;
          _0x59d0f9.classList.add("resizing");
          document.addEventListener("mousemove", _0x46a4c1);
          document.addEventListener("mouseup", _0x21612e);
        }
        function _0x46a4c1(_0x3b0802) {
          if (!_0x48c843) {
            return;
          }
          _0x3b0802.preventDefault();
          const _0x268f6c = _0x3b0802.clientX - _0x54f7ff;
          const _0x35abea = _0x3b0802.clientY - _0x590331;
          let _0x4e0923 = _0x4f51ab;
          let _0x934ad3 = _0x548243;
          let _0x2f9168 = _0x38c6df;
          let _0x1b5a15 = _0xb24c26;
          if (_0x29f3a9.includes("e")) {
            _0x4e0923 = Math.max(0xb4, Math.min(0x320, _0x4f51ab + _0x268f6c));
          }
          if (_0x29f3a9.includes("w")) {
            _0x4e0923 = Math.max(0xb4, Math.min(0x320, _0x4f51ab - _0x268f6c));
            _0x2f9168 = _0x38c6df + (_0x4f51ab - _0x4e0923);
          }
          if (_0x29f3a9.includes("s")) {
            _0x934ad3 = Math.max(0x28, Math.min(0xc8, _0x548243 + _0x35abea));
          }
          if (_0x29f3a9.includes("n")) {
            _0x934ad3 = Math.max(0x28, Math.min(0xc8, _0x548243 - _0x35abea));
            _0x1b5a15 = _0xb24c26 + (_0x548243 - _0x934ad3);
          }
          _0x59d0f9.style.width = _0x4e0923 + "px";
          _0x59d0f9.style.height = _0x934ad3 + "px";
          _0x59d0f9.style.left = _0x2f9168 + "px";
          _0x59d0f9.style.top = _0x1b5a15 + "px";
          updateFontSize(_0x4e0923, _0x934ad3);
          _0x14f677.textContent =
            Math.round(_0x4e0923) + "px × " + Math.round(_0x934ad3) + "px";
          _0x14f677.style.opacity = "1";
        }
        function _0x21612e() {
          if (!_0x48c843) {
            return;
          }
          _0x48c843 = !1;
          document.removeEventListener("mousemove", _0x46a4c1);
          document.removeEventListener("mouseup", _0x21612e);
          _0x59d0f9.classList.remove("resizing");
          _0x14f677.style.opacity = "0";
          saveTimerSettings();
        }
      }
      function updateFpsFontSize(width, height) {
        if (!fpsOverlay) return;
        const valueElement = fpsOverlay.querySelector(".fps-value");
        const labelElement = fpsOverlay.querySelector(".fps-label");
        if (!valueElement || !labelElement) return;
        const baseWidth = 120;
        const baseHeight = 70;
        const widthRatio = width / baseWidth;
        const heightRatio = height / baseHeight;
        const scale = Math.min(widthRatio, heightRatio);
        const baseValueSize = 36;
        const baseLabelSize = 10;
        valueElement.style.fontSize = `${Math.max(12, baseValueSize * scale)}px`;
        labelElement.style.fontSize = `${Math.max(6, baseLabelSize * scale)}px`;
      }
      function makeFpsResizable(element) {
        const handles = element.querySelectorAll(".resize-handle");
        const sizeIndicator = element.querySelector(".size-indicator");
        let isResizing = !1;
        let resizeDirection = "";
        let startX = 0,
          startY = 0;
        let startWidth = 0,
          startHeight = 0;
        let startLeft = 0,
          startTop = 0;
        handles.forEach((handle) =>
          handle.addEventListener("mousedown", startResize),
        );
        function startResize(e) {
          e.preventDefault();
          e.stopPropagation();
          isResizing = !0;
          resizeDirection = e.target.dataset.direction;
          startX = e.clientX;
          startY = e.clientY;
          const rect = element.getBoundingClientRect();
          startWidth = rect.width;
          startHeight = rect.height;
          startLeft = rect.left;
          startTop = rect.top;
          element.classList.add("resizing");
          document.addEventListener("mousemove", performResize);
          document.addEventListener("mouseup", stopResize);
        }
        function performResize(e) {
          if (!isResizing) return;
          e.preventDefault();
          const deltaX = e.clientX - startX;
          const deltaY = e.clientY - startY;
          let newWidth = startWidth;
          let newHeight = startHeight;
          let newLeft = startLeft;
          let newTop = startTop;
          if (resizeDirection.includes("e"))
            newWidth = Math.max(100, startWidth + deltaX);
          if (resizeDirection.includes("w")) {
            newWidth = Math.max(100, startWidth - deltaX);
            newLeft = startLeft + (startWidth - newWidth);
          }
          if (resizeDirection.includes("s"))
            newHeight = Math.max(50, startHeight + deltaY);
          if (resizeDirection.includes("n")) {
            newHeight = Math.max(50, startHeight - deltaY);
            newTop = startTop + (startHeight - newHeight);
          }
          element.style.width = `${newWidth}px`;
          element.style.height = `${newHeight}px`;
          element.style.left = `${newLeft}px`;
          element.style.top = `${newTop}px`;
          updateFpsFontSize(newWidth, newHeight);
          if (sizeIndicator) {
            sizeIndicator.textContent = `${Math.round(newWidth)}px × ${Math.round(newHeight)}px`;
            sizeIndicator.style.opacity = "1";
          }
        }
        function stopResize() {
          if (!isResizing) return;
          isResizing = !1;
          document.removeEventListener("mousemove", performResize);
          document.removeEventListener("mouseup", stopResize);
          element.classList.remove("resizing");
          if (sizeIndicator) sizeIndicator.style.opacity = "0";
          saveFpsSettings();
        }
      }
      function updateFontSize(width, height) {
        if (!timerDisplayEl) {
          return;
        }
        const widthRatio = width / 225;
        const heightRatio = height / 50;
        const scale = Math.min(widthRatio, heightRatio);
        const fontSize = Math.max(18, Math.min(120, 43 * scale));
        timerDisplayEl.style.fontSize = fontSize + "px";
        timerDisplayEl.style.letterSpacing = "0px";
        timerDisplayEl.style.lineHeight = "1";
        timerDisplayEl.style.padding = "8px 12px";
        timerDisplayEl.style.textAlign = "right";
        if (timerDecimalsEl) {
          timerDecimalsEl.style.fontSize = "0.7em";
        }
      }
      function saveTimerSettings() {
        if (!timerOverlay) {
          return;
        }
        const rect = timerOverlay.getBoundingClientRect();
        chrome.runtime.sendMessage({
          action: "saveTimerSettings",
          position: { x: Math.round(rect.left), y: Math.round(rect.top) },
          size: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          visible: isVisible,
        });
      }
      function applyCustomBackground(element, imageDataUrl) {
        if (!element) return;
        if (element.id === "key-display-overlay") {
          const keys = element.querySelectorAll(".key");
          if (imageDataUrl) {
            keys.forEach((key) => {
              key.style.setProperty("background-image", `url(${imageDataUrl})`);
              key.style.setProperty("background-size", "100% 100%");
              key.style.setProperty(
                "background-color",
                "transparent",
                "important",
              );
              key.style.setProperty(
                "border",
                "1px solid rgba(255, 255, 255, 0.3)",
              );
            });
            element.style.setProperty("background", "transparent", "important");
          } else {
            keys.forEach((key) => {
              key.style.removeProperty("background-image");
              key.style.removeProperty("background-attachment");
              key.style.removeProperty("background-size");
              key.style.removeProperty("background-color");
              key.style.removeProperty("border");
            });
          }
          return;
        }
        if (imageDataUrl) {
          element.style.setProperty(
            "background-image",
            `url(${imageDataUrl})`,
            "important",
          );
          element.style.setProperty(
            "background-size",
            "100% 100%",
            "important",
          );
          element.style.setProperty(
            "background-position",
            "center",
            "important",
          );
          element.style.setProperty(
            "background-repeat",
            "no-repeat",
            "important",
          );
          element.style.setProperty(
            "background-color",
            "rgba(0,0,0,0.7)",
            "important",
          );
        } else {
          element.style.removeProperty("background-image");
          element.style.removeProperty("background-size");
          element.style.removeProperty("background-position");
          element.style.removeProperty("background-repeat");
          if (element.id === "fps-monitor-overlay") {
            element.style.setProperty(
              "background-color",
              "rgba(0, 0, 0, 1.0)",
              "important",
            );
          } else if (element.id === "speedrun-timer-overlay") {
            element.style.setProperty("background", "#000");
          } else {
            element.style.removeProperty("background-color");
          }
        }
      }
      (async () => {
        const { customBackground } =
          await chrome.storage.local.get("customBackground");
        if (customBackground) {
          storedCustomBackground = customBackground;
          if (timerOverlay)
            applyCustomBackground(timerOverlay, storedCustomBackground);
          if (fpsOverlay)
            applyCustomBackground(fpsOverlay, storedCustomBackground);
          if (keypressOverlay)
            applyCustomBackground(keypressOverlay, storedCustomBackground);
        }
      })();
      function setTimerText(mainPart, decimalPart) {
        if (!timerMainEl || !timerDecimalsEl) {
          return;
        }
        if (lastTimerMain !== mainPart) {
          timerMainEl.textContent = mainPart;
          lastTimerMain = mainPart;
        }
        if (lastTimerDecimals !== decimalPart) {
          timerDecimalsEl.textContent = decimalPart;
          lastTimerDecimals = decimalPart;
        }
      }
      function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((ms % 1000) / 10);
        const decimalPart = centiseconds.toString().padStart(2, "0");
        const mainPart =
          hours > 0
            ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
            : minutes > 0
              ? `${minutes}:${seconds.toString().padStart(2, "0")}`
              : `${seconds}`;
        return { mainPart, decimalPart };
      }
      const rankTiers = [
        { name: "Interstellar", minTime: 90 * 60 * 1000 },
        { name: "Suprême", minTime: 73 * 60 * 1000 },
        { name: "Grand Champion", minTime: 55 * 60 * 1000 },
        { name: "Champion", minTime: 47 * 60 * 1000 },
        { name: "Grand Master", minTime: 41 * 60 * 1000 },
        { name: "Master +", minTime: 35 * 60 * 1000 },
        { name: "Master", minTime: 28 * 60 * 1000 },
        { name: "Élite", minTime: 23 * 60 * 1000 + 1000 },
        { name: "Diamant 3", minTime: 23 * 60 * 1000 },
        { name: "Diamant 2", minTime: 19 * 60 * 1000 },
        { name: "Diamant 1", minTime: 15 * 60 * 1000 + 1000 },
        { name: "Platine 3", minTime: 15 * 60 * 1000 },
        { name: "Platine 2", minTime: 12 * 60 * 1000 },
        { name: "Platine 1", minTime: 9 * 60 * 1000 + 1000 },
        { name: "Gold 3", minTime: 9 * 60 * 1000 },
        { name: "Gold 2", minTime: 7 * 60 * 1000 },
        { name: "Gold 1", minTime: 5 * 60 * 1000 },
        { name: "Argent 3", minTime: 4 * 60 * 1000 },
        { name: "Argent 2", minTime: 3 * 60 * 1000 },
        { name: "Argent 1", minTime: 2 * 60 * 1000 },
        { name: "Bronze 3", minTime: 90 * 1000 },
        { name: "Bronze 2", minTime: 60 * 1000 },
        { name: "Bronze 1", minTime: 30 * 1000 },
        { name: "Unranked", minTime: 0 },
      ].sort((a, b) => b.minTime - a.minTime);
      function updateRank(time) {
        if (!timerOverlay) return;
        let rankDisplay = timerOverlay.querySelector("#rank-display");
        if (!rankDisplay) {
          rankDisplay = document.createElement("div");
          rankDisplay.id = "rank-display";
          Object.assign(rankDisplay.style, {
            color: "#fff",
            fontSize: "16px",
            fontWeight: "bold",
            position: "absolute",
            top: "-20px",
            left: "0px",
            textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
            zIndex: "1",
          });
          const timerContent = timerOverlay.querySelector("#timer-content");
          if (timerContent)
            timerContent.insertBefore(rankDisplay, timerContent.firstChild);
        }
        if (!rankDisplay) return;
        const currentRank = rankTiers.find((rank) => time >= rank.minTime);
        rankDisplay.textContent = currentRank ? currentRank.name : "";
      }
      function updateTimer() {
        if (!timerOverlay || !isVisible || timerState !== "running") {
          return;
        }
        if (!timerMainEl || !timerDecimalsEl) {
          return;
        }
        currentTime = performance.now() - startTime;
        updateRank(currentTime);
        const { mainPart, decimalPart } = formatTime(currentTime);
        setTimerText(mainPart, "." + decimalPart);
      }
      function controlTimer() {
        if (!timerOverlay) {
          createTimerOverlay();
        }
        if (!isVisible) {
          toggleTimerVisibility();
        }
        if (!timerDisplayEl) {
          return;
        }
        if (smartTimerEnabled && timerState === "stopped") {
          return;
        } // smart timer gère le démarrage
        if (timerState === "stopped") {
          startTime = performance.now();
          currentTime = 0;
          timerState = "running";
          timerDisplayEl.className = "timer-running";
          applyTimerColor();
          setTimerText("0", ".00");
          const update = () => {
            if (timerState === "running") {
              updateTimer();
              timerInterval = requestAnimationFrame(update);
            }
          };
          timerInterval = requestAnimationFrame(update);
        } else if (timerState === "running") {
          cancelAnimationFrame(timerInterval);
          timerInterval = null;
          currentTime = performance.now() - startTime;
          timerState = "paused";
          timerDisplayEl.className = "timer-paused";
          applyTimerColor();
          const { mainPart, decimalPart } = formatTime(currentTime);
          setTimerText(mainPart, "." + decimalPart);
        } else {
          cancelAnimationFrame(timerInterval);
          timerInterval = null;
          timerState = "stopped";
          currentTime = 0;
          timerDisplayEl.className = "timer-stopped";
          applyTimerColor();
          setTimerText("0", ".00");
        }
      }
      function toggleTimerVisibility() {
        if (!timerOverlay) {
          createTimerOverlay();
        }
        isVisible = !isVisible;
        timerOverlay.style.display = isVisible ? "block" : "none";
        if (isVisible) {
          if (timerState === "running") {
            updateTimer();
          } else {
            const time = timerState === "paused" ? currentTime : 0;
            const { mainPart, decimalPart } = formatTime(time);
            setTimerText(mainPart, "." + decimalPart);
          }
        }
        saveTimerSettings();
      }
      function ensureFpsStyles() {
        let styleSheet = document.getElementById("fps-monitor-styles");
        if (!styleSheet) {
          styleSheet = document.createElement("style");
          styleSheet.id = "fps-monitor-styles";
          document.head.appendChild(styleSheet);
        }
        const newContent = `
        #fps-monitor-overlay {
            position: fixed !important;
            top: 100px;
            left: 20px;
            min-width: 120px;
            padding: 12px 16px;
            z-index: 2147483647 !important;
            display: none;
            flex-direction: column;
            gap: 4px;
            cursor: move !important;
            user-select: none;
            transition: none;
            background-color: rgba(0, 0, 0, 1.0) !important;
            border: none;
            box-shadow: none;
            color: #FFFFFF;
            border-radius: 4px;
            overflow: hidden;
        }
        #fps-monitor-overlay:active {
            cursor: grabbing !important;
        }
        #fps-monitor-overlay .fps-label {
            text-transform: uppercase;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.5px;
            color: #CCCCCC;
            opacity: 0.8;
            pointer-events: none;
        }
        #fps-monitor-overlay .fps-value {
            font-size: 36px;
            font-weight: 900;
            line-height: 1;
            transition: color 0.2s ease;
            pointer-events: none;
        }
        #fps-monitor-overlay .fps-value.high { color: #FFFFFF; }
        #fps-monitor-overlay .fps-value.medium { color: #DDDDDD; }
        #fps-monitor-overlay .fps-value.low { 
            color: #BBBBBB;
        }
        .resize-handle{position:absolute;background:transparent;z-index:2147483648;opacity:0;transition:opacity .2s}
        #fps-monitor-overlay:hover .resize-handle{opacity:.3;background:rgba(255,255,255,.1)}
        .resize-handle:hover{opacity:.6!important;background:rgba(255,255,255,.2)!important}
        .resize-nw{top:0;left:0;width:12px;height:12px;cursor:nw-resize}
        .resize-ne{top:0;right:0;width:12px;height:12px;cursor:ne-resize}
        .resize-sw{bottom:0;left:0;width:12px;height:12px;cursor:sw-resize}
        .resize-se{bottom:0;right:0;width:12px;height:12px;cursor:se-resize}
        .resize-n{top:0;left:12px;right:12px;height:8px;cursor:n-resize}
        .resize-s{bottom:0;left:12px;right:12px;height:8px;cursor:s-resize}
        .resize-w{left:0;top:12px;bottom:12px;width:8px;cursor:w-resize}
        .resize-e{right:0;top:12px;bottom:12px;width:8px;cursor:e-resize}
        .size-indicator{position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;white-space:nowrap;opacity:0;transition:opacity .2s;pointer-events:none;z-index:2147483649}
        #fps-monitor-overlay.resizing .size-indicator{opacity:1}
    `;
        if (styleSheet.textContent !== newContent) {
          styleSheet.textContent = newContent;
        }
      }
      function createFpsOverlay() {
        if (fpsOverlay) {
          return;
        }
        ensureFpsStyles();
        fpsOverlay = document.createElement("div");
        fpsOverlay.id = "fps-monitor-overlay";
        fpsOverlay.innerHTML = `
        <div class="fps-label">Frames per second</div>
        <div class="fps-value">--</div>
        <div class="resize-handle resize-nw" data-direction="nw"></div>
        <div class="resize-handle resize-ne" data-direction="ne"></div>
        <div class="resize-handle resize-sw" data-direction="sw"></div>
        <div class="resize-handle resize-se" data-direction="se"></div>
        <div class="resize-handle resize-n" data-direction="n"></div>
        <div class="resize-handle resize-s" data-direction="s"></div>
        <div class="resize-handle resize-w" data-direction="w"></div>
        <div class="resize-handle resize-e" data-direction="e"></div>
        <div class="size-indicator"></div>
    `;
        document.documentElement.appendChild(fpsOverlay);
        chrome.storage.local.get("customBackground", ({ customBackground }) => {
          if (customBackground) {
            storedCustomBackground = customBackground;
            applyCustomBackground(fpsOverlay, customBackground);
          }
        });
        makeDraggable(fpsOverlay, { onChange: saveFpsSettings });
        makeFpsResizable(fpsOverlay);
        applyFpsSettings();
      }
      function applyFpsSettings() {
        if (!fpsOverlay) {
          return;
        }
        const position = fpsSettings.position || { x: 20, y: 100 };
        fpsOverlay.style.left =
          (typeof position.x === "number" ? position.x : 20) + "px";
        fpsOverlay.style.top =
          (typeof position.y === "number" ? position.y : 100) + "px";
        fpsOverlay.style.display = fpsVisible ? "flex" : "none";
        if (fpsVisible) {
          startFpsLoop();
        } else {
          stopFpsLoop();
          updateFpsDisplay(null);
        }
      }
      function toggleFpsOverlay() {
        if (!fpsOverlay) {
          createFpsOverlay();
        }
        fpsVisible = !fpsVisible;
        fpsSettings.visible = fpsVisible;
        fpsOverlay.style.display = fpsVisible ? "flex" : "none";
        if (fpsVisible) {
          startFpsLoop();
        } else {
          stopFpsLoop();
          updateFpsDisplay(null);
        }
        saveFpsSettings();
        return fpsVisible;
      }
      function startFpsLoop() {
        if (fpsAnimationId) {
          return;
        }
        fpsLastTimestamp = null;
        fpsSamples = [];
        let frameCount = 0;
        const loop = (timestamp) => {
          if (!fpsVisible) {
            fpsAnimationId = null;
            return;
          }
          if (fpsLastTimestamp !== null) {
            const deltaTime = timestamp - fpsLastTimestamp;
            if (deltaTime > 0) {
              const fps = 1000 / deltaTime;
              fpsSamples.push(fps);
              if (fpsSamples.length > 30) {
                fpsSamples.shift();
              }
              frameCount++;
              if (frameCount % 5 === 0) {
                const sum = fpsSamples.reduce((a, b) => a + b, 0);
                const avg = sum / fpsSamples.length;
                updateFpsDisplay(avg);
              }
            }
          }
          fpsLastTimestamp = timestamp;
          fpsAnimationId = requestAnimationFrame(loop);
        };
        fpsAnimationId = requestAnimationFrame(loop);
      }
      function stopFpsLoop() {
        if (fpsAnimationId) {
          cancelAnimationFrame(fpsAnimationId);
          fpsAnimationId = null;
        }
        fpsLastTimestamp = null;
        fpsSamples = [];
      }
      function updateFpsDisplay(fps) {
        if (!fpsOverlay) {
          return;
        }
        const valueElement = fpsOverlay.querySelector(".fps-value");
        if (!valueElement) {
          return;
        }
        valueElement.classList.remove("low", "medium", "high");
        if (typeof fps !== "number" || !isFinite(fps)) {
          valueElement.textContent = "--";
          valueElement.classList.add("medium");
          return;
        }
        const roundedFps = Math.max(0, Math.round(fps));
        valueElement.textContent = roundedFps.toString();
        if (roundedFps >= 55) {
          valueElement.classList.add("high");
        } else if (roundedFps >= 30) {
          valueElement.classList.add("medium");
        } else {
          valueElement.classList.add("low");
        }
      }
      function saveFpsSettings() {
        if (!fpsOverlay) {
          return;
        }
        if (fpsOverlay.style.display !== "none") {
          const rect = fpsOverlay.getBoundingClientRect();
          fpsSettings.position = {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
          };
          fpsSettings.size = {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        }
        chrome.runtime.sendMessage(
          {
            action: "saveFpsSettings",
            position: fpsSettings.position,
            size: fpsSettings.size,
            visible: fpsVisible,
          },
          () => { },
        );
      }
      const KEY_LAYOUTS = {
        arrows: {
          rows: [
            [{ id: "key-up", label: "↑", matches: ["arrowup"] }],
            [
              { id: "key-left", label: "←", matches: ["arrowleft"] },
              { id: "key-down", label: "↓", matches: ["arrowdown"] },
              { id: "key-right", label: "→", matches: ["arrowright"] },
            ],
          ],
        },
        wasd: {
          rows: [
            [
              {
                id: "key-up",
                label: "W",
                matches: ["w", "keyw", "z", "keyz", "arrowup"],
              },
            ],
            [
              {
                id: "key-left",
                label: "A",
                matches: ["a", "keya", "q", "keyq", "arrowleft"],
              },
              {
                id: "key-down",
                label: "S",
                matches: ["s", "keys", "arrowdown"],
              },
              {
                id: "key-right",
                label: "D",
                matches: ["d", "keyd", "arrowright"],
              },
            ],
          ],
        },
        zqsd: {
          rows: [
            [
              {
                id: "key-up",
                label: "Z",
                matches: ["z", "keyz", "w", "keyw", "arrowup"],
              },
            ],
            [
              {
                id: "key-left",
                label: "Q",
                matches: ["q", "keyq", "a", "keya", "arrowleft"],
              },
              {
                id: "key-down",
                label: "S",
                matches: ["s", "keys", "arrowdown"],
              },
              {
                id: "key-right",
                label: "D",
                matches: ["d", "keyd", "arrowright"],
              },
            ],
          ],
        },
      };
      const KEY_THEMES = {
        default: { label: "Default" },
        classic: { label: "Classique" },
        minimal: { label: "Minimal Verre" },
        block: { label: "Bloc Mécanique" },
        "block-white": { label: "Bloc Blanc" },
        retro: { label: "Retro Terminal" },
      };
      const LEGACY_THEME_MAP = {
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
        split: "classic",
      };
      function resolveThemeKey(theme) {
        if (!theme) {
          return "default";
        }
        const themeKey =
          typeof theme === "string" ? theme.toLowerCase() : "default";
        if (Object.prototype.hasOwnProperty.call(KEY_THEMES, themeKey)) {
          return themeKey;
        }
        const mappedTheme = LEGACY_THEME_MAP[themeKey];
        if (
          mappedTheme &&
          Object.prototype.hasOwnProperty.call(KEY_THEMES, mappedTheme)
        ) {
          return mappedTheme;
        }
        return "default";
      }
      function normalizeKeyValue(value) {
        if (!value) {
          return "";
        }
        return value.toLowerCase();
      }
      function clampKeypressScale(scale) {
        const numScale = typeof scale === "number" ? scale : parseFloat(scale);
        if (Number.isNaN(numScale)) {
          return 1;
        }
        return Math.min(1.6, Math.max(0.6, numScale));
      }
      function getKeypressSizePercent(scale = keypressSettings.size) {
        const numScale =
          typeof scale === "number" ? scale : keypressSettings.size;
        return Math.round(Math.min(1.6, Math.max(0.6, numScale)) * 100);
      }
      function updateKeypressSizeIndicator(scale) {
        if (!keySizeIndicator) {
          return;
        }
        keySizeIndicator.textContent = getKeypressSizePercent(scale) + "%";
      }
      function persistKeypressSettings(newSettings = {}) {
        const validLayouts = Object.keys(KEY_LAYOUTS);
        const layout =
          typeof newSettings.layout === "string"
            ? newSettings.layout.toLowerCase()
            : keypressSettings.layout;
        let newLayout = validLayouts.includes(layout)
          ? layout
          : keypressSettings.layout;
        const newSize =
          typeof newSettings.size === "number"
            ? clampKeypressScale(newSettings.size)
            : keypressSettings.size;
        const newVisibility =
          typeof newSettings.visible === "boolean"
            ? newSettings.visible
            : keypressSettings.visible;
        const theme =
          typeof newSettings.theme === "string"
            ? newSettings.theme
            : keypressSettings.theme;
        const newTheme = resolveThemeKey(theme);
        let newPosition = keypressSettings.position;
        if (newSettings.position && typeof newSettings.position === "object") {
          const x = Number(newSettings.position.x);
          const y = Number(newSettings.position.y);
          if (Number.isFinite(x) && Number.isFinite(y)) {
            newPosition = { x: Math.round(x), y: Math.round(y) };
          }
        }
        const settingsToSave = {
          action: "saveKeypressSettings",
          visible: newVisibility,
          size: newSize,
          layout: newLayout,
          theme: newTheme,
          position: newPosition ? { x: newPosition.x, y: newPosition.y } : null,
        };
        const positionsAreEqual = (pos1, pos2) => {
          if (!pos1 && !pos2) {
            return !0;
          }
          if (!pos1 || !pos2) {
            return !1;
          }
          return pos1.x === pos2.x && pos1.y === pos2.y;
        };
        if (
          lastSavedKeypressSettings.visible === settingsToSave.visible &&
          lastSavedKeypressSettings.size === settingsToSave.size &&
          lastSavedKeypressSettings.layout === settingsToSave.layout &&
          lastSavedKeypressSettings.theme === settingsToSave.theme &&
          positionsAreEqual(
            lastSavedKeypressSettings.position,
            settingsToSave.position,
          )
        ) {
          return;
        }
        lastSavedKeypressSettings = {
          visible: settingsToSave.visible,
          size: settingsToSave.size,
          layout: settingsToSave.layout,
          theme: settingsToSave.theme,
          position: settingsToSave.position
            ? { x: settingsToSave.position.x, y: settingsToSave.position.y }
            : null,
        };
        keypressSettings.visible = settingsToSave.visible;
        keypressSettings.size = settingsToSave.size;
        keypressSettings.layout = settingsToSave.layout;
        keypressSettings.theme = settingsToSave.theme;
        keypressSettings.position = settingsToSave.position
          ? { x: settingsToSave.position.x, y: settingsToSave.position.y }
          : null;
        chrome.runtime.sendMessage(settingsToSave, () => { });
      }
      function ensureKeypressResizeElements() {
        if (!keypressOverlay) {
          return;
        }
        if (!keyResizeHandle) {
          keyResizeHandle = document.createElement("div");
          keyResizeHandle.className = "key-resize-handle";
          keypressOverlay.appendChild(keyResizeHandle);
        }
        if (!keySizeIndicator) {
          keySizeIndicator = document.createElement("div");
          keySizeIndicator.className = "key-size-indicator";
          keypressOverlay.appendChild(keySizeIndicator);
        }
        updateKeypressSizeIndicator();
        if (!keyResizeHandle.dataset.bound) {
          keyResizeHandle.addEventListener("mousedown", startKeyResize);
          keyResizeHandle.dataset.bound = "true";
        }
      }
      function getKeypressOverlayRect() {
        if (!keypressOverlay) {
          return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
        }
        const styles = window.getComputedStyle(keypressOverlay);
        let restoreStyles = null;
        if (styles.display === "none") {
          const originalDisplay = keypressOverlay.style.display;
          const originalVisibility = keypressOverlay.style.visibility;
          keypressOverlay.style.visibility = "hidden";
          keypressOverlay.style.display = "block";
          restoreStyles = () => {
            keypressOverlay.style.display = originalDisplay;
            keypressOverlay.style.visibility = originalVisibility;
          };
        }
        const rect = keypressOverlay.getBoundingClientRect();
        if (restoreStyles) {
          restoreStyles();
        }
        return rect;
      }
      function computeDefaultKeypressPosition(rect) {
        const overlayRect = rect || getKeypressOverlayRect();
        const overlayWidth = overlayRect.width || 180;
        const overlayHeight = overlayRect.height || 180;
        const x = Math.max(
          10,
          Math.round(window.innerWidth - overlayWidth - 30),
        );
        const y = Math.max(
          10,
          Math.round(window.innerHeight - overlayHeight - 30),
        );
        return { x, y };
      }
      function applyKeypressPosition(position) {
        if (!keypressOverlay) {
          return;
        }
        const rect = getKeypressOverlayRect();
        const overlayWidth = rect.width || keypressOverlay.offsetWidth || 0;
        const overlayHeight = rect.height || keypressOverlay.offsetHeight || 0;
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;
        let newPos = null;
        if (
          position &&
          Number.isFinite(position.x) &&
          Number.isFinite(position.y)
        ) {
          newPos = { x: position.x, y: position.y };
        } else {
          newPos = computeDefaultKeypressPosition(rect);
        }
        const finalPos = {
          x: Math.max(0, Math.min(winWidth - overlayWidth, newPos.x)),
          y: Math.max(0, Math.min(winHeight - overlayHeight, newPos.y)),
        };
        keypressOverlay.style.left = Math.round(finalPos.x) + "px";
        keypressOverlay.style.top = Math.round(finalPos.y) + "px";
        keypressOverlay.style.right = "auto";
        keypressOverlay.style.bottom = "auto";
        keypressOverlay.style.transform = "none";
        keypressSettings.position = { ...finalPos };
      }
      function saveKeypressPosition() {
        if (!keypressOverlay) {
          return;
        }
        let x = parseFloat(keypressOverlay.style.left);
        let y = parseFloat(keypressOverlay.style.top);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          const rect = getKeypressOverlayRect();
          if (!Number.isFinite(x)) {
            x = rect.left;
          }
          if (!Number.isFinite(y)) {
            y = rect.top;
          }
        }
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return;
        }
        const position = {
          x: Math.max(0, Math.round(x)),
          y: Math.max(0, Math.round(y)),
        };
        keypressSettings.position = { ...position };
        persistKeypressSettings({ position });
      }
      function applyKeypressTheme(theme) {
        if (!keypressOverlay) {
          return;
        }
        const themeKey = resolveThemeKey(theme);
        Object.keys(KEY_THEMES).forEach((key) => {
          keypressOverlay.classList.toggle(
            "key-theme-" + key,
            key === themeKey,
          );
        });
        keypressOverlay.dataset.theme = themeKey;
      }
      function setKeypressTheme(theme, options = {}) {
        const newTheme = resolveThemeKey(theme);
        const changed = keypressSettings.theme !== newTheme;
        keypressSettings.theme = newTheme;
        if (keypressOverlay) {
          applyKeypressTheme(newTheme);
        }
        if (options.persist && changed) {
          persistKeypressSettings({ theme: newTheme });
        }
        return newTheme;
      }
      function startKeyResize(_0x5d8143) {
        if (!keypressOverlay) {
          return;
        }
        _0x5d8143.preventDefault();
        _0x5d8143.stopPropagation();
        const _0x1153c6 = keypressOverlay.getBoundingClientRect();
        keyResizeState = {
          startX: _0x5d8143.clientX,
          startY: _0x5d8143.clientY,
          width: _0x1153c6.width,
          height: _0x1153c6.height,
          diagonal: Math.hypot(_0x1153c6.width, _0x1153c6.height) || 0x1,
          scale: keypressSettings.size,
        };
        isKeyResizeActive = !0;
        keypressOverlay.classList.add("resizing");
        updateKeypressSizeIndicator(keyResizeState.scale);
        document.addEventListener("mousemove", performKeyResize);
        document.addEventListener("mouseup", stopKeyResize);
      }
      function performKeyResize(_0x8e8e37) {
        if (!isKeyResizeActive || !keyResizeState) {
          return;
        }
        _0x8e8e37.preventDefault();
        const _0x12e32d = _0x8e8e37.clientX - keyResizeState.startX;
        const _0x219e9b = _0x8e8e37.clientY - keyResizeState.startY;
        const _0x3f1707 = Math.max(0x1e, keyResizeState.width + _0x12e32d);
        const _0x3068ce = Math.max(0x1e, keyResizeState.height + _0x219e9b);
        const _0x370d34 = Math.hypot(_0x3f1707, _0x3068ce);
        const _0x14f901 = _0x370d34 / keyResizeState.diagonal;
        const _0x2c7f14 = clampKeypressScale(keyResizeState.scale * _0x14f901);
        applyKeypressSize(_0x2c7f14);
        updateKeypressSizeIndicator(_0x2c7f14);
      }
      function stopKeyResize() {
        if (!isKeyResizeActive) {
          return;
        }
        document.removeEventListener("mousemove", performKeyResize);
        document.removeEventListener("mouseup", stopKeyResize);
        isKeyResizeActive = !1;
        if (keypressOverlay) {
          keypressOverlay.classList.remove("resizing");
        }
        updateKeypressSizeIndicator();
        persistKeypressSettings({ size: keypressSettings.size });
        keyResizeState = null;
      }
      function resetKeypressActiveState() {
        keypressActiveKeys.clear();
        for (const _0x3aeb0f in keypressElementMap) {
          if (
            Object.prototype.hasOwnProperty.call(keypressElementMap, _0x3aeb0f)
          ) {
            const _0x5c1129 = keypressElementMap[_0x3aeb0f];
            if (_0x5c1129) {
              _0x5c1129.classList.remove("active");
            }
          }
        }
      }
      function renderKeypressLayout(_0x163ef5) {
        if (!keypressOverlay) {
          return;
        }
        const _0x9ae2fa = keypressOverlay.querySelector(".key-container");
        if (!_0x9ae2fa) {
          return;
        }
        const _0x122470 = KEY_LAYOUTS[_0x163ef5] || KEY_LAYOUTS.arrows;
        keypressKeyMap = {};
        keypressElementMap = Object.create(null);
        keypressActiveKeys.clear();
        _0x9ae2fa.innerHTML = "";
        _0x122470.rows.forEach((_0x28272f) => {
          const _0x2d8233 = document.createElement("div");
          _0x2d8233.className = "key-row";
          _0x28272f.forEach((_0x44035d) => {
            const _0x3b817a = document.createElement("div");
            _0x3b817a.className = "key";
            _0x3b817a.id = _0x44035d.id;
            const _0x4eb2a4 = document.createElement("span");
            _0x4eb2a4.textContent = _0x44035d.label;
            _0x3b817a.appendChild(_0x4eb2a4);
            const _0x3475f8 = _0x44035d.matches.map((_0x30f79c) =>
              _0x30f79c.toLowerCase(),
            );
            _0x3b817a.dataset.matches = _0x3475f8.join(",");
            _0x3475f8.forEach((_0x41f126) => {
              keypressKeyMap[_0x41f126] = _0x44035d.id;
            });
            keypressElementMap[_0x44035d.id] = _0x3b817a;
            _0x2d8233.appendChild(_0x3b817a);
          });
          _0x9ae2fa.appendChild(_0x2d8233);
        });
        keypressOverlay.dataset.layout = _0x163ef5;
        resetKeypressActiveState();
      }
      function applyKeypressSize(_0x3c3c5b) {
        const _0x2bc1d7 = clampKeypressScale(_0x3c3c5b);
        keypressSettings.size = _0x2bc1d7;
        if (keypressOverlay) {
          keypressOverlay.style.setProperty("--key-scale", String(_0x2bc1d7));
          if (keypressVisible) {
            scheduleKeypressBoundsCheck();
          }
        }
        updateKeypressSizeIndicator(_0x2bc1d7);
      }
      function setKeypressLayout(_0x450b1f) {
        const _0x16fd97 =
          typeof _0x450b1f === "string" ? _0x450b1f.toLowerCase() : "arrows";
        const _0x7d8f89 = _0x16fd97;
        const _0x4a08cc = KEY_LAYOUTS[_0x7d8f89] ? _0x7d8f89 : "arrows";
        const _0x36628d = keypressSettings.layout !== _0x4a08cc;
        keypressSettings.layout = _0x4a08cc;
        if (
          keypressOverlay &&
          (_0x36628d || keypressOverlay.dataset.layout !== _0x4a08cc)
        ) {
          renderKeypressLayout(_0x4a08cc);
          if (keypressVisible) {
            scheduleKeypressBoundsCheck();
          }
        }
      }
      function handleKeydown(_0x3742d2) {
        if (!keypressVisible || !keypressOverlay) {
          return;
        }
        const _0x343915 = normalizeKeyValue(_0x3742d2.key);
        const _0x23f342 = _0x3742d2.code
          ? normalizeKeyValue(_0x3742d2.code)
          : null;
        let _0x5bc161 = keypressKeyMap[_0x343915];
        if (!_0x5bc161 && _0x23f342) {
          _0x5bc161 = keypressKeyMap[_0x23f342];
        }
        if (!_0x5bc161) {
          return;
        }
        if (keypressActiveKeys.has(_0x5bc161)) {
          return;
        }
        const _0x4b1556 = keypressElementMap[_0x5bc161];
        if (!_0x4b1556) {
          return;
        }
        keypressActiveKeys.add(_0x5bc161);
        _0x4b1556.classList.add("active");
        if (storedCustomBackgroundActive) {
          _0x4b1556.style.setProperty(
            "background-image",
            `url(${storedCustomBackgroundActive})`,
          );
        }
      }
      function handleKeyup(_0x9e283c) {
        if (!keypressVisible || !keypressOverlay) {
          return;
        }
        let _0x4abc8d = keypressKeyMap[normalizeKeyValue(_0x9e283c.key)];
        if (!_0x4abc8d && _0x9e283c.code) {
          _0x4abc8d = keypressKeyMap[normalizeKeyValue(_0x9e283c.code)];
        }
        if (!_0x4abc8d) {
          return;
        }
        keypressActiveKeys["delete"](_0x4abc8d);
        const _0x10d66b = keypressElementMap[_0x4abc8d];
        if (_0x10d66b) {
          _0x10d66b.classList.remove("active");
          if (storedCustomBackground) {
            _0x10d66b.style.setProperty(
              "background-image",
              `url(${storedCustomBackground})`,
            );
          } else {
            _0x10d66b.style.removeProperty("background-image");
          }
        }
      }
      function createKeypressOverlay() {
        if (keypressOverlay) {
          return keypressOverlay;
        }
        keypressOverlay = document.createElement("div");
        keypressOverlay.id = "key-display-overlay";
        keypressOverlay.style.setProperty(
          "--key-scale",
          String(clampKeypressScale(keypressSettings.size)),
        );
        const _0x5dc46f = document.createElement("div");
        _0x5dc46f.className = "key-container";
        keypressOverlay.appendChild(_0x5dc46f);
        let _0x21947e = document.getElementById("key-display-overlay-style");
        if (!_0x21947e) {
          _0x21947e = document.createElement("style");
          _0x21947e.id = "key-display-overlay-style";
          _0x21947e.textContent =
            '\n        #key-display-overlay {\n            position: fixed;\n            bottom: 30px;\n            right: 30px;\n            z-index: 2147483647 !important;\n            user-select: none;\n            cursor: move;\n            display: none;\n            padding: 0;\n            margin: 0;\n            border-radius: 0;\n            background: transparent !important;\n            border: none !important;\n            box-shadow: none !important;\n            outline: none !important;\n            overflow: visible;\n            animation: keyOverlayFadeIn 0.3s ease;\n            --key-scale: 1;\n            --key-base-size: 60px;\n            --key-gap: 10px;\n            --key-border-width: calc(2px * var(--key-scale));\n            --key-radius: calc(12px * var(--key-scale));\n            --key-bg: linear-gradient(145deg, #2b2b2b, #191919);\n            --key-border: #3d3d3d;\n            --key-hover-bg: linear-gradient(145deg, #323232, #1f1f1f);\n            --key-active-bg: linear-gradient(145deg, #4bc277, #328f56);\n            --key-active-border: #6fe49d;\n            --key-shadow: 0 calc(6px * var(--key-scale)) calc(18px * var(--key-scale)) rgba(0, 0, 0, 0.55),\n                          inset 0 calc(1px * var(--key-scale)) calc(3px * var(--key-scale)) rgba(255, 255, 255, 0.12);\n            --key-hover-shadow: 0 calc(7px * var(--key-scale)) calc(20px * var(--key-scale)) rgba(0, 0, 0, 0.55);\n            --key-active-shadow: 0 calc(5px * var(--key-scale)) calc(22px * var(--key-scale)) rgba(73, 194, 119, 0.55),\n                                 inset 0 0 calc(18px * var(--key-scale)) rgba(73, 194, 119, 0.45);\n            --key-color: #ffffff;\n            --key-font: \'Segoe UI\', Arial, sans-serif;\n            --key-letter: 0;\n            --key-text-shadow: 0 calc(2px * var(--key-scale)) calc(4px * var(--key-scale)) rgba(0, 0, 0, 0.8);\n            --resize-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0));\n            --resize-border: rgba(255, 255, 255, 0.25);\n            --resize-shadow: inset 0 0 calc(4px * var(--key-scale)) rgba(0, 0, 0, 0.3);\n        }\n        #key-display-overlay::before,\n        #key-display-overlay::after {\n            display: none !important;\n        }\n        #key-display-overlay .key-container {\n            display: flex;\n            flex-direction: column;\n            align-items: center;\n            justify-content: center;\n            gap: calc(var(--key-gap) * var(--key-scale));\n            padding: 0;\n            margin: 0;\n            border: none;\n            background: transparent;\n            box-shadow: none;\n        }\n        #key-display-overlay .key-row {\n            display: flex;\n            gap: calc(var(--key-gap) * var(--key-scale));\n            align-items: stretch;\n            justify-content: center;\n        }\n        #key-display-overlay .key {\n            position: relative;\n            width: calc(var(--key-base-size) * var(--key-scale));\n            height: calc(var(--key-base-size) * var(--key-scale));\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            border-radius: var(--key-radius);\n            background: var(--key-bg);\n            border: var(--key-border-width) solid var(--key-border);\n            box-shadow: var(--key-shadow);\n            color: var(--key-color);\n            font-family: var(--key-font);\n            letter-spacing: var(--key-letter);\n            text-transform: none;\n            transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease, border-color 0.12s ease;\n            transform: var(--key-transform, translate3d(0, 0, 0));\n        }\n        #key-display-overlay .key span {\n            font-size: calc(22px * var(--key-scale));\n            font-weight: 600;\n            text-shadow: var(--key-text-shadow);\n            pointer-events: none;\n        }\n        #key-display-overlay .key:hover {\n            box-shadow: var(--key-hover-shadow);\n            background: var(--key-hover-bg);\n        }\n        #key-display-overlay .key.active {\n            box-shadow: var(--key-active-shadow);\n            background: var(--key-active-bg);\n            border-color: var(--key-active-border);\n        }\n        #key-display-overlay .key-resize-handle {\n            position: absolute;\n            bottom: calc(-8px * var(--key-scale));\n            right: calc(-8px * var(--key-scale));\n            width: calc(18px * var(--key-scale));\n            height: calc(18px * var(--key-scale));\n            border-radius: 4px;\n            border: none;\n            background: transparent;\n            box-shadow: none;\n            cursor: nwse-resize;\n            opacity: 0;\n            transition: opacity 0.2s ease;\n        }\n        #key-display-overlay:hover .key-resize-handle {\n            opacity: 0.4;\n        }\n        #key-display-overlay .key-resize-handle:hover {\n            opacity: 0.7 !important;\n        }\n        #key-display-overlay .key-resize-handle::after {\n            content: \'\';\n            position: absolute;\n            inset: 6px;\n            border-radius: 3px;\n            border: 1px solid rgba(255, 255, 255, 0.3);\n        }\n        #key-display-overlay .key-size-indicator {\n            position: absolute;\n            bottom: calc(100% + 10px);\n            right: 0;\n            padding: 6px 10px;\n            border-radius: 4px;\n            pointer-events: none;\n            opacity: 0;\n            transition: opacity 0.2s ease;\n            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);\n            background: rgba(0, 0, 0, 0.7);\n            color: #ffffff;\n            font-size: 12px;\n            font-weight: 600;\n        }\n        #key-display-overlay.resizing .key-size-indicator {\n            opacity: 1;\n        }\n        #key-display-overlay.key-theme-classic {\n            --key-base-size: 60px;\n            --key-gap: 10px;\n            --key-border-width: calc(2px * var(--key-scale));\n            --key-radius: calc(14px * var(--key-scale));\n            --key-bg: linear-gradient(145deg, #2c2c2c, #151515);\n            --key-border: #3f3f3f;\n            --key-hover-bg: linear-gradient(145deg, #353535, #1d1d1d);\n            --key-active-bg: linear-gradient(145deg, #47bf74, #2f8f52);\n            --key-active-border: #6ce099;\n            --key-shadow: 0 calc(6px * var(--key-scale)) calc(20px * var(--key-scale)) rgba(0, 0, 0, 0.6),\n                          inset 0 calc(1px * var(--key-scale)) calc(3px * var(--key-scale)) rgba(255, 255, 255, 0.12);\n            --key-hover-shadow: 0 calc(7px * var(--key-scale)) calc(22px * var(--key-scale)) rgba(0, 0, 0, 0.6);\n            --key-active-shadow: 0 calc(5px * var(--key-scale)) calc(24px * var(--key-scale)) rgba(73, 194, 119, 0.55),\n                                 inset 0 0 calc(18px * var(--key-scale)) rgba(73, 194, 119, 0.42);\n        }\n        #key-display-overlay.key-theme-classic::before,\n        #key-display-overlay.key-theme-classic::after {\n            opacity: 0;\n            background: none;\n            border: none;\n        }\n        #key-display-overlay.key-theme-minimal {\n            padding: 0;\n            --key-base-size: 58px;\n            --key-gap: 14px;\n            --key-border-width: calc(1.4px * var(--key-scale));\n            --key-radius: calc(6px * var(--key-scale));\n            --key-bg: #000000;\n            --key-border: rgba(255, 255, 255, 0.45);\n            --key-hover-bg: rgba(255, 255, 255, 0.18);\n            --key-active-bg: #ffffff;\n            --key-active-border: rgba(255, 255, 255, 0.9);\n            --key-shadow: none;\n            --key-hover-shadow: none;\n            --key-active-shadow: none;\n            --key-color: #f7f7f7;\n            --key-text-shadow: none;\n            --resize-bg: rgba(255, 255, 255, 0.35);\n            --resize-border: rgba(255, 255, 255, 0.5);\n        }\n        #key-display-overlay.key-theme-minimal .key {\n            background: var(--key-bg) !important;\n        }\n        #key-display-overlay.key-theme-minimal .key.active {\n            background: #ffffff !important;\n            color: #000000 !important;\n        }\n        #key-display-overlay.key-theme-minimal .key.active span {\n            color: #000000 !important;\n        }\n        #key-display-overlay.key-theme-minimal::before,\n        #key-display-overlay.key-theme-minimal::after {\n            opacity: 0;\n            background: none;\n            border: none;\n            transform: none;\n        }\n        #key-display-overlay.key-theme-minimal .key-container {\n            display: grid;\n            grid-template-columns: repeat(3, minmax(calc(42px * var(--key-scale)), 1fr));\n            grid-template-rows: repeat(2, minmax(calc(42px * var(--key-scale)), 1fr));\n            grid-template-areas:\n                ". up ."\n                "left down right";\n            align-items: center;\n            justify-items: center;\n            gap: calc(16px * var(--key-scale));\n            width: calc(220px * var(--key-scale));\n            padding: 0;\n            border: none;\n            background: transparent;\n            box-shadow: none;\n        }\n        #key-display-overlay.key-theme-minimal .key-row {\n            display: contents;\n        }\n        #key-display-overlay.key-theme-minimal .key {\n            border-radius: calc(8px * var(--key-scale));\n        }\n        #key-display-overlay.key-theme-minimal #key-up { grid-area: up; }\n        #key-display-overlay.key-theme-minimal #key-down { grid-area: down; }\n        #key-display-overlay.key-theme-minimal #key-left { grid-area: left; }\n        #key-display-overlay.key-theme-minimal #key-right { grid-area: right; }\n        #key-display-overlay.key-theme-block {\n            padding: 0;\n            --key-base-size: 58px;\n            --key-gap: 8px;\n            --key-border-width: calc(3px * var(--key-scale));\n            --key-radius: calc(4px * var(--key-scale));\n            --key-bg: linear-gradient(160deg, #303030 0%, #1b1b1b 60%, #050505 100%);\n            --key-border: #050505;\n            --key-hover-bg: linear-gradient(160deg, #3a3a3a, #1f1f1f, #090909);\n            --key-active-bg: linear-gradient(160deg, #ffb347, #ffcc33);\n            --key-active-border: #ffe066;\n            --key-color: #fff7d1;\n            --key-shadow: 0 calc(6px * var(--key-scale)) calc(14px * var(--key-scale)) rgba(8, 8, 8, 0.85);\n            --key-hover-shadow: 0 calc(7px * var(--key-scale)) calc(18px * var(--key-scale)) rgba(0, 0, 0, 0.9);\n            --key-active-shadow: 0 calc(6px * var(--key-scale)) calc(22px * var(--key-scale)) rgba(255, 204, 51, 0.45);\n            --key-text-shadow: 0 calc(2px * var(--key-scale)) calc(4px * var(--key-scale)) rgba(0, 0, 0, 0.9);\n        }\n        #key-display-overlay.key-theme-block::before,\n        #key-display-overlay.key-theme-block::after {\n            opacity: 0;\n            background: none;\n            border: none;\n        }\n        #key-display-overlay.key-theme-block .key-container {\n            padding: 0;\n            border: none;\n            border-radius: calc(12px * var(--key-scale));\n            background: transparent;\n            box-shadow: none;\n        }\n        #key-display-overlay.key-theme-block .key span {\n            font-weight: 800;\n        }\n        #key-display-overlay.key-theme-block-white {\n            padding: 0;\n            --key-base-size: 58px;\n            --key-gap: 8px;\n            --key-border-width: calc(3px * var(--key-scale));\n            --key-radius: calc(4px * var(--key-scale));\n            --key-bg: #000000;\n            --key-border: transparent;\n            --key-hover-bg: #000000;\n            --key-active-bg: #ffffff;\n            --key-active-border: #ffffff;\n            --key-color: #ffffff;\n            --key-shadow: none;\n            --key-hover-shadow: none;\n            --key-active-shadow: 0 0 0 rgba(0,0,0,0);\n            --key-text-shadow: none;\n        }\n        #key-display-overlay.key-theme-block-white::before,\n        #key-display-overlay.key-theme-block-white::after {\n            opacity: 0;\n            background: none;\n            border: none;\n        }\n        #key-display-overlay.key-theme-block-white .key-container {\n            padding: 0;\n            border: none;\n            border-radius: calc(12px * var(--key-scale));\n            background: transparent;\n            box-shadow: none;\n        }\n        #key-display-overlay.key-theme-block-white .key span {\n            font-weight: 800;\n        }\n        #key-display-overlay.key-theme-block-white .key.active {\n            color: #0b0b0b;\n        }\n        #key-display-overlay.key-theme-block-white .key.active span {\n            color: #0b0b0b;\n        }\n        #key-display-overlay.key-theme-retro {\n            padding: 0;\n            --key-base-size: 58px;\n            --key-gap: 8px;\n            --key-border-width: calc(2px * var(--key-scale));\n            --key-radius: 0;\n            --key-bg: repeating-linear-gradient(45deg, #333, #333 8px, #2a2a2a 8px, #2a2a2a 16px);\n            --key-border: #00ff7f;\n            --key-hover-bg: repeating-linear-gradient(45deg, #3f3f3f, #3f3f3f 8px, #333 8px, #333 16px);\n            --key-active-bg: #00ff7f;\n            --key-active-border: #111111;\n            --key-color: #00ff7f;\n            --key-shadow: 0 calc(2px * var(--key-scale)) 0 rgba(0, 0, 0, 0.9);\n            --key-hover-shadow: 0 calc(3px * var(--key-scale)) 0 rgba(0, 0, 0, 0.9);\n            --key-active-shadow: 0 calc(4px * var(--key-scale)) 0 rgba(0, 0, 0, 0.95);\n            --key-font: \'Courier New\', monospace;\n            --key-letter: 0.08em;\n            --key-text-shadow: none;\n        }\n        #key-display-overlay.key-theme-retro::before,\n        #key-display-overlay.key-theme-retro::after {\n            opacity: 0;\n            background: none;\n            border: none;\n        }\n        #key-display-overlay.key-theme-retro {\n            border-radius: calc(6px * var(--key-scale));\n        }\n        #key-display-overlay.key-theme-retro .key-container {\n            border: none;\n            padding: 0;\n            background: transparent;\n            box-shadow: none;\n        }\n        #key-display-overlay.key-theme-retro .key {\n            border-top: calc(4px * var(--key-scale)) solid #111111;\n        }\n        #key-display-overlay.key-theme-retro .key span {\n            text-transform: uppercase;\n            font-weight: 700;\n        }\n        #key-display-overlay.key-theme-split {\n            padding: 0;\n            --key-base-size: 54px;\n            --key-gap: 12px;\n            --key-radius: calc(10px * var(--key-scale));\n            --key-bg: linear-gradient(145deg, #1f1f1f, #101010);\n            --key-border: rgba(255, 255, 255, 0.18);\n            --key-hover-bg: linear-gradient(145deg, #282828, #141414);\n            --key-active-bg: linear-gradient(145deg, #42b0ff, #2d7de2);\n            --key-active-border: #66c7ff;\n            --key-shadow: 0 calc(6px * var(--key-scale)) calc(12px * var(--key-scale)) rgba(0, 0, 0, 0.5);\n            --key-hover-shadow: 0 calc(8px * var(--key-scale)) calc(18px * var(--key-scale)) rgba(0, 0, 0, 0.55);\n            --key-active-shadow: 0 calc(8px * var(--key-scale)) calc(22px * var(--key-scale)) rgba(66, 176, 255, 0.45);\n        }\n        #key-display-overlay.key-theme-split::before,\n        #key-display-overlay.key-theme-split::after {\n            opacity: 0;\n            background: none;\n            border: none;\n        }\n        #key-display-overlay.key-theme-split .key-container {\n            display: grid;\n            grid-template-columns: repeat(2, minmax(calc(58px * var(--key-scale)), 1fr));\n            grid-template-rows: repeat(2, minmax(calc(58px * var(--key-scale)), 1fr));\n            grid-template-areas:\n                "up right"\n                "left down";\n            gap: calc(18px * var(--key-scale));\n            align-items: stretch;\n            justify-items: stretch;\n            padding: 0;\n            background: transparent;\n            border-radius: calc(18px * var(--key-scale));\n            box-shadow: none;\n        }\n        #key-display-overlay.key-theme-split .key-row {\n            display: contents;\n        }\n        #key-display-overlay.key-theme-split #key-up {\n            grid-area: up;\n            align-self: end;\n            justify-self: start;\n            --key-transform: rotate(-6deg);\n        }\n        #key-display-overlay.key-theme-split #key-right {\n            grid-area: right;\n            align-self: start;\n            justify-self: end;\n            --key-transform: rotate(8deg);\n        }\n        #key-display-overlay.key-theme-split #key-left {\n            grid-area: left;\n            align-self: start;\n            justify-self: start;\n            --key-transform: rotate(-10deg);\n        }\n        #key-display-overlay.key-theme-split .key.active {\n            --key-active-bg: linear-gradient(135deg, #52c0ff 0%, #3b8de8 100%);\n            --key-active-border: #88d4ff;\n        }\n        #key-display-overlay.key-theme-default {\n            --key-bg: #000000;\n            --key-border: #000000;\n            --key-radius: 0;\n            --key-active-bg: #FFFFFF;\n            --key-active-border: #FFFFFF;\n            --key-color: #FFFFFF;\n            --key-active-color: #000000;\n            --key-shadow: none;\n            --key-active-shadow: none;\n        }\n        #key-display-overlay.key-theme-default .key.active > span {\n            color: #000000 !important;\n        }\n        #key-display-overlay.key-theme-default .key {\n            transition: background 0.1s ease, border-color 0.1s ease;\n        }\n        #key-display-overlay.key-theme-default .key.active {\n            transition-duration: 0.05s;\n        }\n        @keyframes keyOverlayFadeIn {\n            from { opacity: 0; transform: translateY(15px) scale(0.98); }\n            to { opacity: 1; transform: translateY(0) scale(1); }\n        }\n        ';
          document.head.appendChild(_0x21947e);
        }
        document.documentElement.appendChild(keypressOverlay);
        chrome.storage.local.get(
          ["customBackground", "customBackgroundActive"],
          (_0x181a2f) => {
            if (_0x181a2f.customBackground) {
              storedCustomBackground = _0x181a2f.customBackground;
              applyCustomBackground(
                keypressOverlay,
                _0x181a2f.customBackground,
              );
            }
            if (_0x181a2f.customBackgroundActive) {
              storedCustomBackgroundActive = _0x181a2f.customBackgroundActive;
            }
          },
        );
        applyKeypressTheme(keypressSettings.theme || "default");
        setKeypressLayout(keypressSettings.layout || "arrows");
        applyKeypressSize(keypressSettings.size || 0x1);
        ensureKeypressResizeElements();
        applyKeypressPosition(keypressSettings.position);
        makeDraggable(keypressOverlay, { onChange: saveKeypressPosition });
        scheduleKeypressBoundsCheck();
        return keypressOverlay;
      }
      function keepOverlayInBounds() {
        if (!keypressOverlay) {
          return;
        }
        const _0x4f8c10 = getKeypressOverlayRect();
        const _0x1c7aab = window.innerWidth;
        const _0x1e87f7 = window.innerHeight;
        let _0x3b2564 = _0x4f8c10.left;
        let _0x415510 = _0x4f8c10.top;
        let _0xc08179 = !1;
        if (_0x4f8c10.right > _0x1c7aab) {
          _0x3b2564 = Math.max(0x0, _0x1c7aab - _0x4f8c10.width - 0xa);
          _0xc08179 = !0;
        }
        if (_0x4f8c10.left < 0x0) {
          _0x3b2564 = 0xa;
          _0xc08179 = !0;
        }
        if (_0x4f8c10.bottom > _0x1e87f7) {
          _0x415510 = Math.max(0x0, _0x1e87f7 - _0x4f8c10.height - 0xa);
          _0xc08179 = !0;
        }
        if (_0x4f8c10.top < 0x0) {
          _0x415510 = 0xa;
          _0xc08179 = !0;
        }
        if (_0xc08179) {
          keypressOverlay.style.left = Math.round(_0x3b2564) + "px";
          keypressOverlay.style.top = Math.round(_0x415510) + "px";
          keypressOverlay.style.right = "auto";
          keypressOverlay.style.bottom = "auto";
          keypressOverlay.style.transform = "none";
          keypressSettings.position = {
            x: Math.round(_0x3b2564),
            y: Math.round(_0x415510),
          };
          persistKeypressSettings({ position: keypressSettings.position });
        }
      }
      function scheduleKeypressBoundsCheck() {
        if (!keypressOverlay) {
          return;
        }
        if (keypressBoundsHandle !== null) {
          return;
        }
        keypressBoundsHandle = requestAnimationFrame(() => {
          keypressBoundsHandle = null;
          keepOverlayInBounds();
        });
      }
      function toggleKeypressDisplay() {
        if (!keypressOverlay) {
          createKeypressOverlay();
        }
        keypressVisible = !keypressVisible;
        keypressSettings.visible = keypressVisible;
        log("Keypress display toggled:", keypressVisible);
        if (keypressVisible) {
          applyKeypressTheme(keypressSettings.theme);
          setKeypressLayout(keypressSettings.layout);
          applyKeypressSize(keypressSettings.size);
          keypressOverlay.style.display = "block";
          applyKeypressPosition(keypressSettings.position);
          scheduleKeypressBoundsCheck();
          ensureKeypressResizeElements();
          updateKeypressSizeIndicator();
          resetKeypressActiveState();
          log(
            "Keypress display is now active using layout " +
            keypressSettings.layout +
            ".",
          );
        } else {
          keypressOverlay.style.display = "none";
          resetKeypressActiveState();
        }
        persistKeypressSettings({
          visible: keypressVisible,
          size: keypressSettings.size,
          layout: keypressSettings.layout,
          theme: keypressSettings.theme,
          position: keypressSettings.position,
        });
        return keypressVisible;
      }
      window.addEventListener("resize", () => {
        if (keypressOverlay) {
          scheduleKeypressBoundsCheck();
        }
      });
      document.addEventListener("fullscreenchange", () => {
        if (keypressOverlay) {
          scheduleKeypressBoundsCheck();
        }
      });
      chrome.runtime.sendMessage(
        { action: "getKeypressSettings" },
        (_0x18252a) => {
          if (chrome.runtime.lastError) {
            return;
          }
          if (_0x18252a && _0x18252a.settings) {
            keypressVisible = !!_0x18252a.settings.visible;
            keypressSettings.visible = keypressVisible;
            keypressSettings.size = clampKeypressScale(
              _0x18252a.settings.size ?? 0x1,
            );
            keypressSettings.layout =
              typeof _0x18252a.settings.layout === "string"
                ? KEY_LAYOUTS[_0x18252a.settings.layout.toLowerCase()]
                  ? _0x18252a.settings.layout.toLowerCase()
                  : "arrows"
                : "arrows";
            if (keypressVisible) {
              createKeypressOverlay();
              setKeypressLayout(keypressSettings.layout);
              applyKeypressSize(keypressSettings.size);
              keypressOverlay.style.display = "block";
              setTimeout(() => keepOverlayInBounds(), 0x64);
            }
          }
        },
      );
      chrome.runtime.onMessage.addListener((_0x4b84e5, _0x797bbd, _0x14454) => {
        switch (_0x4b84e5.action) {
          case "toggleTimer":
            toggleTimerVisibility();
            _0x14454({ success: !0 });
            break;
          case "toggleFpsMonitor":
            const _0x47db29 = toggleFpsOverlay();
            _0x14454({ success: !0, visible: _0x47db29 });
            break;
          case "toggleKeypressDisplay":
            const _0x4fc725 = toggleKeypressDisplay();
            _0x14454({ success: !0, visible: _0x4fc725 });
            break;
          case "updateKeypressLayout":
            setKeypressLayout(_0x4b84e5.layout);
            ensureKeypressResizeElements();
            if (keypressOverlay) {
              renderKeypressLayout(keypressSettings.layout);
            }
            if (window.wasdZqsdHandler) {
              deactivateZqsd();
              activateZqsdDirectly();
            }
            _0x14454({ success: !0, layout: keypressSettings.layout });
            break;
          case "updateKeypressTheme":
            const _0x9f8edc = setKeypressTheme(_0x4b84e5.theme);
            ensureKeypressResizeElements();
            if (_0x4fc725) {
              scheduleKeypressBoundsCheck();
            }
            _0x14454({ success: !0, theme: _0x9f8edc });
            break;
          case "updateHotkey":
            currentHotkey = _0x4b84e5.hotkey;
            _0x14454({ success: !0 });
            break;
          case "updateTimerColors":
            timerColors = _0x4b84e5.colors;
            applyTimerColor();
            _0x14454({ success: !0 });
            break;
          case "activateZqsd":
            activateZqsdDirectly();
            chrome.runtime.sendMessage({ action: "saveZqsdState", active: !0 });
            _0x14454({ success: !0 });
            break;
          case "deactivateZqsd":
            if (window.wasdZqsdHandler) {
              document.removeEventListener(
                "keydown",
                window.wasdZqsdHandler,
                !0,
              );
              document.removeEventListener("keyup", window.wasdZqsdHandler, !0);
              window.wasdZqsdHandler = null;
              zqsdHandler = null;
            }
            chrome.runtime.sendMessage({ action: "saveZqsdState", active: !1 });
            _0x14454({ success: !0 });
            break;
          case "updateZqsdKeys":
            if (window.wasdZqsdHandler) {
              document.removeEventListener(
                "keydown",
                window.wasdZqsdHandler,
                !0,
              );
              document.removeEventListener("keyup", window.wasdZqsdHandler, !0);
              window.wasdZqsdHandler = null;
              zqsdHandler = null;
            }
            activateZqsdDirectly();
            _0x14454({ success: !0 });
            break;
          case "toggleResolution":
            const _0x2f48d6 = _0x4b84e5.blackBarsEnabled !== !1;
            const _0x3c5feb =
              typeof _0x4b84e5.mode === "string" &&
                (_0x4b84e5.mode === "stretched" ||
                  RESOLUTION_CONFIGS[_0x4b84e5.mode] ||
                  /^\d{2,4}x\d{2,4}$/i.test(_0x4b84e5.mode))
                ? _0x4b84e5.mode
                : "608x1080";
            const _barsColor =
              typeof _0x4b84e5.barsColor === "string" && _0x4b84e5.barsColor
                ? _0x4b84e5.barsColor
                : "#000000";
            if (_0x4b84e5.activate === !1) {
              localStorage.setItem('resolutionEnabled', 'false');
              localStorage.removeItem('stretchEnabled');
              chrome.storage.local.set({ verticalResolutionEnabled: false, stretchedResActive: false, forcedResolutionMode: null });
            } else if (_0x3c5feb === "stretched") {
              localStorage.setItem('stretchEnabled', 'true');
              localStorage.setItem('stretchPercent', 0);
              localStorage.setItem('resolutionEnabled', 'false');
              chrome.storage.local.set({ stretchedResActive: true, verticalResolutionEnabled: false, forcedResolutionMode: null });
            } else {
              localStorage.setItem('resolutionEnabled', 'true');
              let w = 608, h = 1080;
              if (_0x3c5feb.includes('x')) {
                const parts = _0x3c5feb.split('x');
                w = parseInt(parts[0], 10) || 608;
                h = parseInt(parts[1], 10) || 1080;
              }
              localStorage.setItem('customWidth', w);
              localStorage.setItem('customHeight', h);
              localStorage.removeItem('stretchEnabled');
              chrome.storage.local.set({ verticalResolutionEnabled: true, forcedResolutionMode: _0x3c5feb, selectedResolutionMode: _0x3c5feb, stretchedResActive: false });
            }
            _0x14454({
              success: !0,
              enabled: _0x4b84e5.activate !== !1,
              mode: _0x3c5feb,
              reloaded: !0,
            });
            setTimeout(() => window.location.reload(), 100);
            break;
          case "setGlobalVolume":
            if (
              typeof _0x4b84e5.volume === "number" &&
              !Number.isNaN(_0x4b84e5.volume)
            ) {
              const _0x383f42 = Math.min(0x1, Math.max(0x0, _0x4b84e5.volume));
              currentGlobalVolume = _0x383f42;
              chrome.storage.local.set({ globalVolumeLevel: _0x383f42 }, () => {
                sendVolumeToPage("EXT_SET_VOLUME", { volume: _0x383f42 });
                _0x14454({ success: !0, volume: _0x383f42 });
              });
            } else {
              _0x14454({ success: !1 });
            }
            return !0;
          case "updateTripleClick":
            tripleClickActive = _0x4b84e5.active;
            break;
          case "updateTripleClickKey":
            tripleClickKey = _0x4b84e5.key;
            break;
          case "updateTripleClickX":
            tripleClickX =
              _0x4b84e5.x !== null && _0x4b84e5.x !== undefined
                ? Number(_0x4b84e5.x)
                : null;
            break;
          case "updateTripleClickY":
            tripleClickY =
              _0x4b84e5.y !== null && _0x4b84e5.y !== undefined
                ? Number(_0x4b84e5.y)
                : null;
            break;
          case "startPickTripleClickPos":
            startPickingTripleClickPosition();
            break;
          case "startScreenRecording":
            startScreenRecording();
            _0x14454({ success: true, recording: true });
            break;
          case "stopScreenRecording":
            stopScreenRecording();
            _0x14454({ success: true });
            break; // Nouveau
          case "getRecordingState":
            _0x14454({ recording: isRecordingActive });
            break; // Nouveau
          case "applyAdvancedStyle":
            if (_0x4b84e5.settings) {
              const s = _0x4b84e5.settings;
              // Sauvegarder les états importants avant modification
              const timerWasVisible = timerOverlay
                ? timerOverlay.style.display
                : "none";
              const fpsWasVisible = fpsOverlay
                ? fpsOverlay.style.display
                : "none";
              const keysWasVisible = keypressOverlay
                ? keypressOverlay.style.display
                : "none";

              if (timerOverlay) {
                timerOverlay.style.borderRadius = s.borderRadius || "0px";
                timerOverlay.style.opacity =
                  s.bgOpacity !== undefined ? s.bgOpacity : 1;
                timerOverlay.style.display = timerWasVisible; // Restaurer display
                if (timerDisplayEl) {
                  timerDisplayEl.style.color = s.textColor || "#FFFFFF";
                  if (s.fontFamily)
                    timerDisplayEl.style.fontFamily = s.fontFamily;
                  // Calculer taille à partir de la taille de BASE (43px), pas de la taille actuelle
                  const baseSize = 43;
                  const rect = timerOverlay.getBoundingClientRect();
                  const widthRatio = rect.width / 225;
                  const heightRatio = rect.height / 50;
                  const scale = Math.min(widthRatio, heightRatio);
                  const calculatedSize = Math.max(
                    18,
                    Math.min(120, baseSize * scale),
                  );
                  const finalSize = calculatedSize * (s.fontScale || 1);
                  timerDisplayEl.style.fontSize = `${finalSize}px`;
                }
              }
              if (fpsOverlay) {
                fpsOverlay.style.borderRadius = s.borderRadius || "4px";
                fpsOverlay.style.opacity =
                  s.bgOpacity !== undefined ? s.bgOpacity : 1;
                fpsOverlay.style.display = fpsWasVisible; // Restaurer display
                const valueEl = fpsOverlay.querySelector(".fps-value");
                if (valueEl) {
                  valueEl.style.color = s.textColor || "#FFFFFF";
                  if (s.fontFamily) valueEl.style.fontFamily = s.fontFamily;
                }
              }
              if (keypressOverlay) {
                keypressOverlay.style.setProperty(
                  "--key-radius",
                  s.borderRadius || "12px",
                );
                keypressOverlay.style.setProperty(
                  "--key-color",
                  s.textColor || "#ffffff",
                );
                keypressOverlay.style.opacity =
                  s.bgOpacity !== undefined ? s.bgOpacity : 1;
                keypressOverlay.style.display = keysWasVisible; // Restaurer display
                if (s.fontFamily)
                  keypressOverlay.style.setProperty("--key-font", s.fontFamily);
              }
            }
            _0x14454({ success: true });
            break;
          case "resetAllCustomization":
            if (timerOverlay) {
              const wasVisible = timerOverlay.style.display;
              const pos = {
                left: timerOverlay.style.left,
                top: timerOverlay.style.top,
              };
              const size = {
                width: timerOverlay.style.width,
                height: timerOverlay.style.height,
              };
              applyThemeToTimer();
              timerOverlay.style.display = wasVisible;
              timerOverlay.style.left = pos.left;
              timerOverlay.style.top = pos.top;
              timerOverlay.style.width = size.width;
              timerOverlay.style.height = size.height;
            }
            if (fpsOverlay) {
              const wasVisible = fpsOverlay.style.display;
              const pos = {
                left: fpsOverlay.style.left,
                top: fpsOverlay.style.top,
              };
              ensureFpsStyles();
              fpsOverlay.style.display = wasVisible;
              fpsOverlay.style.left = pos.left;
              fpsOverlay.style.top = pos.top;
            }
            if (keypressOverlay) {
              const wasVisible = keypressOverlay.style.display;
              const pos = {
                left: keypressOverlay.style.left,
                top: keypressOverlay.style.top,
              };
              applyKeypressTheme("default");
              keypressOverlay.style.display = wasVisible;
              keypressOverlay.style.left = pos.left;
              keypressOverlay.style.top = pos.top;
            }
            _0x14454({ success: true });
            break;
          case "updateBackground":
            storedCustomBackground = _0x4b84e5.background;
            applyCustomBackground(timerOverlay, storedCustomBackground);
            applyCustomBackground(fpsOverlay, storedCustomBackground);
            applyCustomBackground(keypressOverlay, storedCustomBackground);
            _0x14454({ success: !0 });
            break;
          case "updateBackgroundActive":
            storedCustomBackgroundActive = _0x4b84e5.background;
            _0x14454({ success: !0 });
            break;
          case "resetSpecificBackground": {
            const target = _0x4b84e5.targetType;
            if (target === "timer" && timerOverlay) {
              applyCustomBackground(timerOverlay, null);
            }
            if (target === "fps" && fpsOverlay) {
              applyCustomBackground(fpsOverlay, null);
            }
            if (target === "keys" && keypressOverlay) {
              applyCustomBackground(keypressOverlay, null);
              storedCustomBackgroundActive = null;
            }
            _0x14454({ success: true });
            break;
          }
          case "updateSpecificBackground": {
            const target = _0x4b84e5.targetType;
            const bg = _0x4b84e5.background;
            if (target === "timer" && timerOverlay) {
              applyCustomBackground(timerOverlay, bg);
            }
            if (target === "fps" && fpsOverlay) {
              applyCustomBackground(fpsOverlay, bg);
            }
            if (target === "keys" && keypressOverlay) {
              applyCustomBackground(keypressOverlay, bg);
            }
            if (target === "keysActive") {
              storedCustomBackgroundActive = bg;
            }
            _0x14454({ success: true });
            break;
          }
          case "applyAdvancedStyleV2":
            if (_0x4b84e5.settings) {
              const s = _0x4b84e5.settings;

              // TIMER
              if (s.timer && timerOverlay) {
                const ts = s.timer;
                timerOverlay.style.backgroundColor = ts.bgColor || "#000000";
                timerOverlay.style.borderRadius = ts.borderRadius || "0px";
                timerOverlay.style.opacity =
                  ts.opacity !== undefined ? ts.opacity : 1;
                timerOverlay.style.borderWidth = ts.borderWidth || "0px";
                timerOverlay.style.borderColor = ts.borderColor || "#6366f1";
                timerOverlay.style.borderStyle =
                  parseInt(ts.borderWidth) > 0 ? "solid" : "none";
                timerOverlay.style.boxShadow =
                  parseInt(ts.shadow) > 0
                    ? `0 0 ${ts.shadow} rgba(0,0,0,0.5)`
                    : "none";
                if (timerDisplayEl) {
                  timerDisplayEl.style.color = ts.textColor || "#FFFFFF";
                  if (ts.fontFamily)
                    timerDisplayEl.style.fontFamily = ts.fontFamily;
                  const baseSize = 43;
                  const rect = timerOverlay.getBoundingClientRect();
                  const widthRatio = rect.width / 225;
                  const heightRatio = rect.height / 50;
                  const scale = Math.min(widthRatio, heightRatio);
                  const calculatedSize = Math.max(
                    18,
                    Math.min(120, baseSize * scale),
                  );
                  const finalSize = calculatedSize * (ts.fontScale || 1);
                  timerDisplayEl.style.fontSize = `${finalSize}px`;
                }
              }

              // FPS
              if (s.fps && fpsOverlay) {
                const fs = s.fps;
                fpsOverlay.style.backgroundColor = fs.bgColor || "#000000";
                fpsOverlay.style.borderRadius = fs.borderRadius || "4px";
                fpsOverlay.style.opacity =
                  fs.opacity !== undefined ? fs.opacity : 1;
                fpsOverlay.style.borderWidth = fs.borderWidth || "0px";
                fpsOverlay.style.borderColor = fs.borderColor || "#10b981";
                fpsOverlay.style.borderStyle =
                  parseInt(fs.borderWidth) > 0 ? "solid" : "none";
                fpsOverlay.style.boxShadow =
                  parseInt(fs.shadow) > 0
                    ? `0 0 ${fs.shadow} rgba(0,0,0,0.5)`
                    : "none";
                const valueEl = fpsOverlay.querySelector(".fps-value");
                if (valueEl) {
                  valueEl.style.color = fs.textColor || "#FFFFFF";
                  if (fs.fontFamily) valueEl.style.fontFamily = fs.fontFamily;
                  const baseFps = 14;
                  const finalFpsSize = baseFps * (fs.fontScale || 1);
                  valueEl.style.fontSize = `${finalFpsSize}px`;
                }
              }

              // KEYS
              if (s.keys && keypressOverlay) {
                const ks = s.keys;
                // Définir les variables CSS principales
                keypressOverlay.style.setProperty(
                  "--key-bg",
                  ks.bgColor || "#000000",
                );
                keypressOverlay.style.setProperty(
                  "--key-color",
                  ks.textColor || "#ffffff",
                );
                keypressOverlay.style.setProperty(
                  "--key-border",
                  ks.borderColor || "#3d3d3d",
                );
                keypressOverlay.style.setProperty(
                  "--key-active-bg",
                  ks.activeBgColor || "#4bc277",
                );
                keypressOverlay.style.setProperty(
                  "--key-active-border",
                  ks.activeColor || "#4bc277",
                );
                keypressOverlay.style.setProperty(
                  "--key-radius",
                  ks.borderRadius || "12px",
                );
                keypressOverlay.style.setProperty(
                  "--key-border-width",
                  ks.borderWidth || "2px",
                );
                keypressOverlay.style.setProperty(
                  "--key-gap",
                  ks.gap || "10px",
                );
                keypressOverlay.style.setProperty("--key-base-size", "60px");

                // Ombre
                const shadowPx = parseInt(ks.shadow) || 0;
                if (shadowPx > 0) {
                  keypressOverlay.style.setProperty(
                    "--key-shadow",
                    `0 ${shadowPx}px ${shadowPx * 2}px rgba(0,0,0,0.3)`,
                  );
                  keypressOverlay.style.setProperty(
                    "--key-active-shadow",
                    `0 ${shadowPx}px ${shadowPx * 2}px rgba(75,194,119,0.4)`,
                  );
                } else {
                  keypressOverlay.style.setProperty("--key-shadow", "none");
                  keypressOverlay.style.setProperty(
                    "--key-active-shadow",
                    "none",
                  );
                }

                // Opacité globale
                keypressOverlay.style.opacity =
                  ks.opacity !== undefined ? ks.opacity : 1;

                // Size scale
                const sizeScale = ks.sizeScale || 1;
                keypressOverlay.style.setProperty(
                  "--key-scale",
                  String(sizeScale),
                );

                // Appliquer les styles inline aux touches (priorité sur CSS)
                const keys = keypressOverlay.querySelectorAll(".key");
                const keyContainer =
                  keypressOverlay.querySelector(".key-container");
                if (keyContainer) {
                  keyContainer.style.gap = `calc(${ks.gap || "10px"} * ${sizeScale})`;
                }

                // Add dynamic style for active keys
                let activeKeyStyle = document.getElementById(
                  "key-active-dynamic-style",
                );
                if (!activeKeyStyle) {
                  activeKeyStyle = document.createElement("style");
                  activeKeyStyle.id = "key-active-dynamic-style";
                  document.head.appendChild(activeKeyStyle);
                }
                const activeBgColor = ks.activeBgColor || "#4bc277";
                const activeTextColor = ks.activeTextColor || "#ffffff";
                const activeBorderColor = ks.activeColor || "#4bc277";
                activeKeyStyle.textContent = `
                #key-display-overlay .key.active {
                    background: ${activeBgColor} !important;
                    border-color: ${activeBorderColor} !important;
                }
                #key-display-overlay .key.active span {
                    color: ${activeTextColor} !important;
                }
            `;

                keys.forEach((key) => {
                  key.style.background = ks.bgColor || "#000000";
                  key.style.borderColor = ks.borderColor || "#3d3d3d";
                  key.style.borderRadius = ks.borderRadius || "12px";
                  key.style.borderWidth = ks.borderWidth || "2px";
                  key.style.borderStyle = "solid";
                  if (shadowPx > 0) {
                    key.style.boxShadow = `0 ${shadowPx}px ${shadowPx * 2}px rgba(0,0,0,0.3)`;
                  } else {
                    key.style.boxShadow = "none";
                  }
                  const span = key.querySelector("span");
                  if (span) span.style.color = ks.textColor || "#ffffff";
                });
              }
            }
            _0x14454({ success: true });
            break;
          default:
            _0x14454({ success: !1, error: "Unknown action" });
            break;
        }
        return !0;
      });
      document.addEventListener(
        "keydown",
        (_0xf3f8b2) => {
          if (_0xf3f8b2.repeat) {
            return;
          }
          if (
            tripleClickActive &&
            _0xf3f8b2.code === tripleClickKey &&
            !_0xf3f8b2.ctrlKey &&
            !_0xf3f8b2.altKey &&
            !_0xf3f8b2.metaKey &&
            !_0xf3f8b2.shiftKey
          ) {
            doTripleClick();
          }
          let _0x3cf96b = !1;
          if (currentHotkey === "Space") {
            if (
              _0xf3f8b2.key === " " ||
              _0xf3f8b2.code === "Space" ||
              _0xf3f8b2.keyCode === 0x20
            ) {
              if (
                !_0xf3f8b2.ctrlKey &&
                !_0xf3f8b2.altKey &&
                !_0xf3f8b2.metaKey &&
                !_0xf3f8b2.shiftKey
              ) {
                _0x3cf96b = !0;
              } else {
                if (
                  _0xf3f8b2.shiftKey &&
                  !_0xf3f8b2.ctrlKey &&
                  !_0xf3f8b2.altKey &&
                  !_0xf3f8b2.metaKey
                ) {
                }
              }
            }
          } else {
            if (
              currentHotkey === "Control" &&
              _0xf3f8b2.ctrlKey &&
              !_0xf3f8b2.altKey &&
              !_0xf3f8b2.metaKey &&
              !_0xf3f8b2.shiftKey
            ) {
              _0x3cf96b = !0;
            } else {
              if (
                currentHotkey === "Shift" &&
                _0xf3f8b2.shiftKey &&
                !_0xf3f8b2.ctrlKey &&
                !_0xf3f8b2.altKey &&
                !_0xf3f8b2.metaKey
              ) {
                _0x3cf96b = !0;
              } else {
                if (
                  currentHotkey === "Alt" &&
                  _0xf3f8b2.altKey &&
                  !_0xf3f8b2.ctrlKey &&
                  !_0xf3f8b2.metaKey &&
                  !_0xf3f8b2.shiftKey
                ) {
                  _0x3cf96b = !0;
                } else {
                  if (
                    currentHotkey === "Meta" &&
                    _0xf3f8b2.metaKey &&
                    !_0xf3f8b2.ctrlKey &&
                    !_0xf3f8b2.altKey &&
                    !_0xf3f8b2.shiftKey
                  ) {
                    _0x3cf96b = !0;
                  } else {
                    if (
                      currentHotkey === _0xf3f8b2.code &&
                      !_0xf3f8b2.ctrlKey &&
                      !_0xf3f8b2.altKey &&
                      !_0xf3f8b2.metaKey &&
                      !_0xf3f8b2.shiftKey
                    ) {
                      _0x3cf96b = !0;
                    }
                  }
                }
              }
            }
          }
          if (_0x3cf96b) {
            _0xf3f8b2.preventDefault();
            _0xf3f8b2.stopPropagation();
            _0xf3f8b2.stopImmediatePropagation();
            const _0x210fc1 = ["Shift", "Control", "Alt", "Meta"].includes(
              currentHotkey,
            );
            if (_0x210fc1 || !_0xf3f8b2.shiftKey) {
              controlTimer();
            }
          }
          let _0x4650bb = !1;
          if (
            currentHotkey === "Space" &&
            (_0xf3f8b2.key === " " ||
              _0xf3f8b2.code === "Space" ||
              _0xf3f8b2.keyCode === 0x20) &&
            _0xf3f8b2.shiftKey &&
            !_0xf3f8b2.ctrlKey &&
            !_0xf3f8b2.altKey &&
            !_0xf3f8b2.metaKey
          ) {
            _0x4650bb = !0;
          } else if (
            !["Shift", "Control", "Alt", "Meta"].includes(currentHotkey) &&
            currentHotkey === _0xf3f8b2.code &&
            _0xf3f8b2.shiftKey &&
            !_0xf3f8b2.ctrlKey &&
            !_0xf3f8b2.altKey &&
            !_0xf3f8b2.metaKey
          ) {
            _0x4650bb = !0;
          }
          if (_0x4650bb) {
            _0xf3f8b2.preventDefault();
            _0xf3f8b2.stopPropagation();
            _0xf3f8b2.stopImmediatePropagation();
            toggleTimerVisibility();
          }
        },
        !0,
      );
      log("Gaming Tools Suite Complete - Content script prêt");

      // --- ENREGISTREUR 1080p 60FPS ---
      let mediaRecorder = null;
      let recordedChunks = [];
      let isRecordingActive = false; // Nouvelle variable pour suivre l'état

      async function startScreenRecording() {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1920, height: 1080, frameRate: 60 },
            audio: false,
          });

          const mimeTypes = [
            "video/webm;codecs=h264",
            "video/webm;codecs=vp8",
            "video/webm",
          ];
          const selectedMime =
            mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) ||
            "video/webm";

          mediaRecorder = new MediaRecorder(stream, {
            mimeType: selectedMime,
            videoBitsPerSecond: 5000000,
          });

          recordedChunks = [];
          isRecordingActive = true; // On marque comme actif

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunks.push(event.data);
          };

          mediaRecorder.onstop = () => {
            isRecordingActive = false; // On marque comme inactif
            const blob = new Blob(recordedChunks, { type: selectedMime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const now = new Date();
            const filename = `Run_${now.getHours()}h${now.getMinutes()}_${now.getSeconds()}.webm`;

            a.style.display = "none";
            a.href = url;
            a.download = filename;

            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              recordedChunks = [];
            }, 1000);

            // Arrêter les pistes du stream (éteint le point rouge du navigateur)
            stream.getTracks().forEach((track) => track.stop());
          };

          // Si l'utilisateur clique sur "Arrêter le partage" via l'interface du navigateur
          stream.getVideoTracks()[0].onended = () => {
            if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
          };

          mediaRecorder.start(1000);
        } catch (err) {
          console.error("Erreur REC:", err);
          isRecordingActive = false;
        }
      }

      function stopScreenRecording() {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      }
    }

    function initNocoinPopup() {
      /*
       * Gaming Tools Suite v9.0 Pro Ultimate
       * Copyright (c) 2025 Volt & Tinso
       */
      const log = () => { };
      let currentActiveKey = "Control";

      // Fonction utilitaire pour envoyer un message au content script de manière sécurisée
      function sendToContentScript(message, callback) {
        try {
          if (!chrome || !chrome.tabs || !chrome.tabs.query) {
            if (callback) callback(null, "Not in extension context");
            return;
          }
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
              if (callback) callback(null, "Aucun onglet actif");
              return;
            }
            chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
              if (chrome.runtime.lastError) {
                console.log(
                  "Content script non disponible:",
                  chrome.runtime.lastError.message,
                );
                if (callback)
                  callback(null, "Ouvrez une page de jeu supportée");
              } else {
                if (callback) callback(response, null);
              }
            });
          });
        } catch (e) {
          console.error("sendToContentScript error:", e);
          if (callback) callback(null, e.message);
        }
      }

      const DEFAULT_PLAYLIST_URL =
        "https://soundcloud.com/bdwx/sets/u7j3r9nbxpeu";

      const rankTiers = [
        { name: "Interstellar", minTime: 90 * 60 * 1000 },
        { name: "Suprême", minTime: 73 * 60 * 1000 },
        { name: "Grand Champion", minTime: 55 * 60 * 1000 },
        { name: "Champion", minTime: 47 * 60 * 1000 },
        { name: "Grand Master", minTime: 41 * 60 * 1000 },
        { name: "Master +", minTime: 35 * 60 * 1000 },
        { name: "Master", minTime: 28 * 60 * 1000 },
        { name: "Élite", minTime: 23 * 60 * 1000 + 1000 },
        { name: "Diamant 3", minTime: 23 * 60 * 1000 },
        { name: "Diamant 2", minTime: 19 * 60 * 1000 },
        { name: "Diamant 1", minTime: 15 * 60 * 1000 + 1000 },
        { name: "Platine 3", minTime: 15 * 60 * 1000 },
        { name: "Platine 2", minTime: 12 * 60 * 1000 },
        { name: "Platine 1", minTime: 9 * 60 * 1000 + 1000 },
        { name: "Gold 3", minTime: 9 * 60 * 1000 },
        { name: "Gold 2", minTime: 7 * 60 * 1000 },
        { name: "Gold 1", minTime: 5 * 60 * 1000 },
        { name: "Argent 3", minTime: 4 * 60 * 1000 },
        { name: "Argent 2", minTime: 3 * 60 * 1000 },
        { name: "Argent 1", minTime: 2 * 60 * 1000 },
        { name: "Bronze 3", minTime: 90 * 1000 },
        { name: "Bronze 2", minTime: 60 * 1000 },
        { name: "Bronze 1", minTime: 30 * 1000 },
        { name: "Unranked", minTime: 0 },
      ].sort((a, b) => b.minTime - a.minTime);

      const SUPPORTED_LANGS = ["fr", "en", "pt-BR", "de"];
      const LANGUAGE_FALLBACK = "fr";
      let currentLanguage = LANGUAGE_FALLBACK;

      const translations = {
        fr: {
          "timer.smartTimer": "Smart Timer",
          "timer.smartTimerDesc": "Démarre/arrête auto via sons du jeu",
          "timer.smartTimerRefresh":
            "Si le smart timer ne marche pas, refresh la page",
          "rec.title": "Enregistrement",
          "rec.loading": "Chargement...",
          "rec.start": "Lancer l'enregistrement",
          "rec.stop": "Arrêter l'enregistrement",
          "res.vertical": "608x1080 (Vertical)",
          "res.large": "890x1080 (Large)",
          "res.stretched": "Étirée (Full Screen)",
          "res.custom": "Custom",
          "tclick.title": "Triple Clic Rapide (Boosts)",
          "tclick.enable": "Activer le Triple Clic",
          "tclick.desc": "Active 3 boosts rapidement (Subway Surfers)",
          "tclick.hotkey": "Touche d'activation :",
          "tclick.hint":
            "💡 Place ta souris sur le jeu et appuie sur la touche pour activer les 3 boosts !",
          "bg.title": "Images de Fond",
          "bg.subtitle": "Une image unique pour chaque outil",
          "bg.timer": "Timer Background",
          "bg.fps": "FPS Counter Background",
          "bg.keys": "Touches (Keys) Background",
          "bg.choose": "Choisir Image",
          "bg.global": "Image Globale",
          "bg.active": "Image Active",
          "adv.keySizeLabel": "Taille des touches",
          "tab.original": "Original",
          "tab.training": "Training",
          "tab.cheat": "Cheat",
          "adv.customTotal": "Customisation Totale",
          "adv.customTotalSub": "Modifiez les arrondis, couleurs et styles",
          "adv.bgColor": "Couleur de fond",
          "adv.textColor": "Couleur du texte",
          "adv.radius": "Arrondi",
          "adv.opacity": "Opacité",
          "adv.fontSize": "Taille police",
          "adv.borderWidth": "Épaisseur bordure",
          "adv.borderColor": "Couleur bordure",
          "adv.font": "Police",
          "adv.shadow": "Ombre portée",
          "adv.keyBgColor": "Couleur fond touches",
          "adv.keyTextColor": "Couleur texte",
          "adv.keyActiveBg": "Couleur fond touche actif",
          "adv.keyActiveText": "Couleur texte actif",
          "adv.keyActiveBorder": "Couleur bordure active",
          "adv.keyRadius": "Arrondi des touches",
          "adv.keyGap": "Espacement",
          "adv.keySize": "Taille globale",
          "nav.dashboard": "Dashboard",
          "nav.gametools": "Outils Jeu",
          "nav.rankings": "Classements",
          "nav.appearance": "Style",
          "nav.media": "Média",
          "language.title": "Choisissez votre langue",
          "language.subtitle": "Nous l'utiliserons pour l'interface du popup.",
          "language.fr": "Français",
          "language.frLabel": "Par défaut",
          "language.en": "English",
          "language.enLabel": "International",
          "language.pt": "Português (Brasil)",
          "language.ptLabel": "Comunidade BR",
          "language.de": "Deutsch",
          "language.deLabel": "Deutschland",
          "language.later": "Plus tard",
          "language.confirm": "Valider",
          "language.switch": "Changer de langue",
          "section.dashboard.title": "Dashboard",
          "section.dashboard.subtitle": "Contrôles principaux & Overlays",
          "card.liveOverlays": "Live Overlays",
          "label.speedrun": "Speedrun Timer",
          "desc.speedrun": "Chrono précis au millième",
          "desc.timerHotkey": "Touche d'activation du Timer :",
          "placeholder.customKey": "Ou tapez une touche personnalisée...",
          "label.fps": "FPS Counter",
          "desc.fps": "Affiche les images/seconde",
          "label.keypress": "Affichage Touches",
          "desc.keypress": "Visualisez vos inputs en direct",
          "card.resolution": "Résolution",
          "btn.force": "Forcer",
          "label.blackBars": "Bandes noires",
          "btn.reset": "Réinitialiser",
          "section.gametools.title": "Outils Jeu",
          "section.gametools.subtitle": "Sauvegardes, Cartes & Contrôles",
          "card.backup": "Gestionnaire de Sauvegarde",
          "btn.backup": "Backup",
          "btn.restore": "Restore",
          "btn.unlock": "Unlock All",
          "btn.resetData": "Reset Data",
          "card.mapSelector": "Sélecteur de Cartes",
          "card.keymap": "Mapping Clavier (ZQSD)",
          "placeholder.up": "Haut (Z)",
          "placeholder.left": "Gauche (Q)",
          "placeholder.down": "Bas (S)",
          "placeholder.right": "Droite (D)",
          "btn.apply": "Appliquer",
          "btn.disable": "Désactiver",
          "section.rankings.title": "Classements",
          "section.rankings.subtitle": "Speedrun & Records",
          "card.rankCalc": "Calculateur de Rang",
          "desc.rankCalc": "Entrez un temps pour voir le rang correspondant.",
          "placeholder.timeInput": "Ex: 1h 13m 45s",
          "card.worldRecords": "World Records",
          "btn.leaderboard": "Voir le Leaderboard Speedrun.com",
          "card.topFrance": "Top France",
          "section.appearance.title": "Apparence",
          "section.appearance.subtitle": "Personnalisez votre interface",
          "card.overlay": "Overlay Touches",
          "card.backgrounds": "Images de Fond",
          "desc.globalBackground": "Fond Global",
          "desc.activeBackground": "Fond Touche Active",
          "btn.import": "Importer Image",
          "btn.removeBackgrounds": "Supprimer les fonds",
          "card.timerColors": "Couleurs du Timer",
          "desc.colorRunning": "En cours",
          "desc.colorPaused": "Pause",
          "desc.colorStopped": "Arrêt",
          "section.media.title": "Média",
          "section.media.subtitle": "Audio et Musique",
          "card.volume": "Volume Global du Jeu",
          "card.soundcloud": "Lecteur SoundCloud",
          "placeholder.playlist": "URL de la Playlist...",
          "btn.launchPlayer": "Lancer le Player",
          "desc.soundcloud": "Ouvre une fenêtre pop-up dédiée.",
          "status.done": "Action effectuée",
          "rank.label": "Rang :",
          "rank.unranked": "Non classé",
        },
        en: {
          "timer.smartTimer": "Smart Timer",
          "timer.smartTimerDesc": "Auto start/stop via game sounds",
          "timer.smartTimerRefresh":
            "Si le smart timer ne marche pas, refresh la page",
          "timer.smartTimerRefresh":
            "If smart timer doesn't work, refresh the page",
          "rec.title": "Recording",
          "rec.loading": "Loading...",
          "rec.start": "Start recording",
          "rec.stop": "Stop recording",
          "res.vertical": "608x1080 (Vertical)",
          "res.large": "890x1080 (Wide)",
          "res.stretched": "Stretched (Full Screen)",
          "res.custom": "Custom",
          "tclick.title": "Fast Triple Click (Boosts)",
          "tclick.enable": "Enable Triple Click",
          "tclick.desc": "Quickly activate 3 boosts (Subway Surfers)",
          "tclick.hotkey": "Activation Key:",
          "tclick.hint":
            "💡 Hover over the game and press the key to activate 3 boosts!",
          "bg.title": "Background Images",
          "bg.subtitle": "A unique image for each tool",
          "bg.timer": "Timer Background",
          "bg.fps": "FPS Counter Background",
          "bg.keys": "Keys Background",
          "bg.choose": "Choose Image",
          "bg.global": "Global Image",
          "bg.active": "Active Image",
          "adv.keySizeLabel": "Keys Size",
          "tab.original": "Original",
          "tab.training": "Training",
          "tab.cheat": "Cheat",
          "adv.customTotal": "Total Customization",
          "adv.customTotalSub": "Modify borders, colors and styles",
          "adv.bgColor": "Background Color",
          "adv.textColor": "Text Color",
          "adv.radius": "Border Radius",
          "adv.opacity": "Opacity",
          "adv.fontSize": "Font Size",
          "adv.borderWidth": "Border Width",
          "adv.borderColor": "Border Color",
          "adv.font": "Font",
          "adv.shadow": "Drop Shadow",
          "adv.keyBgColor": "Keys Background",
          "adv.keyTextColor": "Text Color",
          "adv.keyActiveBg": "Active Key Background",
          "adv.keyActiveText": "Active Text Color",
          "adv.keyActiveBorder": "Active Border Color",
          "adv.keyRadius": "Keys Border Radius",
          "adv.keyGap": "Spacing",
          "adv.keySize": "Global Size",
          "nav.dashboard": "Dashboard",
          "nav.gametools": "Game Tools",
          "nav.rankings": "Ranks",
          "nav.appearance": "Style",
          "nav.media": "Media",
          "language.title": "Choose your language",
          "language.subtitle": "We will use it for the popup UI.",
          "language.fr": "Français",
          "language.frLabel": "Default",
          "language.en": "English",
          "language.enLabel": "International",
          "language.pt": "Português (Brasil)",
          "language.ptLabel": "BR community",
          "language.de": "Deutsch",
          "language.deLabel": "Deutschland",
          "language.later": "Later",
          "language.confirm": "Confirm",
          "language.switch": "Change language",
          "section.dashboard.title": "Dashboard",
          "section.dashboard.subtitle": "Main controls & overlays",
          "card.liveOverlays": "Live Overlays",
          "label.speedrun": "Speedrun Timer",
          "desc.speedrun": "Millisecond-accurate timer",
          "desc.timerHotkey": "Timer activation key:",
          "placeholder.customKey": "Or type a custom key...",
          "label.fps": "FPS Counter",
          "desc.fps": "Show frames per second",
          "label.keypress": "Key Display",
          "desc.keypress": "See your inputs live",
          "card.resolution": "Resolution",
          "btn.force": "Apply",
          "label.blackBars": "Black bars",
          "btn.reset": "Reset",
          "section.gametools.title": "Game Tools",
          "section.gametools.subtitle": "Backups, maps & controls",
          "card.backup": "Save Manager",
          "btn.backup": "Backup",
          "btn.restore": "Restore",
          "btn.unlock": "Unlock All",
          "btn.resetData": "Reset Data",
          "card.mapSelector": "Map Selector",
          "card.keymap": "Keyboard Mapping (ZQSD)",
          "placeholder.up": "Up (Z)",
          "placeholder.left": "Left (Q)",
          "placeholder.down": "Down (S)",
          "placeholder.right": "Right (D)",
          "btn.apply": "Apply",
          "btn.disable": "Disable",
          "section.rankings.title": "Ranks",
          "section.rankings.subtitle": "Speedrun & records",
          "card.rankCalc": "Rank Calculator",
          "desc.rankCalc": "Enter a time to see the matching rank.",
          "placeholder.timeInput": "Ex: 1h 13m 45s",
          "card.worldRecords": "World Records",
          "btn.leaderboard": "Open the Speedrun.com leaderboard",
          "card.topFrance": "Top France",
          "section.appearance.title": "Appearance",
          "section.appearance.subtitle": "Customize your interface",
          "card.overlay": "Key Overlay",
          "card.backgrounds": "Background Images",
          "desc.globalBackground": "Global Background",
          "desc.activeBackground": "Active Key Background",
          "btn.import": "Import Image",
          "btn.removeBackgrounds": "Remove backgrounds",
          "card.timerColors": "Timer Colors",
          "desc.colorRunning": "Running",
          "desc.colorPaused": "Paused",
          "desc.colorStopped": "Stopped",
          "section.media.title": "Media",
          "section.media.subtitle": "Audio & Music",
          "card.volume": "Game Master Volume",
          "card.soundcloud": "SoundCloud Player",
          "placeholder.playlist": "Playlist URL...",
          "btn.launchPlayer": "Launch Player",
          "desc.soundcloud": "Opens a dedicated pop-up window.",
          "status.done": "Action done",
          "rank.label": "Rank:",
          "rank.unranked": "Unranked",
        },
        "pt-BR": {
          "timer.smartTimer": "Smart Timer",
          "timer.smartTimerDesc": "Inicia/para auto via sons do jogo",
          "timer.smartTimerRefresh":
            "Si le smart timer ne marche pas, refresh la page",
          "timer.smartTimerRefresh":
            "Se o smart timer não funcionar, recarregue a página",
          "rec.title": "Gravação",
          "rec.loading": "Carregando...",
          "rec.start": "Iniciar gravação",
          "rec.stop": "Parar gravação",
          "res.vertical": "608x1080 (Vertical)",
          "res.large": "890x1080 (Largo)",
          "res.stretched": "Esticado (Tela Cheia)",
          "res.custom": "Customizado",
          "tclick.title": "Triplo Clique Rápido (Boosts)",
          "tclick.enable": "Ativar Triplo Clique",
          "tclick.desc": "Ativa 3 boosts rapidamente (Subway Surfers)",
          "tclick.hotkey": "Tecla de Ativação:",
          "tclick.hint":
            "💡 Passe o mouse sobre o jogo e pressione a tecla para ativar 3 boosts!",
          "bg.title": "Imagens de Fundo",
          "bg.subtitle": "Uma imagem única para cada ferramenta",
          "bg.timer": "Fundo do Timer",
          "bg.fps": "Fundo do Contador de FPS",
          "bg.keys": "Fundo das Teclas",
          "bg.choose": "Escolher Imagem",
          "bg.global": "Imagem Global",
          "bg.active": "Imagem Ativa",
          "adv.keySizeLabel": "Tamanho das Teclas",
          "tab.original": "Original",
          "tab.training": "Treinamento",
          "tab.cheat": "Cheat",
          "adv.customTotal": "Personalização Total",
          "adv.customTotalSub": "Modifique bordas, cores e estilos",
          "adv.bgColor": "Cor de Fundo",
          "adv.textColor": "Cor do Texto",
          "adv.radius": "Arredondamento",
          "adv.opacity": "Opacidade",
          "adv.fontSize": "Tamanho da Fonte",
          "adv.borderWidth": "Espessura da Borda",
          "adv.borderColor": "Cor da Borda",
          "adv.font": "Fonte",
          "adv.shadow": "Sombra Projetada",
          "adv.keyBgColor": "Fundo das Teclas",
          "adv.keyTextColor": "Cor do Texto",
          "adv.keyActiveBg": "Fundo da Tecla Ativa",
          "adv.keyActiveText": "Texto Ativo",
          "adv.keyActiveBorder": "Borda Ativa",
          "adv.keyRadius": "Arredondamento das Teclas",
          "adv.keyGap": "Espaçamento",
          "adv.keySize": "Tamanho Global",
          "nav.dashboard": "Dashboard",
          "nav.gametools": "Ferramentas de Jogo",
          "nav.rankings": "Ranks",
          "nav.appearance": "Estilo",
          "nav.media": "Mídia",
          "language.title": "Escolha o idioma",
          "language.subtitle": "Usaremos no popup da extensão.",
          "language.fr": "Français",
          "language.frLabel": "Padrão",
          "language.en": "English",
          "language.enLabel": "Internacional",
          "language.pt": "Português (Brasil)",
          "language.ptLabel": "Comunidade BR",
          "language.de": "Deutsch",
          "language.deLabel": "Deutschland",
          "language.later": "Depois",
          "language.confirm": "Confirmar",
          "language.switch": "Mudar idioma",
          "section.dashboard.title": "Dashboard",
          "section.dashboard.subtitle": "Controles principais e overlays",
          "card.liveOverlays": "Overlays ao vivo",
          "label.speedrun": "Timer de Speedrun",
          "desc.speedrun": "Cronômetro com precisão de ms",
          "desc.timerHotkey": "Tecla do timer:",
          "placeholder.customKey": "Ou digite uma tecla personalizada...",
          "label.fps": "Contador de FPS",
          "desc.fps": "Mostrar quadros por segundo",
          "label.keypress": "Exibição de teclas",
          "desc.keypress": "Veja seus inputs ao vivo",
          "card.resolution": "Resolução",
          "btn.force": "Forçar",
          "label.blackBars": "Barras pretas",
          "btn.reset": "Redefinir",
          "section.gametools.title": "Ferramentas de Jogo",
          "section.gametools.subtitle": "Backups, mapas e controles",
          "card.backup": "Gerenciador de Backup",
          "btn.backup": "Backup",
          "btn.restore": "Restaurar",
          "btn.unlock": "Desbloquear tudo",
          "btn.resetData": "Zerar dados",
          "card.mapSelector": "Seletor de mapa",
          "card.keymap": "Mapeamento de teclado (ZQSD)",
          "placeholder.up": "Cima (Z)",
          "placeholder.left": "Esquerda (Q)",
          "placeholder.down": "Baixo (S)",
          "placeholder.right": "Direita (D)",
          "btn.apply": "Aplicar",
          "btn.disable": "Desativar",
          "section.rankings.title": "Ranks",
          "section.rankings.subtitle": "Speedrun e recordes",
          "card.rankCalc": "Calculadora de Rank",
          "desc.rankCalc": "Digite um tempo para ver o rank.",
          "placeholder.timeInput": "Ex: 1h 13m 45s",
          "card.worldRecords": "Recordes Mundiais",
          "btn.leaderboard": "Ver leaderboard no Speedrun.com",
          "card.topFrance": "Top França",
          "section.appearance.title": "Aparência",
          "section.appearance.subtitle": "Personalize sua interface",
          "card.overlay": "Overlay de Teclas",
          "card.backgrounds": "Imagens de Fundo",
          "desc.globalBackground": "Fundo Global",
          "desc.activeBackground": "Fundo da tecla ativa",
          "btn.import": "Importar imagem",
          "btn.removeBackgrounds": "Remover fundos",
          "card.timerColors": "Cores do Timer",
          "desc.colorRunning": "Em andamento",
          "desc.colorPaused": "Pausado",
          "desc.colorStopped": "Parado",
          "section.media.title": "Mídia",
          "section.media.subtitle": "Áudio e música",
          "card.volume": "Volume global do jogo",
          "card.soundcloud": "Player SoundCloud",
          "placeholder.playlist": "URL da playlist...",
          "btn.launchPlayer": "Abrir player",
          "desc.soundcloud": "Abre uma janela pop-up dedicada.",
          "status.done": "Ação concluída",
          "rank.label": "Rank:",
          "rank.unranked": "Sem rank",
        },
        de: {
          "timer.smartTimer": "Smart Timer",
          "timer.smartTimerDesc": "Auto Start/Stopp via Spielesounds",
          "timer.smartTimerRefresh":
            "Si le smart timer ne marche pas, refresh la page",
          "timer.smartTimerRefresh":
            "Wenn der Smart Timer nicht funktioniert, aktualisieren Sie die Seite",
          "rec.title": "Aufnahme",
          "rec.loading": "Lädt...",
          "rec.start": "Aufnahme starten",
          "rec.stop": "Aufnahme stoppen",
          "res.vertical": "608x1080 (Vertikal)",
          "res.large": "890x1080 (Breit)",
          "res.stretched": "Gestreckt (Vollbild)",
          "res.custom": "Benutzerdefiniert",
          "tclick.title": "Schneller Dreifachklick (Boosts)",
          "tclick.enable": "Dreifachklick aktivieren",
          "tclick.desc": "Aktiviere schnell 3 Boosts (Subway Surfers)",
          "tclick.hotkey": "Aktivierungstaste:",
          "tclick.hint":
            "💡 Bewege die Maus über das Spiel und drücke die Taste, um 3 Boosts zu aktivieren!",
          "bg.title": "Hintergrundbilder",
          "bg.subtitle": "Ein einzigartiges Bild für jedes Tool",
          "bg.timer": "Timer-Hintergrund",
          "bg.fps": "FPS-Zähler-Hintergrund",
          "bg.keys": "Tasten-Hintergrund",
          "bg.choose": "Bild auswählen",
          "bg.global": "Globales Bild",
          "bg.active": "Aktives Bild",
          "adv.keySizeLabel": "Tastengröße",
          "tab.original": "Original",
          "tab.training": "Training",
          "tab.cheat": "Cheat",
          "adv.customTotal": "Volle Anpassung",
          "adv.customTotalSub": "Ändere Ränder, Farben und Stile",
          "adv.bgColor": "Hintergrundfarbe",
          "adv.textColor": "Textfarbe",
          "adv.radius": "Abrundung",
          "adv.opacity": "Deckkraft",
          "adv.fontSize": "Schriftgröße",
          "adv.borderWidth": "Rahmendicke",
          "adv.borderColor": "Rahmenfarbe",
          "adv.font": "Schriftart",
          "adv.shadow": "Schlagschatten",
          "adv.keyBgColor": "Tastenhintergrund",
          "adv.keyTextColor": "Textfarbe",
          "adv.keyActiveBg": "Aktiver Tastenhintergrund",
          "adv.keyActiveText": "Aktiver Text",
          "adv.keyActiveBorder": "Aktiver Rahmen",
          "adv.keyRadius": "Tastenabrundung",
          "adv.keyGap": "Abstand",
          "adv.keySize": "Globale Größe",
          "nav.dashboard": "Dashboard",
          "nav.gametools": "Spiel-Tools",
          "nav.rankings": "Rangliste",
          "nav.appearance": "Aussehen",
          "nav.media": "Medien",
          "language.title": "Wähle deine Sprache",
          "language.subtitle": "Wir verwenden sie für die Popup-UI.",
          "language.fr": "Français",
          "language.frLabel": "Standard",
          "language.en": "English",
          "language.enLabel": "International",
          "language.pt": "Português (Brasil)",
          "language.ptLabel": "BR-Community",
          "language.de": "Deutsch",
          "language.deLabel": "Deutschland",
          "language.later": "Später",
          "language.confirm": "Bestätigen",
          "language.switch": "Sprache ändern",
          "section.dashboard.title": "Dashboard",
          "section.dashboard.subtitle": "Hauptsteuerungen & Overlays",
          "card.liveOverlays": "Live-Overlays",
          "label.speedrun": "Speedrun Timer",
          "desc.speedrun": "Millisekundengenauer Timer",
          "desc.timerHotkey": "Timer Aktivierungstaste :",
          "placeholder.customKey": "Oder eigene Taste drücken...",
          "label.fps": "FPS-Zähler",
          "desc.fps": "Zeigt Bilder pro Sekunde",
          "label.keypress": "Tastenanzeige",
          "desc.keypress": "Live-Eingaben anzeigen",
          "card.resolution": "Auflösung",
          "btn.force": "Erzwingen",
          "label.blackBars": "Schwarze Balken",
          "btn.reset": "Zurücksetzen",
          "section.gametools.title": "Spiel-Tools",
          "section.gametools.subtitle": "Speicherstände, Karten & Steuerung",
          "card.backup": "Speicher-Manager",
          "btn.backup": "Backup",
          "btn.restore": "Wiederherstellen",
          "btn.unlock": "Alles freischalten",
          "btn.resetData": "Daten zurücksetzen",
          "card.mapSelector": "Karten-Auswahl",
          "card.keymap": "Tastenbelegung (WASD)",
          "placeholder.up": "Oben (W)",
          "placeholder.left": "Links (A)",
          "placeholder.down": "Unten (S)",
          "placeholder.right": "Rechts (D)",
          "btn.apply": "Anwenden",
          "btn.disable": "Deaktivieren",
          "section.rankings.title": "Rangliste",
          "section.rankings.subtitle": "Speedrun & Rekorde",
          "card.rankCalc": "Rang-Rechner",
          "desc.rankCalc": "Gib eine Zeit ein, um den Rang zu sehen.",
          "placeholder.timeInput": "Z.B.: 1h 13m 45s",
          "card.worldRecords": "Weltrekorde",
          "btn.leaderboard": "Speedrun.com Leaderboard",
          "card.topFrance": "Top Frankreich",
          "section.appearance.title": "Aussehen",
          "section.appearance.subtitle": "Passe deine Oberfläche an",
          "card.overlay": "Tasten-Overlay",
          "card.backgrounds": "Hintergrundbilder",
          "desc.globalBackground": "Globaler Hintergrund",
          "desc.activeBackground": "Aktiver Tastenhintergrund",
          "btn.import": "Bild importieren",
          "btn.removeBackgrounds": "Hintergründe entfernen",
          "card.timerColors": "Timer-Farben",
          "desc.colorRunning": "Läuft",
          "desc.colorPaused": "Pausiert",
          "desc.colorStopped": "Gestoppt",
          "section.media.title": "Medien",
          "section.media.subtitle": "Audio & Musik",
          "card.volume": "Globale Spiellautstärke",
          "card.soundcloud": "SoundCloud-Player",
          "placeholder.playlist": "Playlist-URL...",
          "btn.launchPlayer": "Player starten",
          "desc.soundcloud": "Öffnet ein dediziertes Pop-up-Fenster.",
          "status.done": "Aktion ausgeführt",
          "rank.label": "Rang:",
          "rank.unranked": "Nicht gewertet",
        },
      };

      const storageGet = (keys) =>
        new Promise((resolve) => {
          try {
            chrome.storage.local.get(keys, (data) => resolve(data || {}));
          } catch (e) {
            resolve({});
          }
        });

      function getTranslation(lang, key) {
        const locale = translations[lang] ? lang : LANGUAGE_FALLBACK;
        const dict = translations[locale] || {};
        if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
        if (
          translations.en &&
          Object.prototype.hasOwnProperty.call(translations.en, key)
        )
          return translations.en[key];
        if (
          translations.fr &&
          Object.prototype.hasOwnProperty.call(translations.fr, key)
        )
          return translations.fr[key];
        return "";
      }

      function applyTranslations(lang) {
        const locale = translations[lang] ? lang : LANGUAGE_FALLBACK;
        currentLanguage = locale;
        document.documentElement.lang = locale.startsWith("pt")
          ? "pt-BR"
          : locale;

        document.querySelectorAll("[data-i18n-key]").forEach((el) => {
          const key = el.dataset.i18nKey;
          const value = getTranslation(locale, key);
          if (value) el.textContent = value;
        });

        document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
          const key = el.dataset.i18nPlaceholder;
          const value = getTranslation(locale, key);
          if (value) el.placeholder = value;
        });
      }

      function getNormalizedLang(lang) {
        if (lang === "pt") return "pt-BR";
        return translations[lang] ? lang : null;
      }

      function setLanguage(lang, persist = false) {
        const locale = getNormalizedLang(lang) || LANGUAGE_FALLBACK;
        applyTranslations(locale);
        if (persist) {
          chrome.storage.local.set({
            preferredLanguage: locale,
            languageConfirmed: true,
          });
          try {
            localStorage.setItem("lang", locale);
            localStorage.setItem("langChosen", "true");
          } catch (e) { }
        }
      }

      async function initLanguage() {
        let siteLang = null;
        try {
          siteLang = localStorage.getItem("lang");
        } catch (e) { }

        const { preferredLanguage, languageConfirmed } = await storageGet([
          "preferredLanguage",
          "languageConfirmed",
        ]);

        let locale =
          getNormalizedLang(siteLang) ||
          getNormalizedLang(preferredLanguage) ||
          LANGUAGE_FALLBACK;

        setLanguage(locale, false);
        // If we have a siteLang, consider it confirmed
        setupLanguageModal(locale, !languageConfirmed && !siteLang);
      }

      function setupLanguageModal(
        initialLang = LANGUAGE_FALLBACK,
        shouldShowPrompt = false,
      ) {
        const modal = document.getElementById("languageModal");
        if (!modal) return;

        const optionButtons = Array.from(
          modal.querySelectorAll(".language-option"),
        );
        const confirmBtn = document.getElementById("confirmLanguage");
        const laterBtn = document.getElementById("languageLater");
        const openPickerBtn = document.getElementById("openLanguagePicker");
        let selectedLang = translations[initialLang]
          ? initialLang
          : LANGUAGE_FALLBACK;

        const markActive = (lang) => {
          optionButtons.forEach((btn) =>
            btn.classList.toggle("active", btn.dataset.lang === lang),
          );
        };

        optionButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            selectedLang = btn.dataset.lang;
            markActive(selectedLang);
            if (confirmBtn) confirmBtn.disabled = false;
          });
        });

        if (confirmBtn) {
          confirmBtn.addEventListener("click", () => {
            setLanguage(selectedLang, true);
            modal.classList.add("hidden");
          });
        }

        if (laterBtn) {
          laterBtn.addEventListener("click", () =>
            modal.classList.add("hidden"),
          );
        }

        const openModal = () => {
          markActive(selectedLang);
          if (confirmBtn) confirmBtn.disabled = false;
          modal.classList.remove("hidden");
        };

        if (openPickerBtn) openPickerBtn.addEventListener("click", openModal);
        if (shouldShowPrompt) openModal();
      }

      function parseTimeToMillis(timeString) {
        if (!timeString) return 0;

        const trimmed = timeString.trim();
        const colonMatch = /^\s*(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?\s*$/;
        const colonParts = trimmed.match(colonMatch);
        if (colonParts) {
          const h = parseInt(colonParts[1] || "0", 10);
          const m = parseInt(colonParts[2] || "0", 10);
          const s = parseInt(colonParts[3] || "0", 10);
          return ((h * 60 + m) * 60 + s) * 1000;
        }

        const parts = trimmed
          .toLowerCase()
          .replace(/,/g, " ")
          .split(/\s+/)
          .filter(Boolean);
        let totalMillis = 0;
        parts.forEach((part) => {
          if (part.includes("h")) {
            totalMillis += parseInt(part, 10) * 60 * 60 * 1000;
          } else if (part.includes("m")) {
            totalMillis += parseInt(part, 10) * 60 * 1000;
          } else if (part.includes("s")) {
            totalMillis += parseInt(part, 10) * 1000;
          }
        });
        return totalMillis;
      }

      init();

      async function init() {
        setupRecordingButton();
        await initLanguage();
        setupNavigation();
        setupSwitches();
        setupHotkeySelector();

        // Fonctions existantes
        loadCurrentHotkey();
        setupColorEventListeners();
        setupSubwayEventListeners();
        setupSubwayCityEventListeners();
        setupZqsdEventListeners();
        setupResolutionEventListeners();
        setupVolumeControl();
        setupKeypressLogic();
        setupMusicEventListeners();
        setupIndividualBackgrounds();
        setupAdvancedCustomization();
        setupTripleClick();
        setupRankCalculator();
        setupMapTabs();
      }

      function setupMapTabs() {
        const tabs = document.querySelectorAll(".map-tab");
        const categories = document.querySelectorAll(".map-category");

        tabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            tabs.forEach((t) => {
              t.classList.remove("active");
              t.style.borderColor = "transparent";
              t.style.color = "";
            });
            categories.forEach((c) => (c.style.display = "none"));

            tab.classList.add("active");
            tab.style.borderColor = "var(--border-highlight)";
            tab.style.color = "white";

            const targetId = tab.getAttribute("data-target");
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.style.display = "block";
          });
        });
      }

      function setupRankCalculator() {
        const timeInput = document.getElementById("timeInput");
        const rankResult = document.getElementById("rankResult");

        if (!timeInput || !rankResult) return;

        timeInput.addEventListener("input", () => {
          const timeString = timeInput.value;
          if (!timeString) {
            rankResult.textContent = "";
            return;
          }
          const timeInMillis = parseTimeToMillis(timeString);

          if (isNaN(timeInMillis)) {
            rankResult.textContent = "";
            return;
          }

          const currentRank = rankTiers.find(
            (rank) => timeInMillis >= rank.minTime,
          );
          const label =
            getTranslation(currentLanguage, "rank.label") || "Rank:";
          const unrankedLabel =
            getTranslation(currentLanguage, "rank.unranked") || "Unranked";
          rankResult.textContent = currentRank
            ? `${label} ${currentRank.name}`
            : unrankedLabel;
        });
      }

      // --- NAVIGATION ---
      function setupNavigation() {
        const navItems = document.querySelectorAll(".nav-item");
        const sections = document.querySelectorAll(".view-section");

        navItems.forEach((item) => {
          item.addEventListener("click", () => {
            navItems.forEach((nav) => nav.classList.remove("active"));
            sections.forEach((sec) => sec.classList.remove("active"));
            item.classList.add("active");
            document
              .getElementById(item.dataset.target)
              .classList.add("active");
          });
        });
      }

      // --- HOTKEY SELECTOR ---
      function setupHotkeySelector() {
        const btns = document.querySelectorAll(".hotkey-btn");
        const customInput = document.getElementById("customKeyInput");

        btns.forEach((btn) => {
          btn.addEventListener("click", () => {
            const key = btn.dataset.key;
            setHotkey(key);
            btns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            customInput.value = "";
          });
        });

        customInput.addEventListener("keydown", (e) => {
          e.preventDefault();
          let code = e.code;
          if (e.ctrlKey && !e.altKey) code = "Control";
          else if (e.shiftKey) code = "Shift";
          else if (e.altKey) code = "Alt";
          else if (code === "Space") code = "Space";

          customInput.value = code.startsWith("Key")
            ? code.slice(3)
            : code.startsWith("Digit")
              ? code.slice(5)
              : code;
          setHotkey(code);
          btns.forEach((b) => b.classList.remove("active"));
        });
      }

      // --- SWITCHES ---
      function setupSwitches() {
        const bindSwitch = (id, msgAction, labelOn, labelOff) => {
          const el = document.getElementById(id);
          el.addEventListener("change", () => {
            sendToContentScript({ action: msgAction }, (r, err) => {
              if (err) {
                showStatus(err, false);
                el.checked = false; // Reset le switch si erreur
              } else {
                const active = r && (r.visible || r.success);
                showStatus(active ? labelOn : labelOff, true);
              }
            });
          });
        };

        bindSwitch(
          "toggleTimerSwitch",
          "toggleTimer",
          "Timer Activé",
          "Timer Masqué",
        );
        bindSwitch(
          "toggleFpsSwitch",
          "toggleFpsMonitor",
          "FPS Activés",
          "FPS Masqués",
        );
        bindSwitch(
          "toggleKeypressSwitch",
          "toggleKeypressDisplay",
          "Touches Activées",
          "Touches Masquées",
        );

        // Smart Timer toggle
        const smartTimerSwitch = document.getElementById("smartTimerSwitch");
        if (smartTimerSwitch) {
          chrome.storage.local.get(["smartTimer"], (data) => {
            smartTimerSwitch.checked = data.smartTimer !== false;
          });
          smartTimerSwitch.addEventListener("change", () => {
            const enabled = smartTimerSwitch.checked;
            chrome.storage.local.set({ smartTimer: enabled });
            smartTimerEnabled = enabled;
            if (enabled) injectAudioHook();
            sendSmartTimerConfig();
            showStatus(
              enabled ? "Smart Timer Activé" : "Smart Timer Désactivé",
              true,
            );
          });
        }

        chrome.runtime.sendMessage({ action: "getFpsSettings" }, (r) => {
          if (r?.settings?.visible)
            document.getElementById("toggleFpsSwitch").checked = true;
        });
        chrome.runtime.sendMessage({ action: "getKeypressSettings" }, (r) => {
          if (r?.settings?.visible)
            document.getElementById("toggleKeypressSwitch").checked = true;
        });
        chrome.runtime.sendMessage({ action: "getTimerSettings" }, (r) => {
          if (r?.settings?.visible)
            document.getElementById("toggleTimerSwitch").checked = true;
        });
      }

      function showStatus(msg, success) {
        const toast = document.getElementById("status");
        const translated = getTranslation(currentLanguage, msg) || msg;
        toast.querySelector("span").textContent = translated;
        toast.style.borderColor = success ? "var(--accent)" : "var(--danger)";
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 2500);
      }

      function setupTripleClick() {
        const toggle = document.getElementById("tripleClickToggle");
        const input = document.getElementById("tripleClickInput");
        const inputX = document.getElementById("tripleClickX");
        const inputY = document.getElementById("tripleClickY");

        if (!toggle || !input) return;

        chrome.storage.local.get(
          [
            "tripleClickActive",
            "tripleClickKey",
            "tripleClickX",
            "tripleClickY",
          ],
          (data) => {
            toggle.checked = data.tripleClickActive || false;
            const tcCode = data.tripleClickKey || "KeyF";
            input.value = tcCode.startsWith("Key")
              ? tcCode.slice(3)
              : tcCode.startsWith("Digit")
                ? tcCode.slice(5)
                : tcCode;
            input.dataset.code = tcCode;
            if (
              inputX &&
              data.tripleClickX !== undefined &&
              data.tripleClickX !== null
            ) {
              inputX.value = data.tripleClickX;
            }
            if (
              inputY &&
              data.tripleClickY !== undefined &&
              data.tripleClickY !== null
            ) {
              inputY.value = data.tripleClickY;
            }
          },
        );

        toggle.addEventListener("change", () => {
          const active = toggle.checked;
          chrome.storage.local.set({ tripleClickActive: active });
          sendToContentScript({ action: "updateTripleClick", active: active });
        });

        input.addEventListener("keydown", (e) => {
          e.preventDefault();
          const code = e.code;

          input.value = code.startsWith("Key")
            ? code.slice(3)
            : code.startsWith("Digit")
              ? code.slice(5)
              : code;
          input.dataset.code = code;

          chrome.storage.local.set({ tripleClickKey: code });
          sendToContentScript({ action: "updateTripleClickKey", key: code });

          input.blur();
        });

        // Gestion des coordonnées X et Y
        if (inputX) {
          inputX.addEventListener("input", () => {
            const x = inputX.value === "" ? null : parseInt(inputX.value, 10);
            chrome.storage.local.set({ tripleClickX: x });
            sendToContentScript({ action: "updateTripleClickX", x: x });
          });
        }

        if (inputY) {
          inputY.addEventListener("input", () => {
            const y = inputY.value === "" ? null : parseInt(inputY.value, 10);
            chrome.storage.local.set({ tripleClickY: y });
            sendToContentScript({ action: "updateTripleClickY", y: y });
          });
        }

        // Bouton pour sélectionner la position en cliquant sur la page
        const pickBtn = document.getElementById("pickTripleClickPos");
        if (pickBtn) {
          pickBtn.addEventListener("click", () => {
            sendToContentScript(
              { action: "startPickTripleClickPos" },
              (res, err) => {
                if (!err) {
                  window.close(); // Ferme le popup pour permettre la sélection
                } else {
                  showStatus(err, false);
                }
              },
            );
          });
        }

        // Écouter les changements de storage pour mettre à jour les champs X/Y
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === "local") {
            if (changes.tripleClickX && inputX) {
              inputX.value =
                changes.tripleClickX.newValue !== null
                  ? changes.tripleClickX.newValue
                  : "";
            }
            if (changes.tripleClickY && inputY) {
              inputY.value =
                changes.tripleClickY.newValue !== null
                  ? changes.tripleClickY.newValue
                  : "";
            }
          }
        });
      }

      // --- KEYPRESS LOGIC ---
      function setupKeypressLogic() {
        const layoutBtns = document.querySelectorAll(".key-layout-btn");
        const themeBtns = document.querySelectorAll(".key-theme-btn");

        const updateActive = (btns, val, attr) => {
          btns.forEach((b) =>
            b.classList.toggle("active", b.dataset[attr] === val),
          );
        };

        layoutBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            const layout = btn.dataset.layout;
            updateActive(layoutBtns, layout, "layout");
            sendToContentScript({ action: "updateKeypressLayout", layout });
            chrome.runtime.sendMessage({
              action: "saveKeypressSettings",
              layout,
            });
            showStatus(`Layout: ${layout.toUpperCase()}`, true);
          });
        });

        themeBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            const theme = btn.dataset.theme;
            updateActive(themeBtns, theme, "theme");
            sendToContentScript({ action: "updateKeypressTheme", theme });
            chrome.runtime.sendMessage({
              action: "saveKeypressSettings",
              theme,
            });
            showStatus(`Thème: ${theme}`, true);
          });
        });

        chrome.runtime.sendMessage({ action: "getKeypressSettings" }, (r) => {
          if (r && r.settings) {
            updateActive(layoutBtns, r.settings.layout || "arrows", "layout");
            updateActive(themeBtns, r.settings.theme || "default", "theme");
          }
        });
      }

      function loadCurrentHotkey() {
        chrome.runtime.sendMessage({ action: "getHotkey" }, (r) => {
          if (r && r.hotkey) {
            currentActiveKey = r.hotkey;
            const predefined = ["Control", "Shift", "Alt", "Space"];
            let matched = false;
            document.querySelectorAll(".hotkey-btn").forEach((b) => {
              if (b.dataset.key === r.hotkey) {
                b.classList.add("active");
                matched = true;
              } else b.classList.remove("active");
            });
            const customInput = document.getElementById("customKeyInput");
            if (customInput) {
              if (!matched && !predefined.includes(r.hotkey)) {
                customInput.value = r.hotkey.startsWith("Key")
                  ? r.hotkey.slice(3)
                  : r.hotkey.startsWith("Digit")
                    ? r.hotkey.slice(5)
                    : r.hotkey;
              } else {
                customInput.value = "";
              }
            }
          }
        });
      }

      function setHotkey(key) {
        chrome.runtime.sendMessage(
          { action: "saveHotkey", hotkey: key },
          (r) => {
            if (r && r.success) {
              currentActiveKey = key;
              showStatus(`Touche Timer : ${key}`, true);
              sendToContentScript({ action: "updateHotkey", hotkey: key });
            }
          },
        );
      }

      function setupResolutionEventListeners() {
        const activate = document.getElementById("activateResolution");
        const deactivate = document.getElementById("deactivateResolution");
        const select = document.getElementById("resolutionSelect");
        const bb = document.getElementById("blackBarsToggle");
        const customInputs = document.getElementById("customResInputs");
        const widthInput = document.getElementById("customWidth");
        const heightInput = document.getElementById("customHeight");
        const colorPicker = document.getElementById("barsColorPicker");

        chrome.runtime.sendMessage({ action: "getResolutionSettings" }, (r) => {
          if (r) {
            if (r.selectedResolutionMode)
              select.value = r.selectedResolutionMode;
            if (r.blackBarsEnabled !== undefined)
              bb.checked = r.blackBarsEnabled;
          }
        });
        // Also check stretched resolution
        chrome.storage.local.get(
          ["stretchedResActive", "forcedResolutionMode"],
          (data) => {
            if (data.stretchedResActive) {
              select.value = "stretched";
            } else if (
              data.forcedResolutionMode &&
              data.forcedResolutionMode !== "stretched"
            ) {
              select.value = data.forcedResolutionMode;
            }
          },
        );

        activate.addEventListener("click", () => toggleResolution(true));
        deactivate.addEventListener("click", () => toggleResolution(false));

        // Afficher/masquer les entrées custom selon le choix
        if (select && customInputs) {
          const updateCustomVisibility = () => {
            customInputs.style.display =
              select.value === "custom" ? "block" : "none";
          };
          select.addEventListener("change", updateCustomVisibility);
          updateCustomVisibility();
        }

        // Charger la couleur sauvegardée
        if (colorPicker) {
          chrome.storage.local.get("barsColor", (data) => {
            if (data && data.barsColor) colorPicker.value = data.barsColor;
          });
          colorPicker.addEventListener("change", () => {
            chrome.storage.local.set({ barsColor: colorPicker.value });
          });
        }

        const saveSettings = () => {
          chrome.runtime.sendMessage({
            action: "saveResolutionSettings",
            selectedResolutionMode: select.value,
            blackBarsEnabled: bb.checked,
          });
        };

        select.addEventListener("change", saveSettings);
        bb.addEventListener("change", saveSettings);
      }

      function toggleResolution(activate) {
        let mode = document.getElementById("resolutionSelect").value;
        const bb = document.getElementById("blackBarsToggle").checked;
        const colorEl = document.getElementById("barsColorPicker");
        const color = colorEl ? colorEl.value : "#000000";
        let width, height;

        if (mode === "custom") {
          const wEl = document.getElementById("customWidth");
          const hEl = document.getElementById("customHeight");
          width = wEl ? parseInt(wEl.value, 10) : NaN;
          height = hEl ? parseInt(hEl.value, 10) : NaN;
          if (!width || !height || width < 320 || height < 240) {
            showStatus("Résolution invalide", false);
            return;
          }
          mode = `${width}x${height}`;
        }
        sendToContentScript(
          {
            action: "toggleResolution",
            activate,
            blackBarsEnabled: bb,
            mode,
            barsColor: color,
          },
          (r, err) => {
            if (err) {
              showStatus(err, false);
            } else {
              showStatus(
                activate ? `Résolution ${mode}` : "Reset Normal",
                true,
              );
            }
          },
        );
      }

      function setupVolumeControl() {
        const slider = document.getElementById("volumeSlider");
        const label = document.getElementById("volumeValue");
        chrome.runtime.sendMessage({ action: "getGlobalVolume" }, (r) => {
          if (r && r.globalVolumeLevel !== undefined) {
            const vol = r.globalVolumeLevel * 100;
            slider.value = vol;
            label.textContent = Math.round(vol) + "%";
          }
        });
        slider.addEventListener("input", () => {
          const val = slider.value;
          label.textContent = val + "%";
          const volume = val / 100;
          chrome.runtime.sendMessage({
            action: "saveGlobalVolume",
            globalVolumeLevel: volume,
          });
          sendToContentScript({ action: "setGlobalVolume", volume: volume });
        });
      }

      function setupZqsdEventListeners() {
        const up = document.getElementById("upKey");
        const left = document.getElementById("leftKey");
        const down = document.getElementById("downKey");
        const right = document.getElementById("rightKey");

        // Add keydown interception for binding keys easily
        [up, left, down, right].forEach((input) => {
          if (!input) return;
          input.addEventListener("keydown", (e) => {
            e.preventDefault();
            e.stopPropagation();

            // For ZQSD we probably want the actual character typed, not the JS key code like "KeyW"
            // So we use e.key, unless it's a special key
            let keyStr = e.key;
            if (keyStr === " ") keyStr = "Space";
            if (keyStr.length === 1) keyStr = keyStr.toUpperCase();

            input.value = keyStr;
            input.blur();
          });
        });

        chrome.runtime.sendMessage({ action: "getZqsdKeys" }, (r) => {
          if (r && r.keys) {
            up.value = r.keys.up;
            left.value = r.keys.left;
            down.value = r.keys.down;
            right.value = r.keys.right;
          }
        });
        document
          .getElementById("saveZqsdKeys")
          .addEventListener("click", () => {
            const keys = {
              up: (up.value || "W").toUpperCase(),
              down: (down.value || "S").toUpperCase(),
              left: (left.value || "A").toUpperCase(),
              right: (right.value || "D").toUpperCase(),
            };
            chrome.runtime.sendMessage(
              { action: "saveZqsdKeys", keys: keys },
              () => {
                showStatus("Touches ZQSD Sauvegardées", true);
                sendToContentScript({ action: "updateZqsdKeys", keys });
                sendToContentScript({ action: "activateZqsd" });
              },
            );
          });
        document
          .getElementById("deactivateZqsd")
          .addEventListener("click", () => {
            sendToContentScript({ action: "deactivateZqsd" }, (r, err) => {
              showStatus(err ? err : "ZQSD Désactivé", !err);
            });
          });
      }

      function setupSubwayEventListeners() {
        document.getElementById("backup").addEventListener("click", doBackup);
        document.getElementById("restore").addEventListener("click", doRestore);
        document.getElementById("save100").addEventListener("click", doSave100);
        document
          .getElementById("cleanData")
          .addEventListener("click", doCleanData);
      }

      function doBackup() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]) return;
          chrome.scripting.executeScript(
            { target: { tabId: tabs[0].id }, func: backupData },
            (res) => {
              if (res?.[0]?.result) {
                const blob = new Blob([res[0].result], {
                  type: "application/octet-stream",
                });
                const url = URL.createObjectURL(blob);
                chrome.downloads.download({
                  url,
                  filename: `SubwaySurfers_Backup_${new Date().toISOString().slice(0, 10)}.bin`,
                  saveAs: true,
                });
                showStatus("Backup Créé", true);
              } else showStatus("Erreur Backup", false);
            },
          );
        });
      }

      function backupData() {
        return new Promise((resolve) => {
          const payload = { indexedDB: null, localStorage: null };
          let idb = false,
            ls = false;
          const check = () => {
            if (idb && ls) resolve(JSON.stringify(payload));
          };

          try {
            if (localStorage.length) {
              payload.localStorage = {};
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k.includes("SaveData") || k.includes("Unity"))
                  payload.localStorage[k] = localStorage.getItem(k);
              }
            }
          } catch (e) { }
          ls = true;

          if (!window.indexedDB) {
            idb = true;
            check();
            return;
          }
          const req = indexedDB.open("/idbfs");
          req.onerror = () => {
            idb = true;
            check();
          };
          req.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("FILE_DATA")) {
              db.close();
              idb = true;
              check();
              return;
            }
            const tx = db.transaction(["FILE_DATA"], "readonly");
            const st = tx.objectStore("FILE_DATA");
            st.getAll().onsuccess = (ev) => {
              const data = ev.target.result;
              st.getAllKeys().onsuccess = (ev2) => {
                payload.indexedDB = {};
                ev2.target.result.forEach((k, i) => {
                  const d = data[i];
                  if (d.contents instanceof Uint8Array)
                    d.contents = Array.from(d.contents);
                  payload.indexedDB[k] = d;
                });
                db.close();
                idb = true;
                check();
              };
            };
          };
        });
      }

      function doRestore() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".bin";
        input.onchange = (e) => {
          const f = e.target.files[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = (ev) => {
            const fileContent = ev.target.result;
            try {
              // Check for valid JSON before sending to the content script
              JSON.parse(fileContent);
              chrome.tabs.query(
                { active: true, currentWindow: true },
                (tabs) => {
                  if (tabs[0]) {
                    chrome.scripting.executeScript(
                      {
                        target: { tabId: tabs[0].id },
                        args: [fileContent],
                        func: restoreData,
                      },
                      () => showStatus("Restauré ! Rechargez la page", true),
                    );
                  }
                },
              );
            } catch (error) {
              showStatus("Fichier de sauvegarde invalide", false);
            }
          };
          r.readAsText(f);
        };
        input.click();
      }

      function restoreData(json) {
        try {
          const d = JSON.parse(json);
          if (d.localStorage)
            for (let k in d.localStorage)
              localStorage.setItem(k, d.localStorage[k]);
          if (d.indexedDB) {
            const r = indexedDB.open("/idbfs");
            r.onsuccess = (e) => {
              const db = e.target.result;
              const tx = db.transaction(["FILE_DATA"], "readwrite");
              const st = tx.objectStore("FILE_DATA");
              st.clear().onsuccess = () => {
                for (let k in d.indexedDB) {
                  const rec = d.indexedDB[k];
                  if (rec.contents) rec.contents = new Uint8Array(rec.contents);
                  st.put(rec, k);
                }
              };
            };
          }
        } catch (e) {
          console.error("Error restoring data:", e);
        }
      }

      function doSave100() {
        try {
          applySave100();
          showStatus("Tout débloqué ! Rechargez.", true);
        } catch (e) {
          console.error("doSave100 error:", e);
          showStatus("Erreur unlock", false);
        }
      }

      function applySave100() {
        const request = indexedDB.open("/idbfs");
        request.onsuccess = function (event) {
          const db = event.target.result;
          const tx = db.transaction(["FILE_DATA"], "readonly");
          const store = tx.objectStore("FILE_DATA");
          const keysReq = store.getAllKeys();
          keysReq.onsuccess = function () {
            const allKeys = keysReq.result;
            // Extraire tous les hashs uniques présents dans /idbfs/HASH/Save/cloud
            const hashSet = new Set();
            allKeys.forEach((k) => {
              const m = k.match(/^\/idbfs\/([a-f0-9]+)\/Save\/cloud$/);
              if (m) hashSet.add(m[1]);
            });
            if (hashSet.size === 0) {
              console.error("Aucun hash trouvé dans IndexedDB.");
              return;
            }
            // Écrire la sauvegarde sur chaque hash trouvé
            const hashes = Array.from(hashSet);
            let done = 0;
            hashes.forEach((hash) => {
              const tx2 = db.transaction(["FILE_DATA"], "readwrite");
              const store2 = tx2.objectStore("FILE_DATA");
              const data = {
                timestamp: new Date(1732485593978),
                mode: 33206,
                contents: new Uint8Array([
                  20, 0, 0, 0, 218, 47, 51, 223, 211, 235, 36, 203, 232, 4, 109,
                  30, 183, 217, 129, 209, 226, 12, 85, 89, 244, 45, 0, 0, 244,
                  45, 0, 0, 16, 111, 98, 102, 117, 115, 99, 97, 116, 101, 100,
                  67, 111, 105, 110, 115, 0, 81, 178, 127, 59, 16, 111, 98, 102,
                  117, 115, 99, 97, 116, 101, 100, 75, 101, 121, 115, 0, 240,
                  163, 125, 0, 16, 111, 98, 102, 117, 115, 99, 97, 116, 101,
                  100, 85, 110, 114, 101, 119, 97, 114, 100, 101, 100, 67, 111,
                  105, 110, 115, 0, 2, 0, 0, 0, 3, 112, 111, 119, 101, 114, 117,
                  112, 115, 0, 58, 0, 0, 0, 16, 104, 111, 118, 101, 114, 98,
                  111, 97, 114, 100, 0, 0, 0, 0, 0, 16, 104, 101, 97, 100, 115,
                  116, 97, 114, 116, 50, 48, 48, 48, 0, 247, 196, 154, 59, 16,
                  115, 99, 111, 114, 101, 98, 111, 111, 115, 116, 101, 114, 0,
                  20, 0, 0, 0, 0, 3, 117, 112, 103, 114, 97, 100, 101, 115, 0,
                  75, 0, 0, 0, 16, 106, 101, 116, 112, 97, 99, 107, 0, 0, 0, 0,
                  0, 16, 115, 117, 112, 101, 114, 115, 110, 101, 97, 107, 101,
                  114, 115, 0, 0, 0, 0, 0, 16, 99, 111, 105, 110, 109, 97, 103,
                  110, 101, 116, 0, 0, 0, 0, 0, 16, 100, 111, 117, 98, 108, 101,
                  77, 117, 108, 116, 105, 112, 108, 105, 101, 114, 0, 0, 0, 0,
                  0, 0, 4, 112, 101, 110, 100, 105, 110, 103, 82, 101, 119, 97,
                  114, 100, 115, 0, 5, 0, 0, 0, 0, 3, 98, 111, 97, 114, 100, 84,
                  104, 101, 109, 101, 68, 97, 116, 97, 0, 5, 0, 0, 0, 0, 4, 117,
                  110, 108, 111, 99, 107, 101, 100, 67, 104, 97, 114, 97, 99,
                  116, 101, 114, 115, 0, 134, 0, 0, 0, 2, 48, 0, 6, 0, 0, 0,
                  115, 108, 105, 99, 107, 0, 2, 49, 0, 7, 0, 0, 0, 102, 114,
                  105, 122, 122, 121, 0, 2, 50, 0, 8, 0, 0, 0, 112, 114, 105,
                  110, 99, 101, 107, 0, 2, 51, 0, 6, 0, 0, 0, 98, 114, 111, 100,
                  121, 0, 2, 52, 0, 4, 0, 0, 0, 122, 111, 101, 0, 2, 53, 0, 6,
                  0, 0, 0, 110, 105, 110, 106, 97, 0, 2, 54, 0, 4, 0, 0, 0, 116,
                  97, 103, 0, 2, 55, 0, 7, 0, 0, 0, 116, 114, 105, 99, 107, 121,
                  0, 2, 56, 0, 5, 0, 0, 0, 108, 117, 99, 121, 0, 2, 57, 0, 6, 0,
                  0, 0, 102, 114, 101, 115, 104, 0, 0, 3, 99, 111, 108, 108,
                  101, 99, 116, 101, 100, 67, 104, 97, 114, 97, 99, 116, 101,
                  114, 84, 111, 107, 101, 110, 115, 0, 51, 0, 0, 0, 16, 116,
                  114, 105, 99, 107, 121, 0, 2, 0, 0, 0, 16, 102, 114, 101, 115,
                  104, 0, 20, 9, 0, 0, 16, 121, 117, 116, 97, 110, 105, 0, 2, 0,
                  0, 0, 16, 115, 112, 105, 107, 101, 0, 12, 0, 0, 0, 0, 3, 115,
                  101, 108, 101, 99, 116, 101, 100, 79, 117, 116, 102, 105, 116,
                  115, 0, 69, 0, 0, 0, 16, 112, 114, 105, 110, 99, 101, 107, 0,
                  2, 0, 0, 0, 16, 122, 111, 101, 0, 2, 0, 0, 0, 16, 116, 97,
                  103, 0, 1, 0, 0, 0, 16, 116, 114, 105, 99, 107, 121, 0, 1, 0,
                  0, 0, 16, 108, 117, 99, 121, 0, 1, 0, 0, 0, 16, 102, 114, 101,
                  115, 104, 0, 1, 0, 0, 0, 0, 3, 117, 110, 108, 111, 99, 107,
                  101, 100, 79, 117, 116, 102, 105, 116, 115, 0, 162, 0, 0, 0,
                  4, 115, 108, 105, 99, 107, 0, 12, 0, 0, 0, 16, 48, 0, 1, 0, 0,
                  0, 0, 4, 112, 114, 105, 110, 99, 101, 107, 0, 12, 0, 0, 0, 16,
                  48, 0, 2, 0, 0, 0, 0, 4, 122, 111, 101, 0, 12, 0, 0, 0, 16,
                  48, 0, 2, 0, 0, 0, 0, 4, 116, 97, 103, 0, 12, 0, 0, 0, 16, 48,
                  0, 1, 0, 0, 0, 0, 4, 102, 114, 101, 115, 104, 0, 12, 0, 0, 0,
                  16, 48, 0, 1, 0, 0, 0, 0, 4, 116, 114, 105, 99, 107, 121, 0,
                  19, 0, 0, 0, 16, 48, 0, 2, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 0,
                  4, 108, 117, 99, 121, 0, 12, 0, 0, 0, 16, 48, 0, 1, 0, 0, 0,
                  0, 4, 98, 114, 111, 100, 121, 0, 12, 0, 0, 0, 16, 48, 0, 1, 0,
                  0, 0, 0, 0, 4, 117, 110, 108, 111, 99, 107, 101, 100, 66, 111,
                  97, 114, 100, 115, 0, 22, 0, 0, 0, 2, 48, 0, 10, 0, 0, 0, 115,
                  116, 97, 114, 98, 111, 97, 114, 100, 0, 0, 4, 104, 97, 115,
                  83, 107, 105, 112, 112, 101, 100, 77, 105, 115, 115, 105, 111,
                  110, 115, 0, 17, 0, 0, 0, 8, 48, 0, 0, 8, 49, 0, 0, 8, 50, 0,
                  0, 0, 16, 114, 117, 110, 115, 67, 111, 109, 112, 108, 101,
                  116, 101, 100, 73, 110, 67, 117, 114, 114, 101, 110, 116, 77,
                  105, 115, 115, 105, 111, 110, 83, 101, 116, 0, 111, 1, 0, 0,
                  16, 99, 117, 114, 114, 101, 110, 116, 77, 105, 115, 115, 105,
                  111, 110, 83, 101, 116, 0, 1, 0, 0, 0, 4, 99, 117, 114, 114,
                  101, 110, 116, 77, 105, 115, 115, 105, 111, 110, 80, 114, 111,
                  103, 114, 101, 115, 115, 0, 26, 0, 0, 0, 16, 48, 0, 0, 0, 0,
                  0, 16, 49, 0, 20, 0, 0, 0, 16, 50, 0, 2, 0, 0, 0, 0, 16, 109,
                  105, 115, 115, 105, 111, 110, 83, 101, 116, 67, 111, 109, 112,
                  108, 101, 116, 101, 100, 67, 111, 117, 110, 116, 0, 2, 0, 0,
                  0, 16, 99, 117, 114, 114, 101, 110, 116, 83, 107, 105, 112,
                  70, 111, 114, 86, 105, 100, 101, 111, 77, 105, 115, 115, 105,
                  111, 110, 73, 110, 100, 101, 120, 0, 0, 0, 0, 0, 9, 99, 117,
                  114, 114, 101, 110, 116, 83, 107, 105, 112, 70, 111, 114, 86,
                  105, 100, 101, 111, 73, 110, 100, 101, 120, 83, 101, 116, 65,
                  116, 0, 86, 59, 48, 96, 147, 1, 0, 0, 9, 108, 97, 115, 116,
                  84, 105, 109, 101, 77, 105, 115, 115, 105, 111, 110, 87, 97,
                  115, 83, 107, 105, 112, 112, 101, 100, 70, 111, 114, 86, 105,
                  100, 101, 111, 0, 128, 243, 119, 238, 124, 199, 255, 255, 8,
                  104, 97, 115, 83, 107, 105, 112, 112, 101, 100, 77, 105, 115,
                  115, 105, 111, 110, 70, 111, 114, 86, 105, 100, 101, 111, 84,
                  104, 105, 115, 83, 101, 116, 0, 0, 4, 97, 99, 104, 105, 101,
                  118, 101, 109, 101, 110, 116, 80, 114, 111, 103, 114, 101,
                  115, 115, 0, 5, 0, 0, 0, 0, 16, 117, 110, 114, 101, 112, 111,
                  114, 116, 101, 100, 71, 97, 109, 101, 115, 0, 0, 0, 0, 0, 9,
                  117, 110, 114, 101, 112, 111, 114, 116, 101, 100, 71, 97, 109,
                  101, 115, 84, 105, 109, 101, 83, 116, 97, 109, 112, 0, 128,
                  243, 119, 238, 124, 199, 255, 255, 16, 104, 105, 103, 104, 83,
                  99, 111, 114, 101, 0, 193, 105, 130, 0, 4, 117, 110, 108, 111,
                  99, 107, 101, 100, 84, 114, 111, 112, 104, 105, 101, 115, 0,
                  37, 0, 0, 0, 8, 48, 0, 0, 8, 49, 0, 0, 8, 50, 0, 0, 8, 51, 0,
                  0, 8, 52, 0, 0, 8, 53, 0, 0, 8, 54, 0, 0, 8, 55, 0, 0, 0, 3,
                  97, 119, 97, 114, 100, 115, 80, 114, 111, 103, 114, 101, 115,
                  115, 0, 159, 15, 0, 0, 3, 83, 67, 79, 82, 69, 95, 80, 79, 73,
                  78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 76, 65, 78, 69, 0,
                  238, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101,
                  114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111,
                  110, 100, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84,
                  105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0, 68, 105, 97,
                  109, 111, 110, 100, 0, 2, 99, 117, 114, 114, 101, 110, 116,
                  65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116,
                  97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101,
                  100, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111,
                  103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97,
                  116, 101, 0, 9, 0, 0, 0, 70, 105, 110, 105, 115, 104, 101,
                  100, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83,
                  116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116,
                  101, 84, 105, 109, 101, 0, 237, 186, 92, 53, 146, 1, 0, 0, 16,
                  111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115,
                  116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0,
                  8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84,
                  111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101,
                  116, 0, 0, 0, 3, 79, 80, 69, 78, 95, 88, 95, 83, 85, 80, 69,
                  82, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0,
                  13, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114,
                  84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101,
                  0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101,
                  114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122,
                  101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105,
                  118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11,
                  0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2,
                  99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101,
                  115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11,
                  0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9,
                  108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97,
                  116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84,
                  105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16,
                  111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115,
                  116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 34, 0, 0, 0, 16,
                  83, 117, 112, 101, 114, 77, 121, 115, 116, 101, 114, 121, 66,
                  111, 120, 101, 115, 79, 112, 101, 110, 101, 100, 0, 0, 0, 0,
                  0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100,
                  84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115,
                  101, 116, 0, 1, 0, 3, 87, 73, 78, 95, 88, 95, 74, 65, 67, 75,
                  80, 79, 84, 83, 0, 1, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101,
                  84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114,
                  111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115,
                  115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66,
                  114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110,
                  116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83,
                  116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103,
                  114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116,
                  80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100,
                  83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111,
                  103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116,
                  105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103,
                  101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119,
                  238, 124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0,
                  255, 255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115,
                  101, 116, 0, 22, 0, 0, 0, 16, 74, 97, 99, 107, 112, 111, 116,
                  115, 87, 111, 110, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105,
                  103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116,
                  97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 83, 67, 79,
                  82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71, 76,
                  69, 95, 82, 85, 78, 95, 78, 79, 95, 74, 85, 77, 80, 95, 79,
                  82, 95, 82, 79, 76, 76, 0, 238, 0, 0, 0, 2, 97, 99, 116, 105,
                  118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 8, 0, 0, 0,
                  68, 105, 97, 109, 111, 110, 100, 0, 2, 112, 114, 111, 103,
                  114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0,
                  8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 99, 117,
                  114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119,
                  97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105,
                  110, 105, 115, 104, 101, 100, 0, 2, 99, 117, 114, 114, 101,
                  110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97,
                  114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105, 110,
                  105, 115, 104, 101, 100, 0, 9, 108, 97, 115, 116, 65, 99, 116,
                  105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103,
                  101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 22, 220, 92, 53,
                  146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255,
                  255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116,
                  0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116,
                  101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102,
                  102, 115, 101, 116, 0, 0, 0, 3, 79, 80, 69, 78, 95, 88, 95,
                  77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 9, 1,
                  0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84,
                  121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0,
                  2, 112, 114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114,
                  84, 121, 112, 101, 0, 7, 0, 0, 0, 83, 105, 108, 118, 101, 114,
                  0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118,
                  101, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 12, 0,
                  0, 0, 67, 111, 108, 108, 101, 99, 116, 105, 98, 108, 101, 0,
                  2, 99, 117, 114, 114, 101, 110, 116, 80, 114, 111, 103, 114,
                  101, 115, 115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101,
                  0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115,
                  115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83,
                  116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116,
                  101, 84, 105, 109, 101, 0, 218, 173, 20, 99, 146, 1, 0, 0, 16,
                  111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115,
                  116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 29, 0, 0, 0, 16,
                  77, 121, 115, 116, 101, 114, 121, 66, 111, 120, 101, 115, 79,
                  112, 101, 110, 101, 100, 0, 20, 0, 0, 0, 0, 8, 104, 97, 115,
                  77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101,
                  83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 80,
                  73, 67, 75, 95, 88, 95, 75, 69, 89, 83, 95, 73, 78, 71, 65,
                  77, 69, 0, 3, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84, 105,
                  101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110,
                  122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115, 84,
                  105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111,
                  110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116, 65, 99,
                  116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116, 97, 116,
                  101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114, 101,
                  115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80, 114,
                  111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83, 116,
                  97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114,
                  101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105, 118,
                  101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101, 68,
                  97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124,
                  199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255,
                  255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116,
                  0, 24, 0, 0, 0, 16, 75, 101, 121, 115, 67, 111, 108, 108, 101,
                  99, 116, 101, 100, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105,
                  103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116,
                  97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 67, 79, 76,
                  76, 69, 67, 84, 95, 67, 79, 73, 78, 83, 95, 83, 73, 78, 71,
                  76, 69, 95, 82, 85, 78, 0, 240, 0, 0, 0, 2, 97, 99, 116, 105,
                  118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0,
                  66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111, 103, 114,
                  101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0,
                  0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117, 114, 114,
                  101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119, 97, 114,
                  100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114,
                  111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114, 114, 101,
                  110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119, 97,
                  114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80,
                  114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97, 115, 116,
                  65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104,
                  97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0,
                  128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102, 102,
                  115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116,
                  79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0, 8, 104, 97,
                  115, 77, 105, 103, 114, 97, 116, 101, 100, 84, 111, 85, 115,
                  101, 83, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 0, 0,
                  3, 72, 65, 86, 69, 95, 83, 85, 80, 69, 82, 83, 78, 73, 67, 75,
                  69, 82, 83, 95, 65, 67, 84, 73, 86, 69, 95, 88, 95, 77, 73,
                  78, 95, 73, 78, 95, 65, 95, 82, 79, 87, 0, 240, 0, 0, 0, 2,
                  97, 99, 116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112,
                  101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112,
                  114, 111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121,
                  112, 101, 0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2,
                  99, 117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101,
                  65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0,
                  73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117,
                  114, 114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115,
                  115, 65, 119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0,
                  0, 0, 73, 110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9,
                  108, 97, 115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97,
                  116, 101, 67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84,
                  105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16,
                  111, 102, 102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115,
                  116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5, 0, 0, 0, 0,
                  8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84,
                  111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101,
                  116, 0, 0, 0, 3, 67, 79, 77, 80, 76, 69, 84, 69, 95, 77, 73,
                  83, 83, 73, 79, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82,
                  85, 78, 0, 240, 0, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84,
                  105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 83, 105, 108,
                  118, 101, 114, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115,
                  84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 83, 105,
                  108, 118, 101, 114, 0, 2, 99, 117, 114, 114, 101, 110, 116,
                  65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116,
                  97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114,
                  101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80,
                  114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83,
                  116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103,
                  114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105,
                  118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101,
                  68, 97, 116, 101, 84, 105, 109, 101, 0, 130, 36, 67, 48, 146,
                  1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255, 255, 255,
                  255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101, 116, 0, 5,
                  0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101,
                  100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102,
                  115, 101, 116, 0, 0, 0, 3, 83, 67, 79, 82, 69, 95, 80, 79, 73,
                  78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95,
                  78, 79, 95, 67, 79, 73, 78, 83, 0, 238, 0, 0, 0, 2, 97, 99,
                  116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0,
                  8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 112, 114,
                  111, 103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112,
                  101, 0, 8, 0, 0, 0, 68, 105, 97, 109, 111, 110, 100, 0, 2, 99,
                  117, 114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65,
                  119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70,
                  105, 110, 105, 115, 104, 101, 100, 0, 2, 99, 117, 114, 114,
                  101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65, 119,
                  97, 114, 100, 83, 116, 97, 116, 101, 0, 9, 0, 0, 0, 70, 105,
                  110, 105, 115, 104, 101, 100, 0, 9, 108, 97, 115, 116, 65, 99,
                  116, 105, 118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110,
                  103, 101, 68, 97, 116, 101, 84, 105, 109, 101, 0, 251, 13, 93,
                  53, 146, 1, 0, 0, 16, 111, 102, 102, 115, 101, 116, 0, 255,
                  255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101,
                  116, 0, 5, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97,
                  116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97, 116, 79,
                  102, 102, 115, 101, 116, 0, 0, 0, 3, 80, 73, 67, 75, 85, 80,
                  95, 80, 79, 87, 69, 82, 85, 80, 83, 0, 4, 1, 0, 0, 2, 97, 99,
                  116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0,
                  7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111,
                  103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101,
                  0, 7, 0, 0, 0, 83, 105, 108, 118, 101, 114, 0, 2, 99, 117,
                  114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119,
                  97, 114, 100, 83, 116, 97, 116, 101, 0, 12, 0, 0, 0, 67, 111,
                  108, 108, 101, 99, 116, 105, 98, 108, 101, 0, 2, 99, 117, 114,
                  114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65,
                  119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73,
                  110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97,
                  115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101,
                  67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109,
                  101, 0, 104, 170, 29, 99, 146, 1, 0, 0, 16, 111, 102, 102,
                  115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97, 116,
                  79, 102, 102, 115, 101, 116, 0, 24, 0, 0, 0, 16, 80, 105, 99,
                  107, 117, 112, 80, 111, 119, 101, 114, 117, 112, 0, 100, 0, 0,
                  0, 0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100,
                  84, 111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115,
                  101, 116, 0, 1, 0, 3, 67, 79, 77, 80, 76, 69, 84, 69, 95, 88,
                  95, 77, 73, 83, 83, 73, 79, 78, 83, 0, 6, 1, 0, 0, 2, 97, 99,
                  116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0,
                  7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111,
                  103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101,
                  0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117,
                  114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119,
                  97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110,
                  80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114,
                  114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65,
                  119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73,
                  110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97,
                  115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101,
                  67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109,
                  101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102,
                  102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97,
                  116, 79, 102, 102, 115, 101, 116, 0, 27, 0, 0, 0, 16, 77, 105,
                  115, 115, 105, 111, 110, 67, 111, 109, 112, 108, 101, 116,
                  101, 100, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105, 103,
                  114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116, 97,
                  116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 3, 67, 79, 76, 76,
                  69, 67, 84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95,
                  73, 84, 69, 77, 83, 95, 77, 66, 0, 48, 1, 0, 0, 2, 97, 99,
                  116, 105, 118, 101, 84, 105, 101, 114, 84, 121, 112, 101, 0,
                  7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 112, 114, 111,
                  103, 114, 101, 115, 115, 84, 105, 101, 114, 84, 121, 112, 101,
                  0, 7, 0, 0, 0, 66, 114, 111, 110, 122, 101, 0, 2, 99, 117,
                  114, 114, 101, 110, 116, 65, 99, 116, 105, 118, 101, 65, 119,
                  97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110,
                  80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 99, 117, 114,
                  114, 101, 110, 116, 80, 114, 111, 103, 114, 101, 115, 115, 65,
                  119, 97, 114, 100, 83, 116, 97, 116, 101, 0, 11, 0, 0, 0, 73,
                  110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 9, 108, 97,
                  115, 116, 65, 99, 116, 105, 118, 101, 83, 116, 97, 116, 101,
                  67, 104, 97, 110, 103, 101, 68, 97, 116, 101, 84, 105, 109,
                  101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 16, 111, 102,
                  102, 115, 101, 116, 0, 255, 255, 255, 255, 3, 115, 116, 97,
                  116, 79, 102, 102, 115, 101, 116, 0, 69, 0, 0, 0, 16, 71, 111,
                  108, 100, 67, 104, 97, 105, 110, 67, 108, 111, 99, 107, 0, 0,
                  0, 0, 0, 16, 72, 101, 97, 100, 112, 104, 111, 110, 101, 115,
                  0, 0, 0, 0, 0, 16, 84, 97, 112, 101, 66, 108, 97, 99, 107, 0,
                  0, 0, 0, 0, 16, 76, 112, 66, 108, 97, 99, 107, 0, 0, 0, 0, 0,
                  0, 8, 104, 97, 115, 77, 105, 103, 114, 97, 116, 101, 100, 84,
                  111, 85, 115, 101, 83, 116, 97, 116, 79, 102, 102, 115, 101,
                  116, 0, 1, 0, 3, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76, 68,
                  95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95, 83,
                  77, 66, 0, 46, 1, 0, 0, 2, 97, 99, 116, 105, 118, 101, 84,
                  105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114, 111,
                  110, 122, 101, 0, 2, 112, 114, 111, 103, 114, 101, 115, 115,
                  84, 105, 101, 114, 84, 121, 112, 101, 0, 7, 0, 0, 0, 66, 114,
                  111, 110, 122, 101, 0, 2, 99, 117, 114, 114, 101, 110, 116,
                  65, 99, 116, 105, 118, 101, 65, 119, 97, 114, 100, 83, 116,
                  97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103, 114,
                  101, 115, 115, 0, 2, 99, 117, 114, 114, 101, 110, 116, 80,
                  114, 111, 103, 114, 101, 115, 115, 65, 119, 97, 114, 100, 83,
                  116, 97, 116, 101, 0, 11, 0, 0, 0, 73, 110, 80, 114, 111, 103,
                  114, 101, 115, 115, 0, 9, 108, 97, 115, 116, 65, 99, 116, 105,
                  118, 101, 83, 116, 97, 116, 101, 67, 104, 97, 110, 103, 101,
                  68, 97, 116, 101, 84, 105, 109, 101, 0, 128, 243, 119, 238,
                  124, 199, 255, 255, 16, 111, 102, 102, 115, 101, 116, 0, 255,
                  255, 255, 255, 3, 115, 116, 97, 116, 79, 102, 102, 115, 101,
                  116, 0, 67, 0, 0, 0, 16, 71, 111, 108, 100, 67, 104, 97, 105,
                  110, 68, 111, 108, 108, 97, 114, 0, 0, 0, 0, 0, 16, 71, 111,
                  108, 100, 83, 107, 117, 108, 108, 0, 0, 0, 0, 0, 16, 71, 111,
                  108, 100, 98, 97, 114, 0, 0, 0, 0, 0, 16, 68, 105, 97, 109,
                  111, 110, 100, 0, 0, 0, 0, 0, 0, 8, 104, 97, 115, 77, 105,
                  103, 114, 97, 116, 101, 100, 84, 111, 85, 115, 101, 83, 116,
                  97, 116, 79, 102, 102, 115, 101, 116, 0, 1, 0, 0, 9, 119, 101,
                  101, 107, 108, 121, 71, 105, 102, 116, 85, 110, 108, 111, 99,
                  107, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255,
                  255, 4, 115, 116, 97, 116, 86, 97, 108, 117, 101, 115, 0, 35,
                  1, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 0, 0, 0, 0, 16, 50,
                  0, 0, 0, 0, 0, 16, 51, 0, 0, 0, 0, 0, 16, 52, 0, 0, 0, 0, 0,
                  16, 53, 0, 0, 0, 0, 0, 16, 54, 0, 0, 0, 0, 0, 16, 55, 0, 0, 0,
                  0, 0, 16, 56, 0, 1, 0, 0, 0, 16, 57, 0, 0, 0, 0, 0, 16, 49,
                  48, 0, 0, 0, 0, 0, 16, 49, 49, 0, 0, 0, 0, 0, 16, 49, 50, 0,
                  0, 0, 0, 0, 16, 49, 51, 0, 5, 0, 0, 0, 16, 49, 52, 0, 0, 0, 0,
                  0, 16, 49, 53, 0, 0, 0, 0, 0, 16, 49, 54, 0, 0, 0, 0, 0, 16,
                  49, 55, 0, 0, 0, 0, 0, 16, 49, 56, 0, 0, 0, 0, 0, 16, 49, 57,
                  0, 0, 0, 0, 0, 16, 50, 48, 0, 0, 0, 0, 0, 16, 50, 49, 0, 0, 0,
                  0, 0, 16, 50, 50, 0, 0, 0, 0, 0, 16, 50, 51, 0, 0, 0, 0, 0,
                  16, 50, 52, 0, 0, 0, 0, 0, 16, 50, 53, 0, 192, 1, 0, 0, 16,
                  50, 54, 0, 0, 0, 0, 0, 16, 50, 55, 0, 0, 0, 0, 0, 16, 50, 56,
                  0, 0, 0, 0, 0, 16, 50, 57, 0, 58, 0, 0, 0, 16, 51, 48, 0, 0,
                  0, 0, 0, 16, 51, 49, 0, 0, 0, 0, 0, 16, 51, 50, 0, 0, 0, 0, 0,
                  16, 51, 51, 0, 0, 0, 0, 0, 16, 51, 52, 0, 0, 0, 0, 0, 16, 51,
                  53, 0, 0, 0, 0, 0, 16, 51, 54, 0, 0, 0, 0, 0, 0, 4, 109, 121,
                  115, 116, 101, 114, 121, 66, 111, 120, 101, 115, 79, 112, 101,
                  110, 101, 100, 0, 26, 0, 0, 0, 16, 48, 0, 57, 0, 0, 0, 16, 49,
                  0, 0, 0, 0, 0, 16, 50, 0, 0, 0, 0, 0, 0, 16, 99, 111, 109,
                  112, 108, 101, 116, 101, 100, 82, 117, 110, 67, 111, 117, 110,
                  116, 0, 199, 1, 0, 0, 2, 99, 117, 114, 114, 101, 110, 116, 67,
                  104, 97, 114, 97, 99, 116, 101, 114, 73, 100, 0, 8, 0, 0, 0,
                  112, 114, 105, 110, 99, 101, 107, 0, 2, 99, 117, 114, 114,
                  101, 110, 116, 66, 111, 97, 114, 100, 73, 100, 0, 7, 0, 0, 0,
                  110, 111, 114, 109, 97, 108, 0, 2, 112, 114, 101, 118, 105,
                  111, 117, 115, 66, 111, 97, 114, 100, 73, 100, 0, 7, 0, 0, 0,
                  110, 111, 114, 109, 97, 108, 0, 3, 97, 119, 97, 114, 100, 73,
                  115, 78, 101, 119, 0, 145, 1, 0, 0, 8, 67, 79, 76, 76, 69, 67,
                  84, 95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84,
                  69, 77, 83, 95, 77, 66, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84,
                  95, 79, 76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69,
                  77, 83, 95, 83, 77, 66, 0, 0, 8, 67, 79, 77, 80, 76, 69, 84,
                  69, 95, 88, 95, 77, 73, 83, 83, 73, 79, 78, 83, 0, 0, 8, 80,
                  73, 67, 75, 85, 80, 95, 80, 79, 87, 69, 82, 85, 80, 83, 0, 0,
                  8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73,
                  78, 71, 76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 67, 79, 73,
                  78, 83, 0, 0, 8, 67, 79, 77, 80, 76, 69, 84, 69, 95, 77, 73,
                  83, 83, 73, 79, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82,
                  85, 78, 0, 0, 8, 72, 65, 86, 69, 95, 83, 85, 80, 69, 82, 83,
                  78, 73, 67, 75, 69, 82, 83, 95, 65, 67, 84, 73, 86, 69, 95,
                  88, 95, 77, 73, 78, 95, 73, 78, 95, 65, 95, 82, 79, 87, 0, 0,
                  8, 67, 79, 76, 76, 69, 67, 84, 95, 67, 79, 73, 78, 83, 95, 83,
                  73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 0, 8, 80, 73, 67, 75,
                  95, 88, 95, 75, 69, 89, 83, 95, 73, 78, 71, 65, 77, 69, 0, 0,
                  8, 79, 80, 69, 78, 95, 88, 95, 77, 89, 83, 84, 69, 82, 89, 95,
                  66, 79, 88, 69, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79,
                  73, 78, 84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78,
                  95, 78, 79, 95, 74, 85, 77, 80, 95, 79, 82, 95, 82, 79, 76,
                  76, 0, 0, 8, 87, 73, 78, 95, 88, 95, 74, 65, 67, 75, 80, 79,
                  84, 83, 0, 0, 8, 79, 80, 69, 78, 95, 88, 95, 83, 85, 80, 69,
                  82, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0,
                  0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83,
                  73, 78, 71, 76, 69, 95, 76, 65, 78, 69, 0, 0, 0, 3, 97, 119,
                  97, 114, 100, 72, 97, 115, 80, 97, 121, 101, 100, 79, 117,
                  116, 0, 145, 1, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 79,
                  76, 68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83,
                  95, 77, 66, 0, 0, 8, 67, 79, 76, 76, 69, 67, 84, 95, 79, 76,
                  68, 95, 84, 82, 79, 80, 72, 89, 95, 73, 84, 69, 77, 83, 95,
                  83, 77, 66, 0, 0, 8, 67, 79, 77, 80, 76, 69, 84, 69, 95, 88,
                  95, 77, 73, 83, 83, 73, 79, 78, 83, 0, 0, 8, 80, 73, 67, 75,
                  85, 80, 95, 80, 79, 87, 69, 82, 85, 80, 83, 0, 0, 8, 83, 67,
                  79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78, 71,
                  76, 69, 95, 82, 85, 78, 95, 78, 79, 95, 67, 79, 73, 78, 83, 0,
                  1, 8, 67, 79, 77, 80, 76, 69, 84, 69, 95, 77, 73, 83, 83, 73,
                  79, 78, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 0, 1,
                  8, 72, 65, 86, 69, 95, 83, 85, 80, 69, 82, 83, 78, 73, 67, 75,
                  69, 82, 83, 95, 65, 67, 84, 73, 86, 69, 95, 88, 95, 77, 73,
                  78, 95, 73, 78, 95, 65, 95, 82, 79, 87, 0, 0, 8, 67, 79, 76,
                  76, 69, 67, 84, 95, 67, 79, 73, 78, 83, 95, 83, 73, 78, 71,
                  76, 69, 95, 82, 85, 78, 0, 0, 8, 80, 73, 67, 75, 95, 88, 95,
                  75, 69, 89, 83, 95, 73, 78, 71, 65, 77, 69, 0, 0, 8, 79, 80,
                  69, 78, 95, 88, 95, 77, 89, 83, 84, 69, 82, 89, 95, 66, 79,
                  88, 69, 83, 0, 0, 8, 83, 67, 79, 82, 69, 95, 80, 79, 73, 78,
                  84, 83, 95, 83, 73, 78, 71, 76, 69, 95, 82, 85, 78, 95, 78,
                  79, 95, 74, 85, 77, 80, 95, 79, 82, 95, 82, 79, 76, 76, 0, 1,
                  8, 87, 73, 78, 95, 88, 95, 74, 65, 67, 75, 80, 79, 84, 83, 0,
                  0, 8, 79, 80, 69, 78, 95, 88, 95, 83, 85, 80, 69, 82, 95, 77,
                  89, 83, 84, 69, 82, 89, 95, 66, 79, 88, 69, 83, 0, 0, 8, 83,
                  67, 79, 82, 69, 95, 80, 79, 73, 78, 84, 83, 95, 83, 73, 78,
                  71, 76, 69, 95, 76, 65, 78, 69, 0, 1, 0, 8, 97, 119, 97, 114,
                  100, 115, 70, 105, 114, 115, 116, 76, 111, 97, 100, 101, 100,
                  0, 1, 2, 119, 101, 101, 107, 108, 121, 72, 117, 110, 116, 80,
                  114, 111, 103, 114, 101, 115, 115, 86, 101, 114, 115, 105,
                  111, 110, 0, 4, 0, 0, 0, 49, 46, 48, 0, 4, 104, 97, 115, 76,
                  111, 103, 103, 101, 100, 87, 101, 101, 107, 108, 121, 72, 117,
                  110, 116, 80, 101, 114, 105, 111, 100, 0, 21, 0, 0, 0, 8, 48,
                  0, 1, 8, 49, 0, 1, 8, 50, 0, 1, 8, 51, 0, 1, 0, 3, 119, 101,
                  101, 107, 108, 121, 72, 117, 110, 116, 80, 114, 111, 103, 114,
                  101, 115, 115, 68, 97, 116, 97, 0, 95, 0, 0, 0, 2, 104, 117,
                  110, 116, 83, 116, 97, 114, 116, 86, 101, 114, 115, 105, 111,
                  110, 0, 20, 0, 0, 0, 48, 57, 47, 49, 51, 47, 50, 48, 49, 56,
                  32, 48, 48, 58, 48, 48, 58, 48, 48, 0, 4, 116, 111, 107, 101,
                  110, 80, 114, 111, 103, 114, 101, 115, 115, 0, 33, 0, 0, 0,
                  16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 0, 0, 0, 0, 16, 50, 0, 0, 0,
                  0, 0, 16, 51, 0, 0, 0, 0, 0, 0, 0, 16, 119, 111, 114, 100, 72,
                  117, 110, 116, 87, 111, 114, 100, 115, 73, 110, 82, 111, 119,
                  0, 1, 0, 0, 0, 8, 119, 111, 114, 100, 72, 117, 110, 116, 80,
                  97, 121, 101, 100, 79, 117, 116, 0, 0, 16, 119, 111, 114, 100,
                  72, 117, 110, 116, 85, 110, 108, 111, 99, 107, 101, 100, 77,
                  97, 115, 107, 0, 1, 0, 0, 0, 16, 119, 111, 114, 100, 72, 117,
                  110, 116, 76, 97, 115, 116, 80, 97, 121, 111, 117, 116, 68,
                  97, 121, 79, 102, 89, 101, 97, 114, 0, 27, 1, 0, 0, 3, 99,
                  104, 97, 114, 97, 99, 116, 101, 114, 78, 97, 109, 101, 69,
                  118, 101, 110, 116, 68, 97, 116, 97, 0, 221, 0, 0, 0, 2, 99,
                  117, 114, 114, 101, 110, 116, 67, 104, 97, 114, 97, 99, 116,
                  101, 114, 0, 6, 0, 0, 0, 115, 108, 105, 99, 107, 0, 16, 99,
                  111, 108, 108, 101, 99, 116, 101, 100, 76, 101, 116, 116, 101,
                  114, 73, 110, 100, 101, 120, 0, 255, 255, 255, 255, 16, 115,
                  107, 105, 112, 112, 101, 100, 67, 104, 97, 114, 97, 99, 116,
                  101, 114, 115, 0, 0, 0, 0, 0, 8, 119, 97, 115, 76, 97, 115,
                  116, 67, 104, 97, 114, 97, 99, 116, 101, 114, 67, 111, 109,
                  112, 108, 101, 116, 101, 100, 0, 0, 16, 99, 111, 109, 112,
                  108, 101, 116, 101, 100, 67, 104, 97, 114, 97, 99, 116, 101,
                  114, 115, 0, 0, 0, 0, 0, 4, 99, 104, 97, 114, 97, 99, 116,
                  101, 114, 115, 76, 105, 115, 116, 0, 5, 0, 0, 0, 0, 4, 99, 97,
                  116, 101, 103, 111, 114, 121, 87, 111, 114, 100, 115, 76, 105,
                  115, 116, 0, 5, 0, 0, 0, 0, 18, 101, 118, 101, 110, 116, 73,
                  68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 101, 118, 101, 110, 116, 67,
                  97, 116, 101, 103, 111, 114, 121, 0, 5, 0, 0, 0, 67, 97, 116,
                  49, 0, 0, 18, 108, 97, 115, 116, 69, 118, 101, 110, 116, 73,
                  68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 108, 97, 115, 116, 84, 105,
                  109, 101, 65, 110, 69, 118, 101, 110, 116, 72, 97, 115, 66,
                  101, 101, 110, 84, 114, 105, 101, 100, 0, 0, 0, 0, 0, 0, 0, 0,
                  0, 18, 108, 97, 115, 116, 84, 105, 109, 101, 65, 110, 69, 118,
                  101, 110, 116, 87, 97, 115, 83, 116, 97, 114, 116, 101, 100,
                  0, 213, 111, 239, 102, 0, 0, 0, 0, 18, 108, 97, 115, 116, 84,
                  105, 109, 101, 69, 118, 101, 110, 116, 80, 111, 112, 117, 112,
                  87, 97, 115, 70, 111, 114, 99, 101, 83, 104, 111, 119, 110, 0,
                  0, 0, 0, 0, 0, 0, 0, 0, 2, 108, 97, 115, 116, 69, 118, 101,
                  110, 116, 73, 116, 101, 109, 73, 68, 0, 1, 0, 0, 0, 0, 8, 115,
                  104, 111, 117, 108, 100, 82, 101, 115, 116, 111, 114, 101, 73,
                  116, 101, 109, 65, 102, 116, 101, 114, 69, 118, 101, 110, 116,
                  0, 0, 2, 119, 111, 114, 100, 72, 117, 110, 116, 68, 97, 105,
                  108, 121, 87, 111, 114, 100, 0, 5, 0, 0, 0, 68, 65, 83, 72, 0,
                  9, 119, 111, 114, 100, 72, 117, 110, 116, 69, 120, 112, 105,
                  114, 101, 84, 105, 109, 101, 0, 69, 44, 158, 96, 147, 1, 0, 0,
                  2, 115, 121, 98, 111, 65, 110, 97, 108, 121, 116, 105, 99,
                  115, 83, 97, 109, 112, 108, 101, 83, 116, 97, 116, 101, 0, 10,
                  0, 0, 0, 85, 110, 115, 97, 109, 112, 108, 101, 100, 0, 2, 115,
                  121, 98, 111, 65, 110, 97, 108, 121, 116, 105, 99, 115, 85,
                  115, 101, 114, 73, 100, 0, 1, 0, 0, 0, 0, 2, 115, 121, 98,
                  111, 65, 103, 103, 114, 101, 103, 97, 116, 101, 100, 68, 97,
                  116, 97, 83, 116, 114, 105, 110, 103, 0, 1, 0, 0, 0, 0, 3,
                  115, 121, 98, 111, 65, 110, 97, 108, 121, 116, 105, 99, 115,
                  85, 110, 104, 97, 110, 100, 108, 101, 100, 65, 98, 84, 101,
                  115, 116, 68, 97, 116, 97, 0, 5, 0, 0, 0, 0, 16, 115, 121, 98,
                  111, 65, 110, 97, 108, 121, 116, 105, 99, 115, 67, 117, 114,
                  114, 101, 110, 116, 83, 101, 115, 115, 105, 111, 110, 0, 255,
                  255, 255, 255, 8, 107, 105, 108, 111, 111, 65, 110, 97, 108,
                  121, 116, 105, 99, 115, 72, 97, 115, 76, 111, 103, 103, 101,
                  100, 83, 121, 98, 111, 85, 115, 101, 114, 73, 100, 0, 0, 16,
                  112, 101, 114, 115, 105, 115, 116, 101, 100, 83, 101, 115,
                  115, 105, 111, 110, 69, 118, 101, 110, 116, 78, 117, 109, 98,
                  101, 114, 0, 255, 255, 255, 255, 3, 109, 97, 110, 97, 103,
                  101, 114, 68, 97, 116, 97, 0, 165, 0, 0, 0, 9, 108, 97, 115,
                  116, 83, 117, 98, 109, 105, 116, 116, 101, 100, 83, 99, 111,
                  114, 101, 83, 116, 97, 114, 116, 84, 105, 109, 101, 0, 128,
                  243, 119, 238, 124, 199, 255, 255, 9, 108, 97, 115, 116, 83,
                  117, 98, 109, 105, 116, 116, 101, 100, 83, 99, 111, 114, 101,
                  69, 110, 100, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124,
                  199, 255, 255, 10, 110, 101, 120, 116, 84, 111, 117, 114, 110,
                  97, 109, 101, 110, 116, 84, 105, 109, 101, 0, 16, 117, 110,
                  115, 117, 98, 109, 105, 116, 116, 101, 100, 83, 99, 111, 114,
                  101, 78, 111, 84, 111, 117, 114, 110, 97, 109, 101, 110, 116,
                  0, 0, 0, 0, 0, 10, 117, 110, 115, 117, 98, 109, 105, 116, 116,
                  101, 100, 83, 99, 111, 114, 101, 78, 111, 84, 111, 117, 114,
                  110, 97, 109, 101, 110, 116, 84, 105, 109, 101, 0, 0, 2, 108,
                  97, 115, 116, 84, 111, 112, 82, 117, 110, 82, 101, 115, 117,
                  108, 116, 65, 119, 97, 114, 100, 101, 100, 73, 68, 0, 1, 0, 0,
                  0, 0, 2, 112, 101, 110, 100, 105, 110, 103, 84, 111, 112, 82,
                  117, 110, 82, 101, 115, 117, 108, 116, 73, 68, 0, 1, 0, 0, 0,
                  0, 16, 112, 101, 110, 100, 105, 110, 103, 84, 111, 112, 82,
                  117, 110, 82, 101, 115, 117, 108, 116, 115, 83, 99, 111, 114,
                  101, 0, 255, 255, 255, 255, 16, 112, 101, 110, 100, 105, 110,
                  103, 84, 111, 112, 82, 117, 110, 82, 101, 115, 117, 108, 116,
                  115, 82, 97, 110, 107, 0, 255, 255, 255, 255, 16, 112, 101,
                  110, 100, 105, 110, 103, 84, 111, 112, 82, 117, 110, 82, 101,
                  115, 117, 108, 116, 115, 87, 101, 101, 107, 0, 255, 255, 255,
                  255, 16, 112, 101, 110, 100, 105, 110, 103, 84, 111, 112, 82,
                  117, 110, 66, 101, 97, 116, 101, 110, 70, 114, 105, 101, 110,
                  100, 115, 65, 119, 97, 114, 100, 0, 0, 0, 0, 0, 8, 98, 101,
                  104, 97, 118, 105, 111, 114, 97, 108, 65, 100, 115, 65, 108,
                  108, 111, 119, 101, 100, 0, 1, 3, 105, 110, 116, 101, 114,
                  115, 116, 105, 116, 105, 97, 108, 83, 116, 97, 116, 115, 0,
                  159, 0, 0, 0, 3, 108, 105, 115, 116, 86, 101, 114, 115, 105,
                  111, 110, 70, 111, 114, 73, 68, 0, 41, 0, 0, 0, 2, 104, 111,
                  109, 101, 95, 105, 110, 116, 101, 114, 115, 116, 105, 116,
                  105, 97, 108, 115, 95, 108, 105, 115, 116, 0, 7, 0, 0, 0, 110,
                  111, 116, 115, 101, 116, 0, 0, 16, 115, 101, 101, 110, 84,
                  104, 105, 115, 72, 111, 117, 114, 0, 1, 0, 0, 0, 16, 99, 117,
                  114, 114, 101, 110, 116, 72, 111, 117, 114, 0, 59, 181, 14, 1,
                  16, 115, 101, 101, 110, 84, 104, 105, 115, 68, 97, 121, 0, 1,
                  0, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 68, 97, 121, 0,
                  141, 71, 11, 0, 8, 104, 97, 115, 83, 101, 101, 110, 70, 105,
                  114, 115, 116, 73, 110, 116, 101, 114, 115, 116, 105, 116,
                  105, 97, 108, 0, 0, 0, 3, 99, 111, 110, 115, 117, 109, 97, 98,
                  108, 101, 83, 101, 101, 110, 86, 105, 100, 101, 111, 115, 67,
                  111, 117, 110, 116, 0, 5, 0, 0, 0, 0, 3, 99, 111, 110, 115,
                  117, 109, 97, 98, 108, 101, 86, 105, 100, 101, 111, 83, 101,
                  101, 110, 65, 116, 0, 5, 0, 0, 0, 0, 3, 99, 111, 111, 108,
                  100, 111, 119, 110, 115, 0, 27, 0, 0, 0, 3, 97, 99, 116, 105,
                  118, 101, 67, 111, 111, 108, 100, 111, 119, 110, 115, 0, 5, 0,
                  0, 0, 0, 0, 16, 105, 110, 65, 112, 112, 76, 101, 103, 97, 99,
                  121, 80, 117, 114, 99, 104, 97, 115, 101, 67, 111, 117, 110,
                  116, 0, 0, 0, 0, 0, 16, 105, 110, 65, 112, 112, 67, 111, 110,
                  115, 117, 109, 97, 98, 108, 101, 80, 117, 114, 99, 104, 97,
                  115, 101, 67, 111, 117, 110, 116, 0, 0, 0, 0, 0, 16, 105, 110,
                  65, 112, 112, 82, 101, 115, 116, 111, 114, 101, 100, 80, 117,
                  114, 99, 104, 97, 115, 101, 67, 111, 117, 110, 116, 0, 0, 0,
                  0, 0, 16, 105, 110, 65, 112, 112, 78, 111, 110, 67, 111, 110,
                  115, 117, 109, 97, 98, 108, 101, 80, 117, 114, 99, 104, 97,
                  115, 101, 67, 111, 117, 110, 116, 0, 0, 0, 0, 0, 8, 105, 115,
                  70, 114, 101, 115, 104, 73, 110, 115, 116, 97, 108, 108, 0, 1,
                  8, 104, 97, 115, 85, 115, 101, 114, 82, 117, 110, 65, 112,
                  112, 66, 101, 102, 111, 114, 101, 0, 1, 9, 108, 97, 115, 116,
                  68, 97, 105, 108, 121, 79, 110, 108, 105, 110, 101, 76, 111,
                  103, 0, 128, 243, 119, 238, 124, 199, 255, 255, 9, 108, 97,
                  115, 116, 80, 108, 97, 121, 68, 97, 116, 101, 0, 128, 243,
                  119, 238, 124, 199, 255, 255, 9, 108, 97, 115, 116, 81, 117,
                  105, 116, 68, 97, 116, 101, 0, 128, 243, 119, 238, 124, 199,
                  255, 255, 2, 108, 97, 115, 116, 80, 117, 114, 99, 104, 97,
                  115, 101, 100, 66, 117, 110, 100, 108, 101, 0, 5, 0, 0, 0, 78,
                  111, 110, 101, 0, 8, 104, 97, 115, 80, 97, 105, 100, 79, 117,
                  116, 70, 97, 99, 101, 98, 111, 111, 107, 82, 101, 119, 97,
                  114, 100, 0, 0, 8, 104, 97, 115, 83, 101, 101, 110, 70, 114,
                  111, 110, 116, 83, 99, 114, 101, 101, 110, 70, 105, 114, 115,
                  116, 84, 105, 109, 101, 0, 1, 8, 104, 97, 115, 77, 97, 100,
                  101, 79, 110, 101, 86, 97, 108, 105, 100, 80, 117, 114, 99,
                  104, 97, 115, 101, 0, 0, 2, 102, 105, 114, 115, 116, 73, 110,
                  115, 116, 97, 108, 108, 101, 100, 86, 101, 114, 115, 105, 111,
                  110, 0, 1, 0, 0, 0, 0, 9, 102, 105, 114, 115, 116, 73, 110,
                  115, 116, 97, 108, 108, 68, 97, 116, 101, 0, 54, 218, 76, 23,
                  146, 1, 0, 0, 8, 104, 97, 115, 68, 111, 117, 98, 108, 101, 67,
                  111, 105, 110, 115, 85, 112, 103, 114, 97, 100, 101, 0, 0, 8,
                  104, 97, 115, 65, 100, 82, 101, 109, 111, 118, 97, 108, 85,
                  112, 103, 114, 97, 100, 101, 0, 0, 3, 104, 97, 115, 67, 104,
                  97, 114, 97, 99, 116, 101, 114, 66, 101, 101, 110, 83, 101,
                  101, 110, 0, 5, 0, 0, 0, 0, 3, 104, 97, 115, 66, 111, 97, 114,
                  100, 66, 101, 101, 110, 83, 101, 101, 110, 0, 5, 0, 0, 0, 0,
                  3, 99, 104, 97, 114, 97, 99, 116, 101, 114, 79, 117, 116, 102,
                  105, 116, 115, 83, 101, 101, 110, 0, 83, 1, 0, 0, 4, 110, 105,
                  110, 106, 97, 0, 12, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 0, 4,
                  112, 114, 105, 110, 99, 101, 107, 0, 19, 0, 0, 0, 16, 48, 0,
                  0, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 102, 114, 97, 110,
                  107, 0, 12, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 0, 4, 107, 105,
                  110, 103, 0, 12, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 0, 4, 102,
                  114, 105, 122, 122, 121, 0, 12, 0, 0, 0, 16, 48, 0, 0, 0, 0,
                  0, 0, 4, 115, 108, 105, 99, 107, 0, 19, 0, 0, 0, 16, 48, 0, 1,
                  0, 0, 0, 16, 49, 0, 0, 0, 0, 0, 0, 4, 122, 111, 101, 0, 19, 0,
                  0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 0, 4, 98,
                  114, 111, 100, 121, 0, 19, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16,
                  49, 0, 1, 0, 0, 0, 0, 4, 116, 97, 103, 0, 19, 0, 0, 0, 16, 48,
                  0, 0, 0, 0, 0, 16, 49, 0, 1, 0, 0, 0, 0, 4, 116, 97, 115, 104,
                  97, 0, 12, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 0, 4, 108, 117, 99,
                  121, 0, 19, 0, 0, 0, 16, 48, 0, 0, 0, 0, 0, 16, 49, 0, 1, 0,
                  0, 0, 0, 4, 116, 114, 105, 99, 107, 121, 0, 26, 0, 0, 0, 16,
                  48, 0, 0, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 16, 50, 0, 1, 0, 0,
                  0, 0, 4, 102, 114, 101, 115, 104, 0, 26, 0, 0, 0, 16, 48, 0,
                  0, 0, 0, 0, 16, 49, 0, 2, 0, 0, 0, 16, 50, 0, 1, 0, 0, 0, 0,
                  4, 115, 112, 105, 107, 101, 0, 12, 0, 0, 0, 16, 48, 0, 0, 0,
                  0, 0, 0, 0, 4, 99, 111, 108, 108, 101, 99, 116, 67, 111, 105,
                  110, 115, 68, 117, 109, 109, 121, 68, 97, 116, 97, 0, 35, 4,
                  0, 0, 3, 48, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0,
                  0, 0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78,
                  65, 77, 69, 95, 49, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 0, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 0, 0, 0, 0, 0,
                  3, 49, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0,
                  68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65,
                  77, 69, 95, 50, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 0, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 0, 0, 0, 0, 0,
                  3, 50, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0,
                  68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65,
                  77, 69, 95, 51, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 0, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 0, 0, 0, 0, 0,
                  3, 51, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0,
                  68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65,
                  77, 69, 95, 49, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 24, 0, 0, 0, 0,
                  3, 52, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0,
                  68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65,
                  77, 69, 95, 53, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 22, 0, 0, 0, 0,
                  3, 53, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0,
                  68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65,
                  77, 69, 95, 54, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 19, 0, 0, 0, 0,
                  3, 54, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0,
                  68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65,
                  77, 69, 95, 55, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 15, 0, 0, 0, 0,
                  3, 55, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0,
                  68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65,
                  77, 69, 95, 51, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 14, 0, 0, 0, 0,
                  3, 56, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0,
                  68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65,
                  77, 69, 95, 56, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 10, 0, 0, 0, 0,
                  3, 57, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0, 0,
                  68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65,
                  77, 69, 95, 49, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 7, 0, 0, 0, 0,
                  3, 49, 48, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0,
                  0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65,
                  77, 69, 95, 57, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 0, 0, 0, 0,
                  3, 49, 49, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0,
                  0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65,
                  77, 69, 95, 52, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 2, 0, 0, 0, 0,
                  3, 49, 50, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0,
                  0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65,
                  77, 69, 95, 50, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 1, 0, 0, 0, 0,
                  3, 49, 51, 0, 72, 0, 0, 0, 2, 110, 97, 109, 101, 0, 20, 0, 0,
                  0, 68, 85, 77, 77, 89, 95, 70, 82, 73, 69, 78, 68, 95, 78, 65,
                  77, 69, 95, 51, 0, 8, 104, 97, 115, 66, 101, 101, 110, 67,
                  111, 108, 108, 101, 99, 116, 101, 100, 0, 1, 16, 102, 97, 107,
                  101, 80, 114, 111, 103, 114, 101, 115, 115, 0, 0, 0, 0, 0, 0,
                  0, 3, 101, 97, 114, 110, 67, 117, 114, 114, 101, 110, 99, 121,
                  68, 97, 116, 97, 0, 5, 0, 0, 0, 0, 3, 105, 110, 65, 112, 112,
                  80, 117, 114, 99, 104, 97, 115, 101, 72, 105, 115, 116, 111,
                  114, 121, 0, 5, 0, 0, 0, 0, 16, 110, 117, 109, 98, 101, 114,
                  79, 102, 66, 114, 101, 97, 100, 67, 114, 117, 109, 98, 115,
                  83, 104, 111, 119, 110, 79, 110, 70, 114, 111, 110, 116, 80,
                  97, 103, 101, 0, 195, 5, 0, 0, 16, 97, 103, 101, 82, 101, 115,
                  116, 114, 105, 99, 116, 105, 111, 110, 73, 110, 112, 117, 116,
                  86, 101, 114, 115, 105, 111, 110, 0, 0, 0, 0, 0, 16, 97, 103,
                  101, 82, 101, 115, 116, 114, 105, 99, 116, 105, 111, 110, 73,
                  110, 112, 117, 116, 77, 111, 110, 116, 104, 0, 12, 0, 0, 0,
                  16, 97, 103, 101, 82, 101, 115, 116, 114, 105, 99, 116, 105,
                  111, 110, 73, 110, 112, 117, 116, 89, 101, 97, 114, 0, 207, 7,
                  0, 0, 3, 98, 114, 101, 97, 100, 99, 114, 117, 109, 98, 115, 0,
                  90, 0, 0, 0, 2, 108, 97, 115, 116, 68, 97, 105, 108, 121, 87,
                  111, 114, 100, 0, 5, 0, 0, 0, 68, 65, 83, 72, 0, 18, 119, 101,
                  101, 107, 108, 121, 72, 117, 110, 116, 80, 101, 114, 105, 111,
                  100, 69, 120, 112, 105, 114, 101, 68, 97, 116, 101, 84, 105,
                  99, 107, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 108, 97, 115,
                  116, 77, 105, 115, 115, 105, 111, 110, 83, 101, 116, 0, 2, 0,
                  0, 0, 0, 2, 108, 97, 115, 116, 69, 118, 101, 110, 116, 84,
                  121, 112, 101, 83, 104, 111, 119, 110, 0, 5, 0, 0, 0, 78, 111,
                  110, 101, 0, 9, 108, 97, 115, 116, 69, 118, 101, 110, 116, 83,
                  104, 111, 119, 110, 84, 105, 109, 101, 115, 116, 97, 109, 112,
                  0, 128, 243, 119, 238, 124, 199, 255, 255, 2, 108, 97, 115,
                  116, 83, 101, 101, 110, 66, 117, 110, 100, 108, 101, 86, 101,
                  114, 115, 105, 111, 110, 0, 4, 0, 0, 0, 49, 46, 48, 0, 9, 108,
                  97, 115, 116, 84, 105, 109, 101, 65, 86, 105, 100, 101, 111,
                  70, 111, 114, 75, 101, 121, 115, 87, 97, 115, 83, 101, 101,
                  110, 0, 128, 243, 119, 238, 124, 199, 255, 255, 9, 119, 101,
                  108, 99, 111, 109, 101, 80, 97, 99, 107, 83, 116, 97, 114,
                  116, 84, 105, 109, 101, 0, 128, 243, 119, 238, 124, 199, 255,
                  255, 16, 99, 117, 114, 114, 101, 110, 116, 73, 110, 116, 114,
                  111, 86, 105, 100, 101, 111, 65, 100, 80, 114, 105, 122, 101,
                  73, 110, 100, 101, 120, 0, 0, 0, 0, 0, 16, 99, 117, 114, 114,
                  101, 110, 116, 82, 97, 110, 100, 111, 109, 86, 105, 100, 101,
                  111, 65, 100, 80, 114, 105, 122, 101, 73, 110, 100, 101, 120,
                  0, 0, 0, 0, 0, 16, 99, 117, 114, 114, 101, 110, 116, 86, 105,
                  100, 101, 111, 65, 100, 80, 114, 105, 122, 101, 83, 101, 101,
                  100, 0, 112, 171, 154, 71, 16, 118, 105, 100, 101, 111, 115,
                  87, 97, 116, 99, 104, 101, 100, 83, 105, 110, 99, 101, 68, 97,
                  105, 108, 121, 75, 101, 121, 115, 0, 0, 0, 0, 0, 3, 102, 114,
                  105, 101, 110, 100, 83, 116, 97, 116, 117, 115, 0, 5, 0, 0, 0,
                  0, 8, 97, 108, 108, 111, 119, 83, 101, 108, 108, 72, 101, 97,
                  100, 115, 116, 97, 114, 116, 68, 117, 114, 105, 110, 103, 82,
                  117, 110, 0, 1, 8, 97, 108, 108, 111, 119, 83, 101, 108, 108,
                  83, 99, 111, 114, 101, 98, 111, 111, 115, 116, 101, 114, 68,
                  117, 114, 105, 110, 103, 82, 117, 110, 0, 1, 8, 104, 97, 115,
                  67, 111, 108, 108, 101, 99, 116, 101, 100, 70, 114, 111, 109,
                  70, 114, 105, 101, 110, 100, 115, 0, 0, 8, 104, 97, 115, 83,
                  104, 111, 119, 110, 67, 111, 108, 108, 101, 99, 116, 80, 111,
                  112, 117, 112, 0, 0, 8, 104, 97, 115, 83, 104, 111, 119, 110,
                  70, 97, 99, 101, 98, 111, 111, 107, 80, 111, 112, 117, 112, 0,
                  0, 8, 104, 97, 115, 83, 104, 111, 119, 110, 72, 111, 118, 101,
                  114, 98, 111, 97, 114, 100, 80, 111, 112, 117, 112, 0, 0, 8,
                  104, 97, 115, 83, 104, 111, 119, 110, 77, 105, 115, 115, 105,
                  111, 110, 73, 110, 116, 114, 111, 80, 111, 112, 117, 112, 0,
                  0, 8, 104, 97, 115, 83, 104, 111, 119, 110, 69, 110, 100, 71,
                  97, 109, 101, 77, 105, 115, 115, 105, 111, 110, 80, 111, 112,
                  117, 112, 0, 0, 8, 105, 115, 84, 117, 116, 111, 114, 105, 97,
                  108, 67, 111, 109, 112, 108, 101, 116, 101, 100, 0, 1, 8, 115,
                  104, 111, 117, 108, 100, 83, 104, 111, 119, 67, 111, 108, 108,
                  101, 99, 116, 80, 111, 112, 117, 112, 0, 0, 8, 115, 104, 111,
                  117, 108, 100, 83, 104, 111, 119, 70, 97, 99, 101, 98, 111,
                  111, 107, 80, 111, 112, 117, 112, 0, 0, 8, 115, 104, 111, 117,
                  108, 100, 83, 104, 111, 119, 72, 111, 118, 101, 114, 98, 111,
                  97, 114, 100, 80, 111, 112, 117, 112, 0, 1, 8, 115, 104, 111,
                  117, 108, 100, 83, 104, 111, 119, 77, 105, 115, 115, 105, 111,
                  110, 73, 110, 116, 114, 111, 100, 117, 99, 116, 105, 111, 110,
                  80, 111, 112, 117, 112, 0, 0, 8, 115, 104, 111, 117, 108, 100,
                  83, 104, 111, 119, 69, 110, 100, 71, 97, 109, 101, 77, 105,
                  115, 115, 105, 111, 110, 80, 111, 112, 117, 112, 0, 0, 16,
                  108, 97, 115, 116, 83, 104, 111, 119, 110, 84, 111, 112, 82,
                  117, 110, 73, 110, 116, 114, 111, 80, 111, 112, 117, 112, 86,
                  101, 114, 115, 105, 111, 110, 78, 117, 109, 98, 101, 114, 0,
                  0, 0, 0, 0, 8, 110, 101, 118, 101, 114, 65, 115, 107, 70, 111,
                  114, 82, 97, 116, 105, 110, 103, 0, 0, 2, 108, 97, 110, 103,
                  117, 97, 103, 101, 0, 1, 0, 0, 0, 0, 8, 115, 111, 117, 110,
                  100, 69, 102, 102, 101, 99, 116, 115, 69, 110, 97, 98, 108,
                  101, 100, 0, 1, 8, 109, 117, 115, 105, 99, 69, 110, 97, 98,
                  108, 101, 100, 0, 0, 8, 116, 111, 112, 82, 117, 110, 67, 104,
                  97, 108, 108, 101, 110, 103, 101, 114, 115, 69, 110, 97, 98,
                  108, 101, 100, 0, 1, 8, 114, 101, 109, 111, 116, 101, 78, 111,
                  116, 105, 102, 105, 99, 97, 116, 105, 111, 110, 115, 69, 110,
                  97, 98, 108, 101, 100, 0, 1, 16, 108, 111, 99, 97, 108, 78,
                  111, 116, 105, 102, 105, 99, 97, 116, 105, 111, 110, 115, 69,
                  110, 97, 98, 108, 101, 100, 0, 255, 255, 255, 255, 8, 104, 97,
                  115, 76, 111, 103, 103, 101, 100, 83, 116, 97, 116, 105, 99,
                  68, 97, 116, 97, 0, 0, 9, 108, 97, 115, 116, 76, 111, 103,
                  103, 101, 100, 68, 97, 105, 108, 121, 68, 97, 116, 97, 0, 128,
                  243, 119, 238, 124, 199, 255, 255, 1, 97, 110, 97, 108, 121,
                  116, 105, 99, 115, 83, 97, 109, 112, 108, 105, 110, 103, 75,
                  101, 121, 0, 0, 0, 0, 32, 175, 182, 224, 63, 9, 97, 98, 84,
                  101, 115, 116, 76, 97, 115, 116, 68, 97, 105, 108, 121, 69,
                  118, 101, 110, 116, 115, 82, 101, 112, 111, 114, 116, 68, 97,
                  116, 101, 0, 128, 243, 119, 238, 124, 199, 255, 255, 2, 97,
                  98, 84, 101, 115, 116, 80, 108, 97, 121, 101, 114, 83, 101,
                  101, 100, 0, 11, 0, 0, 0, 50, 50, 51, 53, 54, 55, 53, 56, 57,
                  51, 0, 2, 97, 98, 84, 101, 115, 116, 84, 97, 103, 68, 97, 116,
                  97, 0, 1, 0, 0, 0, 0, 2, 102, 108, 117, 114, 114, 121, 85,
                  115, 101, 114, 73, 100, 0, 1, 0, 0, 0, 0, 8, 104, 97, 115, 76,
                  111, 103, 103, 101, 100, 71, 97, 109, 101, 67, 101, 110, 116,
                  101, 114, 76, 111, 103, 105, 110, 0, 0, 8, 104, 97, 115, 76,
                  111, 103, 103, 101, 100, 70, 97, 99, 101, 98, 111, 111, 107,
                  76, 111, 103, 105, 110, 0, 0, 3, 104, 97, 115, 76, 111, 103,
                  103, 101, 100, 70, 108, 117, 114, 114, 121, 68, 97, 105, 108,
                  121, 69, 118, 101, 110, 116, 83, 111, 99, 105, 97, 108, 0, 5,
                  0, 0, 0, 0, 0,
                ]),
              };
              const putReq = store2.put(data, `/idbfs/${hash}/Save/cloud`);
              putReq.onsuccess = function () {
                done++;
                if (done === hashes.length) location.reload();
              };
              putReq.onerror = function () {
                console.error("Erreur unlock pour hash:", hash);
              };
            });
          };
        };
        request.onerror = function () {
          console.error("Erreur ouverture IndexedDB.");
        };
      }
      function doCleanData() {
        if (!confirm("Tout effacer ?")) return;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0])
            chrome.scripting.executeScript(
              {
                target: { tabId: tabs[0].id },
                func: () => {
                  indexedDB.deleteDatabase("/idbfs");
                  localStorage.clear();
                  location.reload();
                },
              },
              () => showStatus("Données effacées", true),
            );
        });
      }

      function setupSubwayCityEventListeners() {
        document.querySelectorAll(".city-link").forEach((link) => {
          link.addEventListener("click", () => {
            const url = link.dataset.url;
            if (url.includes("speedrun")) chrome.tabs.create({ url });
            else if (url.includes("image")) chrome.tabs.create({ url });
            else chrome.tabs.create({ url });
          });
        });
      }

      function setupColorEventListeners() {
        document.querySelectorAll(".color-picker").forEach((p) => {
          p.addEventListener("input", () => {
            const colors = {
              stopped: document.getElementById("color-stopped").value,
              running: document.getElementById("color-running").value,
              paused: document.getElementById("color-paused").value,
            };
            chrome.runtime.sendMessage({ action: "saveTimerColors", colors });
            sendToContentScript({ action: "updateTimerColors", colors });
          });
        });
        chrome.runtime.sendMessage({ action: "getTimerColors" }, (r) => {
          if (r?.colors) {
            document.getElementById("color-stopped").value = r.colors.stopped;
            document.getElementById("color-running").value = r.colors.running;
            document.getElementById("color-paused").value = r.colors.paused;
          }
        });
      }

      function setupMusicEventListeners() {
        const input = document.getElementById("soundcloudUrl");
        const loadBtn = document.getElementById("loadSoundcloudPlaylist");
        if (!input || !loadBtn) return;

        loadBtn.addEventListener("click", () => {
          const raw = (input.value || "").trim();
          const url = raw || DEFAULT_PLAYLIST_URL;

          if (url && url.includes("soundcloud")) {
            chrome.storage.local.set({ musicPlaylistUrl: url });
            chrome.windows.create({
              url: chrome.runtime.getURL(
                "player.html?url=" + encodeURIComponent(url),
              ),
              type: "popup",
              width: 500,
              height: 300,
            });
          } else showStatus("URL Invalide", false);
        });

        chrome.storage.local.get("musicPlaylistUrl", (r) => {
          const saved =
            typeof r?.musicPlaylistUrl === "string"
              ? r.musicPlaylistUrl.trim()
              : "";
          const initialUrl = saved || DEFAULT_PLAYLIST_URL;

          input.value = initialUrl;
          if (!saved)
            chrome.storage.local.set({ musicPlaylistUrl: initialUrl });
        });
      }

      function setupIndividualBackgrounds() {
        const previewIds = {
          timer: "preview-timer",
          fps: "preview-fps",
          keys: "preview-keys",
          keysActive: "preview-keys",
        };

        const setPreview = (type, data) => {
          const previewId = previewIds[type];
          if (!previewId) return;
          const el = document.getElementById(previewId);
          if (!el) return;
          if (data) {
            el.style.backgroundImage = `url(${data})`;
            el.style.backgroundSize = "cover";
          } else {
            el.style.backgroundImage = "none";
            el.style.backgroundColor = "transparent";
          }
        };

        const bindUpload = (
          btnId,
          inputId,
          storageKey,
          msgAction,
          targetType,
        ) => {
          const btn = document.getElementById(btnId);
          const input = document.getElementById(inputId);
          if (!btn || !input) return;

          btn.addEventListener("click", () => input.click());
          input.addEventListener("change", (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              const data = ev.target?.result;
              if (!data) return;
              chrome.storage.local.set({ [storageKey]: data });
              sendToContentScript({
                action: msgAction,
                background: data,
                targetType,
              });
              setPreview(targetType, data);
              showStatus("Image appliquée !", true);
            };
            reader.readAsDataURL(f);
          });
        };

        bindUpload(
          "btn-upload-timer",
          "file-timer",
          "bgTimer",
          "updateSpecificBackground",
          "timer",
        );
        bindUpload(
          "btn-upload-fps",
          "file-fps",
          "bgFps",
          "updateSpecificBackground",
          "fps",
        );
        bindUpload(
          "btn-upload-keys",
          "file-keys",
          "bgKeys",
          "updateSpecificBackground",
          "keys",
        );
        bindUpload(
          "btn-upload-keys-active",
          "file-keys-active",
          "bgKeysActive",
          "updateSpecificBackground",
          "keysActive",
        );

        ["timer", "fps", "keys"].forEach((type) => {
          const resetBtn = document.getElementById(`btn-reset-${type}`);
          if (!resetBtn) return;

          resetBtn.addEventListener("click", () => {
            const keys =
              type === "keys"
                ? ["bgKeys", "bgKeysActive"]
                : [`bg${type.charAt(0).toUpperCase()}${type.slice(1)}`];
            chrome.storage.local.remove(keys);
            sendToContentScript({
              action: "resetSpecificBackground",
              targetType: type,
            });
            setPreview(type, null);
            showStatus("Fond réinitialisé", true);
          });
        });

        chrome.storage.local.get(
          ["bgTimer", "bgFps", "bgKeys", "bgKeysActive"],
          (data) => {
            setPreview("timer", data.bgTimer);
            setPreview("fps", data.bgFps);
            setPreview("keys", data.bgKeys || data.bgKeysActive);
          },
        );
      }

      function setupAdvancedCustomization() {
        // Helper pour mettre à jour les labels
        const setLabel = (id, value, suffix = "") => {
          const el = document.getElementById(id);
          if (el) el.textContent = value + suffix;
        };

        // Timer inputs
        const timerInputs = {
          bgColor: document.getElementById("timer-bg-color"),
          textColor: document.getElementById("timer-text-color"),
          radius: document.getElementById("timer-radius"),
          opacity: document.getElementById("timer-opacity"),
          fontScale: document.getElementById("timer-font-scale"),
          borderWidth: document.getElementById("timer-border-width"),
          borderColor: document.getElementById("timer-border-color"),
          fontFamily: document.getElementById("timer-font-family"),
          shadow: document.getElementById("timer-shadow"),
        };

        // FPS inputs
        const fpsInputs = {
          bgColor: document.getElementById("fps-bg-color"),
          textColor: document.getElementById("fps-text-color"),
          radius: document.getElementById("fps-radius"),
          opacity: document.getElementById("fps-opacity"),
          fontScale: document.getElementById("fps-font-scale"),
          borderWidth: document.getElementById("fps-border-width"),
          borderColor: document.getElementById("fps-border-color"),
          fontFamily: document.getElementById("fps-font-family"),
          shadow: document.getElementById("fps-shadow"),
        };

        // Keys inputs
        const keysInputs = {
          bgColor: document.getElementById("keys-bg-color"),
          textColor: document.getElementById("keys-text-color"),
          activeBgColor: document.getElementById("keys-active-bg-color"),
          activeTextColor: document.getElementById("keys-active-text-color"),
          activeColor: document.getElementById("keys-active-color"),
          borderColor: document.getElementById("keys-border-color"),
          radius: document.getElementById("keys-radius"),
          opacity: document.getElementById("keys-opacity"),
          sizeScale: document.getElementById("keys-size-scale"),
          borderWidth: document.getElementById("keys-border-width"),
          shadow: document.getElementById("keys-shadow"),
          gap: document.getElementById("keys-gap"),
        };

        const updateLabels = () => {
          // Timer
          if (timerInputs.radius)
            setLabel("val-timer-radius", timerInputs.radius.value, "px");
          if (timerInputs.opacity)
            setLabel("val-timer-opacity", timerInputs.opacity.value, "%");
          if (timerInputs.fontScale)
            setLabel("val-timer-font", timerInputs.fontScale.value, "%");
          if (timerInputs.borderWidth)
            setLabel("val-timer-border", timerInputs.borderWidth.value, "px");
          if (timerInputs.shadow)
            setLabel("val-timer-shadow", timerInputs.shadow.value, "px");
          // FPS
          if (fpsInputs.radius)
            setLabel("val-fps-radius", fpsInputs.radius.value, "px");
          if (fpsInputs.opacity)
            setLabel("val-fps-opacity", fpsInputs.opacity.value, "%");
          if (fpsInputs.fontScale)
            setLabel("val-fps-font", fpsInputs.fontScale.value, "%");
          if (fpsInputs.borderWidth)
            setLabel("val-fps-border", fpsInputs.borderWidth.value, "px");
          if (fpsInputs.shadow)
            setLabel("val-fps-shadow", fpsInputs.shadow.value, "px");
          // Keys
          if (keysInputs.radius)
            setLabel("val-keys-radius", keysInputs.radius.value, "px");
          if (keysInputs.opacity)
            setLabel("val-keys-opacity", keysInputs.opacity.value, "%");
          if (keysInputs.sizeScale)
            setLabel("val-keys-size", keysInputs.sizeScale.value, "%");
          if (keysInputs.borderWidth)
            setLabel("val-keys-border", keysInputs.borderWidth.value, "px");
          if (keysInputs.shadow)
            setLabel("val-keys-shadow", keysInputs.shadow.value, "px");
          if (keysInputs.gap)
            setLabel("val-keys-gap", keysInputs.gap.value, "px");
        };

        const getSettings = () => ({
          timer: {
            bgColor: timerInputs.bgColor?.value || "#000000",
            textColor: timerInputs.textColor?.value || "#ffffff",
            borderRadius: (timerInputs.radius?.value || 0) + "px",
            opacity: (timerInputs.opacity?.value || 100) / 100,
            fontScale: (timerInputs.fontScale?.value || 100) / 100,
            borderWidth: (timerInputs.borderWidth?.value || 0) + "px",
            borderColor: timerInputs.borderColor?.value || "#6366f1",
            fontFamily:
              timerInputs.fontFamily?.value || "'Calibri', sans-serif",
            shadow: (timerInputs.shadow?.value || 0) + "px",
          },
          fps: {
            bgColor: fpsInputs.bgColor?.value || "#000000",
            textColor: fpsInputs.textColor?.value || "#ffffff",
            borderRadius: (fpsInputs.radius?.value || 4) + "px",
            opacity: (fpsInputs.opacity?.value || 100) / 100,
            fontScale: (fpsInputs.fontScale?.value || 100) / 100,
            borderWidth: (fpsInputs.borderWidth?.value || 0) + "px",
            borderColor: fpsInputs.borderColor?.value || "#10b981",
            fontFamily: fpsInputs.fontFamily?.value || "'Segoe UI', sans-serif",
            shadow: (fpsInputs.shadow?.value || 0) + "px",
          },
          keys: {
            bgColor: keysInputs.bgColor?.value || "#000000",
            textColor: keysInputs.textColor?.value || "#ffffff",
            activeBgColor: keysInputs.activeBgColor?.value || "#4bc277",
            activeTextColor: keysInputs.activeTextColor?.value || "#ffffff",
            activeColor: keysInputs.activeColor?.value || "#4bc277",
            borderColor: keysInputs.borderColor?.value || "#3d3d3d",
            borderRadius: (keysInputs.radius?.value || 12) + "px",
            opacity: (keysInputs.opacity?.value || 100) / 100,
            sizeScale: (keysInputs.sizeScale?.value || 100) / 100,
            borderWidth: (keysInputs.borderWidth?.value || 2) + "px",
            shadow: (keysInputs.shadow?.value || 6) + "px",
            gap: (keysInputs.gap?.value || 10) + "px",
          },
        });

        const saveAndApply = () => {
          updateLabels();
          const settings = getSettings();
          chrome.storage.local.set({ advancedStyleV2: settings });
          sendToContentScript({ action: "applyAdvancedStyleV2", settings });
        };

        // Attacher les événements
        [
          ...Object.values(timerInputs),
          ...Object.values(fpsInputs),
          ...Object.values(keysInputs),
        ].forEach((input) => {
          if (input) input.addEventListener("input", saveAndApply);
        });

        // Charger les valeurs sauvegardées
        chrome.storage.local.get("advancedStyleV2", (data) => {
          if (data.advancedStyleV2) {
            const s = data.advancedStyleV2;
            // Timer
            if (s.timer) {
              if (timerInputs.bgColor)
                timerInputs.bgColor.value = s.timer.bgColor || "#000000";
              if (timerInputs.textColor)
                timerInputs.textColor.value = s.timer.textColor || "#ffffff";
              if (timerInputs.radius)
                timerInputs.radius.value = parseInt(s.timer.borderRadius) || 0;
              if (timerInputs.opacity)
                timerInputs.opacity.value = Math.round(
                  (s.timer.opacity || 1) * 100,
                );
              if (timerInputs.fontScale)
                timerInputs.fontScale.value = Math.round(
                  (s.timer.fontScale || 1) * 100,
                );
              if (timerInputs.borderWidth)
                timerInputs.borderWidth.value =
                  parseInt(s.timer.borderWidth) || 0;
              if (timerInputs.borderColor)
                timerInputs.borderColor.value =
                  s.timer.borderColor || "#6366f1";
              if (timerInputs.fontFamily)
                timerInputs.fontFamily.value =
                  s.timer.fontFamily || "'Calibri', sans-serif";
              if (timerInputs.shadow)
                timerInputs.shadow.value = parseInt(s.timer.shadow) || 0;
            }
            // FPS
            if (s.fps) {
              if (fpsInputs.bgColor)
                fpsInputs.bgColor.value = s.fps.bgColor || "#000000";
              if (fpsInputs.textColor)
                fpsInputs.textColor.value = s.fps.textColor || "#ffffff";
              if (fpsInputs.radius)
                fpsInputs.radius.value = parseInt(s.fps.borderRadius) || 4;
              if (fpsInputs.opacity)
                fpsInputs.opacity.value = Math.round(
                  (s.fps.opacity || 1) * 100,
                );
              if (fpsInputs.fontScale)
                fpsInputs.fontScale.value = Math.round(
                  (s.fps.fontScale || 1) * 100,
                );
              if (fpsInputs.borderWidth)
                fpsInputs.borderWidth.value = parseInt(s.fps.borderWidth) || 0;
              if (fpsInputs.borderColor)
                fpsInputs.borderColor.value = s.fps.borderColor || "#10b981";
              if (fpsInputs.fontFamily)
                fpsInputs.fontFamily.value =
                  s.fps.fontFamily || "'Segoe UI', sans-serif";
              if (fpsInputs.shadow)
                fpsInputs.shadow.value = parseInt(s.fps.shadow) || 0;
            }
            // Keys
            if (s.keys) {
              if (keysInputs.bgColor)
                keysInputs.bgColor.value = s.keys.bgColor || "#000000";
              if (keysInputs.textColor)
                keysInputs.textColor.value = s.keys.textColor || "#ffffff";
              if (keysInputs.activeColor)
                keysInputs.activeColor.value = s.keys.activeColor || "#4bc277";
              if (keysInputs.borderColor)
                keysInputs.borderColor.value = s.keys.borderColor || "#3d3d3d";
              if (keysInputs.radius)
                keysInputs.radius.value = parseInt(s.keys.borderRadius) || 12;
              if (keysInputs.opacity)
                keysInputs.opacity.value = Math.round(
                  (s.keys.opacity || 1) * 100,
                );
              if (keysInputs.sizeScale)
                keysInputs.sizeScale.value = Math.round(
                  (s.keys.sizeScale || 1) * 100,
                );
              if (keysInputs.borderWidth)
                keysInputs.borderWidth.value =
                  parseInt(s.keys.borderWidth) || 2;
              if (keysInputs.shadow)
                keysInputs.shadow.value = parseInt(s.keys.shadow) || 6;
              if (keysInputs.gap)
                keysInputs.gap.value = parseInt(s.keys.gap) || 10;
            }
          }
          updateLabels();
        });

        updateLabels();
      }

      function setupRecordingButton() {
        const btn = document.getElementById("recordingActionBtn");
        if (!btn) return;

        const setBtnState = (isRecording) => {
          const startLabel =
            getTranslation(currentLanguage, "rec.start") ||
            "Lancer l'enregistrement";
          const stopLabel =
            getTranslation(currentLanguage, "rec.stop") ||
            "Arrêter l'enregistrement";
          if (isRecording) {
            btn.innerHTML = `<i class="fa-solid fa-stop"></i> <span data-i18n-key="rec.stop">${stopLabel}</span>`;
            btn.classList.remove("btn-primary");
            btn.classList.add("btn-danger");
            btn.dataset.action = "stop";
          } else {
            btn.innerHTML = `<i class="fa-solid fa-video"></i> <span data-i18n-key="rec.start">${startLabel}</span>`;
            btn.classList.remove("btn-danger");
            btn.classList.add("btn-primary");
            btn.dataset.action = "start";
          }
        };

        setBtnState(false);
        sendToContentScript({ action: "getRecordingState" }, (res) => {
          setBtnState(res && res.recording);
        });

        btn.addEventListener("click", () => {
          const action = btn.dataset.action;
          if (action === "start") {
            sendToContentScript(
              { action: "startScreenRecording" },
              (res, err) => {
                if (err) {
                  showStatus(err, false);
                } else if (res && res.recording) {
                  setBtnState(true);
                }
              },
            );
          } else {
            sendToContentScript(
              { action: "stopScreenRecording" },
              (res, err) => {
                setBtnState(false);
                showStatus(err ? err : "Vidéo téléchargée !", !err);
              },
            );
          }
        });
      }

      // Reset complète de la customisation
      document
        .getElementById("resetAllCustom")
        ?.addEventListener("click", () => {
          if (!confirm("Réinitialiser TOUTE la customisation ?")) return;
          chrome.storage.local.remove([
            "advancedStyle",
            "bgTimer",
            "bgFps",
            "bgKeys",
            "bgKeysActive",
            "barsColor",
          ]);
          sendToContentScript({ action: "resetAllCustomization" });
          showStatus("Customisation réinitialisée", true);
          setTimeout(() => location.reload(), 500);
        });
    }

    function createNocoinUI() {
      if (document.getElementById("nocoin-backdrop")) return;

      const backdrop = document.createElement("div");
      backdrop.id = "nocoin-backdrop";

      const wrapper = document.createElement("div");
      wrapper.id = "nocoin-modal-wrapper";

      const nocoinModal = document.createElement("div");
      nocoinModal.id = "nocoin-modal";

      const closeBtn = document.createElement("button");
      closeBtn.id = "nocoin-close-btn";
      closeBtn.innerHTML = "✕";

      nocoinModal.innerHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>V10 Ultimate Custom</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    
    <style>
        :root {
            /* Volt Maps Graphic Charter */
            --bg-body: #0e0e1a;
            --bg-sidebar: #0e0e1a;
            --bg-card: #13131f;
            --bg-input: #1e1e30;
            --bg-hover: rgba(124, 92, 252, 0.1);
            
            --accent: #7c5cfc;
            --accent-glow: rgba(124, 92, 252, 0.25);
            --accent-hover: #6a4de0;
            
            --text-main: #e8e8f0;
            --text-muted: #8a8aaa;
            --text-sub: #4a4a6a;
            
            --border: #1e1e30;
            --border-highlight: #7c5cfc;
            
            --success: #10b981;
            --danger: #ef4444;
            
            --radius: 14px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; outline: none; }

        #nocoin-modal {
            width: 700px;
            height: 540px;
            background-color: var(--bg-body);
            background-image: radial-gradient(ellipse at 20% 20%, rgba(124,92,252,0.08) 0%, transparent 60%),
                              radial-gradient(ellipse at 80% 80%, rgba(91,63,212,0.06) 0%, transparent 60%);
            color: var(--text-main);
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
            display: flex;
            overflow: hidden;
            -webkit-font-smoothing: antialiased;
        }

        /* --- SIDEBAR --- */
        .sidebar {
            width: 180px;
            background-color: rgba(19, 19, 31, 0.5); /* semi-transparent #13131f */
            backdrop-filter: blur(10px);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            padding: 20px 0;
            flex-shrink: 0;
        }

        .brand {
            padding: 0 24px 20px 24px;
            font-size: 16px;
            font-weight: 800;
            color: var(--text-main);
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        .brand i { 
            color: var(--accent); 
            filter: drop-shadow(0 0 8px var(--accent-glow));
        }


        .nav-item {
            padding: 12px 24px;
            cursor: pointer;
            color: var(--text-muted);
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 12px;
            border-left: 3px solid transparent;
            position: relative;
        }

        .nav-item:hover { color: var(--text-main); background: rgba(255,255,255,0.03); }
        
        .nav-item.active {
            color: var(--text-main);
            background: linear-gradient(90deg, rgba(124, 92, 252, 0.1) 0%, transparent 100%);
            border-left-color: var(--accent);
        }
        .nav-item.active i { color: var(--accent); }

        .sidebar-footer {
            margin-top: auto;
            padding: 24px;
        }

        /* --- MAIN CONTENT --- */
        .main {
            flex: 1;
            padding: 30px;
            overflow-y: auto;
        }

        .view-section { display: none; animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .view-section.active { display: block; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .section-header { margin-bottom: 20px; }
        .section-title { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: var(--text-main); }
        .section-subtitle { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

        /* GRID */
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }

        /* CARDS */
        .card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 18px;
            margin-bottom: 16px;
            transition: transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease;
            position: relative;
            overflow: hidden;
        }

        .card::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at 50% 0%, rgba(124,92,252,0.08) 0%, transparent 70%);
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
        }

        .card:hover { 
            transform: translateY(-2px);
            border-color: var(--border-highlight);
            box-shadow: 0 8px 32px rgba(124, 92, 252, 0.15);
        }

        .card:hover::before { opacity: 1; }

        .card-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 16px; 
            position: relative;
            z-index: 1;
        }
        .card-title { 
            font-size: 12px; font-weight: 700; color: var(--text-muted); 
            text-transform: uppercase; letter-spacing: 0.8px; 
        }

        /* CONTROLS */
        .control-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .control-row:last-child { border-bottom: none; }
        
        .control-label { font-size: 14px; font-weight: 500; color: var(--text-main); }
        .control-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

        /* SWITCH */
        .switch { position: relative; display: inline-block; width: 42px; height: 22px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
            position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
            background-color: var(--bg-input); transition: .3s; border-radius: 34px;
        }
        .slider:before {
            position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px;
            background-color: var(--text-muted); transition: .3s; border-radius: 50%;
        }
        input:checked + .slider { background-color: var(--accent); box-shadow: 0 0 10px var(--accent-glow); }
        input:checked + .slider:before { transform: translateX(20px); background-color: white; }

        /* BUTTONS */
        .btn {
            padding: 10px 16px; border-radius: var(--radius); border: 1px solid var(--border);
            background: var(--bg-input); color: var(--text-main); font-size: 13px; font-weight: 600;
            cursor: pointer; transition: all 0.2s; text-align: center; width: 100%;
            display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn:hover { background: var(--border-highlight); transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        
        .btn-primary { 
            background: var(--accent); border-color: var(--accent); color: white; 
            box-shadow: 0 4px 12px var(--accent-glow);
        }
        .btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
        
        .btn-danger { 
            background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: var(--danger); 
        }
        .btn-danger:hover { background: rgba(239, 68, 68, 0.2); border-color: var(--danger); }
        
        .btn-mini { padding: 8px 12px; font-size: 12px; }

        /* INPUTS */
        input[type="text"], input[type="number"], select {
            background: var(--bg-input); border: 1px solid transparent;
            color: var(--text-main); padding: 10px 12px; border-radius: var(--radius); 
            width: 100%; font-size: 13px; font-family: inherit; transition: all 0.2s;
        }
        input[type="text"]:focus, select:focus { 
            border-color: var(--accent); background: var(--bg-card); 
            box-shadow: 0 0 0 3px var(--accent-glow);
        }

        input[type="color"] {
            -webkit-appearance: none;
            border: none !important;
            width: 38px !important;
            height: 38px !important;
            border-radius: 50% !important;
            cursor: pointer;
            padding: 0 !important;
            background: conic-gradient(from 90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000) !important;
            margin-top: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        input[type="color"]:hover {
            transform: scale(1.15);
        }
        input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 4px; /* Laisse apparaitre l'anneau arc-en-ciel autour */
        }
        input[type="color"]::-webkit-color-swatch {
            border: 2px solid var(--bg-card); /* Bordure intérieure propre */
            border-radius: 50%;
        }

        /* SCROLLBAR */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

        .scroll-list {
            max-height: 200px; overflow-y: auto; padding-right: 6px;
            display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
        }

        /* KEY BUTTONS */
        .hotkey-container {
            background: var(--bg-body); padding: 4px; border-radius: var(--radius);
            border: 1px solid var(--border); display: flex; gap: 4px;
        }
        .key-btn {
            flex: 1; border: none; background: transparent; color: var(--text-muted);
            padding: 8px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 11px;
            text-transform: uppercase; transition: all 0.2s;
        }
        .key-btn:hover { color: var(--text-main); background: rgba(255,255,255,0.05); }
        .key-btn.active { background: var(--bg-card); color: var(--accent); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }

        /* TOAST */
        .status-toast {
            position: fixed; bottom: 24px; right: 24px;
            background: var(--bg-card); color: var(--text-main);
            padding: 12px 16px; border-radius: var(--radius);
            font-size: 13px; font-weight: 500; 
            border: 1px solid var(--border-highlight);
            border-left: 4px solid var(--accent);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            transform: translateY(100px); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 200000; display: flex; align-items: center; gap: 12px;
        }
        .status-toast.show { transform: translateY(0); }

        /* LANGUAGE MODAL */
        .language-modal { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .language-modal.hidden { display: none; }
        .language-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
        .language-card {
            position: relative;
            width: 440px;
            max-width: 90vw;
            background: var(--bg-card);
            border: 1px solid var(--border-highlight);
            border-radius: 14px;
            padding: 22px 22px 18px 22px;
            box-shadow: 0 16px 40px rgba(0,0,0,0.45);
        }
        .language-title { font-size: 18px; font-weight: 800; margin-bottom: 6px; color: var(--text-main); }
        .language-subtitle { font-size: 13px; color: var(--text-muted); margin-bottom: 14px; }
        .language-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px; }
        .language-option {
            border: 1px solid var(--border);
            background: var(--bg-input);
            color: var(--text-main);
            border-radius: 10px;
            padding: 12px;
            cursor: pointer;
            text-align: left;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .language-option:hover { border-color: var(--border-highlight); background: rgba(255,255,255,0.03); }
        .language-option.active { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
        .language-badge { font-size: 12px; color: var(--text-muted); }
        .language-actions { display: flex; justify-content: flex-end; gap: 10px; }

        /* Customization helpers */
        .style-slider { width: 100%; margin: 8px 0; }
        .style-label { font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between; }
        .upload-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
        .upload-btn { flex: 1; font-size: 11px; padding: 6px; }
        .preview-box { width: 24px; height: 24px; border-radius: 4px; border: 1px solid var(--border); background-size: cover; background-position: center; }
        .berlin-local {
            border: 1px solid #f59e0b !important;
            color: #f59e0b !important;
        }
        .berlin-local:hover {
            background: #f59e0b !important;
            color: #000 !important;
        }
        .separator {
            grid-column: 1 / -1;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(124, 92, 252, 0.5), transparent);
            margin: 0.5rem 0;
            border-radius: 50%;
        }

        /* Mobile Responsiveness for Extension Modal */
        @media (max-width: 750px) {
            #nocoin-modal {
                flex-direction: column;
            }
            .sidebar {
                width: 100%;
                flex-direction: row;
                padding: 10px;
                border-right: none;
                border-bottom: 1px solid var(--border);
                overflow-x: auto;
                align-items: center;
                scrollbar-width: none;
            }
            .sidebar::-webkit-scrollbar {
                display: none;
            }
            .brand {
                padding: 0 15px 0 5px;
                margin-bottom: 0;
            }
            .nav-item {
                padding: 8px 12px;
                border-left: none;
                border-bottom: 3px solid transparent;
                white-space: nowrap;
            }
            .nav-item.active {
                border-left-color: transparent;
                border-bottom-color: var(--accent);
                background: linear-gradient(0deg, rgba(124, 92, 252, 0.1) 0%, transparent 100%);
            }
            .sidebar-footer {
                display: none;
            }
            .main {
                padding: 15px;
            }
            .grid-2, .grid-3, .grid-4 {
                grid-template-columns: 1fr;
            }
            .language-options {
                grid-template-columns: 1fr;
            }
            .language-card {
                width: 95vw;
                padding: 15px;
            }
            .map-tabs {
                flex-wrap: wrap;
            }
        }
    </style>
</head>
<body>

    <div id="languageModal" class="language-modal hidden">
        <div class="language-backdrop"></div>
        <div class="language-card">
            <div class="language-title" data-i18n-key="language.title">Choisissez votre langue</div>
            <div class="language-subtitle" data-i18n-key="language.subtitle">Nous l'utiliserons pour l'interface du popup.</div>
            <div class="language-options">
                <button class="language-option" data-lang="fr">
                    <img src="https://flagcdn.com/w40/fr.png" width="24" style="border-radius: 3px;" alt="FR">
                    <div>
                        <div data-i18n-key="language.fr">Français</div>
                        <div class="language-badge" data-i18n-key="language.frLabel">Par défaut</div>
                    </div>
                </button>
                <button class="language-option" data-lang="en">
                    <img src="https://flagcdn.com/w40/gb.png" width="24" style="border-radius: 3px;" alt="GB">
                    <div>
                        <div data-i18n-key="language.en">English</div>
                        <div class="language-badge" data-i18n-key="language.enLabel">International</div>
                    </div>
                </button>
                <button class="language-option" data-lang="pt-BR">
                    <img src="https://flagcdn.com/w40/pt.png" width="24" style="border-radius: 3px;" alt="PT">
                    <div>
                        <div data-i18n-key="language.pt">Português (Brasil)</div>
                        <div class="language-badge" data-i18n-key="language.ptLabel">Comunidade BR</div>
                    </div>
                </button>
                <button class="language-option" data-lang="de">
                    <img src="https://flagcdn.com/w40/de.png" width="24" style="border-radius: 3px;" alt="DE">
                    <div>
                        <div data-i18n-key="language.de">Deutsch</div>
                        <div class="language-badge" data-i18n-key="language.deLabel">Deutschland</div>
                    </div>
                </button>
            </div>
            <div class="language-actions">
                <button class="btn" id="languageLater" data-i18n-key="language.later">Plus tard</button>
                <button class="btn btn-primary" id="confirmLanguage" data-i18n-key="language.confirm">Valider</button>
            </div>
        </div>
    </div>

    <div class="sidebar">
        <div class="brand">
            <i class="fa-solid fa-ghost"></i>  V10designed by volt modified by AiyzoxX
        </div>
        
        <div class="nav-item active" data-target="dashboard">
            <i class="fa-solid fa-gauge-high" style="width: 20px;"></i> <span data-i18n-key="nav.dashboard">Dashboard</span>
        </div>
        <div class="nav-item" data-target="gametools">
            <i class="fa-solid fa-gamepad" style="width: 20px;"></i> <span data-i18n-key="nav.gametools">Game Tools</span>
        </div>
        <div class="nav-item" data-target="appearance">
            <i class="fa-solid fa-paintbrush" style="width: 20px;"></i> <span>Style & BG</span>
        </div>
        <div class="nav-item" data-target="advanced">
            <i class="fa-solid fa-sliders" style="width: 20px;"></i> <span>Customisation</span>
        </div>
        <div class="nav-item" data-target="media">
            <i class="fa-solid fa-music" style="width: 20px;"></i> <span data-i18n-key="nav.media">Media</span>
        </div>

        <div class="sidebar-footer">
            <a href="https://discord.gg/ssnc" target="_blank" class="btn btn-primary" style="text-decoration: none;">
                <i class="fa-brands fa-discord"></i> Voltmaps
            </a>
            <button class="btn btn-mini" id="openLanguagePicker" style="margin-top: 10px; width: 100%;" data-i18n-key="language.switch">Changer de langue</button>
        </div>
    </div>

    <div class="main">
        
        <div id="dashboard" class="view-section active">
            <div class="section-header">
                <div class="section-title" data-i18n-key="section.dashboard.title">Dashboard</div>
                <div class="section-subtitle" data-i18n-key="section.dashboard.subtitle">Contrôles principaux & Overlays</div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title" data-i18n-key="card.liveOverlays">Live Overlays</span></div>
                
                <div class="control-row">
                    <div>
                        <div class="control-label" data-i18n-key="label.speedrun">Speedrun Timer</div>
                        <div class="control-desc" data-i18n-key="desc.speedrun">Chrono précis au millième</div>
                    </div>
                    <label class="switch"><input type="checkbox" id="toggleTimerSwitch"><span class="slider"></span></label>
                </div>

                <div class="control-row">
                    <div>
                        <div class="control-label" data-i18n-key="timer.smartTimer">Smart Timer</div>
                        <div class="control-desc" data-i18n-key="timer.smartTimerDesc">Démarre/arrête auto via sons du jeu</div>
                        <div class="control-desc" data-i18n-key="timer.smartTimerRefresh" style="color: #ffaa99; font-size: 0.75rem; margin-top: 4px; font-weight: 500;">Si le smart timer ne marche pas, refresh la page</div>
                    </div>
                    <label class="switch"><input type="checkbox" id="smartTimerSwitch"><span class="slider"></span></label>
                </div>

                <div style="margin: 10px 0 20px 0;">
                    <div class="control-desc" style="margin-bottom: 8px;" data-i18n-key="desc.timerHotkey">Touche d'activation du Timer :</div>
                    <div class="hotkey-container">
                        <button class="key-btn hotkey-btn active" data-key="Control">CTRL</button>
                        <button class="key-btn hotkey-btn" data-key="Shift">SHIFT</button>
                        <button class="key-btn hotkey-btn" data-key="Alt">ALT</button>
                        <button class="key-btn hotkey-btn" data-key="Space">SPACE</button>
                    </div>
                    <input type="text" id="customKeyInput" placeholder="Ou tapez une touche personnalisée..." data-i18n-placeholder="placeholder.customKey" style="margin-top: 8px; border: 1px solid var(--border);">
                </div>

                <div class="control-row">
                    <div>
                        <div class="control-label" data-i18n-key="label.fps">FPS Counter</div>
                        <div class="control-desc" data-i18n-key="desc.fps">Affiche les images/seconde</div>
                    </div>
                    <label class="switch"><input type="checkbox" id="toggleFpsSwitch"><span class="slider"></span></label>
                </div>
                <div class="control-row">
                    <div>
                        <div class="control-label" data-i18n-key="label.keypress">Affichage Touches</div>
                        <div class="control-desc" data-i18n-key="desc.keypress">Visualisez vos inputs en direct</div>
                    </div>
                    <label class="switch"><input type="checkbox" id="toggleKeypressSwitch"><span class="slider"></span></label>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title" data-i18n-key="rec.title">Enregistrement</span></div>
                <button class="btn btn-primary" id="recordingActionBtn">
                    <i class="fa-solid fa-video"></i> <span data-i18n-key="rec.start">Lancer l'enregistrement</span>
                </button>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title" data-i18n-key="card.resolution">Résolution</span></div>
                <div class="grid-2">
                    <select id="resolutionSelect">
                        <option value="608x1080" data-i18n-key="res.vertical">608x1080 (Vertical)</option>
                        <option value="890x1080" data-i18n-key="res.large">890x1080 (Large)</option>
                        <option value="stretched" data-i18n-key="res.stretched">Étirée (Full Screen)</option>
                        <option value="custom" data-i18n-key="res.custom">Custom</option>
                    </select>
                    <button class="btn btn-primary" id="activateResolution" data-i18n-key="btn.force">Forcer</button>
                </div>
                
                <!-- Custom resolution inputs -->
                <div id="customResInputs" style="display:none; margin-top:12px;">
                    <div class="grid-2" style="gap:8px;">
                        <input type="number" id="customWidth" placeholder="Largeur (px)" min="320" max="3840">
                        <input type="number" id="customHeight" placeholder="Hauteur (px)" min="240" max="2160">
                    </div>
                </div>

                <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="blackBarsToggle" checked style="width: auto;">
                        <span style="font-size: 13px; color: var(--text-muted);" data-i18n-key="label.blackBars">Bandes noires</span>
                    </div>
                    <!-- Color picker pour les bandes -->
                    <input type="color" id="barsColorPicker" value="#000000" style="width:50px;height:30px;cursor:pointer;">
                    <button class="btn btn-mini" id="deactivateResolution" style="width: auto;" data-i18n-key="btn.reset">Réinitialiser</button>
                </div>
            </div>
        </div>

        <div id="gametools" class="view-section">
            <div class="section-header">
                <div class="section-title" data-i18n-key="section.gametools.title">Outils Jeu</div>
                <div class="section-subtitle" data-i18n-key="section.gametools.subtitle">Sauvegardes, Cartes & Contrôles</div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title" data-i18n-key="card.backup">Gestionnaire de Sauvegarde</span></div>
                <div class="grid-2">
                    <button class="btn" id="backup"><i class="fa-solid fa-download"></i> <span data-i18n-key="btn.backup">Backup</span></button>
                    <button class="btn" id="restore"><i class="fa-solid fa-upload"></i> <span data-i18n-key="btn.restore">Restore</span></button>
                    <button class="btn btn-primary" id="save100"><i class="fa-solid fa-unlock"></i> <span data-i18n-key="btn.unlock">Unlock All</span></button>
                    <button class="btn btn-danger" id="cleanData"><i class="fa-solid fa-trash"></i> <span data-i18n-key="btn.resetData">Reset Data</span></button>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title" data-i18n-key="card.mapSelector">Sélecteur de Cartes</span></div>
                
                <div class="map-tabs" style="display:flex; gap:8px; margin-bottom:12px; justify-content:center;">
                    <button class="btn btn-mini map-tab active" data-target="cat-original" style="border-radius: 30px; border-color: var(--border-highlight); color: white;" data-i18n-key="tab.original">Original</button>
                    <button class="btn btn-mini map-tab" data-target="cat-training" style="border-radius: 30px;" data-i18n-key="tab.training">Training</button>
                    <button class="btn btn-mini map-tab" data-target="cat-cheat" style="border-radius: 30px;" data-i18n-key="tab.cheat">Cheat</button>
                </div>

                <div id="cat-original" class="map-category">
                    <div class="scroll-list">
                        <button class="btn btn-mini city-link" data-url="/barcelona.html">🇪🇸 Barcelona</button>
                        <button class="btn btn-mini city-link" data-url="/beijing.html">🇨🇳 Beijing</button>
                        <button class="btn btn-mini city-link" data-url="/berlin.html">🇩🇪 Berlin</button>
                        <button class="btn btn-mini city-link" data-url="/buenosaires.html">🇦🇷 Buenos Aires</button>
                        <button class="btn btn-mini city-link" data-url="/havana.html">🇨🇺 Havana</button>
                        <button class="btn btn-mini city-link" data-url="/houston.html">🇺🇸 Houston</button>
                        <button class="btn btn-mini city-link" data-url="/iceland.html">🇮🇸 Iceland</button>
                        <button class="btn btn-mini city-link" data-url="/london.html">🇬🇧 London</button>
                        <button class="btn btn-mini city-link" data-url="/mexico.html">🇲🇽 Mexico</button>
                        <button class="btn btn-mini city-link" data-url="/monaco.html">🇲🇨 Monaco</button>
                        <button class="btn btn-mini city-link" data-url="/neworleans.html">🇺🇸 New Orleans</button>
                        <button class="btn btn-mini city-link" data-url="/saintpetersburg.html">🇷🇺 Saint Petersburg</button>
                        <button class="btn btn-mini city-link" data-url="/sanfrancisco.html">🇺🇸 San Francisco</button>
                        <button class="btn btn-mini city-link" data-url="/winterholiday.html">❄️ Winter Holiday</button>
                        <button class="btn btn-mini city-link" data-url="/zurich.html">🇨🇭 Zurich</button>
                    </div>
                </div>

                <div id="cat-training" class="map-category" style="display:none;">
                    <div class="scroll-list">
                        <button class="btn btn-mini city-link" data-url="/barcelona-training.html?mode=training">🇪🇸 Barcelona</button>
                        <button class="btn btn-mini city-link" data-url="/beijing-training.html?mode=training">🇨🇳 Beijing</button>
                        <button class="btn btn-mini city-link" data-url="/berlin-training.html?mode=training">🇩🇪 Berlin</button>
                        <button class="btn btn-mini city-link" data-url="/buenosaires-training.html?mode=training">🇦🇷 Buenos Aires</button>
                        <button class="btn btn-mini city-link" data-url="/havana-training.html?mode=training">🇨🇺 Havana</button>
                        <button class="btn btn-mini city-link" data-url="/houston-training.html?mode=training">🇺🇸 Houston</button>
                        <button class="btn btn-mini city-link" data-url="/iceland-training.html?mode=training">🇮🇸 Iceland</button>
                        <button class="btn btn-mini city-link" data-url="/london-training.html?mode=training">🇬🇧 London</button>
                        <button class="btn btn-mini city-link" data-url="/mexico-training.html?mode=training">🇲🇽 Mexico</button>
                        <button class="btn btn-mini city-link" data-url="/monaco-training.html?mode=training">🇲🇨 Monaco</button>
                        <button class="btn btn-mini city-link" data-url="/neworleans-training.html?mode=training">🇺🇸 New Orleans</button>
                        <button class="btn btn-mini city-link" data-url="/saintpetersburg-training.html?mode=training">🇷🇺 Saint Petersburg</button>
                        <button class="btn btn-mini city-link" data-url="/sanfrancisco-training.html?mode=training">🇺🇸 San Francisco</button>
                        <button class="btn btn-mini city-link" data-url="/winterholiday-training.html?mode=training">❄️ Winter Holiday</button>
                        <button class="btn btn-mini city-link" data-url="/zurich-training.html?mode=training">🇨🇭 Zurich</button>
                        <div class="separator"></div>
                        <button class="btn btn-mini city-link" data-url="/pogo.html">🦘 Map Pogo</button>
                    </div>
                </div>

                <div id="cat-cheat" class="map-category" style="display:none;">
                    <div class="scroll-list">
                        <button class="btn btn-mini city-link" data-url="/beijing-noimpo/">🇨🇳 Beijing (No Impo)</button>
                        <button class="btn btn-mini city-link" data-url="/beijing-reduced-impo/">🇨🇳 Beijing (Reduced Impo)</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title" data-i18n-key="card.keymap">Mapping Clavier (ZQSD)</span></div>
                <div class="grid-4">
                    <input type="text" id="upKey" placeholder="Haut (Z)" data-i18n-placeholder="placeholder.up">
                    <input type="text" id="leftKey" placeholder="Gauche (Q)" data-i18n-placeholder="placeholder.left">
                    <input type="text" id="downKey" placeholder="Bas (S)" data-i18n-placeholder="placeholder.down">
                    <input type="text" id="rightKey" placeholder="Droite (D)" data-i18n-placeholder="placeholder.right">
                </div>
                <div class="grid-2" style="margin-top: 10px;">
                    <button class="btn btn-primary" id="saveZqsdKeys" data-i18n-key="btn.apply">Appliquer</button>
                    <button class="btn" id="deactivateZqsd" data-i18n-key="btn.disable">Désactiver</button>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title" data-i18n-key="tclick.title">Triple Clic Rapide (Boosts)</span></div>
                
                <div class="control-row">
                    <div>
                        <div class="control-label" data-i18n-key="tclick.enable">Activer le Triple Clic</div>
                        <div class="control-desc" data-i18n-key="tclick.desc">Active 3 boosts rapidement (Subway Surfers)</div>
                    </div>
                    <label class="switch"><input type="checkbox" id="tripleClickToggle"><span class="slider"></span></label>
                </div>

                <div style="margin-top: 10px;">
                    <div class="control-desc" style="margin-bottom: 5px;" data-i18n-key="tclick.hotkey">Touche d'activation :</div>
                    <input type="text" id="tripleClickInput" placeholder="Cliquez ici et pressez une touche..." readonly style="cursor: pointer; text-align: center; font-weight: bold; color: var(--accent);">
                </div>

                <div class="control-desc" style="margin-top: 12px; padding: 10px; background: var(--bg-input); border-radius: var(--radius); text-align: center;" data-i18n-key="tclick.hint">
                    💡 Place ta souris sur le jeu et appuie sur la touche pour activer les 3 boosts !
                </div>
            </div>

        </div>

        <div id="appearance" class="view-section">
            <div class="section-header">
                <div class="section-title" data-i18n-key="section.appearance.title">Apparence</div>
                <div class="section-subtitle" data-i18n-key="section.appearance.subtitle">Personnalisez votre interface</div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title" data-i18n-key="card.overlay">Overlay Touches</span></div>
                
                <div class="hotkey-container" style="margin-bottom: 12px;">
                    <button class="key-btn key-layout-btn active" data-layout="arrows">Arrows</button>
                    <button class="key-btn key-layout-btn" data-layout="wasd">WASD</button>
                    <button class="key-btn key-layout-btn" data-layout="zqsd">ZQSD</button>
                </div>

                <div class="grid-3">
                    <button class="btn btn-mini key-theme-btn" data-theme="default">Default</button>
                    <button class="btn btn-mini key-theme-btn" data-theme="minimal">Minimal</button>
                    <button class="btn btn-mini key-theme-btn" data-theme="block">Block</button>
                    <button class="btn btn-mini key-theme-btn" data-theme="classic">Classic</button>
                    <button class="btn btn-mini key-theme-btn" data-theme="retro">Retro</button>
                    <button class="btn btn-mini key-theme-btn" data-theme="block-white">White</button>
                </div>
            </div>

            <div class="section-header">
                <div class="section-title" data-i18n-key="bg.title">Images de Fond</div>
                <div class="section-subtitle" data-i18n-key="bg.subtitle">Une image unique pour chaque outil</div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title" data-i18n-key="bg.timer">Timer Background</span></div>
                <div class="upload-row">
                    <div id="preview-timer" class="preview-box"></div>
                    <button class="btn btn-mini upload-btn" id="btn-upload-timer" data-i18n-key="bg.choose">Choisir Image</button>
                    <button class="btn btn-mini btn-danger" id="btn-reset-timer" style="width: 30px;"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <input type="file" id="file-timer" accept="image/*" hidden>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title" data-i18n-key="bg.fps">FPS Counter Background</span></div>
                <div class="upload-row">
                    <div id="preview-fps" class="preview-box"></div>
                    <button class="btn btn-mini upload-btn" id="btn-upload-fps" data-i18n-key="bg.choose">Choisir Image</button>
                    <button class="btn btn-mini btn-danger" id="btn-reset-fps" style="width: 30px;"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <input type="file" id="file-fps" accept="image/*" hidden>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title" data-i18n-key="bg.keys">Touches (Keys) Background</span></div>
                <div class="upload-row">
                    <div id="preview-keys" class="preview-box"></div>
                    <button class="btn btn-mini upload-btn" id="btn-upload-keys" data-i18n-key="bg.global">Image Globale</button>
                    <button class="btn btn-mini upload-btn" id="btn-upload-keys-active" data-i18n-key="bg.active">Image Active</button>
                    <button class="btn btn-mini btn-danger" id="btn-reset-keys" style="width: 30px;"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <input type="file" id="file-keys" accept="image/*" hidden>
                <input type="file" id="file-keys-active" accept="image/*" hidden>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title" data-i18n-key="card.timerColors">Couleurs du Timer</span></div>
                <div class="grid-3">
                    <div>
                        <div class="control-desc" data-i18n-key="desc.colorRunning">En cours</div>
                        <input type="color" id="color-running" class="color-picker" style="height: 35px; padding: 0; background:none; border:none; cursor:pointer;">
                    </div>
                    <div>
                        <div class="control-desc" data-i18n-key="desc.colorPaused">Pause</div>
                        <input type="color" id="color-paused" class="color-picker" style="height: 35px; padding: 0; background:none; border:none; cursor:pointer;">
                    </div>
                    <div>
                        <div class="control-desc" data-i18n-key="desc.colorStopped">Arrêt</div>
                        <input type="color" id="color-stopped" class="color-picker" style="height: 35px; padding: 0; background:none; border:none; cursor:pointer;">
                    </div>
                </div>
            </div>
        </div>

        <div id="advanced" class="view-section">
            <div class="section-header">
                <div class="section-title" data-i18n-key="adv.customTotal">Customisation Totale</div>
                <div class="section-subtitle" data-i18n-key="adv.customTotalSub">Modifiez les arrondis, couleurs et styles</div>
            </div>

            <!-- TIMER -->
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-stopwatch"></i> Timer</span></div>
                
                <div class="grid-2">
                    <div>
                        <div class="control-desc" data-i18n-key="adv.bgColor">Couleur de fond</div>
                        <input type="color" id="timer-bg-color" value="#000000" style="width:100%; height:30px; border:none; padding:0;">
                    </div>
                    <div>
                        <div class="control-desc" data-i18n-key="adv.textColor">Couleur du texte</div>
                        <input type="color" id="timer-text-color" value="#ffffff" style="width:100%; height:30px; border:none; padding:0;">
                    </div>
                </div>
                
                <div class="style-label" style="margin-top:10px;"><span data-i18n-key="adv.radius">Arrondi</span> <span id="val-timer-radius">0px</span></div>
                <input type="range" class="style-slider" id="timer-radius" min="0" max="30" value="0">
                
                <div class="style-label"><span data-i18n-key="adv.opacity">Opacité</span> <span id="val-timer-opacity">100%</span></div>
                <input type="range" class="style-slider" id="timer-opacity" min="0" max="100" value="100">
                
                <div class="style-label"><span data-i18n-key="adv.fontSize">Taille police</span> <span id="val-timer-font">100%</span></div>
                <input type="range" class="style-slider" id="timer-font-scale" min="50" max="200" value="100">
                
                <div class="style-label"><span data-i18n-key="adv.borderWidth">Épaisseur bordure</span> <span id="val-timer-border">0px</span></div>
                <input type="range" class="style-slider" id="timer-border-width" min="0" max="10" value="0">
                
                <div class="grid-2" style="margin-top:10px;">
                    <div>
                        <div class="control-desc" data-i18n-key="adv.borderColor">Couleur bordure</div>
                        <input type="color" id="timer-border-color" value="#6366f1" style="width:100%; height:30px; border:none; padding:0;">
                    </div>
                    <div>
                        <div class="control-desc" data-i18n-key="adv.font">Police</div>
                        <select id="timer-font-family">
                            <option value="'Calibri', 'Segoe UI', sans-serif">Standard</option>
                            <option value="'Courier New', monospace">Retro / Code</option>
                            <option value="'Arial Black', sans-serif">Bold</option>
                            <option value="'Georgia', serif">Serif</option>
                            <option value="'Impact', sans-serif">Impact</option>
                        </select>
                    </div>
                </div>
                
                <div class="style-label" style="margin-top:10px;"><span data-i18n-key="adv.shadow">Ombre portée</span> <span id="val-timer-shadow">0px</span></div>
                <input type="range" class="style-slider" id="timer-shadow" min="0" max="30" value="0">
            </div>

            <!-- FPS COUNTER -->
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-gauge-high"></i> FPS Counter</span></div>
                
                <div class="grid-2">
                    <div>
                        <div class="control-desc" data-i18n-key="adv.bgColor">Couleur de fond</div>
                        <input type="color" id="fps-bg-color" value="#000000" style="width:100%; height:30px; border:none; padding:0;">
                    </div>
                    <div>
                        <div class="control-desc" data-i18n-key="adv.textColor">Couleur du texte</div>
                        <input type="color" id="fps-text-color" value="#ffffff" style="width:100%; height:30px; border:none; padding:0;">
                    </div>
                </div>
                
                <div class="style-label" style="margin-top:10px;"><span data-i18n-key="adv.radius">Arrondi</span> <span id="val-fps-radius">4px</span></div>
                <input type="range" class="style-slider" id="fps-radius" min="0" max="30" value="4">
                
                <div class="style-label"><span data-i18n-key="adv.opacity">Opacité</span> <span id="val-fps-opacity">100%</span></div>
                <input type="range" class="style-slider" id="fps-opacity" min="0" max="100" value="100">
                
                <div class="style-label"><span data-i18n-key="adv.fontSize">Taille police</span> <span id="val-fps-font">100%</span></div>
                <input type="range" class="style-slider" id="fps-font-scale" min="50" max="200" value="100">
                
                <div class="style-label"><span data-i18n-key="adv.borderWidth">Épaisseur bordure</span> <span id="val-fps-border">0px</span></div>
                <input type="range" class="style-slider" id="fps-border-width" min="0" max="10" value="0">
                
                <div class="grid-2" style="margin-top:10px;">
                    <div>
                        <div class="control-desc" data-i18n-key="adv.borderColor">Couleur bordure</div>
                        <input type="color" id="fps-border-color" value="#10b981" style="width:100%; height:30px; border:none; padding:0;">
                    </div>
                    <div>
                        <div class="control-desc" data-i18n-key="adv.font">Police</div>
                        <select id="fps-font-family">
                            <option value="'Segoe UI', sans-serif">Standard</option>
                            <option value="'Courier New', monospace">Retro / Code</option>
                            <option value="'Arial Black', sans-serif">Bold</option>
                            <option value="'Georgia', serif">Serif</option>
                        </select>
                    </div>
                </div>
                
                <div class="style-label" style="margin-top:10px;"><span data-i18n-key="adv.shadow">Ombre portée</span> <span id="val-fps-shadow">0px</span></div>
                <input type="range" class="style-slider" id="fps-shadow" min="0" max="30" value="0">
            </div>

            <!-- KEYPRESS OVERLAY -->
            <div class="card">
                <div class="card-header"><span class="card-title"><i class="fa-solid fa-keyboard"></i> Affichage Touches</span></div>
                
                <div class="grid-2">
                    <div>
                        <div class="control-desc" data-i18n-key="adv.keyBgColor">Couleur fond touches</div>
                        <input type="color" id="keys-bg-color" value="#000000" style="width:100%; height:30px; border:none; padding:0;">
                    </div>
                    <div>
                        <div class="control-desc" data-i18n-key="adv.keyTextColor">Couleur texte</div>
                        <input type="color" id="keys-text-color" value="#ffffff" style="width:100%; height:30px; border:none; padding:0;">
                    </div>
                </div>
                
                <div class="grid-2" style="margin-top:10px;">
                    <div>
                        <div class="control-desc" data-i18n-key="adv.keyActiveBg">Couleur fond touche actif</div>
                        <input type="color" id="keys-active-bg-color" value="#4bc277" style="width:100%; height:30px; border:none; padding:0;">
                    </div>
                    <div>
                        <div class="control-desc" data-i18n-key="adv.keyActiveText">Couleur texte actif</div>
                        <input type="color" id="keys-active-text-color" value="#ffffff" style="width:100%; height:30px; border:none; padding:0;">
                    </div>
                </div>
                <div class="grid-2" style="margin-top:10px;">
                    <div>
                        <div class="control-desc" data-i18n-key="adv.keyActiveBorder">Couleur bordure active</div>
                        <input type="color" id="keys-active-color" value="#4bc277" style="width:100%; height:30px; border:none; padding:0;">
                    </div>
                    <div>
                        <div class="control-desc" data-i18n-key="adv.borderColor">Couleur bordure</div>
                        <input type="color" id="keys-border-color" value="#3d3d3d" style="width:100%; height:30px; border:none; padding:0;">
                    </div>
                </div>
                
                <div class="style-label" style="margin-top:10px;"><span data-i18n-key="adv.keyRadius">Arrondi des touches</span> <span id="val-keys-radius">12px</span></div>
                <input type="range" class="style-slider" id="keys-radius" min="0" max="30" value="12">
                
                <div class="style-label"><span data-i18n-key="adv.opacity">Opacité</span> <span id="val-keys-opacity">100%</span></div>
                <input type="range" class="style-slider" id="keys-opacity" min="0" max="100" value="100">
                
                <div class="style-label"><span data-i18n-key="adv.keySizeLabel">Taille des touches</span> <span id="val-keys-size">100%</span></div>
                <input type="range" class="style-slider" id="keys-size-scale" min="60" max="160" value="100">
                
                <div class="style-label"><span data-i18n-key="adv.borderWidth">Épaisseur bordure</span> <span id="val-keys-border">2px</span></div>
                <input type="range" class="style-slider" id="keys-border-width" min="0" max="10" value="2">
                
                <div class="style-label"><span data-i18n-key="adv.shadow">Ombre portée</span> <span id="val-keys-shadow">6px</span></div>
                <input type="range" class="style-slider" id="keys-shadow" min="0" max="30" value="6">
            </div>
        </div>

        <div id="media" class="view-section">
            <div class="section-header">
                <div class="section-title" data-i18n-key="section.media.title">Média</div>
                <div class="section-subtitle" data-i18n-key="section.media.subtitle">Audio et Musique</div>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title" data-i18n-key="card.volume">Volume Global du Jeu</span></div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <i class="fa-solid fa-volume-high" style="color: var(--text-muted);"></i>
                    <input type="range" id="volumeSlider" class="slider-range" min="0" max="100" style="flex: 1;">
                    <span id="volumeValue" style="font-weight: 700; width: 45px; text-align: right; color: var(--accent);">100%</span>
    <div id="status" class="status-toast">
        <span data-i18n-key="status.done">Action effectuée</span>
    </div>

    <button id="toggleTimer" style="display:none;"></button>
    <button id="toggleFps" style="display:none;"></button>
    <button id="toggleKeypress" style="display:none;"></button>

</body>
</html>
`;
      wrapper.appendChild(nocoinModal);
      wrapper.appendChild(closeBtn);

      document.documentElement.appendChild(backdrop);
      document.documentElement.appendChild(wrapper);

      const fab = document.createElement("button");
      fab.id = "nocoin-fab";
      fab.innerHTML = "⚙️";
      document.documentElement.appendChild(fab);

      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        ) || "ontouchstart" in window;
      if (isMobileDevice) {
        const hideCardWith = (selector) => {
          const el = nocoinModal.querySelector(selector);
          if (el) {
            const card = el.closest(".card");
            if (card) card.style.display = "none";
          }
        };

        const hideRowWith = (selector) => {
          const el = nocoinModal.querySelector(selector);
          if (el) {
            const row =
              el.closest(".control-row") ||
              el.closest('div[style*="margin: 10px 0 20px 0;"]');
            if (row) row.style.display = "none";
          }
        };

        hideCardWith("#saveZqsdKeys");
        hideCardWith("#tripleClickToggle");
        hideCardWith("#resolutionSelect");
        hideCardWith(".key-layout-btn");
        hideRowWith("#smartTimerSwitch");
        hideCardWith("#keys-bg-color");
        hideCardWith("#btn-upload-keys");
        hideRowWith("#toggleKeypressSwitch");
        hideCardWith("#recordingActionBtn");

        const appearanceTitle = nocoinModal.querySelector(
          '[data-i18n-key="section.appearance.title"]',
        );
        if (appearanceTitle) {
          const appearanceHeader = appearanceTitle.closest(".section-header");
          if (appearanceHeader) appearanceHeader.style.display = "none";
        }

        const btns = nocoinModal.querySelectorAll(".hotkey-btn");
        if (btns.length > 0) {
          const container = btns[0].closest(".hotkey-container");
          if (container && container.parentElement) {
            container.parentElement.style.display = "none";
          }
        }
      }

      const FAB_POS_KEY = "nocoin_fab_pos";
      const applyFabPos = (left, top) => {
        const fw = fab.offsetWidth || 52;
        const fh = fab.offsetHeight || 52;
        const maxL = window.innerWidth - fw - 4;
        const maxT = window.innerHeight - fh - 4;
        left = Math.max(4, Math.min(left, maxL));
        top = Math.max(4, Math.min(top, maxT));
        fab.style.left = left + "px";
        fab.style.top = top + "px";
        fab.style.right = "auto";
        fab.style.bottom = "auto";
      };
      try {
        const saved = JSON.parse(localStorage.getItem(FAB_POS_KEY) || "null");
        if (
          saved &&
          typeof saved.left === "number" &&
          typeof saved.top === "number"
        ) {
          requestAnimationFrame(() => applyFabPos(saved.left, saved.top));
        }
      } catch { }
      window.addEventListener("resize", () => {
        const r = fab.getBoundingClientRect();
        if (fab.style.left) applyFabPos(r.left, r.top);
      });

      let dragState = null;
      const DRAG_THRESHOLD = 5;

      const onPointerMove = (ev) => {
        if (!dragState) return;
        const dx = ev.clientX - dragState.startX;
        const dy = ev.clientY - dragState.startY;
        if (!dragState.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        dragState.moved = true;
        fab.classList.add("dragging");
        applyFabPos(ev.clientX - dragState.offX, ev.clientY - dragState.offY);
        ev.preventDefault();
      };
      const onPointerUp = (ev) => {
        if (!dragState) return;
        const wasMoved = dragState.moved;
        window.removeEventListener("pointermove", onPointerMove, true);
        window.removeEventListener("pointerup", onPointerUp, true);
        window.removeEventListener("pointercancel", onPointerUp, true);
        fab.classList.remove("dragging");
        if (wasMoved) {
          const r = fab.getBoundingClientRect();
          try {
            localStorage.setItem(
              FAB_POS_KEY,
              JSON.stringify({ left: r.left, top: r.top }),
            );
          } catch { }
        } else {
          toggleModal();
        }
        dragState = null;
      };
      const onPointerDown = (ev) => {
        if (ev.button !== undefined && ev.button !== 0) return;
        console.log("[FAB] pointerdown", ev.clientX, ev.clientY);
        const r = fab.getBoundingClientRect();
        dragState = {
          startX: ev.clientX,
          startY: ev.clientY,
          offX: ev.clientX - r.left,
          offY: ev.clientY - r.top,
          moved: false,
        };
        window.addEventListener("pointermove", onPointerMove, true);
        window.addEventListener("pointerup", onPointerUp, true);
        window.addEventListener("pointercancel", onPointerUp, true);
        ev.preventDefault();
        ev.stopPropagation();
      };
      const onMouseDown = (ev) => {
        if (ev.button !== undefined && ev.button !== 0) return;
        console.log("[FAB] mousedown fallback", ev.clientX, ev.clientY);
        if (dragState) return;
        const r = fab.getBoundingClientRect();
        dragState = {
          startX: ev.clientX,
          startY: ev.clientY,
          offX: ev.clientX - r.left,
          offY: ev.clientY - r.top,
          moved: false,
        };
        const mouseMove = (e) => onPointerMove(e);
        const mouseUp = (e) => {
          window.removeEventListener("mousemove", mouseMove, true);
          window.removeEventListener("mouseup", mouseUp, true);
          onPointerUp(e);
        };
        window.addEventListener("mousemove", mouseMove, true);
        window.addEventListener("mouseup", mouseUp, true);
        ev.preventDefault();
        ev.stopPropagation();
      };

      fab.addEventListener("pointerdown", onPointerDown, true);
      fab.addEventListener("mousedown", onMouseDown, true);
      fab.style.touchAction = "none";
      fab.style.userSelect = "none";
      fab.style.cursor = "grab";
      fab.title = "Click: open · Drag: move";
      console.log(
        "[FAB] drag handlers attached. Test by hovering — cursor must be grab.",
      );

      const toggleModal = () => {
        const isOpen = backdrop.classList.contains("open");
        if (isOpen) {
          backdrop.classList.remove("open");
          nocoinModal.classList.remove("open");
        } else {
          backdrop.classList.add("open");
          nocoinModal.classList.add("open");
        }
      };

      closeBtn.addEventListener("click", toggleModal);
      backdrop.addEventListener("click", toggleModal);
      nocoinModal.addEventListener("click", (e) => e.stopPropagation());

      // Fix inputs not being typable due to game capturing keys globally
      const textInputs = nocoinModal.querySelectorAll(
        'input[type="text"], input[type="number"]',
      );
      textInputs.forEach((inp) => {
        inp.addEventListener("keydown", (e) => {
          e.stopPropagation();
        });
        inp.addEventListener("keyup", (e) => {
          e.stopPropagation();
        });
        inp.addEventListener("keypress", (e) => {
          e.stopPropagation();
        });
      });
    }

    // EXECUTE INJECTION
    if (localStorage.getItem("nocoinExtensionEnabled") !== "false") {
      if (document.readyState !== "loading") {
        createNocoinUI();
        initNocoinContent();
        initNocoinPopup();
        setTimeout(() => {
          window.postMessage(
            { source: "GAMING_TOOLS_VOLUME_CHANNEL", type: "PAGE_READY" },
            "*",
          );
        }, 500);
      } else {
        document.addEventListener("DOMContentLoaded", () => {
          createNocoinUI();
          initNocoinContent();
          initNocoinPopup();
          setTimeout(() => {
            window.postMessage(
              { source: "GAMING_TOOLS_VOLUME_CHANNEL", type: "PAGE_READY" },
              "*",
            );
          }, 500);
        });
      }
    }
  } // end isMapPage
} // end __NOCOIN_INITIALIZED__

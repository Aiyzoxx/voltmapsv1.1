// @ts-check
// ============================================================
// Volt Extension — Copyright (c) 2024-2026 Volt
// Proprietary & Confidential — All rights reserved.
// Unauthorized copying, modification, or distribution is
// strictly prohibited. Official source: Discord
// ============================================================
(function () {
    // --- 🔊 VOLT AUDIO ENGINE (VOLUME & RESUME) ---
    const VOLT_AUDIO_DEBUG = false;
    const audioDebug = (...args) => { if (VOLT_AUDIO_DEBUG) console.debug(...args); };
    const audioWarn = (...args) => { if (VOLT_AUDIO_DEBUG) console.warn(...args); };
    const _ctxs = new Set();
    const _masterNodes = new WeakSet();
    let _interacted = false;
    let _volt_volume = 1.0; // Volume par défaut (100%)
    let _volt_detect_audio = true; // STAGE4: hidden Smart Guard listens by default for records/1v1 anti-cheat.
    let _volt_smart_guard = true;

    const _resume = async () => {
        for (const c of _ctxs) {
            if (c.state === 'suspended') {
                try {
                    await c.resume();
                    audioDebug("[VOLT Audio] Resumed context:", c);
                } catch (e) {
                    audioWarn("[VOLT Audio] Resume failed:", e);
                }
            }
        }
    };

    const _onInteraction = () => {
        _interacted = true;
        _resume();
    };

    window.addEventListener('mousedown', _onInteraction, { once: true });
    window.addEventListener('keydown', _onInteraction, { once: true });
    window.addEventListener('touchstart', _onInteraction, { once: true });

    // Remote restoration: previously exposed `_resume` directly on `window`
    // (`window._volt_resume_all = _resume`), which let any page script call
    // it from devtools console. Now it's gated behind a same-origin
    // postMessage with a Volt-internal type, matching the protocol already
    // used by EXT_SET_VOLUME / EXT_INIT_VOLUME / VOLT_AUDIO_HOOK_CONFIG.
    window.addEventListener('message', (e) => {
        if (e.source !== window || e.origin !== window.location.origin) return;
        if (!e.data || e.data.type !== 'VOLT_AUDIO_RESUME_REMOTE') return;
        try { _resume(); } catch (_) {}
    });

    // --- 🎚️ VOLUME CONTROL ENGINE ---
    const _gains = new Map(); // Context -> MasterGainNode

    function updateAllVolumes() {
        const v = (isFinite(_volt_volume) && _volt_volume >= 0) ? _volt_volume : 1.0;
        // WebAudio
        for (const [ctx, gain] of _gains) {
            if (ctx.state !== 'closed') {
                try {
                    const now = isFinite(ctx.currentTime) ? ctx.currentTime : 0;
                    gain.gain.setTargetAtTime(v, now, 0.05);
                } catch (e) {
                    audioWarn("[VOLT Audio] setTargetAtTime failed:", e);
                    gain.gain.value = v; // Fallback
                }
            }
        }
        // HTML5 Audio
        document.querySelectorAll('audio, video').forEach(/** @param {Element} el */ (el) => {
            try { /** @type {HTMLMediaElement} */ (el).volume = v; } catch (_e) { }
        });
    }

    window.addEventListener('message', (e) => {
        if (e.source !== window || e.origin !== window.location.origin || !e.data) return;
        const type = e.data.type;
        if (type === 'VOLT_AUDIO_HOOK_CONFIG') {
            _volt_detect_audio = e.data.detectAudio === true || e.data.payload?.detectAudio === true;
            _volt_smart_guard = e.data.smartGuard !== false && e.data.payload?.smartGuard !== false;
            return;
        }
        if (type === 'EXT_SET_VOLUME' || type === 'EXT_INIT_VOLUME') {
            // content.js sends volume inside payload.volume; direct senders use e.data.volume
            const vol = e.data.volume ?? e.data.payload?.volume;
            if (vol !== undefined && isFinite(vol)) {
                _volt_volume = Math.max(0, Math.min(1, vol));
                updateAllVolumes();
            }
        }
    });

    const _OC = window.AudioContext || window.webkitAudioContext;
    if (_OC && !window._VOLT_HOOKED) {
        try {
            Object.defineProperty(window, '_VOLT_HOOKED', { value: true, writable: false, configurable: false });
        } catch (_) {
            window._VOLT_HOOKED = true;
        }

        // --- HOOK: AudioContext Constructor ---
        const _HC = function () {
            const ctx = new _OC(...arguments);
            _ctxs.add(ctx);

            // Master Gain for this context
            const masterGain = ctx.createGain();
            masterGain.gain.value = _volt_volume;
            _masterNodes.add(masterGain); // RED TEAM AUDIT: WeakSet is closure-private — page scripts cannot spoof master status
            masterGain.connect(ctx.destination);
            _gains.set(ctx, masterGain);

            // On expose le masterGain pour que les futurs hooks puissent s'y brancher
            ctx._volt_master = masterGain;

            if (_interacted) {
                setTimeout(async () => {
                    if (ctx.state === 'suspended') {
                        try { await ctx.resume(); } catch (_e) { }
                    }
                }, 100);
            }
            return ctx;
        };
        _HC.prototype = _OC.prototype;
        try {
            window.AudioContext = /** @type {any} */ (_HC);
            window.webkitAudioContext = /** @type {any} */ (_HC);
        } catch (e) { audioWarn("[VOLT] Audio Hook Failed:", e); }

        // --- HOOK: AudioNode.connect ---
        // Si un nœud essaie de se connecter à la destination, on le branche sur notre masterGain
        if (window.AudioNode?.prototype?.connect && window.AudioDestinationNode) {
            const originalNodeConnect = window.AudioNode.prototype.connect;
            window.AudioNode.prototype.connect = function (destination) {
                const self = /** @type {any} */ (this);
                // RED TEAM AUDIT: Skip redirect if node is the master gain itself to prevent feedback cycles
                if (_masterNodes.has(self)) {
                    return originalNodeConnect.apply(this, arguments);
                }
                if (destination instanceof window.AudioDestinationNode && self.context && self.context._volt_master) {
                    return originalNodeConnect.call(this, self.context._volt_master, ...Array.prototype.slice.call(arguments, 1));
                }
                return originalNodeConnect.apply(this, arguments);
            };
        }
    }

    window.addEventListener('message', (event) => {
        if (event.source !== window || event.origin !== window.location.origin || !event.data) return;
        // SET_FAIL_SOUND_URL / PLAY_FAIL_SOUND handled by isolated world (content script) directly
    });

    const INTERESTING_SOUND_LENGTHS = new Set([167183, 423531, 40124, 22291, 44582, 35665, 27863, 3343, 6687, 166069]);
    let _lastNotifyKey = '';
    let _lastNotifyAt = 0;

    function notify(buffer, offset, callDuration, source = 'WebAudio') {
        if (!_volt_detect_audio || !buffer) return;

        // FPS OPT: keep the smart timer accurate without forwarding generic footsteps/ambient sounds.
        // Known Subway Surfers No-Coin lengths are forwarded, plus one narrow fallback for the start sound.
        const len = Number(buffer.length || 0) || 0;
        const dur = Number(buffer.duration || 0) || 0;
        const isKnownNoCoinSound = INTERESTING_SOUND_LENGTHS.has(len);
        const isStartFallback = len !== 182787 && len > 150000 && dur >= 3.6 && dur <= 4.1;
        if (!isKnownNoCoinSound && !isStartFallback) return;

        const now = Date.now();
        const key = `${source}:${len}:${Math.round(dur * 1000)}`;
        if (key === _lastNotifyKey && now - _lastNotifyAt < 60) return;
        _lastNotifyKey = key;
        _lastNotifyAt = now;

        window.postMessage({
            type: 'GAME_AUDIO_PLAYED',
            source: source,
            duration: dur,
            length: len
        }, window.location.origin);
    }

    // Hook AudioBufferSourceNode.prototype.start
    const audioBufferSourceProto = window.AudioBufferSourceNode?.prototype;
    if (audioBufferSourceProto?.start) {
        const originalStart = audioBufferSourceProto.start;
        audioBufferSourceProto.start = function (when, offset, duration) {
            const self = /** @type {any} */ (this);
            notify(self.buffer || self._volt_buffer, offset, duration, 'WebAudio');

            const ctx = /** @type {any} */ (self.context);
            if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
                if (_interacted) {
                    ctx.resume().catch(() => { });
                } else {
                    // Not yet interacted, track it
                    _ctxs.add(ctx);
                }
            }

            try {
                return originalStart.apply(this, arguments);
            } catch (e) {
                audioWarn("[VOLT Audio] start() failed:", e);
                // Non-fatal, just return null or what they expect
                return null;
            }
        };
        try {
            Object.defineProperty(audioBufferSourceProto, 'start', {
                value: audioBufferSourceProto.start,
                writable: false,
                configurable: false
            });
        } catch (_) {}

        // Hook buffer setter
        const descriptor = Object.getOwnPropertyDescriptor(audioBufferSourceProto, 'buffer');
        if (descriptor && descriptor.set) {
            const originalSetter = descriptor.set;
            Object.defineProperty(audioBufferSourceProto, 'buffer', {
                get: descriptor.get
                    ? function () { return descriptor.get.call(this); }
                    : function () { return this._volt_buffer; },
                set: function (val) {
                    this._volt_buffer = val;
                    return originalSetter.call(this, val);
                },
                enumerable: descriptor.enumerable,
                configurable: descriptor.configurable
            });
        }
    }

    // --- HOOK: HTML5 Audio Element ---
    if (window.HTMLAudioElement?.prototype?.play) {
        const originalAudioPlay = window.HTMLAudioElement.prototype.play;
        window.HTMLAudioElement.prototype.play = function () {
            this.volume = _volt_volume; // Appliquer le volume VOLT
            notify({ duration: this.duration || 0, length: 0 }, this.currentTime, undefined, 'HTML5Audio');
            return originalAudioPlay.apply(this, arguments);
        };
    }
})();

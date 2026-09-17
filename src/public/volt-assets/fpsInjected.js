// @ts-check
(function() {
    if (window.__VOLT_FPS_MONITOR_ACTIVE) return;
    try {
        Object.defineProperty(window, '__VOLT_FPS_MONITOR_ACTIVE', { value: true, writable: false, configurable: false });
    } catch (_) {
        window.__VOLT_FPS_MONITOR_ACTIVE = true;
    }

    const CHANNEL = "VOLT_FPS_CHANNEL";
    let lastTime = performance.now();
    let frames = 0;
    /** @type {number | null} */
    let rafId = null;
    let active = false; // RAF currently running/allowed.
    let desired = false; // Overlay requested by content.js; survives tab hide/show.

    function loop() {
        if (!active) {
            rafId = null;
            return;
        }
        frames++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
            const fps = Math.round((frames * 1000) / (now - lastTime));
            window.postMessage({ 
                source: CHANNEL, 
                type: "VOLT_FPS_UPDATE", 
                fps: fps 
            }, window.location.origin);
            frames = 0;
            lastTime = now;
        }
        rafId = requestAnimationFrame(loop);
    }

    function pause() {
        active = false;
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function start() {
        desired = true;
        if (document.hidden || rafId !== null) return;
        active = true;
        lastTime = performance.now();
        frames = 0;
        rafId = requestAnimationFrame(loop);
    }

    function stop() {
        desired = false;
        pause();
    }

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) pause();
        else if (desired) start();
    });

    window.addEventListener("message", (event) => {
        if (event.source !== window || event.origin !== window.location.origin) return;
        const data = event.data || {};
        if (data.source !== CHANNEL || data.type !== "VOLT_FPS_CONTROL") return;
        if (data.command === "stop") stop();
        else if (data.command === "start") start();
    });
    
    // Notify readiness
    window.postMessage({ source: CHANNEL, type: "VOLT_PAGE_READY" }, window.location.origin);
})();

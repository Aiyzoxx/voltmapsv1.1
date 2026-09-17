!function () { 
    'use strict'; 
    function getSetting(e, t) { 
        try { 
            const o = localStorage.getItem(e); 
            return null !== o ? o : t; 
        } catch { 
            return t; 
        } 
    } 
    let t = 608, o = 1080, r = false; 
    
    if ('true' === localStorage.getItem('resolutionEnabled')) {
        t = parseInt(getSetting('customWidth', '608'), 10);
        o = parseInt(getSetting('customHeight', '1080'), 10);
        r = !isNaN(t) && !isNaN(o) && t > 0 && o > 0;
    }

    if (r) {
        const s = document.createElement('div');
        Object.assign(s.style, {
            position: 'fixed',
            inset: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: '#000',
            zIndex: '2147483646'
        });
        
        let resolved = false;
        const interval = setInterval(() => {
            const e = document.querySelector('canvas');
            if (e && e.width > 0 && e.height > 0 && !resolved) {
                clearInterval(interval);
                resolved = true;
                
                e.parentNode.insertBefore(s, e);
                s.appendChild(e);
                
                let prevW = 0, prevH = 0;
                function l() {
                    const ratio = Math.min(window.innerWidth / t, window.innerHeight / o);
                    const sw = Math.floor(t * ratio);
                    const sh = Math.floor(o * ratio);
                    if (sw !== prevW || sh !== prevH || e.style.width !== sw + 'px' || e.style.height !== sh + 'px') {
                        e.style.setProperty('width', sw + 'px', 'important');
                        e.style.setProperty('height', sh + 'px', 'important');
                        e.style.setProperty('margin', '0', 'important');
                        e.style.setProperty('left', '0', 'important');
                        e.style.setProperty('top', '0', 'important');
                        e.style.setProperty('transform', 'none', 'important');
                        prevW = sw;
                        prevH = sh;
                    }
                }
                l();
                window.addEventListener('resize', l, { passive: true });
                
                // Protect against Unity overwriting styles
                new MutationObserver(l).observe(e, { attributes: true, attributeFilter: ['style'] });
            }
        }, 100);
    }
}();

// Stretch and other settings
!function() {
    const n = 'true' === localStorage.getItem('stretchEnabled');
    const a = parseInt(localStorage.getItem('stretchPercent') || '0', 10);
    const stretch_factor = 1 + Math.min(100, Math.max(0, a)) / 100;
    const r = 'true' === localStorage.getItem('resolutionEnabled') && parseInt(localStorage.getItem('customWidth')) > 0;
    
    if (!r && n && stretch_factor > 1) {
        const e = setInterval(() => {
            const t = document.querySelector('canvas');
            if (t && t.width > 0 && t.height > 0) {
                clearInterval(e);
                const t = Math.min(3, Math.max(1.01, stretch_factor));
                const o = document.querySelector('canvas');
                let parent = o.parentElement;
                while (parent && parent !== document.documentElement) {
                    parent.style.setProperty('overflow', 'hidden', 'important');
                    parent.style.setProperty('position', 'fixed', 'important');
                    parent.style.setProperty('top', '0', 'important');
                    parent.style.setProperty('left', '0', 'important');
                    parent.style.setProperty('width', '100vw', 'important');
                    parent.style.setProperty('height', '100vh', 'important');
                    parent = parent.parentElement;
                }
                const widthPercent = 100 / t;
                const leftPercent = (100 - widthPercent) / 2;
                o.style.setProperty('position', 'fixed', 'important');
                o.style.setProperty('top', '0', 'important');
                o.style.setProperty('height', '100vh', 'important');
                o.style.setProperty('width', widthPercent + 'vw', 'important');
                o.style.setProperty('left', leftPercent + 'vw', 'important');
                o.style.setProperty('transform', 'scaleX(' + t + ')', 'important');
                o.style.setProperty('transform-origin', 'center center', 'important');
                o.style.setProperty('object-fit', 'fill', 'important');
                o.style.setProperty('display', 'block', 'important');
                o.style.setProperty('z-index', '2147483647', 'important');
                document.body.style.setProperty('overflow', 'hidden', 'important');
                document.documentElement.style.setProperty('overflow', 'hidden', 'important');
                document.body.style.setProperty('margin', '0', 'important');
                document.documentElement.style.setProperty('margin', '0', 'important');
            }
        }, 200);
    }
}();

!function() {
    function getSetting(e, t) { 
        try { 
            const o = localStorage.getItem(e); 
            return null !== o ? o : t; 
        } catch { 
            return t; 
        } 
    } 
    const i = 'false' !== localStorage.getItem('keyMappingEnabled');
    const l = 'true' === localStorage.getItem('spaceDisabled');
    
    if (i || l) {
        const v = getSetting('keyUp', 'W').toUpperCase();
        const f = getSetting('keyDown', 'S').toUpperCase();
        const w = getSetting('keyLeft', 'A').toUpperCase();
        const b = getSetting('keyRight', 'D').toUpperCase();
        const P = {};
        if (v) P['Key' + v] = 'ArrowUp';
        if (f) P['Key' + f] = 'ArrowDown';
        if (w) P['Key' + w] = 'ArrowLeft';
        if (b) P['Key' + b] = 'ArrowRight';
        
        const S = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 };
        let E = null;
        const I = () => { E = document.querySelector('canvas'); };
        function x(e, t) {
            const o = S[t];
            (E || document.body).dispatchEvent(new KeyboardEvent(e, { key: t, code: t, keyCode: o, which: o, bubbles: true, cancelable: true }));
        }
        function A(e) {
            if (l && 'Space' === e.code) {
                e.preventDefault();
                e.stopImmediatePropagation();
                return;
            }
            const t = P[e.code] || (e.key && e.key.length === 1 ? P['Key' + e.key.toUpperCase()] : null);
            if (t) {
                e.preventDefault();
                e.stopImmediatePropagation();
                x(e.type, t);
            }
        }
        I();
        new MutationObserver(I).observe(document.body, { childList: true, subtree: true });
        document.addEventListener('keydown', A, true);
        document.addEventListener('keyup', A, true);
    }
}();

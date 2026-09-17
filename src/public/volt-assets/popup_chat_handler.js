// @ts-check
(function() {
    let storageListenerBound = false;

    window.initChatGlobalSection = function() {
        /** @param {string} key */
        const tr = (key) => (window.VOLT_TRANSLATE ? window.VOLT_TRANSLATE(key) : key);
        const openBtn = document.getElementById('chatOpenBtn');
        const notInGame = document.getElementById('chat-not-in-game');

        if (!openBtn) return;

        /** Delegates to voltEscapeHtml in volt-helpers.js (single source of truth). */
        const escapeHtml = /** @type {(value: unknown) => string} */ (
            /** @type {any} */ (window).voltEscapeHtml
        );

        /** @param {string | null | undefined} url */
        function isSupportedGameUrl(url) {
            if (!url) return false;
            try {
                const parsed = new URL(url);
                return (
                    parsed.hostname === 'localhost' && parsed.pathname.startsWith('/beijing')
                ) || [
                    'ss.randomkzn.com',
                    'yell0wsuit.page',
                    'surfmap-run.vercel.app',
                    'localhost:3007'
                ].includes(parsed.hostname);
            } catch (_) {
                return false;
            }
        }

        /** @param {boolean} open */
        function setStoredOpenState(open) {
            chrome.storage.local.get(['chatPanelState'], (res) => {
                if (chrome.runtime?.lastError) return;
                const prev = res.chatPanelState || {};
                chrome.storage.local.set({
                    chatPanelOpen: open,
                    chatPanelState: { ...prev, open }
                }, () => { void chrome.runtime?.lastError; });
            });
        }

        /** @param {boolean} isOpen */
        function updateBtnState(isOpen) {
            if (isOpen) {
                openBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> ${escapeHtml(tr('chat.close'))}`;
                openBtn.classList.remove('btn-accent');
                openBtn.classList.add('btn-danger');
            } else {
                openBtn.innerHTML = `<i class="fa-solid fa-up-right-from-square"></i> ${escapeHtml(tr('chat.open'))}`;
                openBtn.classList.remove('btn-danger');
                openBtn.classList.add('btn-accent');
            }
        }

        /** @param {string} action @param {boolean} expectedOpenState */
        function sendChatAction(action, expectedOpenState) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime?.lastError) {
                    if (notInGame) notInGame.style.display = 'block';
                    setStoredOpenState(false);
                    updateBtnState(false);
                    return;
                }
                const tab = tabs?.[0];
                if (!tab || !isSupportedGameUrl(tab.url)) {
                    if (notInGame) notInGame.style.display = 'block';
                    setStoredOpenState(false);
                    updateBtnState(false);
                    return;
                }
                if (notInGame) notInGame.style.display = 'none';

                const finishOk = () => setStoredOpenState(expectedOpenState);
                const failClosed = () => {
                    if (notInGame) notInGame.style.display = 'block';
                    setStoredOpenState(false);
                    updateBtnState(false);
                };
                const sendOnce = (afterInject = false) => {
                    chrome.tabs.sendMessage(tab.id, { action }, (res) => {
                        const err = chrome.runtime.lastError;
                        if (!err && res && res.success) { finishOk(); return; }
                        if (afterInject || typeof chrome.scripting?.executeScript !== 'function') {
                            failClosed();
                            return;
                        }
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            files: ['chatUIInjected.js']
                        }, () => {
                            if (chrome.runtime.lastError) { failClosed(); return; }
                            setTimeout(() => sendOnce(true), 80);
                        });
                    });
                };
                sendOnce(false);
            });
        }

        chrome.storage.local.get(['chatPanelOpen', 'chatPanelState'], (res) => {
            if (chrome.runtime?.lastError) return;
            const open = res.chatPanelState?.open !== undefined ? res.chatPanelState.open : res.chatPanelOpen;
            updateBtnState(!!open);
        });

        if (!openBtn.dataset.listenerAdded) {
            openBtn.dataset.listenerAdded = '1';
            openBtn.addEventListener('click', () => {
                chrome.storage.local.get(['chatPanelOpen', 'chatPanelState'], (res) => {
                    if (chrome.runtime?.lastError) {
                        updateBtnState(false);
                        return;
                    }
                    const currentOpen = res.chatPanelState?.open !== undefined ? res.chatPanelState.open : res.chatPanelOpen;
                    const newState = !currentOpen;
                    sendChatAction(newState ? 'openGlobalChat' : 'closeGlobalChat', newState);
                    updateBtnState(newState);
                });
            });
        }

        if (!storageListenerBound) {
            storageListenerBound = true;
            const _storageHandler = (changes) => {
                if (changes.chatPanelState && changes.chatPanelState.newValue?.open !== undefined) {
                    updateBtnState(!!changes.chatPanelState.newValue.open);
                    return;
                }
                if (changes.chatPanelOpen) {
                    updateBtnState(!!changes.chatPanelOpen.newValue);
                }
            };
            chrome.storage.onChanged.addListener(_storageHandler);
            window.addEventListener('pagehide', () => {
                try { chrome.storage.onChanged.removeListener(_storageHandler); } catch (_) {}
                storageListenerBound = false;
            }, { once: true });
        }
    };

    const observer = new MutationObserver(() => {
        const chatSection = document.getElementById('chat-global');
        if (chatSection && chatSection.classList.contains('active')) {
            window.initChatGlobalSection();
        }
    });

    const main = document.querySelector('.main');
    if (main) observer.observe(main, { subtree: true, attributes: true, attributeFilter: ['class'] });

    setTimeout(() => {
        const chatSection = document.getElementById('chat-global');
        if (chatSection && chatSection.classList.contains('active')) window.initChatGlobalSection();
    }, 500);
})();

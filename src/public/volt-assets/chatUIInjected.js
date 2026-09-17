// @ts-check
// ============================================================
// Volt Extension — Copyright (c) 2024-2026 Volt
// Proprietary & Confidential — All rights reserved.
// Unauthorized copying, modification, or distribution is
// strictly prohibited. Official source: Discord
// ============================================================
// chatUIInjected.js — v2.0 PANEL REDESIGN
// Chat désormais contrôlé via l'extension (popup) — plus de bouton flottant
// ============================================================

(() => {
  if (window.__voltChatInjectedBootedV3) {
    try { window._volt_open_chat?.(); } catch (_) {}
    return;
  }
  window.__voltChatInjectedBootedV3 = true;
  const _VOLT_CHAT_VERSION = '2.2';
  const CHAT_MAX_TEXT = 500;
  let lastSenderId = null;
  let lastMessageTime = 0; // Fix: Declare missing variable
  const msgById = new Map(); // Store messages to handle edits/replies
  const MAX_MSG_CACHE = 500; // Fix: Cap message cache
  const MAX_RENDERED_MESSAGES = 120; // Phase 3 FPS: cap live DOM nodes in the injected chat panel.
  const CHAT_I18N = {
    fr: {
      scrollTop: "Aller en haut", close: "Fermer (via l'extension)", empty: "Aucun message — sois le premier !", newMessage: "Nouveau message", newMessages: "nouveaux messages", reply: "Réponse", replyTo: "Répondre à", anonymous: "Anonyme", cancelReply: "Annuler la réponse", cancel: "Annuler", placeholder: "Écris ton message...", sendTitle: "Envoyer (Entrée)", enterToSend: "pour envoyer", slowmode: "SLOWMODE", premium: "PASSE PREMIUM POUR LE RETIRER", waitSlowmode: "Veuillez patienter 5s entre chaque message.", back: "← Retour", level: "NIVEAU", avg: "MOYENNE", runs: "RUNS", friends: "✓ Amis", pending: "En attente...", accept: "Accepter", addFriend: "Ajouter en ami", privateMessage: "Envoyer un message", adminPrivateMessage: "Admin : message privé", openExtensionToDm: " Clique sur l'extension Gaming Tools pour envoyer ton message !", banning: "Bannissement en cours...", banSuccess: " Utilisateur banni avec succès.", banError: " Erreur lors du bannissement : ", unknown: "Inconnue", severeViolation: "Violation grave détectée par un modérateur.", nuclearBanConfirm: (pseudo) => ` ATTENTION \n\nVoulez-vous vraiment appliquer un BAN NUCLÉAIRE sur "${pseudo}" ?\n\nActions :\n1. HWID banni de façon permanente.\n2. Suppression instantanée de toutes ses données locales.\n3. Compte désactivé.\n\nC'est IRRÉVERSIBLE.`, notLoggedIn: "Connecte-toi dans l\'extension.", messageFailed: "Message non envoyé. Réessaie.", chatUnavailable: "Chat indisponible pour le moment. Réessaie dans quelques secondes."
    },
    en: {
      scrollTop: "Go to top", close: "Close (from extension)", empty: "No messages — be the first!", newMessage: "New message", newMessages: "new messages", reply: "Reply", replyTo: "Reply to", anonymous: "Anonymous", cancelReply: "Cancel reply", cancel: "Cancel", placeholder: "Write your message...", sendTitle: "Send (Enter)", enterToSend: "to send", slowmode: "SLOWMODE", premium: "GET PREMIUM TO REMOVE IT", waitSlowmode: "Please wait 5s between messages.", back: "← Back", level: "LEVEL", avg: "AVERAGE", runs: "RUNS", friends: "✓ Friends", pending: "Pending...", accept: "Accept", addFriend: "Add friend", privateMessage: "Send a message", adminPrivateMessage: "Admin: private message", openExtensionToDm: " Click the Gaming Tools extension to send your message!", banning: "Banning...", banSuccess: " User banned successfully.", banError: " Ban error: ", unknown: "Unknown", severeViolation: "Severe violation detected by a moderator.", nuclearBanConfirm: (pseudo) => ` WARNING \n\nDo you really want to apply a NUCLEAR BAN to "${pseudo}"?\n\nActions:\n1. HWID permanently banned.\n2. Instant deletion of all local data.\n3. Account disabled.\n\nThis is IRREVERSIBLE.`, notLoggedIn: "Log in from the extension.", messageFailed: "Message not sent. Please try again.", chatUnavailable: "Chat unavailable right now. Try again in a few seconds."
    },
    "pt-BR": {
      scrollTop: "Ir para o topo", close: "Fechar (pela extensão)", empty: "Nenhuma mensagem — seja o primeiro!", newMessage: "Nova mensagem", newMessages: "novas mensagens", reply: "Resposta", replyTo: "Responder a", anonymous: "Anônimo", cancelReply: "Cancelar resposta", cancel: "Cancelar", placeholder: "Escreva sua mensagem...", sendTitle: "Enviar (Enter)", enterToSend: "para enviar", slowmode: "SLOWMODE", premium: "ASSINE PREMIUM PARA REMOVER", waitSlowmode: "Aguarde 5s entre cada mensagem.", back: "← Voltar", level: "NÍVEL", avg: "MÉDIA", runs: "RUNS", friends: "✓ Amigos", pending: "Pendente...", accept: "Aceitar", addFriend: "Adicionar amigo", privateMessage: "Enviar mensagem", adminPrivateMessage: "Admin: mensagem privada", openExtensionToDm: " Clique na extensão Gaming Tools para enviar sua mensagem!", banning: "Banindo...", banSuccess: " Usuário banido com sucesso.", banError: " Erro ao banir: ", unknown: "Desconhecido", severeViolation: "Violação grave detectada por um moderador.", nuclearBanConfirm: (pseudo) => ` ATENÇÃO \n\nDeseja realmente aplicar um BAN NUCLEAR em "${pseudo}"?\n\nAções:\n1. HWID banido permanentemente.\n2. Exclusão instantânea de todos os dados locais.\n3. Conta desativada.\n\nIsso é IRREVERSÍVEL.`, notLoggedIn: "Faça login na extensão.", messageFailed: "Mensagem não enviada. Tente novamente.", chatUnavailable: "Chat indisponível no momento. Tente novamente em alguns segundos."
    },
    zh: {
      scrollTop: "回到顶部", close: "关闭（通过扩展）", empty: "暂无消息 — 快来发送第一条！", newMessage: "新消息", newMessages: "条新消息", reply: "回复", replyTo: "回复", anonymous: "匿名", cancelReply: "取消回复", cancel: "取消", placeholder: "输入你的消息...", sendTitle: "发送（Enter）", enterToSend: "发送", slowmode: "慢速模式", premium: "升级 PREMIUM 即可移除", waitSlowmode: "请等待 5 秒后再发送下一条消息。", back: "← 返回", level: "等级", avg: "平均", runs: "RUNS", friends: "✓ 好友", pending: "等待中...", accept: "接受", addFriend: "添加好友", privateMessage: "发送消息", adminPrivateMessage: "管理员：私信", openExtensionToDm: " 点击 Gaming Tools 扩展来发送你的消息！", banning: "正在封禁...", banSuccess: " 用户已成功封禁。", banError: " 封禁错误：", unknown: "未知", severeViolation: "管理员检测到严重违规。", nuclearBanConfirm: (pseudo) => ` 警告 \n\n确定要对 "${pseudo}" 执行核封禁吗？\n\n操作：\n1. HWID 永久封禁。\n2. 立即删除所有本地数据。\n3. 账户停用。\n\n此操作不可逆。`, notLoggedIn: "请在扩展中登录。", messageFailed: "消息发送失败，请重试。", chatUnavailable: "聊天暂时不可用，请几秒后重试。"
    }
  };
  let chatLang = 'fr';
  const chatT = (key, ...args) => {
    const value = (CHAT_I18N[chatLang] && CHAT_I18N[chatLang][key]) || CHAT_I18N.fr[key] || key;
    return typeof value === 'function' ? value(...args) : value;
  };
  const chatUnreadText = (count) => {
    if (chatLang === 'zh') return `↓ ${count} ${CHAT_I18N.zh.newMessages}`;
    return `↓ ${count} ${count > 1 ? chatT('newMessages') : chatT('newMessage')}`;
  };
  function runtimeMessageSafe(payload, callback) {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
        if (callback) callback({ success: false, error: 'runtime_unavailable' });
        return;
      }
      chrome.runtime.sendMessage(payload, (res) => {
        const err = chrome.runtime?.lastError;
        if (err) {
          if (callback) callback({ success: false, error: err.message });
          return;
        }
        if (callback) callback(res || {});
      });
    } catch (e) {
      if (callback) callback({ success: false, error: e.message || String(e) });
    }
  }
  const initChatUI = () => {
    if (document.getElementById('volt-chat-panel')) return;

    // Load local fonts dynamically
    if (!document.getElementById('volt-fonts-css')) {
      const fontLink = document.createElement('link');
      fontLink.id = 'volt-fonts-css';
      fontLink.rel = 'stylesheet';
      fontLink.href = chrome.runtime.getURL('fonts/fonts.css');
      document.head.appendChild(fontLink);
    }

    // ──  STYLES ──────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.id = 'volt-chat-styles';
    style.textContent = `
      /* Removed external @import to preserve privacy */

      /* ── VARIABLES (PREMIUM ORANGE) ── */
      :root {
        --volt-c-bg:        #0c0d12;
        --volt-c-panel:     #111218;
        --volt-c-surface:   #181921;
        --volt-c-border:    rgba(255,255,255,0.07);
        --volt-c-accent:    #c17f59;
        --volt-c-accent-rgb: 193, 127, 89;
        --volt-c-accent2:   #d68d63;
        --volt-c-online:    #f59e0b;
        --volt-c-text:      #e2e2e7;
        --volt-c-muted:     #80859a;
        --volt-c-own-bg:    rgba(var(--volt-c-accent-rgb), 0.12);
        --volt-c-own-border:rgba(var(--volt-c-accent-rgb), 0.25);
        --volt-panel-w:     360px;
        --volt-panel-h:     560px;
        --volt-radius:      18px;
        --volt-font-ui:     'Rajdhani', sans-serif;
        --volt-font-body:   'DM Sans', sans-serif;
      }

      #volt-chat-panel *, #volt-chat-panel *::before, #volt-chat-panel *::after {
        box-sizing: border-box;
      }

      /* ── PANEL CONTAINER ── */
      #volt-chat-panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: var(--volt-panel-w);
        height: var(--volt-panel-h);
        background: var(--volt-c-panel);
        border: 1px solid var(--volt-c-border);
        border-radius: var(--volt-radius);
        box-shadow:
          0 0 0 1px rgba(var(--volt-c-accent-rgb), 0.1),
          0 24px 60px rgba(0,0,0,0.8),
          0 8px 20px rgba(0,0,0,0.5),
          inset 0 1px 0 rgba(255,255,255,0.04);
        display: flex;
        flex-direction: column;
        z-index: 2147483640;
        font-family: var(--volt-font-body);
        overflow: hidden;
        transform: translateY(20px) scale(0.96);
        opacity: 0;
        pointer-events: none;
        transition:
          transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
          opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        will-change: transform, opacity;
      }
      #volt-chat-panel.volt-open {
        transform: translateY(0) scale(1);
        opacity: 1;
        pointer-events: all;
      }

      /* Top accent line */
      #volt-chat-panel::before {
        content: '';
        position: absolute;
        top: 0; left: 16px; right: 16px;
        height: 1px;
        background: linear-gradient(90deg,
          transparent 0%,
          rgba(var(--volt-c-accent-rgb), 0.6) 30%,
          rgba(214, 141, 99, 0.6) 70%,
          transparent 100%);
        z-index: 1;
      }

      /* ── HEADER ── */
      #volt-chat-header {
        padding: 16px 18px 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: grab;
        user-select: none;
        background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%);
        border-bottom: 1px solid var(--volt-c-border);
        flex-shrink: 0;
      }
      #volt-chat-header:active { cursor: grabbing; }

      .volt-header-icon {
        width: 34px;
        height: 34px;
        background: linear-gradient(135deg, var(--volt-c-accent), var(--volt-c-accent2));
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        flex-shrink: 0;
        box-shadow: 0 4px 14px rgba(var(--volt-c-accent-rgb), 0.35);
      }

      .volt-header-info {
        flex: 1;
        min-width: 0;
      }
      .volt-header-title {
        font-family: var(--volt-font-ui);
        font-size: 16px;
        font-weight: 700;
        color: var(--volt-c-text);
        letter-spacing: 0.8px;
        line-height: 1;
        margin-bottom: 4px;
      }
      .volt-header-sub {
        font-size: 10px;
        color: var(--volt-c-muted);
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        line-height: 1;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .volt-online-dot {
        width: 6px;
        height: 6px;
        background: var(--volt-c-online);
        border-radius: 50%;
        box-shadow: 0 0 8px var(--volt-c-online);
        animation: volt-pulse 2.4s ease-in-out infinite;
        flex-shrink: 0;
      }
      @keyframes volt-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.7); }
      }

      .volt-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .volt-header-btn {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--volt-c-muted);
        font-size: 12px;
        transition: all 0.18s;
        flex-shrink: 0;
      }
      .volt-header-btn:hover {
        background: rgba(255,255,255,0.08);
        color: var(--volt-c-text);
      }
      .volt-header-btn.volt-close-btn:hover {
        background: rgba(255,80,80,0.12);
        border-color: rgba(255,80,80,0.25);
        color: #ff5050;
      }

      /* ── MESSAGES AREA ── */
      #volt-chat-messages {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 12px 12px 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        scroll-behavior: smooth;
      }
      #volt-chat-messages::-webkit-scrollbar { width: 4px; }
      #volt-chat-messages::-webkit-scrollbar-track { background: transparent; }
      #volt-chat-messages::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
      }
      #volt-chat-messages::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.2);
      }

      /* Date separator */
      .volt-date-sep {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 10px 0 8px;
        font-size: 10px;
        font-weight: 600;
        color: var(--volt-c-muted);
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .volt-date-sep::before, .volt-date-sep::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--volt-c-border);
      }

      /* Message row */
      .volt-msg-row {
        display: flex;
        flex-direction: column;
        padding: 2px 4px;
        border-radius: 10px;
        transition: background 0.15s;
        position: relative;
      }
      .volt-msg-row:hover {
        background: rgba(255,255,255,0.02);
      }
      .volt-msg-row.volt-first-in-group {
        margin-top: 6px;
      }

      /* Avatar + content layout */
      .volt-msg-body {
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }
      .volt-msg-row.volt-mine {
        align-self: flex-end;
      }
      .volt-msg-row.volt-mine .volt-msg-body {
        flex-direction: row-reverse;
      }

      .volt-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--volt-c-accent), var(--volt-c-accent2));
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--volt-font-ui);
        font-weight: 700;
        font-size: 13px;
        color: #fff;
        overflow: hidden;
        margin-top: 2px;
      }
      .volt-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      /* Spacer when consecutive messages from same user */
      .volt-avatar-spacer {
        width: 30px;
        flex-shrink: 0;
      }

      .volt-msg-content {
        flex: 1;
        min-width: 0;
        max-width: 85%;
      }
      .volt-msg-row.volt-mine .volt-msg-content {
        align-items: flex-end;
        display: flex;
        flex-direction: column;
      }

      /* Header (pseudo + time) — only on first message in group */
      .volt-msg-meta {
        display: flex;
        align-items: baseline;
        gap: 7px;
        margin-bottom: 3px;
      }
      .volt-msg-pseudo {
        font-family: var(--volt-font-ui);
        font-size: 13px;
        font-weight: 600;
        color: var(--volt-c-text);
        letter-spacing: 0.3px;
      }
      .volt-msg-pseudo.volt-own { color: var(--volt-c-accent); }
      .volt-msg-time {
        font-size: 10px;
        color: var(--volt-c-muted);
        font-weight: 400;
      }

      /* Bubble */
      .volt-bubble {
        display: inline-block;
        background: var(--volt-c-surface);
        border: 1px solid var(--volt-c-border);
        border-radius: 12px;
        padding: 7px 11px;
        font-size: 13.5px;
        color: var(--volt-c-text);
        line-height: 1.45;
        word-break: break-word;
        max-width: 100%;
        transition: border-color 0.15s;
        position: relative;
      }
      .volt-msg-row.volt-mine .volt-bubble {
        background: var(--volt-c-own-bg);
        border-color: var(--volt-c-own-border);
        color: #cdd8f8;
      }
      /* Bubble shape variants */
      .volt-msg-row:not(.volt-mine) .volt-first-bubble { border-top-left-radius: 4px; }
      .volt-msg-row:not(.volt-mine) .volt-last-bubble  { border-bottom-left-radius: 4px; }
      .volt-msg-row.volt-mine       .volt-first-bubble { border-top-right-radius: 4px; }
      .volt-msg-row.volt-mine       .volt-last-bubble  { border-bottom-right-radius: 4px; }

      /* New message animation */
      @keyframes volt-msg-in {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .volt-msg-row.volt-new {
        animation: volt-msg-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      /* ── EMPTY STATE ── */
      #volt-chat-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        gap: 10px;
        color: var(--volt-c-muted);
        text-align: center;
        padding: 20px;
      }
      .volt-empty-icon {
        font-size: 32px;
        opacity: 0.4;
      }
      .volt-empty-label {
        font-size: 13px;
        font-weight: 500;
      }

      /* ── TYPING INDICATOR ── */
      #volt-typing-indicator {
        padding: 6px 16px;
        font-size: 11px;
        color: var(--volt-c-muted);
        font-style: italic;
        min-height: 22px;
        flex-shrink: 0;
      }

      /* ── INPUT AREA ── */
      #volt-chat-inputbar {
        padding: 10px 12px 12px;
        border-top: 1px solid var(--volt-c-border);
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: rgba(0,0,0,0.2);
        flex-shrink: 0;
      }

      .volt-input-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
      }

      #volt-chat-input {
        flex: 1;
        background: var(--volt-c-surface);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        padding: 9px 13px;
        color: var(--volt-c-text);
        font-family: var(--volt-font-body);
        font-size: 13.5px;
        font-weight: 400;
        outline: none;
        resize: none;
        max-height: 80px;
        min-height: 38px;
        line-height: 1.4;
        transition: border-color 0.2s, box-shadow 0.2s;
        scrollbar-width: none;
      }
      #volt-chat-input::-webkit-scrollbar { display: none; }
      #volt-chat-input::placeholder { color: var(--volt-c-muted); }
      #volt-chat-input:focus {
        border-color: rgba(var(--volt-c-accent-rgb), 0.45);
        box-shadow: 0 0 0 3px rgba(var(--volt-c-accent-rgb), 0.1);
      }

      #volt-chat-send {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--volt-c-accent), var(--volt-c-accent2));
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(var(--volt-c-accent-rgb), 0.3);
        color: #fff;
      }
      #volt-chat-send:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 6px 18px rgba(var(--volt-c-accent-rgb), 0.45);
      }
      #volt-chat-send:active { transform: translateY(0) scale(0.96); }
      #volt-chat-send svg {
        width: 17px;
        height: 17px;
        fill: none;
        stroke: #111218;
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      #volt-chat-send:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .volt-input-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .volt-char-counter {
        font-size: 10px;
        color: var(--volt-c-muted);
        font-weight: 500;
        transition: color 0.15s;
      }
      .volt-char-counter.volt-warn { color: #f59e0b; }
      .volt-char-counter.volt-over { color: #ef4444; }
      .volt-input-hint {
        font-size: 10px;
        color: var(--volt-c-muted);
      }
      .volt-input-hint kbd {
        font-family: inherit;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px;
        padding: 1px 5px;
        font-size: 9px;
      }

      /* ── NOT-LOGGED-IN STATE ── */
      #volt-chat-login-wall {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 24px;
        text-align: center;
      }
      .volt-login-icon { font-size: 36px; opacity: 0.5; }
      .volt-login-text {
        font-size: 13px;
        color: var(--volt-c-muted);
        line-height: 1.5;
      }
      .volt-login-text strong { color: var(--volt-c-text); }

      /* ── SCROLL TO BOTTOM BUTTON ── */
      #volt-scroll-btn {
        position: absolute;
        bottom: 70px;
        right: 12px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--volt-c-accent);
        color: #fff;
        border: none;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        transition: all 0.18s;
        z-index: 10;
      }
      #volt-scroll-btn:hover { transform: scale(1.1); }
      #volt-scroll-btn.visible { display: flex; }

      /* ── UNREAD BADGE ── */
      #volt-unread-badge {
        position: absolute;
        bottom: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--volt-c-accent);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 12px;
        border-radius: 20px;
        cursor: pointer;
        display: none;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(79,140,255,0.4);
        white-space: nowrap;
        z-index: 10;
      }
      #volt-unread-badge.visible { display: block; }

      /* ── RESIZE HANDLES ── */
      .volt-resize-h { position: absolute; z-index: 100; }
      #volt-resize-t  { top: 0; left: 10px; right: 10px; height: 6px; cursor: ns-resize; }
      #volt-resize-b  { bottom: 0; left: 10px; right: 10px; height: 6px; cursor: ns-resize; }
      #volt-resize-l  { left: 0; top: 10px; bottom: 10px; width: 6px; cursor: ew-resize; }
      #volt-resize-r  { right: 0; top: 10px; bottom: 10px; width: 6px; cursor: ew-resize; }
      
      .volt-resize-c { position: absolute; width: 12px; height: 12px; z-index: 101; }
      #volt-resize-tl { top: 0; left: 0; cursor: nw-resize; }
      #volt-resize-tr { top: 0; right: 0; cursor: ne-resize; }
      #volt-resize-bl { bottom: 0; left: 0; cursor: sw-resize; }
      #volt-resize-br { bottom: 0; right: 0; cursor: se-resize; }

      /* ── REPLY UI ── */
      #volt-reply-bar {
        display: none;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 10px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 12px;
      }
      #volt-reply-bar.visible { display: flex; }
      .volt-reply-left {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
      }
      .volt-reply-title {
        font-family: var(--volt-font-ui);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.7px;
        color: var(--volt-c-accent2);
        text-transform: uppercase;
        line-height: 1;
      }
      .volt-reply-snippet {
        font-size: 12px;
        color: var(--volt-c-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #volt-reply-cancel {
        width: 26px;
        height: 26px;
        border-radius: 8px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        cursor: pointer;
        color: var(--volt-c-muted);
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #volt-reply-cancel:hover {
        background: rgba(255,80,80,0.12);
        border-color: rgba(255,80,80,0.25);
        color: #ff5050;
      }
      .volt-reply-quote {
        border-left: 3px solid rgba(var(--volt-c-accent-rgb), 0.55);
        background: rgba(255,255,255,0.03);
        padding: 6px 9px;
        border-radius: 10px;
        margin-bottom: 6px;
      }
      .volt-reply-quote .volt-reply-from {
        font-size: 11px;
        font-weight: 700;
        color: var(--volt-c-accent2);
        margin-bottom: 2px;
        font-family: var(--volt-font-ui);
      }
      .volt-reply-quote .volt-reply-text {
        font-size: 12px;
        color: var(--volt-c-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .volt-msg-row .volt-reply-action {
        position: absolute;
        top: 8px;
        right: 10px;
        width: 24px;
        height: 24px;
        border-radius: 8px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        color: var(--volt-c-muted);
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 12px;
      }
      .volt-msg-row:hover .volt-reply-action { display: flex; }
      .volt-msg-row.volt-mine .volt-reply-action { right: auto; left: 10px; }
      .volt-msg-row .volt-reply-action:hover {
        background: rgba(255,255,255,0.08);
        color: var(--volt-c-text);
      }

      /* ── PROFILE VIEW (INTEGRATED) ── */
      #volt-profile-view {
        position: absolute;
        top: 65px; /* header height */
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--volt-c-panel);
        z-index: 100;
        display: flex;
        flex-direction: column;
        opacity: 0;
        pointer-events: none;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        transform: translateX(20px);
        overflow-y: auto;
        padding-top: 5px;
      }
      #volt-profile-view.volt-visible {
        opacity: 1;
        pointer-events: all;
        transform: translateX(0);
      }
      .volt-profile-card {
        width: 100%;
        background: transparent;
        border: none;
        box-shadow: none;
        transform: none !important;
      }
      .volt-profile-banner {
        width: 100%;
        height: 85px;
        background: var(--volt-c-surface);
        position: relative;
        overflow: hidden;
      }
      .volt-profile-banner img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .volt-profile-avatar-wrap {
        width: 76px;
        height: 76px;
        border-radius: 50%;
        border: 4px solid var(--volt-c-panel);
        background: var(--volt-c-surface);
        margin: -38px auto 8px;
        position: relative;
        overflow: hidden;
        z-index: 2;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      }
      .volt-profile-avatar-wrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .volt-profile-content {
        padding: 0 16px 20px;
        text-align: center;
      }
      .volt-profile-pseudo {
        font-family: var(--volt-font-ui);
        font-size: 18px;
        font-weight: 700;
        color: var(--volt-c-text);
        letter-spacing: 0.5px;
        margin-bottom: 2px;
      }
      .volt-profile-level {
        font-family: var(--volt-font-ui);
        font-size: 10px;
        font-weight: 800;
        color: var(--volt-c-accent);
        letter-spacing: 1.2px;
        text-transform: uppercase;
        margin-bottom: 15px;
        opacity: 0.9;
      }
      .volt-profile-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 18px;
      }
      .volt-stat-box {
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--volt-c-border);
        border-radius: 10px;
        padding: 8px;
      }
      .volt-stat-val {
        font-family: var(--volt-font-ui);
        font-size: 13px;
        font-weight: 700;
        color: var(--volt-c-text);
      }
      .volt-stat-label {
        font-size: 8px;
        color: var(--volt-c-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 2px;
      }
      .volt-profile-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .volt-btn-profile {
        width: 100%;
        padding: 8px;
        border-radius: 8px;
        border: none;
        font-family: var(--volt-font-body);
        font-weight: 600;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .volt-btn-primary {
        background: linear-gradient(135deg, var(--volt-c-accent), var(--volt-c-accent2));
        color: #fff;
        box-shadow: 0 4px 10px rgba(var(--volt-c-accent-rgb), 0.2);
      }
      .volt-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(var(--volt-c-accent-rgb), 0.3); }
      .volt-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
      
      .volt-btn-outline:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }
      
      .volt-btn-danger {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        color: #ef4444;
        margin-top: 12px;
        font-weight: 700;
      }
      .volt-btn-danger:hover {
        background: #ef4444;
        color: #fff;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
      }

      .volt-profile-back {
        position: absolute;
        top: 8px;
        left: 10px;
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.1);
        color: var(--volt-c-text);
        padding: 5px 12px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        cursor: pointer;
        z-index: 10;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        backdrop-filter: blur(4px);
      }
      .volt-profile-back:hover { 
        background: var(--volt-c-accent); 
        border-color: var(--volt-c-accent);
        transform: translateX(-2px);
      }

      /* ── TOAST ── */
      .volt-chat-toast {
        position: absolute;
        bottom: 85px;
        left: 50%;
        transform: translateX(-50%) translateY(10px);
        background: rgba(12, 13, 18, 0.98);
        border: 1px solid rgba(var(--volt-c-accent-rgb), 0.5);
        color: var(--volt-c-text);
        padding: 8px 16px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 500;
        z-index: 300;
        box-shadow: 0 8px 24px rgba(0,0,0,0.6);
        opacity: 0;
        pointer-events: none;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        text-align: center;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        width: max-content;
        backdrop-filter: blur(8px);
      }
      .volt-chat-toast.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
        pointer-events: all;
      }
      .volt-toast-title {
        color: #f59e0b;
        font-weight: 800;
        text-transform: uppercase;
        font-size: 9.5px;
      }
      .volt-toast-sep {
        opacity: 0.3;
        color: var(--volt-c-text);
      }
      .volt-toast-premium {
        color: var(--volt-c-accent);
        font-weight: 800;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    `;
    document.head.appendChild(style);

    // ──  DOM ─────────────────────────────────────────────────────────────
    const panel = document.createElement('div');
    panel.id = 'volt-chat-panel';
    panel.innerHTML = `
      <div id="volt-resize-t" class="volt-resize-h"></div>
      <div id="volt-resize-b" class="volt-resize-h"></div>
      <div id="volt-resize-l" class="volt-resize-h"></div>
      <div id="volt-resize-r" class="volt-resize-h"></div>
      <div id="volt-resize-tl" class="volt-resize-c"></div>
      <div id="volt-resize-tr" class="volt-resize-c"></div>
      <div id="volt-resize-bl" class="volt-resize-c"></div>
      <div id="volt-resize-br" class="volt-resize-c"></div>

      <div id="volt-chat-header">
        <div class="volt-header-icon"></div>
        <div class="volt-header-info">
          <div class="volt-header-title">GLOBAL CHAT</div>
          <div class="volt-header-sub">
            <div class="volt-online-dot"></div>
            <span id="volt-online-count">En ligne</span>
          </div>
        </div>
        <div class="volt-header-actions">
          <div class="volt-header-btn" id="volt-scroll-top-btn" title="${chatT('scrollTop')}">↑</div>
          <div class="volt-header-btn volt-close-btn" id="volt-close-btn" title="${chatT('close')}">✕</div>
        </div>
      </div>

      <div id="volt-chat-messages">
        <div id="volt-chat-empty">
          <div class="volt-empty-icon"></div>
          <div class="volt-empty-label" id="volt-empty-label">${chatT('empty')}</div>
        </div>
      </div>

      <div id="volt-unread-badge">↓ ${chatT('newMessage')}</div>
      <button id="volt-scroll-btn">↓</button>

      <div id="volt-typing-indicator"></div>

      <div id="volt-chat-inputbar">
        <div id="volt-reply-bar" aria-hidden="true">
          <div class="volt-reply-left">
            <div class="volt-reply-title" id="volt-reply-title">${chatT('reply')}</div>
            <div class="volt-reply-snippet" id="volt-reply-snippet"></div>
          </div>
          <button id="volt-reply-cancel" title="${chatT('cancelReply')}" aria-label="${chatT('cancel')}">✕</button>
        </div>
        <div class="volt-input-row">
          <textarea
            id="volt-chat-input"
            placeholder="${chatT('placeholder')}"
            maxlength="500"
            rows="1"
          ></textarea>
          <button id="volt-chat-send" disabled title="${chatT('sendTitle')}">
            <svg viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <div class="volt-input-footer">
          <span class="volt-char-counter" id="volt-char-count">0/400</span>
          <span class="volt-input-hint"><kbd>Entrée</kbd> ${chatT('enterToSend')}</span>
        </div>
      </div>

      <div class="volt-chat-toast" id="volt-chat-toast">
        <span class="volt-toast-title">${chatT('slowmode')}</span>
        <span class="volt-toast-premium">${chatT('premium')}</span>
      </div>
    `;
    (document.documentElement || document.body).appendChild(panel);

    // ──  PROFILE VIEW HOLDER (INTEGRATED) ─────────────────────────────────
    const profileView = document.createElement('div');
    profileView.id = 'volt-profile-view';
    panel.appendChild(profileView);

    // ──  REFS ─────────────────────────────────────────────────────────────
    const header = panel.querySelector('#volt-chat-header');
    const closeBtn = panel.querySelector('#volt-close-btn');
    const scrollTopBtn = panel.querySelector('#volt-scroll-top-btn');
    const messagesDiv = panel.querySelector('#volt-chat-messages');
    const emptyState = panel.querySelector('#volt-chat-empty');
    const inputEl = panel.querySelector('#volt-chat-input');
    const sendBtn = panel.querySelector('#volt-chat-send');
    const charCount = panel.querySelector('#volt-char-count');
    const _typingEl = panel.querySelector('#volt-typing-indicator');
    const scrollBtn = panel.querySelector('#volt-scroll-btn');
    const unreadBadge = panel.querySelector('#volt-unread-badge');
    const replyBar = panel.querySelector('#volt-reply-bar');
    const replyTitle = panel.querySelector('#volt-reply-title');
    const replySnippet = panel.querySelector('#volt-reply-snippet');
    const replyCancelBtn = panel.querySelector('#volt-reply-cancel');
    const chatToast = panel.querySelector('#volt-chat-toast');

    function applyChatLanguage() {
      scrollTopBtn?.setAttribute('title', chatT('scrollTop'));
      closeBtn?.setAttribute('title', chatT('close'));
      panel.querySelector('#volt-empty-label')?.replaceChildren(document.createTextNode(chatT('empty')));
      if (unreadBadge) {
        if (unreadCount > 0) unreadBadge.textContent = chatUnreadText(unreadCount);
        else unreadBadge.textContent = `↓ ${chatT('newMessage')}`;
      }
      if (!replyTarget && replyTitle) replyTitle.textContent = chatT('reply');
      replyCancelBtn?.setAttribute('title', chatT('cancelReply'));
      replyCancelBtn?.setAttribute('aria-label', chatT('cancel'));
      if (inputEl) inputEl.placeholder = chatT('placeholder');
      sendBtn?.setAttribute('title', chatT('sendTitle'));
      const hint = panel.querySelector('.volt-input-hint');
      if (hint) {
        const kbd = document.createElement('kbd');
        kbd.textContent = 'Entrée';
        hint.replaceChildren(kbd, document.createTextNode(' ' + chatT('enterToSend')));
      }
      const toastTitle = panel.querySelector('.volt-toast-title');
      const toastPremium = panel.querySelector('.volt-toast-premium');
      if (toastTitle) toastTitle.textContent = chatT('slowmode');
      if (toastPremium) toastPremium.textContent = chatT('premium');
    }

    // ──  STATE ────────────────────────────────────────────────────────────
    let isOpen = false;
    let myUid = null;
    let myRole = null;
    let isChatFocused = false;
    // SECURITY FIX: Remove shadowing lastSenderId declaration — use outer scope
    let _msgCount = 0;
    let unreadCount = 0;
    let isAtBottom = true;
    let panelH = 560;
    let replyTarget = null; // { id, uid, pseudo, text }
    let bulkRendering = false;

    try {
      chrome.storage.local.get(['preferredLanguage'], ({ preferredLanguage }) => {
        if (chrome.runtime?.lastError) { applyChatLanguage(); return; }
        chatLang = CHAT_I18N[preferredLanguage] ? preferredLanguage : 'fr';
        applyChatLanguage();
      });
      // Bind storage listener once even if initChatUI is invoked multiple times.
      if (!window.__VOLT_CHAT_STORAGE_LISTENER_BOUND) {
        window.__VOLT_CHAT_STORAGE_LISTENER_BOUND = true;
        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace === 'local' && changes.preferredLanguage) {
            const next = changes.preferredLanguage.newValue;
            chatLang = CHAT_I18N[next] ? next : 'fr';
            applyChatLanguage();
          }
        });
      }
    } catch (_) { applyChatLanguage(); }

    // msgById is already declared in the outer scope
    // const msgById = new Map();

    function formatChatStamp(createdAt) {
      if (!createdAt) return '';
      const t = new Date(createdAt);
      if (Number.isNaN(t.getTime())) return '';
      const diffMs = Math.abs(Date.now() - t.getTime());
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (diffMs > oneDayMs) {
        const dd = String(t.getDate()).padStart(2, '0');
        const mm = String(t.getMonth() + 1).padStart(2, '0');
        const yy = String(t.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
      }
      return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function setReplyTarget(t) {
      replyTarget = t || null;
      if (!replyBar) return;
      if (!replyTarget) {
        replyBar.classList.remove('visible');
        replyBar.setAttribute('aria-hidden', 'true');
        if (replySnippet) replySnippet.textContent = '';
        return;
      }
      replyBar.classList.add('visible');
      replyBar.setAttribute('aria-hidden', 'false');
      if (replyTitle) replyTitle.textContent = `${chatT('replyTo')} ${replyTarget.pseudo || chatT('anonymous')}`;
      if (replySnippet) replySnippet.textContent = (replyTarget.text || '').slice(0, 140);
    }

    replyCancelBtn?.addEventListener('click', () => setReplyTarget(null));

    let toastTimeout;
    function showChatToast(msg, duration = 2500) {
      if (!chatToast) return;
      const titleEl = chatToast.querySelector('.volt-toast-title');
      if (titleEl) titleEl.textContent = String(msg || '');
      chatToast.classList.add('visible');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        chatToast.classList.remove('visible');
      }, duration);
    }

    // ──  Get local user id & Role & Persistence ──────────────────────────
    chrome.storage.local.get(['id', 'uid', 'role', 'chatPanelState', 'chatPanelOpen', 'chatPanelW', 'chatPanelH', 'chatPanelX', 'chatPanelY', 'volt_profile_cache'], (res) => {
      if (chrome.runtime?.lastError) {
        loadHistory();
        startHistoryPolling();
        return;
      }
      if (res.id) myUid = res.id;
      else if (res.uid) myUid = res.uid;
      else if (res.volt_profile_cache?.id) myUid = res.volt_profile_cache.id;

      if (res.role) myRole = res.role;

      // Support both old individual keys and new atomic chatPanelState object.
      // Defensive: clamp every value so a corrupted storage entry can't
      // push the panel off-screen or below its minimum readable size.
      const MIN_W = 280, MIN_H = 250;
      const vw = Math.max(0, window.innerWidth || 0);
      const vh = Math.max(0, window.innerHeight || 0);
      const ps = res.chatPanelState || {};
      const rawW = Number(ps.w ?? res.chatPanelW);
      const rawH = Number(ps.h ?? res.chatPanelH);
      const rawX = Number(ps.x !== undefined ? ps.x : res.chatPanelX);
      const rawY = Number(ps.y !== undefined ? ps.y : res.chatPanelY);
      const panelOpenSaved = ps.open !== undefined ? ps.open : res.chatPanelOpen;

      const panelW = Number.isFinite(rawW) ? Math.max(MIN_W, Math.min(vw - 24, rawW)) : null;
      const panelHSaved = Number.isFinite(rawH) ? Math.max(MIN_H, Math.min(vh - 24, rawH)) : null;

      if (panelW) panel.style.width = panelW + 'px';
      if (panelHSaved) { panelH = panelHSaved; panel.style.height = panelH + 'px'; }

      if (Number.isFinite(rawX) && Number.isFinite(rawY)) {
        const safeW = panelW || MIN_W;
        const safeH = panelHSaved || MIN_H;
        const panelX = Math.max(0, Math.min(Math.max(0, vw - safeW), rawX));
        const panelY = Math.max(0, Math.min(Math.max(0, vh - safeH), rawY));
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
        panel.style.left = panelX + 'px';
        panel.style.top = panelY + 'px';
      }

      // Only auto-open if it was explicitly open before refresh
      if (panelOpenSaved === true) openPanel();

      // Load history AFTER we have myUid
      loadHistory();
      startHistoryPolling();
    });

    // ──  RESIZE HANDLES (8 Directions) ────────────────────────────────────
    let isResizing = false;
    let resType = ''; 
    let rStartY, rStartX, rStartW, rStartH, rStartT, rStartL;

    panel.querySelectorAll('.volt-resize-h, .volt-resize-c').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        isResizing = true;
        resType = el.id.replace('volt-resize-', '');
        const rect = panel.getBoundingClientRect();
        rStartY = e.clientY;
        rStartX = e.clientX;
        rStartW = rect.width;
        rStartH = rect.height;
        rStartT = rect.top;
        rStartL = rect.left;

        // On bascule en top/left pour que le calcul soit plus simple
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
        panel.style.top = rStartT + 'px';
        panel.style.left = rStartL + 'px';

        document.body.style.userSelect = 'none';
        e.stopPropagation();
        e.preventDefault();
      });
    });

    // Resize + Drag event handling is done by the unified listeners below (see DRAG section).

    let _savePanelTimeout = null;
    try { window.addEventListener('pagehide', () => clearTimeout(_savePanelTimeout), { once: true }); } catch (_) {}
    function savePanelState() {
      if (_savePanelTimeout) clearTimeout(_savePanelTimeout);
      _savePanelTimeout = setTimeout(() => {
        const rect = panel.getBoundingClientRect();
        // Atomic write: one object instead of 5 separate storage operations
        chrome.storage.local.set({ 
          chatPanelOpen: isOpen,
          chatPanelState: {
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            open: isOpen
          }
        }, () => { void chrome.runtime?.lastError; });
      }, 300);
    }

    // ──  DRAG / RESIZE — listeners attached only while user interacts ──────
    // Previously the document-level mousemove/mouseup handlers were attached
    // unconditionally at boot, firing on every global mouse event for the
    // life of the page. They are now bound on mousedown and unbound on
    // mouseup, so the cost is paid only during active drag/resize.
    let isDragging = false, dragSX, dragSY, dragInitX, dragInitY;

    function handleDragMove(e) {
      // --- RESIZE ---
      if (isResizing) {
        let newW = rStartW;
        let newH = rStartH;
        let newT = rStartT;
        let newL = rStartL;

        const dy = e.clientY - rStartY;
        const dx = e.clientX - rStartX;

        if (resType.includes('t')) {
          newH = Math.max(250, rStartH - dy);
          newT = rStartT + (rStartH - newH);
        }
        if (resType.includes('b')) {
          newH = Math.max(250, rStartH + dy);
        }
        if (resType.includes('l')) {
          newW = Math.max(280, rStartW - dx);
          newL = rStartL + (rStartW - newW);
        }
        if (resType.includes('r')) {
          newW = Math.max(280, rStartW + dx);
        }

        panel.style.top = newT + 'px';
        panel.style.left = newL + 'px';
        panel.style.width = newW + 'px';
        panel.style.height = newH + 'px';
        panelH = newH;
      }

      // --- DRAG ---
      if (isDragging) {
        const dx = e.clientX - dragSX;
        const dy = e.clientY - dragSY;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = (dragInitX + dx) + 'px';
        panel.style.top = (dragInitY + dy) + 'px';
      }
    }

    function handleDragUp() {
      let savedAny = false;
      if (isResizing) {
        isResizing = false;
        document.body.style.userSelect = '';
        savedAny = true;
      }
      if (isDragging) {
        isDragging = false;
        document.body.style.userSelect = '';
        savedAny = true;
      }
      detachDragListeners();
      if (savedAny) savePanelState();
    }

    function attachDragListeners() {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragUp);
    }

    function detachDragListeners() {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragUp);
    }

    header.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('volt-header-btn')) return;
      isDragging = true;
      dragSX = e.clientX; dragSY = e.clientY;
      const r = panel.getBoundingClientRect();
      dragInitX = r.left; dragInitY = r.top;
      document.body.style.userSelect = 'none';
      attachDragListeners();
    });

    // Resize handles also need to enable the unified mousemove/mouseup.
    panel.querySelectorAll('.volt-resize-h, .volt-resize-c').forEach(el => {
      el.addEventListener('mousedown', () => { attachDragListeners(); });
    });

    // ──  OPEN / CLOSE ──────────────────────────────────────────────────────
    function openPanel() {
      if (isOpen) return;
      isOpen = true;
      panel.classList.add('volt-open');
      unreadCount = 0;
      hideBadge();
      setTimeout(() => { messagesDiv.scrollTop = messagesDiv.scrollHeight; }, 50);
      setTimeout(() => {
        if (!isOpen) return;
        isChatFocused = true;
        try { inputEl.focus({ preventScroll: true }); } catch (_) { inputEl.focus(); }
      }, 0);
      // Notify popup of open state
      runtimeMessageSafe({ action: 'chatPanelState', open: true });
      const rect = panel.getBoundingClientRect();
      chrome.storage.local.set({
        chatPanelOpen: true,
        chatPanelState: { w: Math.round(rect.width), h: Math.round(rect.height), x: Math.round(rect.left), y: Math.round(rect.top), open: true }
      });
    }

    function closePanel() {
      if (!isOpen) return;
      isOpen = false;
      isChatFocused = false;
      panel.classList.remove('volt-open');
      runtimeMessageSafe({ action: 'chatPanelState', open: false });
      const rect = panel.getBoundingClientRect();
      chrome.storage.local.set({
        chatPanelOpen: false,
        chatPanelState: { w: Math.round(rect.width), h: Math.round(rect.height), x: Math.round(rect.left), y: Math.round(rect.top), open: false }
      });
    }

    function togglePanel() {
      isOpen ? closePanel() : openPanel();
    }

    closeBtn.addEventListener('click', closePanel);
    scrollTopBtn.addEventListener('click', () => { messagesDiv.scrollTop = 0; });

    // ──  SCROLL TRACKING ───────────────────────────────────────────────────
    messagesDiv.addEventListener('scroll', () => {
      const threshold = 80;
      const dist = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight;
      isAtBottom = dist < threshold;
      scrollBtn.classList.toggle('visible', !isAtBottom);
      if (isAtBottom) hideBadge();
    });
    scrollBtn.addEventListener('click', () => {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      hideBadge();
    });
    unreadBadge.addEventListener('click', () => {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      hideBadge();
    });
    function hideBadge() {
      unreadCount = 0;
      unreadBadge.classList.remove('visible');
    }

    // ── ⌨ INPUT HANDLING ────────────────────────────────────────────────────
    const updateFocus = (e) => {
      if (panel.contains(e.target)) {
        isChatFocused = true;
        if (e.target !== inputEl && e.target.tagName !== 'BUTTON') {
          try { inputEl.focus({ preventScroll: true }); } catch (_) { inputEl.focus(); }
        }
      } else {
        isChatFocused = false;
      }
    };
    window.addEventListener('pointerdown', updateFocus, true);

    const inputKeyShield = (e) => {
      isChatFocused = true;
      if (e.key === 'Enter' && !e.shiftKey && e.type === 'keydown') {
        e.preventDefault();
        sendMessage();
      }
      if (e.key === 'Escape' && e.type === 'keydown') {
        e.preventDefault();
        closePanel();
      }
      e.stopPropagation();
    };

    const keyOverride = (e) => {
      if (!isChatFocused) return;
      if (e.target === inputEl) {
        if (e.key === 'Enter' && !e.shiftKey && e.type === 'keydown') {
          e.preventDefault();
          sendMessage();
          e.stopImmediatePropagation();
          return;
        }
        if (e.key === 'Escape' && e.type === 'keydown') {
          e.preventDefault();
          closePanel();
          e.stopImmediatePropagation();
          return;
        }
        // Keep the event away from game hotkeys, but let the browser perform
        // native text editing so IME, paste, accents and mobile input keep working.
        e.stopImmediatePropagation();
        return;
      }
      e.stopImmediatePropagation();
      if (document.activeElement !== inputEl) {
        try { inputEl.focus({ preventScroll: true }); } catch (_) { inputEl.focus(); }
      }
      if (e.key === 'Enter' && !e.shiftKey && e.type === 'keydown') {
        e.preventDefault();
        sendMessage();
      }
      if (e.key === 'Escape' && e.type === 'keydown') {
        e.preventDefault();
        closePanel();
      }
    };
    window.addEventListener('keydown', keyOverride, true);
    window.addEventListener('keyup', keyOverride, true);
    window.addEventListener('keypress', keyOverride, true);
    inputEl.addEventListener('keydown', inputKeyShield);
    inputEl.addEventListener('keyup', inputKeyShield);
    inputEl.addEventListener('keypress', inputKeyShield);
    inputEl.addEventListener('focus', () => { isChatFocused = true; });
    panel.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });

    // Input auto-resize + char counter
    inputEl.addEventListener('input', () => {
      const len = inputEl.value.length;
      const max = CHAT_MAX_TEXT;
      charCount.textContent = `${len}/${max}`;
      charCount.classList.toggle('volt-warn', len >= 300 && len < max);
      charCount.classList.toggle('volt-over', len >= max);
      sendBtn.disabled = len === 0 || len > max;

      // Auto-resize
      inputEl.style.height = '38px'; // Reset to min-height
      if (inputEl.scrollHeight > 38) {
        inputEl.style.height = Math.min(inputEl.scrollHeight, 80) + 'px';
      }
    });

    // ──  RENDER MESSAGE ────────────────────────────────────────────────────
    function renderMessage(m, animate = false) {
      const isMine = (m.uid === myUid) || (m.user_id === myUid);
      const pid = m.uid;
      const mTime = new Date(m.created_at || new Date()).getTime();
      const isGroup = (pid === lastSenderId) && (mTime - lastMessageTime < 300000); // 5 min
      const pseudo = m.pseudo || chatT('anonymous');
      const text = m.text || '';
      const timeStr = formatChatStamp(m.created_at || new Date().toISOString());

      if (m?.id) {
      msgById.set(m.id, m);
      // Fix: Maintain cache size
      if (msgById.size > MAX_MSG_CACHE) {
        const firstKey = msgById.keys().next().value;
        msgById.delete(firstKey);
      }
    }

      lastSenderId = pid;
      lastMessageTime = mTime;
      _msgCount++;
      if (emptyState && messagesDiv.contains(emptyState)) emptyState.remove();

      const row = document.createElement('div');
      if (m?.id) row.dataset.msgId = m.id;
      if (m?.uid) row.dataset.uid = m.uid;
      row.className = [
        'volt-msg-row',
        isMine ? 'volt-mine' : '',
        isGroup ? '' : 'volt-first-in-group',
        animate ? 'volt-new' : ''
      ].filter(Boolean).join(' ');

      // Build avatar
      let avatarHTML;
      if (isGroup) {
        avatarHTML = `<div class="volt-avatar-spacer"></div>`;
      } else {
        const pic = safeMediaUrl(m.profilePic || m.profile_pic);
        const initial = escapeHtml((pseudo || '?')[0].toUpperCase());
        const hasPic = pic && pic.length > 5; 
        if (hasPic) {
          avatarHTML = `<div class="volt-avatar"><img src="${pic}" alt="${initial}"/></div>`;
        } else {
          const color1 = '#' + ((parseInt(pid?.slice(0, 6) || '4f8cff', 16)) & 0xFFFFFF).toString(16).padStart(6, '0');
          avatarHTML = `<div class="volt-avatar" style="background:linear-gradient(135deg,${color1},var(--volt-c-accent2))">${initial}</div>`;
        }
      }

      // Build meta (Premium Fix)
      const pseudoStyle = (typeof VOLT_PREMIUM !== 'undefined')
        ? VOLT_PREMIUM.renderPseudoStyle(m.user_grade, m.user_grade_color, {
            grade_color_mode: m.user_grade_color_mode,
            grade_color_2: m.user_grade_color_2,
            grade_color_angle: m.user_grade_color_angle
          })
        : (isMine ? 'color: var(--volt-c-accent); font-weight: 600;' : '');

      const badgeHTML = (typeof VOLT_PREMIUM !== 'undefined')
        ? /** @type {any} */ (VOLT_PREMIUM).renderBadgeHTML(m.user_grade, m.user_grade_badge)
        : '';

      const metaHTML = isGroup ? '' : `
        <div class="volt-msg-meta">
          <span class="volt-msg-pseudo ${isMine ? 'volt-own' : ''}">${badgeHTML}<span style="${pseudoStyle}">${escapeHtml(pseudo)}</span></span>
          <span class="volt-msg-time">${timeStr}</span>
        </div>`;

      // Reply quote (if any)
      let replyHTML = '';
      if (m?.reply_to) {
        const ref = msgById.get(m.reply_to);
        const from = ref?.pseudo || '…';
        const snippet = (ref?.text || '').trim() || '…';
        replyHTML = `
          <div class="volt-reply-quote" data-reply-to="${escapeHtml(m.reply_to)}">
            <div class="volt-reply-from">${escapeHtml(chatT('replyTo'))} ${escapeHtml(from)}</div>
            <div class="volt-reply-text">${escapeHtml(snippet)}</div>
          </div>
        `;
      }

      row.innerHTML = `
        <div class="volt-msg-body">
          <div class="volt-avatar-clickable" style="cursor:pointer;" data-uid="${escapeHtml(m.uid || '')}">${avatarHTML}</div>
          <div class="volt-msg-content">
            ${metaHTML}
            ${replyHTML}
            <div class="volt-bubble volt-first-bubble volt-last-bubble">${escapeHtml(text)}</div>
          </div>
        </div>
        <button class="volt-reply-action" title="${escapeHtml(chatT('reply'))}">↩</button>
      `;

      // Click to view profile
      row.querySelectorAll('.volt-avatar-clickable, .volt-pseudo-clickable').forEach(el => {
        el.addEventListener('click', () => viewInjectedProfile(m.uid));
      });

      // Reply button
      const replyBtn = row.querySelector('.volt-reply-action');
      replyBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!m?.id) return;
        setReplyTarget({ id: m.id, uid: m.uid, pseudo: pseudo, text: text });
        setTimeout(() => inputEl?.focus(), 0);
      });

      // If reply target isn't in memory, fetch it and update UI
      if (m?.reply_to && !msgById.get(m.reply_to)) {
        const quote = row.querySelector('.volt-reply-quote');
        hydrateReplyQuote(quote, m.reply_to);
      }

      messagesDiv.appendChild(row);
      if (!bulkRendering) {
        pruneRenderedMessages();
        if (isAtBottom || animate) {
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        } else if (animate && !isOpen) {
          unreadCount++;
          unreadBadge.textContent = chatUnreadText(unreadCount);
          unreadBadge.classList.add('visible');
        }
      }
    }


    function pruneRenderedMessages() {
      try {
        const rows = messagesDiv.getElementsByClassName('volt-msg-row');
        while (rows.length > MAX_RENDERED_MESSAGES) rows[0]?.remove();
      } catch (_) {}
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function safeMediaUrl(value) {
      const url = String(value || '').trim();
      if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(url)) return url.length <= 700000 ? escapeHtml(url) : '';
      try {
        const parsed = new URL(url);
        const allowed =
          parsed.protocol === 'https:' &&
          parsed.hostname === 'api.webtvmedia.net' &&
          parsed.pathname.startsWith('/storage/v1/object/public/');
        return allowed ? escapeHtml(url) : '';
      } catch (_) {
        return '';
      }
    }

    function normalizeChatMessages(rows) {
      const seen = new Set();
      const out = [];
      for (const raw of Array.isArray(rows) ? rows : []) {
        if (!raw) continue;
        const m = { ...raw };
        if (m.users) {
          m.pseudo = m.users.pseudo || m.pseudo;
          m.profilePic = m.users.profilePic || m.users.profile_pic || m.profilePic || m.profile_pic;
          m.user_grade = m.users.grade || m.user_grade;
          m.user_grade_badge = m.users.grade_badge || m.user_grade_badge;
          m.user_grade_color = m.users.grade_color || m.user_grade_color;
          m.user_grade_color_mode = m.users.grade_color_mode || m.user_grade_color_mode;
          m.user_grade_color_2 = m.users.grade_color_2 || m.user_grade_color_2;
          m.user_grade_color_angle = m.users.grade_color_angle || m.user_grade_color_angle;
          m.user_grade_rainbow = m.users.grade_rainbow ?? m.user_grade_rainbow;
          m.user_grade_title = m.users.grade_title || m.user_grade_title;
        }
        m.text = String(m.text || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, CHAT_MAX_TEXT);
        if (!m.text.trim()) continue;
        m.pseudo = String(m.pseudo || chatT('anonymous')).replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 40);
        const key = String(m.id || `${m.uid || ''}:${m.created_at || ''}:${m.text.slice(0, 80)}`);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(m);
      }
      out.sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime() || 0;
        const tb = new Date(b.created_at || 0).getTime() || 0;
        if (ta !== tb) return ta - tb;
        return String(a.id || '').localeCompare(String(b.id || ''));
      });
      return out.slice(-100);
    }

    function hydrateReplyQuote(container, replyToId) {
      if (!container || !replyToId) return;
      runtimeMessageSafe({ action: 'getGlobalChatMessageById', id: replyToId }, (res) => {
        if (!res?.success || !res.message) return;
        const ref = res.message;
        if (ref?.id) msgById.set(ref.id, ref);
        const fromEl = container.querySelector('.volt-reply-from');
        const textEl = container.querySelector('.volt-reply-text');
        const pseudo = ref?.pseudo || chatT('anonymous');
        const snippet = ((ref?.text || '').trim() || '…').slice(0, 160);
        if (fromEl) fromEl.textContent = `${chatT('replyTo')} ${pseudo}`;
        if (textEl) textEl.textContent = snippet;
      });
    }

    // ──  VIEW PROFILE MODAL (INTEGRATED) ──────────────────────────────────
    function viewInjectedProfile(uid) {
      const cleanUid = String(uid || '').trim();
      const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUid);
      if (!looksLikeUuid) return;

      runtimeMessageSafe({ action: "getUserProfile", uid: cleanUid }, async (res) => {
        if (!res?.success) return;
        const u = res.data;
        uid = cleanUid;

        // Fetch relationship status
        const relRes = await new Promise(r => runtimeMessageSafe({ action: "checkRelationship", targetUid: uid }, r));
        const status = relRes?.status || "none";

        const isMe = uid === myUid;
        const isAdmin = myRole === 'admin';

        profileView.innerHTML = `
          <div class="volt-profile-card">
            <button class="volt-profile-back">${escapeHtml(chatT('back'))}</button>
            <div class="volt-profile-banner">
              ${safeMediaUrl(u.bannerPic) ? `<img src="${safeMediaUrl(u.bannerPic)}" style="transform:scale(${Math.max(0.5, Math.min(2, Number(u.bannerSize || 100) / 100))}) translateY(${Math.max(-200, Math.min(200, Number(u.bannerOffset || 0)))}px);">` : ''}
            </div>
            <div class="volt-profile-avatar-wrap">
              ${safeMediaUrl(u.profilePic)
            ? `<img src="${safeMediaUrl(u.profilePic)}" alt="${escapeHtml((u.pseudo || '?')[0].toUpperCase())}">`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--volt-c-accent);color:white;font-family:var(--volt-font-ui);font-size:28px;font-weight:700;">${escapeHtml((u.pseudo || '?')[0].toUpperCase())}</div>`}
            </div>
            <div class="volt-profile-content">
              <div class="volt-profile-pseudo">${escapeHtml(u.pseudo)}</div>
              <div class="volt-profile-level">${escapeHtml(chatT('level'))} ${Number(u.userLevel) || 1}</div>

              <div class="volt-profile-stats">
                <div class="volt-stat-box">
                  <div class="volt-stat-val" id="volt-p-avg">--</div>
                  <div class="volt-stat-label">${escapeHtml(chatT('avg'))}</div>
                </div>
                <div class="volt-stat-box">
                  <div class="volt-stat-val">${Number(u.total_runs) || 0}</div>
                  <div class="volt-stat-label">${escapeHtml(chatT('runs'))}</div>
                </div>
              </div>

              <div class="volt-profile-actions">
                ${isMe ? '' : `
                  <button class="volt-btn-profile volt-btn-primary" id="volt-p-add-btn">
                    ${status === "friend" ? escapeHtml(chatT('friends')) :
              status === "pending_sent" ? escapeHtml(chatT('pending')) :
                status === "pending_received" ? escapeHtml(chatT('accept')) : escapeHtml(chatT('addFriend'))}
                  </button>
                  ${(status === "friend" || isAdmin) ? `
                    <button class="volt-btn-profile volt-btn-outline" id="volt-p-msg-btn">
                      <i class="fa-solid fa-message"></i> ${isAdmin ? escapeHtml(chatT('adminPrivateMessage')) : escapeHtml(chatT('privateMessage'))}
                    </button>
                  ` : ''}

                  ${(isAdmin && !isMe) ? `
                    <button class="volt-btn-profile volt-btn-danger" id="volt-p-ban-btn">
                      <i class="fa-solid fa-radiation"></i>  BAN (NUCLEAR)
                    </button>
                  ` : ''}
                `}
              </div>
            </div>
          </div>
        `;

        // Format AVG time
        const avgEl = profileView.querySelector('#volt-p-avg');
        if (avgEl && u.avg_time > 0) {
          const s = u.avg_time;
          const m = Math.floor(s / 60);
          const sec = Math.floor(s % 60);
          avgEl.textContent = m > 0 ? `${m}m${String(sec).padStart(2, '0')}s` : `${sec}s`;
        }

        profileView.classList.add('volt-visible');

        // Handlers
        const back = () => profileView.classList.remove('volt-visible');
        profileView.querySelector('.volt-profile-back').onclick = back;

        const addBtn = profileView.querySelector('#volt-p-add-btn');
        if (addBtn) {
          if (status === "friend" || status === "pending_sent") {
            addBtn.disabled = true;
          } else {
            addBtn.onclick = () => {
              if (status === "pending_received") {
                runtimeMessageSafe({ action: "getFriendRequests" }, (rres) => {
                  const req = rres?.requests?.find(r => r.from_uid === uid);
                  if (req) {
                    runtimeMessageSafe({ action: "respondToFriendRequest", requestId: req.id, accept: true }, () => {
                      addBtn.textContent = chatT('friends');
                      addBtn.disabled = true;
                    });
                  }
                });
              } else {
                runtimeMessageSafe({ action: "sendFriendRequest", targetUid: uid }, (sres) => {
                  if (sres.success) {
                    addBtn.textContent = chatT('pending');
                    addBtn.disabled = true;
                  }
                });
              }
            };
          }
        }
        const msgBtn = profileView.querySelector('#volt-p-msg-btn');
        if (msgBtn) {
          msgBtn.onclick = () => {
            // Signal popup to open DM on next load
            chrome.storage.local.set({ pendingDM: { uid, pseudo: u.pseudo } }, () => {
              // SEC C1: use sanitized in-page toast instead of native alert (alert uses raw pseudo string).
              try { showChatToast?.(chatT('openExtensionToDm')); } catch (_) {}
              back();
            });
          };
        }

        const banBtn = profileView.querySelector('#volt-p-ban-btn');
        if (banBtn && isAdmin) {
          banBtn.onclick = async () => {
            // SEC C1: native confirm() with user pseudo can be spoofed via control chars.
            // Use plain string + sanitized pseudo (already escapeHtml'd elsewhere; here force textContent).
            // eslint-disable-next-line no-irregular-whitespace -- literal C0/DEL/bidi chars are intentional in the regex range
            const safePseudo = String(u.pseudo || '').replace(/[ -​-‏‪-‮]/g, '').slice(0, 40);
            const confirmBan = window.confirm(chatT('nuclearBanConfirm', safePseudo));
            if (!confirmBan) return;

            banBtn.disabled = true;
            banBtn.textContent = chatT('banning');

            runtimeMessageSafe({
              action: "banUserNuclear",
              targetUid: uid,
              reason: chatT('severeViolation')
            }, (bres) => {
              if (bres?.success) {
                try { showChatToast?.(chatT('banSuccess')); } catch (_) {}
                back();
              } else {
                const errMsg = String(bres?.error || chatT('unknown')).replace(/[ -]/g, '').slice(0, 200);
                try { showChatToast?.(chatT('banError') + errMsg); } catch (_) {}
                banBtn.disabled = false;
                banBtn.textContent = "BAN (NUCLEAR)";
              }
            });
          };
        }
      });
    }

    // ──  SEND ──────────────────────────────────────────────────────────────
    function sendMessage() {
      if (sendBtn.disabled) return;
      const text = inputEl.value.trim();
      if (!text || text.length > CHAT_MAX_TEXT) return;

      const originalText = text;
      const originalReply = replyTarget ? { ...replyTarget } : null;

      sendBtn.disabled = true;
      inputEl.value = '';
      charCount.textContent = `0/${CHAT_MAX_TEXT}`;
      inputEl.style.height = 'auto';
      charCount.classList.remove('volt-warn', 'volt-over');

      const payload = { action: 'sendChatMessage', text };
      if (replyTarget?.id) payload.replyTo = replyTarget.id;
      setReplyTarget(null);

      runtimeMessageSafe(payload, (res) => {
        if (!res?.success) {
          if (window.__VOLT_CHAT_DEBUG === true) console.warn('[VOLT Chat] Erreur envoi:', res?.error);

          // Never lose the user's draft on network errors, slowmode, schema errors,
          // or an MV3 service-worker wake-up failure.
          inputEl.value = originalText;
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          if (originalReply?.id) setReplyTarget(originalReply);

          const err = String(res?.error || '').toLowerCase();
          if (err.includes('slowmode')) {
            const remaining = Math.ceil(Math.max(0, Number(res?.remainingMs || 0)) / 1000);
            showChatToast(remaining > 0 ? `${chatT('waitSlowmode')} (${remaining}s)` : chatT('waitSlowmode'));
          } else if (err.includes('not_logged_in')) {
            showChatToast(chatT('notLoggedIn'));
          } else {
            showChatToast(chatT('messageFailed'));
          }
        } else {
          // If MV3/Realtimes wakes slowly, make the sender see the message without waiting for a reload.
          setTimeout(() => loadHistory({ preserveScroll: false }), 150);
        }
        sendBtn.disabled = false;
      });
    }

    sendBtn.addEventListener('click', sendMessage);

    // ──  LOAD HISTORY / POLLING ─────────────────────────────────────────────
    let historyFetchSeq = 0;
    let historyPollingTimer = null;
    let lastGoodHistory = [];

    function loadHistory(opts = {}) {
      const seq = ++historyFetchSeq;
      const wasNearBottom = (messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight) < 90;
      runtimeMessageSafe({ action: 'fetchGlobalChat' }, (response) => {
        if (seq !== historyFetchSeq) return;
        if (!response?.success) {
          if (opts.silent || lastGoodHistory.length) return;
          messagesDiv.innerHTML = '';
          const err = document.createElement('div');
          err.className = 'volt-empty-state';
          err.textContent = chatT('chatUnavailable');
          messagesDiv.appendChild(err);
          return;
        }
        if (Array.isArray(response.messages)) {
          const normalized = normalizeChatMessages(response.messages);
          if (!normalized.length && opts.silent && lastGoodHistory.length) return;
          if (normalized.length || !opts.silent) lastGoodHistory = normalized;
          lastSenderId = null;
          lastMessageTime = 0;
          msgById.clear();
          messagesDiv.innerHTML = '';
          if (normalized.length > 0) {
            bulkRendering = true;
            try {
              normalized.forEach((m) => renderMessage(m, false));
            } finally {
              bulkRendering = false;
            }
            pruneRenderedMessages();
          } else {
            messagesDiv.appendChild(emptyState);
          }
          if (!opts.preserveScroll || wasNearBottom) messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
      });
    }

    function startHistoryPolling() {
      if (historyPollingTimer) return;
      historyPollingTimer = setInterval(() => {
        if (!isOpen || document.visibilityState === 'hidden') return;
        loadHistory({ preserveScroll: true, silent: true });
      }, 4000);
    }

    try {
      window.addEventListener('pagehide', () => {
        if (historyPollingTimer) clearInterval(historyPollingTimer);
        historyPollingTimer = null;
      }, { once: true });
    } catch (_) {}

    // ──  BACKGROUND/POLLING MESSAGE LISTENER ───────────────────────────────
    if (!window.__VOLT_CHAT_RUNTIME_LISTENER_BOUND) {
      window.__VOLT_CHAT_RUNTIME_LISTENER_BOUND = true;
      chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
      // Reject messages that don't come from this extension's own runtime.
      // chrome.runtime.onMessage normally only fires for same-extension senders,
      // but defense-in-depth in case a future API surface allows external senders.
      if (_sender && _sender.id && _sender.id !== chrome.runtime.id) return;
      // Toggle from popup
      if (msg.action === 'toggleGlobalChat') {
        togglePanel();
        _sendResponse?.({ success: true, open: isOpen });
        return;
      }
      if (msg.action === 'openGlobalChat') {
        openPanel();
        _sendResponse?.({ success: true, open: true });
        return;
      }
      if (msg.action === 'closeGlobalChat') {
        closePanel();
        _sendResponse?.({ success: true, open: false });
        return;
      }
      // New message broadcast from background
      if (msg.action === 'newGlobalChatMessage') {
        if (msg.message?.id && msgById.has(msg.message.id)) return;
        renderMessage(msg.message, true);
        if (!isOpen) {
          unreadCount++;
          // Notify popup of unread count
          runtimeMessageSafe({ action: 'chatUnreadCount', count: unreadCount });
        }
        return;
      }

      if (msg.action === 'chatReplyPing') {
        // Subtle: just show a local unread badge + keep focus behavior
        if (!isOpen) {
          unreadCount++;
          unreadBadge.textContent = chatUnreadText(unreadCount);
          unreadBadge.classList.add('visible');
        }
        return;
      }

      if (msg.action === 'justLoggedIn') {
        openPanel();
        return;
      }
    });
    }

    // loadHistory() is now called inside the storage callback to ensure myUid is set
    // loadHistory();

    // ──  EXPOSE TOGGLE for content.js if needed ────────────────────────────
    window._volt_toggle_chat = togglePanel;
    window._volt_open_chat = openPanel;
    window._volt_close_chat = closePanel;
  };

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatUI);
  } else {
    initChatUI();
  }
})();

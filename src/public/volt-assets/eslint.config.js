// Volt Extension — ESLint 10 flat config
// Migré depuis .eslintrc.json (legacy). Compatible avec eslint --no-config-lookup
const globals = {
  // Browser
  window: 'readonly', document: 'readonly', navigator: 'readonly', location: 'readonly',
  fetch: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', history: 'readonly',
  console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
  setInterval: 'readonly', clearInterval: 'readonly', requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly', AbortController: 'readonly', Blob: 'readonly',
  File: 'readonly', FileReader: 'readonly', FormData: 'readonly', Headers: 'readonly',
  Request: 'readonly', Response: 'readonly', WebSocket: 'readonly', XMLHttpRequest: 'readonly',
  crypto: 'readonly', btoa: 'readonly', atob: 'readonly',
  AudioContext: 'readonly', OfflineAudioContext: 'readonly', AudioBuffer: 'readonly',
  AudioBufferSourceNode: 'readonly', AudioNode: 'readonly', AudioDestinationNode: 'readonly',
  HTMLMediaElement: 'readonly', HTMLAudioElement: 'readonly', HTMLVideoElement: 'readonly',
  HTMLElement: 'readonly', HTMLInputElement: 'readonly', HTMLButtonElement: 'readonly',
  HTMLFormElement: 'readonly', HTMLSelectElement: 'readonly', HTMLTextAreaElement: 'readonly',
  Element: 'readonly', Event: 'readonly', CustomEvent: 'readonly',
  KeyboardEvent: 'readonly', MouseEvent: 'readonly', MutationObserver: 'readonly',
  IntersectionObserver: 'readonly', screen: 'readonly', performance: 'readonly',
  TextEncoder: 'readonly', TextDecoder: 'readonly', DOMParser: 'readonly',
  MessageChannel: 'readonly', BroadcastChannel: 'readonly',
  // WebExtension
  chrome: 'readonly', browser: 'readonly',
  // Service worker
  self: 'readonly', importScripts: 'readonly',
  // Browser extras
  alert: 'readonly', confirm: 'readonly', prompt: 'readonly',
  localStorage: 'readonly', sessionStorage: 'readonly', indexedDB: 'readonly',
  Audio: 'readonly', Image: 'readonly', Worker: 'readonly', SharedWorker: 'readonly',
  NodeFilter: 'readonly', Notification: 'readonly', WebGLRenderingContext: 'readonly',
  CSS: 'readonly', MediaRecorder: 'readonly', MediaStream: 'readonly',
  trustedTypes: 'readonly', TrustedTypePolicy: 'readonly', TrustedHTML: 'readonly',
  // Node (build script)
  module: 'readonly', require: 'readonly', __dirname: 'readonly', __filename: 'readonly',
  process: 'readonly', global: 'readonly', Buffer: 'readonly',
  // Volt globals (declared in source files but consumed cross-file)
  supabase: 'writable', supabaseClient: 'writable', VOLT_PREMIUM: 'writable', Chart: 'readonly',
  SUPABASE_URL: 'writable', SUPABASE_ANON_KEY: 'writable',
  DEFAULT_ADVANCED_STYLE_V2: 'writable', KEY_STYLE_PRESETS: 'writable', TIMER_SKIN_PRESETS: 'writable',
  // Volt cross-file globals (declared via window/self in other files)
  // log: defined as const in background.js — removed from globals to avoid no-redeclare
  initChatGlobalSection: 'readonly', initPremiumShop: 'readonly',
  initChallengesCreditsSection: 'readonly', initChallengesSection: 'readonly',
  initCreditsSection: 'readonly', initWalletSection: 'readonly',
  initTeamsSection: 'readonly', initDuelsSection: 'readonly',
  // showError est défini via window.showError = ... dans popup.js. ESLint ne voit pas
  // l'assignation comme déclaration locale, on déclare donc en writable global.
  showError: 'writable',
  showToast: 'writable',
  showStatus: 'writable',
  log: 'writable',
  startPopupDm: 'writable', updateFriendRequests: 'writable', updateFriendsList: 'writable',
  updateSocialPopup: 'writable', viewPopupProfile: 'writable', voltTrapFocus: 'readonly',
  updateSidebarPremiumBadge: 'writable', VOLT_getRealtimeStatus: 'writable',
  _scoreClearPendingDuelAttach: 'readonly',
  getRecentActiveDuelMatchId: 'readonly', updateActiveDuelRunState: 'readonly',
  recordActiveDuelResult: 'readonly', duelRunFinished: 'readonly',
};

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'supabase-js.js',
      'chart.min.js',
      'fontawesome-fallback.css',
      '*.min.js',
      'webfonts/**',
      'i18n/**',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals,
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      'no-undef': 'error',
      'prefer-const': 'warn',
      'no-var': 'warn',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'eqeqeq': ['warn', 'smart'],
      'no-console': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-redeclare': 'error',
      'no-unreachable': 'error',
      'no-self-assign': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-irregular-whitespace': 'error',
    },
  },
  // Stricter rule set for files small enough to keep clean. This pilots
  // a tighter standard on the same files that are already in
  // jsconfig.strict.json — promoting a file into strict typecheck
  // automatically opts it into these rules too.
  {
    files: [
      'volt-presets.js',
      'volt-helpers.js',
      'fpsInjected.js',
      'volumeInjected.js',
      'securityInjected.js',
      'admin_entry.js',
      'admin.js',
    ],
    rules: {
      // Promote prefer-const + no-var to error: the strict set should not
      // produce drift back to var.
      'prefer-const': 'error',
      'no-var': 'error',
      // Reject loose equality outright in strict files.
      'eqeqeq': ['error', 'smart'],
      // Empty catch (_) {} is the codebase convention for swallowed
      // failures (postMessage / Chrome storage / DOM API edge cases);
      // allow it but reject empty if / while / function blocks.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  // content.js : minified bundle, single-letter vars, cross-IIFE refs.
  // ESLint ne peut pas suivre. Désactiver no-undef + no-unreachable + no-redeclare.
  {
    files: ['content.js'],
    rules: {
      'no-undef': 'off',
      'no-unreachable': 'off',
      'no-redeclare': 'off',
      'no-self-assign': 'off',
    },
  },
  // bg/* : sub-modules loaded via importScripts share the service-worker
  // scope. `_duel*`, `_score*` etc. helpers from one file are referenced from
  // another; ESLint can't follow importScripts so we disable no-undef here.
  // The audit (Phase 2) verified each symbol is actually defined by another
  // bg/ file loaded earlier in background.js.
  {
    files: ['bg/*.js'],
    rules: {
      'no-undef': 'off',
      'no-redeclare': 'off',
    },
  },
  // Files defining cross-file globals — disable no-redeclare since they're listed in `globals`.
  {
    files: [
      'popup.js', 'background.js', 'volt_premium.js', 'volt-presets.js',
      'supabaseConfig.js',
    ],
    rules: {
      'no-redeclare': 'off',
    },
  },
];

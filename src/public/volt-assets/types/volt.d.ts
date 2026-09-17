// VOLT global ambient types — JSDoc-friendly definitions.
// Used by jsconfig.json checkJs to provide IDE intellisense.

// Chrome extension API (ambient any — full @types/chrome n'est pas requis
// pour ce projet, on coche juste l'existence).
declare const chrome: any;

// Trusted Types API (Chrome 83+)
declare const trustedTypes: any;

// Supabase library global (loaded via supabase-js.js script tag)
declare const supabase: any;

declare const supabaseClient: SupabaseClient;
declare const SUPABASE_URL: string;
// SUPABASE_ANON_KEY removed from ambient: not a runtime global. Access via supabaseConfig.js module if needed.

// Service worker / window self global with Volt extras
interface ServiceWorkerGlobalScope {
  supabaseClient?: SupabaseClient | null;
  SUPABASE_URL?: string;
  VOLT_DEBUG_LOGS?: boolean;
  VOLT_getRealtimeStatus?: () => { available: boolean; fallback: boolean; reason: string; disabledUntil: number };
  VOLT_shouldUseRealtime?: () => boolean;
  VOLT_isRealtimeTemporarilyDisabled?: () => boolean;
  VOLT_markRealtimeUnavailable?: () => any;
  VOLT_realtimeSubscribe?: (channel: any, name: string, onStatus?: (s: string, e: any) => void) => any;
  handleSettings?: VoltModuleHandler;
  handleScores?: VoltModuleHandler;
  handleCredits?: VoltModuleHandler;
  handleTeams?: VoltModuleHandler;
  handleDuels?: VoltModuleHandler;
  handleEloPayments?: VoltModuleHandler;
  handleChat?: VoltModuleHandler;
  handleSocial?: VoltModuleHandler;
  handleSecurity?: VoltModuleHandler;
}

type VoltModuleHandler = (action: string, message: any, sendResponse: Function, ctx: any) => Promise<boolean>;

interface VoltStorageAdapter {
  getItem: (key: string) => Promise<any>;
  setItem: (key: string, value: any) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// VOLT_PREMIUM est déclaré en const dans volt_premium.js (avec @ts-check).
// Pas de declare ici pour éviter le conflit "Cannot redeclare".
declare const Chart: any;

// Global functions exposed via window.X = function ... popup ecosystem
declare function initChatGlobalSection(): void;
declare function initPremiumShop(): void;
declare function initChallengesCreditsSection(): void;
declare function initChallengesSection(): void;
declare function initCreditsSection(): void;
declare function initWalletSection(): void;
declare function initTeamsSection(force?: boolean): Promise<void>;
declare function initDuelsSection(force?: boolean): Promise<void>;
declare function showError(msg: string): void;
declare function showStatus(msg: string, ok?: boolean): void;
declare function showToast(msg: string, duration?: number): void;
declare function startPopupDm(uid: string, pseudo?: string): void;
declare function updateFriendRequests(): void;
declare function updateFriendsList(): void;
declare function updateSocialPopup(): void;
declare function viewPopupProfile(...args: any[]): void;
declare function updateSidebarPremiumBadge(grade: string | null): void;
declare function VOLT_getRealtimeStatus(): any;

interface VoltUserProfile {
  id: string;
  pseudo: string;
  username?: string;
  email?: string;
  profilePic?: string | null;
  bannerPic?: string | null;
  role: 'user' | 'admin' | string;
  grade?: 'star' | 'elite' | 'legend' | null;
  grade_color?: string | null;
  grade_color_2?: string | null;
  grade_color_angle?: number | null;
  grade_color_mode?: 'solid' | 'gradient' | null;
  grade_rainbow?: boolean;
  grade_title?: string | null;
  grade_expires_at?: string | null;
  grade_frame?: string | null;
  global_elo?: number;
  duel_elo?: number;
  is_banned?: boolean;
  hwid?: string;
  auth_provider?: 'google' | 'email' | string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface VoltGradeConfig {
  label: string;
  emoji: string;
  color: string;
  slowmode_ms: number;
  gif_pp: boolean;
  colored_pseudo: boolean;
  rainbow_pseudo: boolean;
  custom_title: boolean;
  exclusive_emojis: boolean;
  unlimited_history: boolean;
  history_limit: number | null;
  broadcast: boolean;
  no_slowmode: boolean;
}

interface VoltPremium {
  GRADE_CONFIG: Record<string, VoltGradeConfig>;
  GRADE_ORDER: Record<string, number>;
  currentGrade: string | null;
  gradeExpiresAt: Date | null;
  hasGrade(min: string): boolean;
  getConfig(): VoltGradeConfig | null;
  loadGradeFromProfile(p: VoltUserProfile | null): Promise<string | null>;
  loadGradeFromCache(): Promise<void>;
  init(p: VoltUserProfile): Promise<void>;
  renderBadgeHTML(grade?: string | null, badge?: any): string;
  renderBadgeNode(grade?: string | null): HTMLSpanElement | null;
  renderPseudoStyle(grade?: string | null, color?: string | null, profile?: Partial<VoltUserProfile>): string;
  sanitizeCssColor(value: string, fallback: string): string;
  sanitizeAngle(value: any): number;
  canUse(feat: string, onLock?: () => void): boolean;
  showUpsellToast(feat: string, minGrade: string): void;
}

interface VoltGlobalChatMessage {
  id: string;
  uid: string;
  pseudo: string;
  text: string;
  created_at: string;
  profilePic?: string | null;
  user_grade?: string | null;
  user_grade_color?: string | null;
  reply_to_id?: string | null;
  is_deleted?: boolean;
}

interface VoltDirectMessage {
  id: string;
  chat_id: string;
  from_uid: string;
  to_uid: string;
  from_pseudo: string;
  message: string;
  sent_at: string;
  read_at?: string | null;
  is_read: boolean;
  is_deleted: boolean;
}

interface SupabaseClient {
  from: (table: string) => any;
  rpc: (fn: string, args?: any) => Promise<{ data: any; error: any }>;
  channel: (name: string, opts?: any) => any;
  removeChannel: (channel: any) => any;
  auth: {
    getSession: () => Promise<{ data: { session: { user: any; access_token: string } | null }, error: any }>;
    getUser: () => Promise<{ data: { user: any }, error: any }>;
    onAuthStateChange: (cb: (event: string, session: any) => void) => any;
    signOut: () => Promise<void>;
    signInWithOAuth: (opts: any) => Promise<{ data: any; error: any }>;
    resend: (opts: any) => Promise<any>;
    exchangeCodeForSession: (code: string) => Promise<{ data: { session: any; user: any }, error: any }>;
    setSession: (opts: { access_token: string; refresh_token: string }) => Promise<{ data: any; error: any }>;
    signUp: (opts: any) => Promise<{ data: any; error: any }>;
    signInWithPassword: (opts: any) => Promise<{ data: any; error: any }>;
    resetPasswordForEmail: (email: string, opts?: any) => Promise<{ data: any; error: any }>;
    updateUser: (opts: any) => Promise<{ data: any; error: any }>;
    refreshSession: (opts?: any) => Promise<{ data: any; error: any }>;
    [key: string]: any;
  };
  storage?: any;
  functions?: any;
  realtime?: any;
  [key: string]: any;
}

interface VoltTimerStyle {
  bgColor: string;
  textColor: string;
  borderRadius: string;
  opacity: number;
  fontScale: number;
  borderWidth: string;
  borderColor: string;
  shadow: string;
  textShadow: string;
  paddingX: string;
  paddingY: string;
  decimalScale: number;
  letterSpacing: string;
  align: string;
}

interface VoltFpsStyle {
  bgColor: string;
  textColor: string;
  labelColor: string;
  borderRadius: string;
  opacity: number;
  fontScale: number;
  labelScale: number;
  borderWidth: string;
  borderColor: string;
  shadow: string;
  mode: string;
  showBg: boolean;
  padding: string;
  labelOpacity: number;
}

interface VoltKeysStyle {
  bgColor: string;
  textColor: string;
  activeBgColor: string;
  activeTextColor: string;
  borderColor: string;
  activeBorderColor: string;
  activeColor: string;
  borderRadius: string;
  opacity: number;
  sizeScale: number;
  widthScale: number;
  heightScale: number;
  textScale: number;
  fontWeight: number;
  borderWidth: string;
  shadow: string;
  activeGlow: string;
  gap: string;
  containerPadding: string;
  pressScale: number;
  tilt: string;
  textTransform: string;
  showLabels: boolean;
}

interface VoltAdvancedStyleV2 {
  timer: VoltTimerStyle;
  fps: VoltFpsStyle;
  keys: VoltKeysStyle;
}

type VoltKeysStylePreset = Partial<VoltKeysStyle>;
type VoltKeyStylePresetMap = Record<string, VoltKeysStylePreset>;

interface VoltSupabaseConfig {
  url: string;
  anonKey: string;
}

// =============================================================================
// Lib relaxations for popup.js (and other // @ts-check files in this project).
// jsconfig.json scopes this to our own source — never affects external libs.
// We widen Element / Node / EventTarget so the codebase's heavy DOM property
// access (.value, .checked, .style, .dataset, etc.) doesn't require casts.
// =============================================================================

interface Element {
  value?: any;
  checked?: any;
  disabled?: any;
  style?: any;
  dataset?: any;
  files?: any;
  onclick?: any;
  click?: () => void;
  focus?: (opts?: any) => void;
  blur?: () => void;
  innerText?: any;
  hidden?: any;
  placeholder?: any;
  title?: any;
  src?: any;
  type?: any;
  width?: any;
  height?: any;
  min?: any;
  max?: any;
  selectedIndex?: any;
  options?: any;
  selected?: any;
  name?: any;
  form?: any;
  href?: any;
  alt?: any;
  rows?: any;
  cols?: any;
  readOnly?: any;
  multiple?: any;
  accept?: any;
  pattern?: any;
  step?: any;
  required?: any;
  size?: any;
  maxLength?: any;
  minLength?: any;
  autocomplete?: any;
  autofocus?: any;
  defaultValue?: any;
  defaultChecked?: any;
  validity?: any;
  validationMessage?: any;
  willValidate?: any;
  labels?: any;
  list?: any;
  formAction?: any;
  formEnctype?: any;
  formMethod?: any;
  formNoValidate?: any;
  formTarget?: any;
  indeterminate?: any;
  defaultSelected?: any;
  content?: any;
  offsetWidth?: any;
  offsetHeight?: any;
  oninput?: any;
  selectionStart?: any;
  selectionEnd?: any;
  setSelectionRange?: any;
}

interface HTMLElement {
  value?: any;
  checked?: any;
  files?: any;
  disabled?: any;
  width?: any;
  height?: any;
  getContext?: any;
  type?: any;
  src?: any;
  min?: any;
  max?: any;
  selectedIndex?: any;
  options?: any;
  selected?: any;
  name?: any;
  form?: any;
  href?: any;
  alt?: any;
  rows?: any;
  cols?: any;
  readOnly?: any;
  multiple?: any;
  accept?: any;
  pattern?: any;
  step?: any;
  required?: any;
  size?: any;
  maxLength?: any;
  minLength?: any;
  placeholder?: any;
  defaultValue?: any;
  defaultChecked?: any;
  setSelectionRange?: any;
  selectionStart?: any;
  selectionEnd?: any;
  content?: any;
}

interface Node {
  classList?: any;
  setAttribute?: any;
  onclick?: any;
  style?: any;
  dataset?: any;
  value?: any;
  checked?: any;
  disabled?: any;
}

interface EventTarget {
  value?: any;
  checked?: any;
  files?: any;
  disabled?: any;
  closest?: any;
  tagName?: any;
  classList?: any;
  dataset?: any;
  style?: any;
  id?: any;
  textContent?: any;
  innerHTML?: any;
  innerText?: any;
  getAttribute?: any;
  setAttribute?: any;
  removeAttribute?: any;
  hasAttribute?: any;
  matches?: any;
  parentElement?: any;
  parentNode?: any;
  href?: any;
  src?: any;
  type?: any;
  name?: any;
  result?: any;
  error?: any;
}

interface RenderingContext {
  getParameter?: any;
  getExtension?: any;
  VERSION?: any;
  VENDOR?: any;
  RENDERER?: any;
  SHADING_LANGUAGE_VERSION?: any;
  MAX_TEXTURE_SIZE?: any;
}

interface Document {
  _lbCurrentTab?: any;
}

interface Navigator {
  deviceMemory?: any;
}

interface Function {
  _warned?: any;
}

interface Window {
  supabaseClient?: SupabaseClient | null;
  VoltUI?: any;
  voltSetExperimentalLobby?: any;
  voltSectionListeners?: any;
  voltAbortAllSections?: any;
  currentUserIsAdmin?: any;
  playstyleChartInstance?: any;
  webkitOfflineAudioContext?: any;
  webkitAudioContext?: any;
  // Allow arbitrary string keys without losing existing typed fields.
  [key: string]: any;
  SUPABASE_URL?: string;
  VOLT_DEBUG_LOGS?: boolean;
  VOLT_PREMIUM?: VoltPremium;
  Chart?: any;
  // Background module handlers (importScripts globals)
  handleSettings?: VoltModuleHandler;
  handleScores?: VoltModuleHandler;
  handleCredits?: VoltModuleHandler;
  handleTeams?: VoltModuleHandler;
  handleDuels?: VoltModuleHandler;
  handleEloPayments?: VoltModuleHandler;
  handleChat?: VoltModuleHandler;
  handleSocial?: VoltModuleHandler;
  handleSecurity?: VoltModuleHandler;
  // Background helper globals (importScripts) — signatures permissives.
  getRecentActiveDuelMatchId?: (...args: any[]) => any;
  updateActiveDuelRunState?: (...args: any[]) => any;
  recordActiveDuelResult?: (...args: any[]) => any;
  duelRunFinished?: (...args: any[]) => any;
  _scoreClearPendingDuelAttach?: (...args: any[]) => any;
  // Realtime API
  VOLT_getRealtimeStatus?: () => any;
  VOLT_shouldUseRealtime?: () => boolean;
  VOLT_isRealtimeTemporarilyDisabled?: () => boolean;
  VOLT_markRealtimeUnavailable?: () => any;
  VOLT_realtimeSubscribe?: (channel: any, name: string, onStatus?: (s: string, e: any) => void) => any;
  _voltSkipPseudoModal?: boolean;
  _voltHwid?: string;
  _voltSectionLastLoad?: Record<string, number>;
  _voltBgCacheInvalidate?: (prefix?: string) => void;
  switchTab?: (target: string, init?: boolean) => void;
  startPopupDm?: (uid: string, pseudo?: string) => void;
  initTeamsSection?: (force?: boolean) => Promise<void>;
  initDuelsSection?: (force?: boolean) => Promise<void>;
  initPremiumShop?: () => void;
  updateSocialPopup?: () => void;
  updateSidebarPremiumBadge?: (grade: string | null) => void;
  voltLoadI18n?: (lang: string) => Promise<void>;
  initChatGlobalSection?: () => void;
  VOLT_TRANSLATE?: (key: string) => string;
  VOLT_CURRENT_LANGUAGE?: string;
  initChallengesCreditsSection?: () => void;
  initChallengesSection?: () => void;
  initCreditsSection?: () => void;
  initWalletSection?: () => void;
  showError?: (msg: string) => void;
  showStatus?: (msg: string, ok?: boolean) => void;
  showToast?: (msg: string, duration?: number) => void;
  open?: any;
}

// =============================================================================
// content.js minified-IIFE cross-scope ambient bindings.
// content.js is a stitched bundle of multiple IIFEs; some minified vars
// (a1, l1, R, ne, L, F, N1, oe, _, E1, S, B, s1, ...) are referenced from
// one IIFE while declared in another, guarded by `typeof X !== 'undefined'`.
// We declare them ambient here so // @ts-check doesn't flag them.
// =============================================================================
declare var a1: any;
declare var l1: any;
declare var R: any;
declare var ne: any;
declare var L: any;
declare var F: any;
declare var N1: any;
declare var oe: any;
declare var _: any;
declare var E1: any;
declare var S: any;
declare var B: any;
declare var s1: any;
declare var voltLocalRunEpochMs: any;
declare var voltRunSubmissionLocked: any;
declare function deactivateZqsd(...args: any[]): any;
declare function manuallyApplyPanelKey(...args: any[]): any;

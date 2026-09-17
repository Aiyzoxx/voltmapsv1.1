// Supabase Edge Function — profil-public
// Route: GET /functions/v1/profil-public?pseudo=PSEUDO[&lang=fr|en|pt-BR|zh]
// Retourne une page HTML publique avec les stats du joueur.
//
// AUDIT N.2 : IP rate-limit (30 req/min per IP, in-memory sliding window).
// AUDIT N.6 : ?lang= query param for i18n (fr / en / pt-BR / zh).
// AUDIT Y.62: banned or deleted profiles return HTTP 404.

const SUPABASE_URL = 'https://api.webtvmedia.net';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc2ODY2NDUyLCJleHAiOjIwOTIyMjY0NTJ9.jOfn90sK6YeY6LRRuwzdiZpiO-s8pN4Ozr418B8iRXE';

// ── i18n ──────────────────────────────────────────────────────────────────────
const STRINGS: Record<string, Record<string, string>> = {
  fr: {
    notFound: 'introuvable',
    notFoundMsg: 'Ce profil n\'existe pas ou est privé.',
    pageTitle: 'Profil Volt',
    elo: 'ELO',
    runs: 'Runs',
    record: 'Record',
    game: 'Jeu',
    cta: 'Joue avec',
    ctaLink: 'Télécharger Volt Extension',
    rateLimited: 'Trop de requêtes. Réessaye dans une minute.',
  },
  en: {
    notFound: 'not found',
    notFoundMsg: 'This profile does not exist or is private.',
    pageTitle: 'Volt Profile',
    elo: 'ELO',
    runs: 'Runs',
    record: 'Record',
    game: 'Game',
    cta: 'Play with',
    ctaLink: 'Download Volt Extension',
    rateLimited: 'Too many requests. Please try again in a minute.',
  },
  'pt-BR': {
    notFound: 'não encontrado',
    notFoundMsg: 'Este perfil não existe ou é privado.',
    pageTitle: 'Perfil Volt',
    elo: 'ELO',
    runs: 'Runs',
    record: 'Recorde',
    game: 'Jogo',
    cta: 'Jogue com',
    ctaLink: 'Baixar Volt Extension',
    rateLimited: 'Muitas requisições. Tente novamente em um minuto.',
  },
  zh: {
    notFound: '未找到',
    notFoundMsg: '该档案不存在或为私密。',
    pageTitle: 'Volt 档案',
    elo: 'ELO',
    runs: '场次',
    record: '记录',
    game: '游戏',
    cta: '和他一起玩',
    ctaLink: '下载 Volt Extension',
    rateLimited: '请求过多，请一分钟后重试。',
  },
};

function t(lang: string, key: string): string {
  return (STRINGS[lang] || STRINGS['fr'])[key] ?? (STRINGS['fr'][key] ?? key);
}

// ── Grade display ─────────────────────────────────────────────────────────────
const GRADE_COLORS: Record<string, string> = {
  owner: '#ff4d6d',
  legend: '#f0c040',
  elite: '#c17f59',
  free: '#8a837c',
};
const GRADE_LABELS: Record<string, string> = {
  owner: 'OWNER', legend: 'LEGEND', elite: 'ELITE', free: 'FREE',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtMs(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const s = ms / 1000;
  if (s < 60) return s.toFixed(1) + 's';
  return Math.floor(s / 60) + 'm' + String(Math.floor(s % 60)).padStart(2, '0') + 's';
}

// ── HTML builders ─────────────────────────────────────────────────────────────
function buildHtml(profile: Record<string, unknown>, stats: Record<string, unknown>, lang: string): string {
  const pseudo = escHtml(String(profile.pseudo || 'Joueur'));
  const grade = String(profile.grade || 'free');
  const elo = Number(profile.elo_rating || 1000);
  const avatarUrl = profile.avatar_url ? escHtml(String(profile.avatar_url)) : '';
  const gradeColor = GRADE_COLORS[grade] || '#8a837c';
  const gradeLabel = GRADE_LABELS[grade] || 'FREE';
  const totalRuns = Number((stats as any).total_runs || 0);
  const record = fmtMs(Number((stats as any).personal_record_ms || 0));

  const avatarHtml = avatarUrl
    ? `<img src="${avatarUrl}" alt="${pseudo}" style="width:80px;height:80px;border-radius:50%;border:3px solid ${gradeColor};object-fit:cover;">`
    : `<div style="width:80px;height:80px;border-radius:50%;border:3px solid ${gradeColor};background:#1a1a1a;display:flex;align-items:center;justify-content:center;font-size:32px;color:${gradeColor};">${pseudo[0].toUpperCase()}</div>`;

  return `<!DOCTYPE html>
<html lang="${escHtml(lang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${pseudo} — ${escHtml(t(lang, 'pageTitle'))}</title>
  <meta property="og:title" content="${pseudo} — ${escHtml(t(lang, 'pageTitle'))}">
  <meta property="og:description" content="${gradeLabel} · ELO ${elo} · ${totalRuns} ${escHtml(t(lang, 'runs'))}">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0e0c0b;color:#f0ebe8;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:24px 16px;}
    .card{background:#1a1714;border:1px solid rgba(193,127,89,.2);border-radius:16px;padding:28px;max-width:380px;width:100%;text-align:center;}
    .hero{height:80px;background:linear-gradient(135deg,rgba(193,127,89,.3),rgba(193,127,89,.05));margin:-28px -28px 20px;border-radius:16px 16px 0 0;}
    .grade-badge{display:inline-block;padding:3px 12px;border-radius:100px;font-size:11px;font-weight:800;letter-spacing:1px;margin-top:8px;color:${gradeColor};background:rgba(193,127,89,.1);border:1px solid ${gradeColor};}
    .stat-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px;}
    .stat-box{background:#0e0c0b;border:1px solid rgba(193,127,89,.15);border-radius:10px;padding:14px;}
    .stat-label{font-size:9px;color:#8a837c;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;}
    .stat-val{font-size:22px;font-weight:800;color:#f0ebe8;}
    .cta{margin-top:20px;padding:12px;background:rgba(193,127,89,.1);border-radius:10px;font-size:12px;color:#8a837c;}
    .cta a{color:#c17f59;font-weight:600;text-decoration:none;}
  </style>
</head>
<body>
  <div class="card">
    <div class="hero"></div>
    ${avatarHtml}
    <h1 style="font-size:22px;font-weight:900;margin-top:12px;">${pseudo}</h1>
    <span class="grade-badge">${gradeLabel}</span>
    <div class="stat-row">
      <div class="stat-box">
        <div class="stat-label">${escHtml(t(lang, 'elo'))}</div>
        <div class="stat-val" style="color:${gradeColor};">${elo}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">${escHtml(t(lang, 'runs'))}</div>
        <div class="stat-val">${totalRuns}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">${escHtml(t(lang, 'record'))}</div>
        <div class="stat-val" style="font-size:18px;">${record}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">${escHtml(t(lang, 'game'))}</div>
        <div class="stat-val" style="font-size:16px;color:#8a837c;">SubSurf</div>
      </div>
    </div>
    <div class="cta">
      ${escHtml(t(lang, 'cta'))} ${pseudo} →
      <a href="https://github.com/ybenyedder/volt-extension/releases" target="_blank">${escHtml(t(lang, 'ctaLink'))}</a>
    </div>
  </div>
</body>
</html>`;
}

function notFoundHtml(pseudo: string, lang: string): string {
  return `<!DOCTYPE html><html lang="${escHtml(lang)}"><head><meta charset="UTF-8"><title>${escHtml(t(lang, 'pageTitle'))}</title>
  <style>body{background:#0e0c0b;color:#f0ebe8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}</style>
  </head><body><div style="text-align:center;"><h2>« ${escHtml(pseudo)} » ${escHtml(t(lang, 'notFound'))}</h2><p style="color:#8a837c;margin-top:8px;">${escHtml(t(lang, 'notFoundMsg'))}</p></div></body></html>`;
}

function rateLimitHtml(lang: string): string {
  return `<!DOCTYPE html><html lang="${escHtml(lang)}"><head><meta charset="UTF-8"><title>429</title>
  <style>body{background:#0e0c0b;color:#f0ebe8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}</style>
  </head><body><div style="text-align:center;"><h2>429</h2><p style="color:#8a837c;margin-top:8px;">${escHtml(t(lang, 'rateLimited'))}</p></div></body></html>`;
}

// ── AUDIT N.2 — IP rate limiter (30 req / 60 s, per-instance sliding window) ─
// Edge Function instances are ephemeral and may be distributed; this provides
// a best-effort per-instance limit. Supabase platform-level limits back this up.
const _RATE_LIMIT_MAX = 30;
const _RATE_LIMIT_WINDOW_MS = 60_000;
const _ipWindows = new Map<string, number[]>();

function _isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - _RATE_LIMIT_WINDOW_MS;
  const hits = (_ipWindows.get(ip) || []).filter(ts => ts > cutoff);
  hits.push(now);
  _ipWindows.set(ip, hits);
  // Evict old entries periodically to avoid unbounded growth.
  if (_ipWindows.size > 5000) {
    for (const [k, v] of _ipWindows) {
      if (!v.some(ts => ts > cutoff)) _ipWindows.delete(k);
    }
  }
  return hits.length > _RATE_LIMIT_MAX;
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const pseudo = (url.searchParams.get('pseudo') || '').trim().slice(0, 64);
  // Normalize ?lang= to canonical STRINGS keys; toLowerCase() converts 'pt-BR' → 'pt-br'
  // so we map back to the canonical form before the STRINGS lookup.
  const _LANG_NORM: Record<string, string> = { fr: 'fr', en: 'en', 'pt-br': 'pt-BR', zh: 'zh' };
  const lang = _LANG_NORM[(url.searchParams.get('lang') || 'fr').trim().slice(0, 10).toLowerCase()] ?? 'fr';

  // AUDIT N.2 — rate limit by IP
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';
  if (_isRateLimited(clientIp)) {
    return new Response(rateLimitHtml(lang), {
      status: 429,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': '60',
      },
    });
  }

  if (!pseudo) {
    return new Response(notFoundHtml('?', lang), { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const anonHeaders = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  // Appel unique à get_public_profile_by_pseudo (SECURITY DEFINER — bypass RLS,
  // gère ban/deleted, retourne profil + stats en un seul round-trip).
  // AUDIT Y.62 : la fonction côté DB renvoie NULL pour les comptes bannis/supprimés.
  let profileRow: Record<string, unknown> | null = null;
  try {
    const rpcRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_public_profile_by_pseudo`,
      { method: 'POST', headers: anonHeaders, body: JSON.stringify({ p_pseudo: pseudo }) }
    );
    if (!rpcRes.ok) throw new Error(`HTTP ${rpcRes.status}`);
    const raw = await rpcRes.json();
    profileRow = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw as Record<string, unknown> : null;
  } catch (_) {
    return new Response(notFoundHtml(pseudo, lang), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // null → profil inexistant / banni / supprimé
  if (!profileRow || !profileRow.id) {
    return new Response(notFoundHtml(pseudo, lang), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // Map vers la forme attendue par buildHtml
  const profile: Record<string, unknown> = {
    ...profileRow,
    avatar_url: (typeof profileRow.profilePic === 'string' && profileRow.profilePic) ? profileRow.profilePic : null,
  };

  // Validate avatar_url scheme before use in HTML
  if (profile.avatar_url && typeof profile.avatar_url === 'string') {
    if (!profile.avatar_url.startsWith('https://') && !profile.avatar_url.startsWith('http://')) {
      profile.avatar_url = null;
    }
  }

  // Stats déjà incluses dans la réponse RPC
  const summary: Record<string, unknown> = {
    total_runs: profileRow.total_runs ?? 0,
    personal_record_ms: profileRow.personal_record_ms ?? 0,
  };

  const html = buildHtml(profile, summary, lang);
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Vary': 'Accept-Language',
    },
  });
});

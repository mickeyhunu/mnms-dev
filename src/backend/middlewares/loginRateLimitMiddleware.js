/**
 * 파일 역할: 로그인 API 요청 폭주/브루트포스 방지를 위한 간단한 메모리 기반 레이트 리밋 미들웨어.
 */
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 7;
const BLOCK_MS = 10 * 60 * 1000;
const store = new Map();

function normalizeLoginId(req) {
  return String(req.body?.loginId || req.body?.email || '')
    .trim()
    .toLowerCase();
}

function buildKey(req) {
  return `${req.ip || 'unknown'}|${normalizeLoginId(req) || '-'}`;
}

function cleanupExpiredEntries(now = Date.now()) {
  for (const [key, entry] of store.entries()) {
    if (entry.blockUntil && entry.blockUntil > now) continue;
    if (now - entry.windowStartedAt <= WINDOW_MS) continue;
    store.delete(key);
  }
}

function loginRateLimitMiddleware(req, res, next) {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const key = buildKey(req);
  const entry = store.get(key);

  if (entry?.blockUntil && entry.blockUntil > now) {
    const retryAfterSec = Math.ceil((entry.blockUntil - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({ message: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' });
  }

  req.loginRateLimitKey = key;
  return next();
}

function recordLoginAttemptResult(req, { success }) {
  const key = String(req.loginRateLimitKey || '').trim();
  if (!key) return;

  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now - entry.windowStartedAt > WINDOW_MS) {
    if (success) return;
    store.set(key, {
      count: 1,
      windowStartedAt: now,
      blockUntil: null
    });
    return;
  }

  if (success) {
    store.delete(key);
    return;
  }

  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockUntil = now + BLOCK_MS;
  }
  store.set(key, entry);
}

module.exports = { loginRateLimitMiddleware, recordLoginAttemptResult };

/**
 * 파일 역할: JWT 발급/검증 보조 함수를 제공하는 유틸리티 파일.
 */
const crypto = require('crypto');

const DEFAULT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const DEFAULT_ISSUER = process.env.JWT_ISSUER || 'midnightmens';
const DEFAULT_ALGORITHM = 'HS256';

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(paddingLength), 'base64').toString('utf8');
}

function parseExpiresInToSeconds(expiresIn) {
  const raw = String(expiresIn || '').trim();
  if (!raw) return 7 * 24 * 60 * 60;
  if (/^\d+$/.test(raw)) return Number(raw);

  const matched = raw.match(/^(\d+)\s*([smhd])$/i);
  if (!matched) return 7 * 24 * 60 * 60;

  const value = Number(matched[1]);
  const unit = matched[2].toLowerCase();
  const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return value * multiplier;
}

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (secret) return secret;

  return 'midnightmens-dev-secret-change-me';
}

function signAuthToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: DEFAULT_ALGORITHM,
    typ: 'JWT'
  };
  const payload = {
    sub: String(user.id),
    role: user.role || 'MEMBER',
    iss: DEFAULT_ISSUER,
    iat: now,
    exp: now + parseExpiresInToSeconds(DEFAULT_EXPIRES_IN),
    jti: crypto.randomBytes(16).toString('hex')
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyAuthToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw new Error('INVALID_TOKEN_FORMAT');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw new Error('INVALID_TOKEN_SIGNATURE');
  }

  const header = JSON.parse(fromBase64Url(encodedHeader));
  const payload = JSON.parse(fromBase64Url(encodedPayload));
  if (header.alg !== DEFAULT_ALGORITHM || payload.iss !== DEFAULT_ISSUER) {
    throw new Error('INVALID_TOKEN_CLAIMS');
  }

  const now = Math.floor(Date.now() / 1000);
  if (Number(payload.exp || 0) <= now) {
    throw new Error('TOKEN_EXPIRED');
  }

  return payload;
}

module.exports = { signAuthToken, verifyAuthToken, DEFAULT_EXPIRES_IN };

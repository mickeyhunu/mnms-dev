/**
 * 파일 역할: 인증 이벤트(성공/실패/차단 등) 로그를 저장/조회하는 모델 파일.
 */
const crypto = require('crypto');
const { getPool } = require('../config/database');

function hashLoginId(loginId = '') {
  const normalized = String(loginId || '').trim().toLowerCase();
  if (!normalized) return null;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function maskIpAddress(ipAddress = '') {
  const value = String(ipAddress || '').trim();
  if (!value) return 'unknown';

  if (value.includes(':')) {
    const segments = value.split(':').filter(Boolean);
    if (!segments.length) return 'unknown';
    return `${segments.slice(0, 3).join(':')}:****`;
  }

  const segments = value.split('.');
  if (segments.length !== 4) return value.slice(0, 64);
  return `${segments[0]}.${segments[1]}.${segments[2]}.*`;
}

async function recordAuthEvent({
  eventType,
  reason = null,
  userId = null,
  loginId = null,
  ipAddress = null,
  userAgent = null
}) {
  const pool = getPool();
  const resolvedType = String(eventType || '').trim().toUpperCase();
  if (!resolvedType) return;

  await pool.query(
    `INSERT INTO auth_events (event_type, reason, user_id, login_id_hash, ip_address_masked, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      resolvedType,
      reason ? String(reason).slice(0, 120) : null,
      userId || null,
      hashLoginId(loginId),
      maskIpAddress(ipAddress),
      userAgent ? String(userAgent).slice(0, 500) : null
    ]
  );
}

module.exports = { recordAuthEvent, hashLoginId, maskIpAddress };

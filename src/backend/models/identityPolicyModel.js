/**
 * 파일 역할: 본인인증 기반 가입 정책(중복/재가입 제한/블랙리스트) DB 조회/기록 모델.
 */
const crypto = require('crypto');
const { getPool } = require('../config/database');

function normalizeIdentityValue(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function hashIdentityValue(value) {
  const normalized = normalizeIdentityValue(value);
  if (!normalized) return null;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

async function findUserByIdentityHashes({ ciHash = null, diHash = null, phoneHash = null }) {
  const pool = getPool();
  const conditions = [];
  const params = [];

  if (ciHash) {
    conditions.push('identity_ci_hash = ?');
    params.push(ciHash);
  }
  if (diHash) {
    conditions.push('identity_di_hash = ?');
    params.push(diHash);
  }
  if (phoneHash) {
    conditions.push('phone_hash = ?');
    params.push(phoneHash);
  }

  if (!conditions.length) return null;

  const [rows] = await pool.query(
    `SELECT id, email, account_status, created_at AS createdAt
     FROM users
     WHERE ${conditions.join(' OR ')}
     ORDER BY id DESC
     LIMIT 1`,
    params
  );

  return rows[0] || null;
}

async function isIdentityVerificationIdUsed(identityVerificationId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT identity_verification_id AS identityVerificationId FROM identity_verification_usages WHERE identity_verification_id = ? LIMIT 1',
    [identityVerificationId]
  );

  return rows.length > 0;
}

async function markIdentityVerificationUsed({ identityVerificationId, ciHash = null, diHash = null, phoneHash = null, usedByUserId = null, usedIpAddress = 'unknown' }) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO identity_verification_usages
      (identity_verification_id, ci_hash, di_hash, phone_hash, used_by_user_id, used_ip_address)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      used_by_user_id = VALUES(used_by_user_id),
      used_ip_address = VALUES(used_ip_address)`,
    [identityVerificationId, ciHash, diHash, phoneHash, usedByUserId, String(usedIpAddress || 'unknown').slice(0, 255)]
  );
}

async function findActiveSignupRestriction({ ciHash = null, diHash = null, phoneHash = null }) {
  const pool = getPool();
  const conditions = [];
  const params = [];

  if (ciHash) {
    conditions.push('ci_hash = ?');
    params.push(ciHash);
  }
  if (diHash) {
    conditions.push('di_hash = ?');
    params.push(diHash);
  }
  if (phoneHash) {
    conditions.push('phone_hash = ?');
    params.push(phoneHash);
  }

  if (!conditions.length) return null;

  const [rows] = await pool.query(
    `SELECT id, restriction_type AS restrictionType, reason, restricted_until AS restrictedUntil
     FROM signup_restrictions
     WHERE (${conditions.join(' OR ')})
       AND (restricted_until IS NULL OR restricted_until > NOW())
     ORDER BY id DESC
     LIMIT 1`,
    params
  );

  return rows[0] || null;
}

module.exports = {
  hashIdentityValue,
  findUserByIdentityHashes,
  isIdentityVerificationIdUsed,
  markIdentityVerificationUsed,
  findActiveSignupRestriction
};

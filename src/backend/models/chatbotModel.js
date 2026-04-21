/**
 * 파일 역할: chatBot_DB 테이블을 읽기 전용으로 안전하게 조회하는 모델 파일.
 */
const { getChatbotPool } = require('../config/database');

const TABLE_NAME_PATTERN = /^[A-Za-z0-9_]+$/;

function ensureTableName(tableName) {
  const normalized = String(tableName || '').trim();
  if (!TABLE_NAME_PATTERN.test(normalized)) {
    throw new Error('유효하지 않은 테이블 이름입니다.');
  }
  return normalized;
}

function normalizeLimit(limit) {
  const parsed = Number.parseInt(limit, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return 50;
  return Math.min(parsed, 500);
}

async function listTableRows(tableName, limit = 50) {
  const pool = await getChatbotPool();
  const safeTableName = ensureTableName(tableName);
  const rowLimit = normalizeLimit(limit);

  const [rows] = await pool.query(
    `SELECT * FROM \`${safeTableName}\` ORDER BY 1 DESC LIMIT ?`,
    [rowLimit]
  );

  return rows;
}

module.exports = {
  ensureTableName,
  normalizeLimit,
  listTableRows
};

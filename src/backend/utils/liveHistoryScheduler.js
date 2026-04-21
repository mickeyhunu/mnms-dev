/**
 * 파일 역할: LIVE 초이스톡/룸 데이터를 5분 주기로 히스토리 테이블에 적재하는 스케줄러 파일.
 */
const crypto = require('crypto');

const { getChatbotPool } = require('../config/database');
const liveModel = require('../models/liveModel');

const LIVE_HISTORY_INTERVAL_MS = 5 * 60 * 1000;

let liveHistoryTimer = null;
let liveHistoryRunPromise = null;

function normalizeStoreHistoryKey(storeNo, storeName = '') {
  const normalizedStoreNo = Number.parseInt(storeNo, 10);
  if (Number.isInteger(normalizedStoreNo) && normalizedStoreNo > 0) {
    return `storeNo:${normalizedStoreNo}`;
  }

  return `storeName:${String(storeName || '').trim()}`;
}

function normalizeComparableValue(value) {
  if (value === null || value === undefined) return '';

  if (typeof value === 'object') {
    return stableSerializeValue(value);
  }

  return String(value).trim();
}

function stableSerializeValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value).trim();

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerializeValue(item)).join(',')}]`;
  }

  return `{${Object.keys(value).sort().map((key) => `${key}:${stableSerializeValue(value[key])}`).join(',')}}`;
}

function createChoiceContentSignature(row = {}) {
  return [
    normalizeStoreHistoryKey(row.storeNo, row.storeName),
    normalizeComparableValue(row.choiceMsg)
  ].join('|');
}

function createChojoongContentSignature(row = {}) {
  return [
    normalizeStoreHistoryKey(row.storeNo, row.storeName),
    normalizeComparableValue(row.chojoongMsg)
  ].join('|');
}

function createWaitingContentSignature(row = {}) {
  return [
    normalizeStoreHistoryKey(row.storeNo, row.storeName),
    normalizeComparableValue(row.roomInfo),
    normalizeComparableValue(row.waitInfo),
    normalizeComparableValue(row.roomDetail)
  ].join('|');
}

function buildLatestHistoryMap(rows = []) {
  return rows.reduce((historyMap, row) => {
    const key = normalizeStoreHistoryKey(row.storeNo, row.storeName);
    historyMap.set(key, row);
    return historyMap;
  }, new Map());
}

async function getLatestChoiceHistoryMap() {
  const pool = await getChatbotPool();
  const [rows] = await pool.query(`
    SELECT history.storeNo, history.storeName, history.choiceMsg
      FROM LIVE_CHOICE_HISTORY AS history
      INNER JOIN (
        SELECT MAX(id) AS latestId
          FROM LIVE_CHOICE_HISTORY
         GROUP BY CASE
           WHEN storeNo IS NOT NULL THEN CONCAT('storeNo:', storeNo)
           ELSE CONCAT('storeName:', TRIM(storeName))
         END
      ) AS latest_history
        ON latest_history.latestId = history.id
  `);

  return buildLatestHistoryMap(rows);
}

async function getLatestChojoongHistoryMap() {
  const pool = await getChatbotPool();
  const [rows] = await pool.query(`
    SELECT history.storeNo, history.storeName, history.chojoongMsg
      FROM LIVE_CHOJOONG_HISTORY AS history
      INNER JOIN (
        SELECT MAX(id) AS latestId
          FROM LIVE_CHOJOONG_HISTORY
         GROUP BY CASE
           WHEN storeNo IS NOT NULL THEN CONCAT('storeNo:', storeNo)
           ELSE CONCAT('storeName:', TRIM(storeName))
         END
      ) AS latest_history
        ON latest_history.latestId = history.id
  `);

  return buildLatestHistoryMap(rows);
}

async function getLatestRoomHistoryMap() {
  const pool = await getChatbotPool();
  const [rows] = await pool.query(`
    SELECT history.storeNo, history.storeName, history.roomInfo, history.waitInfo, history.roomDetail
      FROM LIVE_ROOM_HISTORY AS history
      INNER JOIN (
        SELECT MAX(id) AS latestId
          FROM LIVE_ROOM_HISTORY
         GROUP BY CASE
           WHEN storeNo IS NOT NULL THEN CONCAT('storeNo:', storeNo)
           ELSE CONCAT('storeName:', TRIM(storeName))
         END
      ) AS latest_history
        ON latest_history.latestId = history.id
  `);

  return buildLatestHistoryMap(rows);
}

function hashHistoryKey(parts = []) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(parts))
    .digest('hex');
}

function getBucketDate(date = new Date()) {
  const bucketTime = Math.floor(date.getTime() / LIVE_HISTORY_INTERVAL_MS) * LIVE_HISTORY_INTERVAL_MS;
  return new Date(bucketTime);
}

function formatMySqlDateTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

async function ensureLiveHistoryTables() {
  const pool = await getChatbotPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS LIVE_CHOICE_HISTORY (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      dedupeKey CHAR(64) NOT NULL UNIQUE,
      storeNo INT NULL,
      storeName VARCHAR(255) NOT NULL DEFAULT '',
      choiceMsg LONGTEXT NOT NULL,
      createdAt DATETIME NULL,
      capturedAt DATETIME NOT NULL,
      INDEX idx_live_choice_history_store_created_at (storeNo, createdAt),
      INDEX idx_live_choice_history_store_name_created_at (storeName, createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS LIVE_ROOM_HISTORY (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      dedupeKey CHAR(64) NOT NULL UNIQUE,
      snapshotAt DATETIME NOT NULL,
      storeNo INT NULL,
      storeName VARCHAR(255) NOT NULL DEFAULT '',
      roomInfo VARCHAR(255) NULL,
      waitInfo VARCHAR(255) NULL,
      roomDetail LONGTEXT NULL,
      updatedAt DATETIME NOT NULL,
      sourceUpdatedAt DATETIME NULL,
      capturedAt DATETIME NOT NULL,
      INDEX idx_live_room_history_store_updated_at (storeNo, updatedAt),
      INDEX idx_live_room_history_store_name_updated_at (storeName, updatedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS LIVE_CHOJOONG_HISTORY (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      dedupeKey CHAR(64) NOT NULL UNIQUE,
      storeNo INT NULL,
      storeName VARCHAR(255) NOT NULL DEFAULT '',
      chojoongMsg LONGTEXT NOT NULL,
      createdAt DATETIME NULL,
      capturedAt DATETIME NOT NULL,
      INDEX idx_live_chojoong_history_store_created_at (storeNo, createdAt),
      INDEX idx_live_chojoong_history_store_name_created_at (storeName, createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function getLatestChoiceHistoryCreatedAt() {
  const pool = await getChatbotPool();
  const [rows] = await pool.query('SELECT MAX(createdAt) AS latestCreatedAt FROM LIVE_CHOICE_HISTORY');
  return rows[0]?.latestCreatedAt || null;
}

async function captureChoiceHistory() {
  const pool = await getChatbotPool();
  const latestCreatedAt = await getLatestChoiceHistoryCreatedAt();
  const rows = await liveModel.listLiveSourceRows('choice', { since: latestCreatedAt });
  const latestHistoryMap = await getLatestChoiceHistoryMap();
  const capturedAt = formatMySqlDateTime(new Date());

  for (const row of rows) {
    const storeHistoryKey = normalizeStoreHistoryKey(row.storeNo, row.storeName);
    const previousRow = latestHistoryMap.get(storeHistoryKey);

    if (previousRow && createChoiceContentSignature(previousRow) === createChoiceContentSignature(row)) {
      continue;
    }
    const sourceCreatedAt = row.createdAt ? String(row.createdAt) : null;
    const createdAt = sourceCreatedAt || capturedAt;
    const dedupeKey = hashHistoryKey([
      'choice',
      row.storeNo,
      row.storeName,
      row.choiceMsg,
      sourceCreatedAt || ''
    ]);

    const [result] = await pool.query(
      `INSERT IGNORE INTO LIVE_CHOICE_HISTORY
        (dedupeKey, storeNo, storeName, choiceMsg, createdAt, capturedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        dedupeKey,
        row.storeNo,
        row.storeName || '',
        row.choiceMsg || '',
        createdAt,
        capturedAt
      ]
    );

    if (result?.affectedRows) {
      latestHistoryMap.set(storeHistoryKey, row);
    }
  }
}

async function getLatestChojoongHistoryCreatedAt() {
  const pool = await getChatbotPool();
  const [rows] = await pool.query('SELECT MAX(createdAt) AS latestCreatedAt FROM LIVE_CHOJOONG_HISTORY');
  return rows[0]?.latestCreatedAt || null;
}

async function captureChojoongHistory() {
  const pool = await getChatbotPool();
  const latestCreatedAt = await getLatestChojoongHistoryCreatedAt();
  const rows = await liveModel.listLiveSourceRows('chojoong', { since: latestCreatedAt });
  const latestHistoryMap = await getLatestChojoongHistoryMap();
  const capturedAt = formatMySqlDateTime(new Date());

  for (const row of rows) {
    const storeHistoryKey = normalizeStoreHistoryKey(row.storeNo, row.storeName);
    const previousRow = latestHistoryMap.get(storeHistoryKey);

    if (previousRow && createChojoongContentSignature(previousRow) === createChojoongContentSignature(row)) {
      continue;
    }
    const sourceCreatedAt = row.createdAt ? String(row.createdAt) : null;
    const createdAt = sourceCreatedAt || capturedAt;
    const dedupeKey = hashHistoryKey([
      'chojoong',
      row.storeNo,
      row.storeName,
      row.chojoongMsg,
      sourceCreatedAt || ''
    ]);

    const [result] = await pool.query(
      `INSERT IGNORE INTO LIVE_CHOJOONG_HISTORY
        (dedupeKey, storeNo, storeName, chojoongMsg, createdAt, capturedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        dedupeKey,
        row.storeNo,
        row.storeName || '',
        row.chojoongMsg || '',
        createdAt,
        capturedAt
      ]
    );

    if (result?.affectedRows) {
      latestHistoryMap.set(storeHistoryKey, row);
    }
  }
}

async function captureRoomHistory() {
  const pool = await getChatbotPool();
  const snapshotAt = formatMySqlDateTime(getBucketDate());
  const capturedAt = formatMySqlDateTime(new Date());
  const rows = await liveModel.listLiveSourceRows('waiting');
  const latestHistoryMap = await getLatestRoomHistoryMap();

  for (const row of rows) {
    const storeHistoryKey = normalizeStoreHistoryKey(row.storeNo, row.storeName);
    const previousRow = latestHistoryMap.get(storeHistoryKey);

    if (previousRow && createWaitingContentSignature(previousRow) === createWaitingContentSignature(row)) {
      continue;
    }
    const dedupeKey = hashHistoryKey([
      'waiting',
      snapshotAt,
      row.storeNo,
      row.storeName,
      row.roomInfo,
      row.waitInfo,
      row.roomDetail
    ]);

    const serializedRoomDetail = row.roomDetail == null
      ? null
      : (typeof row.roomDetail === 'string' ? row.roomDetail : JSON.stringify(row.roomDetail));

    const [result] = await pool.query(
      `INSERT IGNORE INTO LIVE_ROOM_HISTORY
        (dedupeKey, snapshotAt, storeNo, storeName, roomInfo, waitInfo, roomDetail, updatedAt, sourceUpdatedAt, capturedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dedupeKey,
        snapshotAt,
        row.storeNo,
        row.storeName || '',
        row.roomInfo == null ? null : String(row.roomInfo),
        row.waitInfo == null ? null : String(row.waitInfo),
        serializedRoomDetail,
        snapshotAt,
        row.sourceUpdatedAt ? String(row.sourceUpdatedAt) : null,
        capturedAt
      ]
    );

    if (result?.affectedRows) {
      latestHistoryMap.set(storeHistoryKey, {
        ...row,
        roomDetail: serializedRoomDetail
      });
    }
  }
}

async function runLiveHistorySnapshot() {
  if (liveHistoryRunPromise) {
    return liveHistoryRunPromise;
  }

  liveHistoryRunPromise = (async () => {
    await ensureLiveHistoryTables();
    await captureChoiceHistory();
    await captureChojoongHistory();
    await captureRoomHistory();
  })();

  try {
    await liveHistoryRunPromise;
  } finally {
    liveHistoryRunPromise = null;
  }
}

async function startLiveHistoryScheduler() {
  await runLiveHistorySnapshot();

  if (liveHistoryTimer) {
    return liveHistoryTimer;
  }

  liveHistoryTimer = setInterval(() => {
    runLiveHistorySnapshot().catch((error) => {
      console.error('LIVE history snapshot error:', error);
    });
  }, LIVE_HISTORY_INTERVAL_MS);

  return liveHistoryTimer;
}

module.exports = {
  LIVE_HISTORY_INTERVAL_MS,
  ensureLiveHistoryTables,
  runLiveHistorySnapshot,
  startLiveHistoryScheduler
};

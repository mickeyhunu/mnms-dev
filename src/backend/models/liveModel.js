/**
 * 파일 역할: chatBot_DB에서 룸/웨이팅/초이스톡/엔트리 데이터를 읽어오는 LIVE 페이지 조회 모델 파일.
 */
const { getChatbotPool } = require('../config/database');

const TABLE_NAME_PATTERN = /^[A-Za-z0-9_]+$/;
const STORE_NO_CANDIDATES = ['storeNo', 'store_no', 'shopNo', 'shop_no', 'branchNo', 'branch_no'];
const STORE_NAME_CANDIDATES = ['storeName', 'store_name', 'name', 'shopName', 'shop_name', 'branchName', 'branch_name'];
const STORE_ADDRESS_CANDIDATES = ['storeAddress', 'store_address', 'address', 'addr', 'location', 'locationAddress', 'roadAddress', 'jibunAddress'];
const STORE_FILTER_CANDIDATES = ['storeName', 'store_name', 'name', 'shopName', 'shop_name', 'branchName', 'branch_name', 'store', 'storeNm'];
const ORDER_CANDIDATES = ['updatedAt', 'updated_at', 'createdAt', 'created_at', 'regDate', 'reg_date', 'entryDate', 'entry_date', 'date'];
const DISPLAY_FIELD_CANDIDATES = ['title', 'subject', 'name', 'nickName', 'nickname', 'roomName', 'choiceName', 'entryName', 'message'];
const CHOICE_MESSAGE_CANDIDATES = ['choiceMsg', 'choice_msg', 'message', 'msg', 'content'];
const CHOJOONG_MESSAGE_CANDIDATES = ['chojoongMsg', 'chojoong_msg', 'message', 'msg', 'content'];
const ROOM_INFO_CANDIDATES = ['roomInfo', 'room_info'];
const WAIT_INFO_CANDIDATES = ['waitInfo', 'wait_info', 'waitingInfo', 'waiting_info'];
const ROOM_DETAIL_CANDIDATES = ['roomDetail', 'room_detail', 'detail', 'details'];

const MYSQL_DATETIME_FORMAT = '%Y-%m-%d %H:%i:%s';
const TEMPORAL_COLUMN_CANDIDATES = new Set([
  ...ORDER_CANDIDATES,
  'snapshotAt',
  'snapshot_at',
  'sourceUpdatedAt',
  'source_updated_at',
  'capturedAt',
  'captured_at',
  'answeredAt',
  'answered_at'
].map((column) => String(column).toLowerCase()));

const LIVE_CATEGORY_MAP = {
  choice: { key: 'choice', label: '초이스톡', tableName: 'LIVE_CHOICE_HISTORY', sourceTableName: 'INFO_CHOICE' },
  chojoong: { key: 'chojoong', label: '초중', tableName: 'LIVE_CHOJOONG_HISTORY', sourceTableName: 'INFO_CHOJOONG' },
  waiting: { key: 'waiting', label: '웨이팅', tableName: 'LIVE_ROOM_HISTORY', sourceTableName: 'INFO_ROOM' },
  entry: { key: 'entry', label: '엔트리', tableName: 'ENTRY_TODAY' }
};

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
  return Math.min(parsed, 300);
}

function normalizeOffset(offset) {
  const parsed = Number.parseInt(offset, 10);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}

function getCategoryConfig(categoryKey) {
  return LIVE_CATEGORY_MAP[String(categoryKey || '').trim()] || LIVE_CATEGORY_MAP.choice;
}

function findColumn(columns, candidates) {
  const normalizedMap = new Map(columns.map((column) => [String(column).toLowerCase(), column]));
  for (const candidate of candidates) {
    const match = normalizedMap.get(String(candidate).toLowerCase());
    if (match) return match;
  }
  return null;
}

function buildTemporalSelect(columnName) {
  return `DATE_FORMAT(\`${columnName}\`, '${MYSQL_DATETIME_FORMAT}') AS \`${columnName}\``;
}

function buildLiveSelectClause(columns = []) {
  return columns.map((column) => {
    if (TEMPORAL_COLUMN_CANDIDATES.has(String(column).toLowerCase())) {
      return buildTemporalSelect(column);
    }

    return `\`${column}\``;
  }).join(', ');
}

async function getTableColumns(tableName) {
  const pool = await getChatbotPool();
  const safeTableName = ensureTableName(tableName);
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${safeTableName}\``);
  return rows.map((row) => row.Field);
}

async function listStores() {
  const pool = await getChatbotPool();
  const tableName = 'INFO_STORE';
  const columns = await getTableColumns(tableName);
  const storeNoColumn = findColumn(columns, STORE_NO_CANDIDATES);
  const storeNameColumn = findColumn(columns, STORE_NAME_CANDIDATES);
  const storeAddressColumn = findColumn(columns, STORE_ADDRESS_CANDIDATES);

  if (!storeNameColumn) {
    throw new Error('INFO_STORE에서 매장명 컬럼을 찾을 수 없습니다.');
  }

  const selectStoreNo = storeNoColumn ? `\`${storeNoColumn}\` AS storeNo,` : 'NULL AS storeNo,';
  const selectStoreAddress = storeAddressColumn ? `\`${storeAddressColumn}\` AS storeAddress` : "'' AS storeAddress";
  const orderByClause = storeNoColumn
    ? `ORDER BY \`${storeNoColumn}\` ASC, \`${storeNameColumn}\` ASC`
    : `ORDER BY \`${storeNameColumn}\` ASC`;

  const [rows] = await pool.query(
    `SELECT DISTINCT ${selectStoreNo}
            \`${storeNameColumn}\` AS storeName,
            ${selectStoreAddress}
       FROM \`${tableName}\`
      WHERE \`${storeNameColumn}\` IS NOT NULL
        AND TRIM(\`${storeNameColumn}\`) <> ''
      ${orderByClause}`
  );

  return rows
    .map((row) => ({
      storeNo: Number.isFinite(Number(row.storeNo)) ? Number(row.storeNo) : null,
      storeName: String(row.storeName || '').trim(),
      storeAddress: String(row.storeAddress || '').trim()
    }))
    .filter((row) => row.storeName)
    .sort((a, b) => {
      if (a.storeNo === null && b.storeNo === null) return a.storeName.localeCompare(b.storeName, 'ko');
      if (a.storeNo === null) return 1;
      if (b.storeNo === null) return -1;
      return a.storeNo - b.storeNo;
    });
}

async function getStoreByNo(storeNo) {
  const normalizedStoreNo = Number.parseInt(storeNo, 10);
  if (!Number.isInteger(normalizedStoreNo) || normalizedStoreNo <= 0) {
    return null;
  }

  const stores = await listStores();
  return stores.find((store) => store.storeNo === normalizedStoreNo) || null;
}

async function buildStoreLookupMap() {
  const stores = await listStores();
  return new Map(
    stores
      .filter((store) => Number.isInteger(store.storeNo) && store.storeName)
      .map((store) => [store.storeNo, store.storeName])
  );
}

function normalizeNullableString(value = '') {
  const normalized = String(value ?? '').trim();
  return normalized || '';
}

function buildStoreFilter(columns, { storeNo = null, storeName = '' } = {}) {
  const normalizedStoreNo = Number.parseInt(storeNo, 10);
  const normalizedStoreName = String(storeName || '').trim();
  const storeNoColumn = findColumn(columns, STORE_NO_CANDIDATES);
  const storeNameColumn = findColumn(columns, STORE_FILTER_CANDIDATES);

  if (Number.isInteger(normalizedStoreNo) && normalizedStoreNo > 0 && storeNoColumn) {
    return { clause: `WHERE \`${storeNoColumn}\` = ?`, params: [normalizedStoreNo], column: storeNoColumn, type: 'storeNo' };
  }

  if (normalizedStoreName && storeNameColumn) {
    return { clause: `WHERE \`${storeNameColumn}\` = ?`, params: [normalizedStoreName], column: storeNameColumn, type: 'storeName' };
  }

  return { clause: '', params: [], column: storeNoColumn || storeNameColumn || null, type: null };
}

async function countRows(tableName, { storeNo = null, storeName = '' } = {}) {
  const pool = await getChatbotPool();
  const safeTableName = ensureTableName(tableName);
  const columns = await getTableColumns(safeTableName);
  const storeFilter = buildStoreFilter(columns, { storeNo, storeName });

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM \`${safeTableName}\`
       ${storeFilter.clause}`,
    storeFilter.params
  );

  return Number(rows[0]?.total || 0);
}

async function listLiveEntries(categoryKey, { storeNo = null, limit = 50, offset = 0 } = {}) {
  const pool = await getChatbotPool();
  const category = getCategoryConfig(categoryKey);
  const safeTableName = ensureTableName(category.tableName);
  const rowLimit = normalizeLimit(limit);
  const rowOffset = normalizeOffset(offset);
  const columns = await getTableColumns(safeTableName);
  const orderColumn = findColumn(columns, ORDER_CANDIDATES);
  const titleColumn = findColumn(columns, DISPLAY_FIELD_CANDIDATES);
  const selectedStore = await getStoreByNo(storeNo);
  const storeFilter = buildStoreFilter(columns, {
    storeNo,
    storeName: selectedStore?.storeName || ''
  });
  const params = category.key === 'entry'
    ? [...storeFilter.params, rowLimit]
    : [...storeFilter.params, rowLimit, rowOffset];

  const selectClause = buildLiveSelectClause(columns);

  const query = orderColumn
    ? category.key === 'entry'
      ? `SELECT ${selectClause}
           FROM (
             SELECT ${selectClause}
               FROM \`${safeTableName}\`
               ${storeFilter.clause}
              ORDER BY \`${orderColumn}\` DESC
              LIMIT ?
           ) AS recent_entries
          ORDER BY \`${orderColumn}\` ASC`
      : `SELECT ${selectClause}
           FROM (
             SELECT ${selectClause}
               FROM \`${safeTableName}\`
               ${storeFilter.clause}
              ORDER BY \`${orderColumn}\` DESC
              LIMIT ? OFFSET ?
           ) AS history_entries
          ORDER BY \`${orderColumn}\` ASC`
    : category.key === 'entry'
      ? `SELECT ${selectClause}
           FROM \`${safeTableName}\`
           ${storeFilter.clause}
           LIMIT ?`
      : `SELECT ${selectClause}
           FROM \`${safeTableName}\`
           ${storeFilter.clause}
           LIMIT ? OFFSET ?`;

  const [rows] = await pool.query(query, params);

  return {
    category,
    selectedStore,
    storeFilterColumn: storeFilter.column,
    titleColumn,
    columns,
    rows,
    rowLimit,
    rowOffset
  };
}

async function listLiveSourceRows(categoryKey, { since = null } = {}) {
  const pool = await getChatbotPool();
  const category = getCategoryConfig(categoryKey);
  const sourceTableName = ensureTableName(category.sourceTableName || category.tableName);
  const columns = await getTableColumns(sourceTableName);
  const storeNoColumn = findColumn(columns, STORE_NO_CANDIDATES);
  const storeNameColumn = findColumn(columns, STORE_NAME_CANDIDATES);
  const orderColumn = findColumn(columns, ORDER_CANDIDATES);
  const storeLookup = await buildStoreLookupMap();

  if (category.key === 'choice' || category.key === 'chojoong') {
    const messageCandidates = category.key === 'chojoong'
      ? CHOJOONG_MESSAGE_CANDIDATES
      : CHOICE_MESSAGE_CANDIDATES;
    const choiceMessageColumn = findColumn(columns, messageCandidates);
    const messageAlias = category.key === 'chojoong' ? 'chojoongMsg' : 'choiceMsg';

    if (!choiceMessageColumn) {
      throw new Error(`${sourceTableName}에서 메시지 컬럼을 찾을 수 없습니다.`);
    }

    const whereClauses = [`\`${choiceMessageColumn}\` IS NOT NULL`, `TRIM(\`${choiceMessageColumn}\`) <> ''`];
    const params = [];

    if (since && orderColumn) {
      whereClauses.push(`\`${orderColumn}\` > ?`);
      params.push(since);
    }

    const [rows] = await pool.query(
      `SELECT ${storeNoColumn ? `\`${storeNoColumn}\`` : 'NULL'} AS storeNo,
              ${storeNameColumn ? `\`${storeNameColumn}\`` : "''"} AS storeName,
              \`${choiceMessageColumn}\` AS ${messageAlias},
              ${orderColumn ? `DATE_FORMAT(\`${orderColumn}\`, '${MYSQL_DATETIME_FORMAT}')` : 'NULL'} AS createdAt
         FROM \`${sourceTableName}\`
        WHERE ${whereClauses.join(' AND ')}
        ${orderColumn ? `ORDER BY \`${orderColumn}\` ASC` : ''}`,
      params
    );

    return rows.map((row) => {
      const normalizedStoreNo = Number.isInteger(Number(row.storeNo)) ? Number(row.storeNo) : null;
      return {
        storeNo: normalizedStoreNo,
        storeName: normalizeNullableString(row.storeName) || storeLookup.get(normalizedStoreNo) || '',
        [messageAlias]: normalizeNullableString(row[messageAlias]),
        createdAt: row.createdAt || null
      };
    });
  }

  if (category.key === 'waiting') {
    const roomInfoColumn = findColumn(columns, ROOM_INFO_CANDIDATES);
    const waitInfoColumn = findColumn(columns, WAIT_INFO_CANDIDATES);
    const roomDetailColumn = findColumn(columns, ROOM_DETAIL_CANDIDATES);

    const [rows] = await pool.query(
      `SELECT ${storeNoColumn ? `\`${storeNoColumn}\`` : 'NULL'} AS storeNo,
              ${storeNameColumn ? `\`${storeNameColumn}\`` : "''"} AS storeName,
              ${roomInfoColumn ? `\`${roomInfoColumn}\`` : 'NULL'} AS roomInfo,
              ${waitInfoColumn ? `\`${waitInfoColumn}\`` : 'NULL'} AS waitInfo,
              ${roomDetailColumn ? `\`${roomDetailColumn}\`` : 'NULL'} AS roomDetail,
              ${orderColumn ? `DATE_FORMAT(\`${orderColumn}\`, '${MYSQL_DATETIME_FORMAT}')` : 'NULL'} AS sourceUpdatedAt
         FROM \`${sourceTableName}\`
        ${storeNoColumn ? `ORDER BY \`${storeNoColumn}\` ASC` : storeNameColumn ? `ORDER BY \`${storeNameColumn}\` ASC` : ''}`
    );

    return rows.map((row) => {
      const normalizedStoreNo = Number.isInteger(Number(row.storeNo)) ? Number(row.storeNo) : null;
      return {
        storeNo: normalizedStoreNo,
        storeName: normalizeNullableString(row.storeName) || storeLookup.get(normalizedStoreNo) || '',
        roomInfo: row.roomInfo ?? null,
        waitInfo: row.waitInfo ?? null,
        roomDetail: row.roomDetail ?? null,
        sourceUpdatedAt: row.sourceUpdatedAt || null
      };
    });
  }

  return [];
}

async function getLiveFilters() {
  const stores = await listStores();
  const categories = await Promise.all(
    Object.values(LIVE_CATEGORY_MAP).map(async (category) => ({
      key: category.key,
      label: category.label,
      tableName: category.tableName,
      totalCount: await countRows(category.tableName)
    }))
  );

  return { stores, categories };
}

async function deleteLiveHistoryRow(categoryKey, rowId) {
  const pool = await getChatbotPool();
  const category = getCategoryConfig(categoryKey);
  const normalizedRowId = Number.parseInt(rowId, 10);

  if (!Number.isInteger(normalizedRowId) || normalizedRowId <= 0) {
    throw new Error('유효하지 않은 LIVE 이력 ID입니다.');
  }

  const safeTableName = ensureTableName(category.tableName);
  const [result] = await pool.query(`DELETE FROM \`${safeTableName}\` WHERE id = ?`, [normalizedRowId]);
  return Number(result?.affectedRows || 0);
}

module.exports = {
  CHOICE_MESSAGE_CANDIDATES,
  LIVE_CATEGORY_MAP,
  ORDER_CANDIDATES,
  ROOM_DETAIL_CANDIDATES,
  ROOM_INFO_CANDIDATES,
  STORE_NAME_CANDIDATES,
  STORE_NO_CANDIDATES,
  WAIT_INFO_CANDIDATES,
  countRows,
  findColumn,
  getCategoryConfig,
  getLiveFilters,
  getTableColumns,
  listLiveEntries,
  listLiveSourceRows,
  getStoreByNo,
  listStores,
  normalizeLimit,
  normalizeOffset,
  deleteLiveHistoryRow
};

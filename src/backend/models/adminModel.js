/**
 * 파일 역할: 관리자 전용 회원/광고 데이터 조회 및 수정 쿼리를 담당하는 모델 파일.
 */
const { getPool, getChatbotPool } = require('../config/database');
const { pickUserRow } = require('../utils/response');
const { ensureResolvedLoginRestriction, getUserActivityStats, getUserActivityDetails, getUserLoginHistories } = require('./userModel');
const { getStoreByNo, listStores } = require('./liveModel');

async function listUsers() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT *
     FROM users
     WHERE role = 'MEMBER'
     ORDER BY created_at DESC, id DESC`
  );
  const resolvedRows = [];
  for (const row of rows) {
    const resolved = await ensureResolvedLoginRestriction(row);
    resolvedRows.push(pickUserRow(resolved || row));
  }
  return resolvedRows;
}

async function findUserById(userId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
  return ensureResolvedLoginRestriction(rows[0] || null);
}

async function getUserDetail(userId) {
  const user = await findUserById(userId);
  return user ? pickUserRow(user) : null;
}

async function getUserActivityOverview(userId, { limit = 10 } = {}) {
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 10));
  const [stats, activityDetails, loginHistories] = await Promise.all([
    getUserActivityStats(userId),
    getUserActivityDetails(userId, { limit: safeLimit }),
    getUserLoginHistories(userId, { limit: safeLimit })
  ]);

  return {
    stats: {
      postCount: Number(stats.postCount || 0),
      commentCount: Number(stats.commentCount || 0),
      attendanceCount: Number(stats.attendanceCount || 0),
      reviewCount: Number(stats.reviewCount || 0),
      recommendCount: Number(stats.recommendCount || 0)
    },
    recentPosts: activityDetails.posts.map((post) => ({
      id: Number(post.id),
      title: post.title,
      boardType: post.boardType,
      createdAt: post.createdAt,
      likeCount: Number(post.likeCount || 0),
      commentCount: Number(post.commentCount || 0)
    })),
    recentComments: activityDetails.comments.map((comment) => ({
      id: Number(comment.id),
      postId: Number(comment.postId),
      postTitle: comment.postTitle,
      postBoardType: comment.postBoardType,
      content: comment.content,
      createdAt: comment.createdAt
    })),
    recentLikedPosts: activityDetails.likedPosts.map((post) => ({
      id: Number(post.id),
      title: post.title,
      boardType: post.boardType,
      createdAt: post.createdAt,
      likedAt: post.likedAt,
      likeCount: Number(post.likeCount || 0),
      commentCount: Number(post.commentCount || 0)
    })),
    loginHistories: loginHistories.map((history) => ({
      id: Number(history.id),
      ipAddress: history.ipAddress,
      userAgent: history.userAgent,
      createdAt: history.createdAt
    }))
  };
}

async function updateUserRole(userId, role) {
  const pool = getPool();
  await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
}


async function updateUserMemberType(userId, memberType) {
  const pool = getPool();
  await pool.query('UPDATE users SET member_type = ? WHERE id = ?', [memberType, userId]);
}

async function updateUserByAdmin(userId, payload) {
  const pool = getPool();
  const fields = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(payload, 'nickname')) {
    fields.push('nickname = ?');
    values.push(payload.nickname);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'password')) {
    fields.push('password = ?');
    values.push(payload.password);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    fields.push('phone = ?');
    values.push(payload.phone || null);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'sms_consent')) {
    fields.push('sms_consent = ?');
    values.push(payload.sms_consent ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'role')) {
    fields.push('role = ?');
    values.push(payload.role);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'member_type')) {
    fields.push('member_type = ?');
    values.push(payload.member_type);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'account_status')) {
    fields.push('account_status = ?');
    values.push(payload.account_status);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'login_restricted_until')) {
    fields.push('login_restricted_until = ?');
    values.push(payload.login_restricted_until);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'is_login_restriction_permanent')) {
    fields.push('is_login_restriction_permanent = ?');
    values.push(payload.is_login_restriction_permanent ? 1 : 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'total_points')) {
    fields.push('total_points = ?');
    values.push(payload.total_points);
  }

  if (!fields.length) return;

  values.push(userId);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
}

async function deleteUser(userId) {
  const pool = getPool();
  await pool.query('DELETE FROM users WHERE id = ?', [userId]);
}

async function listAds() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, title, image_url AS imageUrl, link_url AS linkUrl,
            ad_type AS adType, store_no AS storeNo, display_order AS displayOrder,
            is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
     FROM banner_ads
     ORDER BY store_no IS NULL ASC, store_no ASC, display_order ASC, id DESC`
  );
  return rows;
}

async function createAd({ title, imageUrl, linkUrl, adType = 'LIVE', storeNo = null, displayOrder = 0, isActive = true }) {
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO banner_ads (title, image_url, link_url, ad_type, store_no, display_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, imageUrl, linkUrl, adType, storeNo, displayOrder, isActive ? 1 : 0]
  );
  return result.insertId;
}

async function findAdById(adId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, title, image_url AS imageUrl, link_url AS linkUrl, ad_type AS adType, store_no AS storeNo
       FROM banner_ads
      WHERE id = ?`,
    [adId]
  );
  return rows[0] || null;
}

async function updateAd(adId, { title, imageUrl, linkUrl, adType = 'LIVE', storeNo = null, displayOrder = 0, isActive = true }) {
  const pool = getPool();
  await pool.query(
    `UPDATE banner_ads
     SET title = ?, image_url = ?, link_url = ?, ad_type = ?, store_no = ?, display_order = ?, is_active = ?
     WHERE id = ?`,
    [title, imageUrl, linkUrl, adType, storeNo, displayOrder, isActive ? 1 : 0, adId]
  );
}

async function listLiveAdsByStore(storeNo) {
  const pool = getPool();
  const normalizedStoreNo = Number.parseInt(storeNo, 10);
  if (!Number.isInteger(normalizedStoreNo) || normalizedStoreNo <= 0) return [];

  const [rows] = await pool.query(
    `SELECT id, title, image_url AS imageUrl, link_url AS linkUrl,
            ad_type AS adType, store_no AS storeNo, display_order AS displayOrder
       FROM banner_ads
      WHERE is_active = 1
        AND ad_type = 'LIVE'
        AND store_no = ?
      ORDER BY display_order ASC, id DESC`,
    [normalizedStoreNo]
  );

  return rows;
}

async function listTopAdsByPlacement(placement = 'HOME') {
  const pool = getPool();
  const normalizedPlacement = String(placement || 'HOME').trim().toUpperCase();
  const placementStoreNoMap = {
    HOME: 1,
    COMMUNITY: 2
  };
  const placementStoreNo = placementStoreNoMap[normalizedPlacement];

  if (!placementStoreNo) return [];

  const [rows] = await pool.query(
    `SELECT id, title, image_url AS imageUrl, link_url AS linkUrl,
            ad_type AS adType, store_no AS storeNo, display_order AS displayOrder
       FROM banner_ads
      WHERE is_active = 1
        AND ad_type = 'TOP'
        AND store_no = ?
      ORDER BY display_order ASC, id DESC`,
    [placementStoreNo]
  );

  return rows;
}

async function deleteAd(adId) {
  const pool = getPool();
  await pool.query('DELETE FROM banner_ads WHERE id = ?', [adId]);
}

async function listBusinessAdsByOwner(ownerUserId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, owner_user_id AS ownerUserId, business_name AS businessName, manager_name AS managerName, manager_contact AS managerContact,
            title, image_url AS imageUrl, link_url AS linkUrl,
            region, district, category, open_hour AS openHour, close_hour AS closeHour,
            description, plan_type AS planType, view_count AS viewCount,
            registration_status AS registrationStatus, display_order AS displayOrder, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
       FROM business_ads
      WHERE owner_user_id = ?
      ORDER BY display_order ASC, id DESC`,
    [ownerUserId]
  );
  return rows;
}

async function listPublicBusinessAds({ region = '', district = '', category = '', keyword = '' } = {}) {
  const pool = getPool();
  const whereConditions = ['ba.is_active = 1', "ba.registration_status = 'REGISTERED'"];
  const whereParams = [];

  if (region) {
    whereConditions.push('ba.region = ?');
    whereParams.push(region);
  }

  if (district) {
    whereConditions.push('ba.district = ?');
    whereParams.push(district);
  }

  if (category) {
    whereConditions.push('ba.category = ?');
    whereParams.push(category);
  }

  if (keyword) {
    whereConditions.push('(ba.title LIKE ? OR COALESCE(u.nickname, \'\') LIKE ?)');
    whereParams.push(`%${keyword}%`, `%${keyword}%`);
  }

  const [rows] = await pool.query(
    `SELECT ba.id, ba.owner_user_id AS ownerUserId, ba.business_name AS businessName, ba.manager_name AS managerName, ba.manager_contact AS managerContact,
            ba.title, ba.image_url AS imageUrl, ba.link_url AS linkUrl,
            ba.region, ba.district, ba.category, ba.open_hour AS openHour, ba.close_hour AS closeHour,
            ba.description, ba.plan_type AS planType, ba.display_order AS displayOrder, ba.created_at AS createdAt,
            ba.view_count AS viewCount, ba.registration_status AS registrationStatus, COALESCE(u.nickname, '업체') AS ownerNickname,
            COALESCE(bp.company_name, '') AS companyName, COALESCE(bp.manager_name, '') AS profileManagerName
       FROM business_ads ba
       LEFT JOIN users u ON u.id = ba.owner_user_id
       LEFT JOIN business_profiles bp ON bp.user_id = ba.owner_user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY CASE WHEN ba.plan_type = 'PREMIUM' THEN 0 ELSE 1 END, ba.display_order ASC, ba.id DESC`,
    whereParams
  );

  return rows;
}

async function createBusinessAd({
  ownerUserId,
  businessName = '',
  managerName = '',
  managerContact = '',
  title,
  imageUrl,
  linkUrl,
  region = '',
  district = '',
  category = '',
  openHour = '',
  closeHour = '',
  description = '',
  planType = 'NORMAL',
  displayOrder = 0,
  isActive = true,
  registrationStatus = 'UNREGISTERED'
}) {
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO business_ads (
      owner_user_id, business_name, manager_name, manager_contact, title, image_url, link_url, region, district, category, open_hour, close_hour,
      description, plan_type, registration_status, display_order, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ownerUserId, businessName, managerName, managerContact, title, imageUrl, linkUrl, region, district, category, openHour, closeHour, description, planType, registrationStatus, displayOrder, isActive ? 1 : 0]
  );
  return result.insertId;
}

async function findBusinessAdById(adId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, owner_user_id AS ownerUserId, business_name AS businessName, manager_name AS managerName, manager_contact AS managerContact,
            title, image_url AS imageUrl, link_url AS linkUrl,
            region, district, category, open_hour AS openHour, close_hour AS closeHour,
            description, plan_type AS planType, view_count AS viewCount,
            registration_status AS registrationStatus, display_order AS displayOrder, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
       FROM business_ads
      WHERE id = ?`,
    [adId]
  );
  return rows[0] || null;
}

async function updateBusinessAd(adId, {
  businessName = '',
  managerName = '',
  managerContact = '',
  title,
  imageUrl,
  linkUrl,
  region = '',
  district = '',
  category = '',
  openHour = '',
  closeHour = '',
  description = '',
  planType = 'NORMAL',
  displayOrder = 0,
  isActive = true,
  registrationStatus = 'UNREGISTERED'
}) {
  const pool = getPool();
  await pool.query(
    `UPDATE business_ads
     SET business_name = ?, manager_name = ?, manager_contact = ?, title = ?, image_url = ?, link_url = ?, region = ?, district = ?, category = ?, open_hour = ?, close_hour = ?,
         description = ?, plan_type = ?, registration_status = ?, display_order = ?, is_active = ?
     WHERE id = ?`,
    [businessName, managerName, managerContact, title, imageUrl, linkUrl, region, district, category, openHour, closeHour, description, planType, registrationStatus, displayOrder, isActive ? 1 : 0, adId]
  );
}

async function increaseBusinessAdViewCounts(adIds = []) {
  if (!Array.isArray(adIds) || !adIds.length) return;
  const normalizedIds = [...new Set(adIds.map((id) => Number.parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0))];
  if (!normalizedIds.length) return;

  const pool = getPool();
  const placeholders = normalizedIds.map(() => '?').join(', ');
  await pool.query(
    `UPDATE business_ads
        SET view_count = view_count + 1
      WHERE id IN (${placeholders})`,
    normalizedIds
  );
}

async function deleteBusinessAd(adId) {
  const pool = getPool();
  await pool.query('DELETE FROM business_ads WHERE id = ?', [adId]);
}

function encodeEntryId({ storeNo, workerName, createdAtKey }) {
  return Buffer.from(JSON.stringify({
    storeNo: Number(storeNo),
    workerName: String(workerName || ''),
    createdAtKey: Number.parseInt(createdAtKey, 10)
  })).toString('base64url');
}

function decodeEntryId(entryId) {
  try {
    const raw = Buffer.from(String(entryId || ''), 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    const storeNo = Number.parseInt(parsed.storeNo, 10);
    const workerName = String(parsed.workerName || '').trim();
    const createdAtKey = Number.parseInt(parsed.createdAtKey, 10);

    if (!Number.isInteger(storeNo) || storeNo <= 0 || !workerName || !Number.isInteger(createdAtKey) || createdAtKey <= 0) {
      return null;
    }

    return { storeNo, workerName, createdAtKey };
  } catch (error) {
    return null;
  }
}

async function listEntryStores() {
  const stores = await listStores();
  return stores.filter((store) => Number.isInteger(store.storeNo) && store.storeNo > 0 && store.storeName);
}

async function listEntries(storeNo) {
  const chatbotPool = await getChatbotPool();
  const normalizedStoreNo = Number.parseInt(storeNo, 10);
  const [rows] = await chatbotPool.query(
    `SELECT storeNo, workerName, mentionCount, insertCount, createdAt,
            UNIX_TIMESTAMP(createdAt) AS createdAtKey
       FROM ENTRY_TODAY
      WHERE storeNo = ?
      ORDER BY createdAt DESC, workerName ASC`,
    [normalizedStoreNo]
  );

  return rows.map((row) => ({
    entryId: encodeEntryId(row),
    storeNo: Number(row.storeNo),
    workerName: String(row.workerName || '').trim(),
    mentionCount: Number(row.mentionCount || 0),
    insertCount: Number(row.insertCount || 0),
    createdAt: row.createdAt
  }));
}

async function findEntryById(entryId) {
  const chatbotPool = await getChatbotPool();
  const decoded = decodeEntryId(entryId);
  if (!decoded) return null;

  const [rows] = await chatbotPool.query(
    `SELECT storeNo, workerName, mentionCount, insertCount, createdAt,
            UNIX_TIMESTAMP(createdAt) AS createdAtKey
       FROM ENTRY_TODAY
      WHERE storeNo = ?
        AND workerName = ?
        AND UNIX_TIMESTAMP(createdAt) = ?
      LIMIT 1`,
    [decoded.storeNo, decoded.workerName, decoded.createdAtKey]
  );

  if (!rows.length) {
    const fallbackRow = await findEntryByStoreAndName(decoded.storeNo, decoded.workerName);
    if (!fallbackRow) return null;

    return {
      entryId: encodeEntryId(fallbackRow),
      storeNo: Number(fallbackRow.storeNo),
      workerName: String(fallbackRow.workerName || '').trim(),
      mentionCount: Number(fallbackRow.mentionCount || 0),
      insertCount: Number(fallbackRow.insertCount || 0),
      createdAt: fallbackRow.createdAt
    };
  }

  return {
    entryId: encodeEntryId(rows[0]),
    storeNo: Number(rows[0].storeNo),
    workerName: String(rows[0].workerName || '').trim(),
    mentionCount: Number(rows[0].mentionCount || 0),
    insertCount: Number(rows[0].insertCount || 0),
    createdAt: rows[0].createdAt
  };
}

async function findEntryByStoreAndName(storeNo, workerName) {
  const chatbotPool = await getChatbotPool();
  const normalizedStoreNo = Number.parseInt(storeNo, 10);
  const normalizedWorkerName = String(workerName || '').trim();
  const [rows] = await chatbotPool.query(
    `SELECT storeNo, workerName, mentionCount, insertCount, createdAt,
            UNIX_TIMESTAMP(createdAt) AS createdAtKey
       FROM ENTRY_TODAY
      WHERE storeNo = ?
        AND workerName = ?
      ORDER BY createdAt DESC
      LIMIT 1`,
    [normalizedStoreNo, normalizedWorkerName]
  );

  return rows[0] || null;
}

async function createEntry({ storeNo, workerName }) {
  const chatbotPool = await getChatbotPool();
  await chatbotPool.query(
    `INSERT INTO ENTRY_TODAY (storeNo, workerName, mentionCount, insertCount, createdAt)
     VALUES (?, ?, 0, 0, NOW())`,
    [storeNo, workerName]
  );

  const createdRow = await findEntryByStoreAndName(storeNo, workerName);
  return createdRow ? {
    entryId: encodeEntryId(createdRow),
    storeNo: Number(createdRow.storeNo),
    workerName: String(createdRow.workerName || '').trim(),
    mentionCount: Number(createdRow.mentionCount || 0),
    insertCount: Number(createdRow.insertCount || 0),
    createdAt: createdRow.createdAt
  } : null;
}

async function updateEntry(entryId, { workerName }) {
  const chatbotPool = await getChatbotPool();
  const decoded = decodeEntryId(entryId);
  if (!decoded) return null;

  await chatbotPool.query(
    `UPDATE ENTRY_TODAY
        SET workerName = ?
      WHERE storeNo = ?
        AND workerName = ?
        AND UNIX_TIMESTAMP(createdAt) = ?`,
    [workerName, decoded.storeNo, decoded.workerName, decoded.createdAtKey]
  );

  const updatedRow = await findEntryByStoreAndName(decoded.storeNo, workerName);
  return updatedRow ? {
    entryId: encodeEntryId(updatedRow),
    storeNo: Number(updatedRow.storeNo),
    workerName: String(updatedRow.workerName || '').trim(),
    mentionCount: Number(updatedRow.mentionCount || 0),
    insertCount: Number(updatedRow.insertCount || 0),
    createdAt: updatedRow.createdAt
  } : null;
}

async function deleteEntry(entryId) {
  const chatbotPool = await getChatbotPool();
  const decoded = decodeEntryId(entryId);
  if (!decoded) return false;

  const [result] = await chatbotPool.query(
    `DELETE FROM ENTRY_TODAY
      WHERE storeNo = ?
        AND workerName = ?
        AND UNIX_TIMESTAMP(createdAt) = ?`,
    [decoded.storeNo, decoded.workerName, decoded.createdAtKey]
  );

  if (result.affectedRows > 0) {
    return true;
  }

  const [fallbackResult] = await chatbotPool.query(
    `DELETE FROM ENTRY_TODAY
      WHERE storeNo = ?
        AND workerName = ?`,
    [decoded.storeNo, decoded.workerName]
  );

  return fallbackResult.affectedRows > 0;
}

async function recordSiteVisit({ visitorKey, path }) {
  const pool = getPool();
  const normalizedVisitorKey = String(visitorKey || '').trim();
  const normalizedPath = String(path || '/').trim() || '/';

  if (!normalizedVisitorKey) return;

  await pool.query(
    `INSERT INTO site_visit_logs (visitor_key, path, visit_date, page_views, first_visited_at, last_visited_at)
     VALUES (?, ?, CURRENT_DATE(), 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       page_views = page_views + 1,
       last_visited_at = NOW()`,
    [normalizedVisitorKey, normalizedPath]
  );
}

function normalizeStatsDateKey(value) {
  if (value == null) return '';

  if (value instanceof Date) {
    return formatStatsDate(value);
  }

  const raw = String(value).trim();
  if (!raw) return '';

  const simpleMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (simpleMatch) return simpleMatch[1];

  const parsedDate = new Date(raw);
  if (!Number.isNaN(parsedDate.getTime())) {
    return formatStatsDate(parsedDate);
  }

  return raw;
}

function toDailySeriesMap(rows, valueMapper) {
  return new Map(rows.map((row) => [normalizeStatsDateKey(row.statsDate), valueMapper(row)]));
}

function formatStatsDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeStatsPeriod(period) {
  const allowedPeriods = new Set(['daily', 'weekly', 'monthly', 'yearly']);
  return allowedPeriods.has(period) ? period : 'daily';
}

function formatYearMonth(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatWeekRangeLabel(startDate) {
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);
  return `${formatStatsDate(startDate)} ~ ${formatStatsDate(endDate)}`;
}

function aggregateDailyStatsByPeriod(dailyStats, period = 'daily') {
  const resolvedPeriod = normalizeStatsPeriod(period);
  if (resolvedPeriod === 'daily') {
    return dailyStats.map((item) => ({ ...item, label: item.date }));
  }

  const map = new Map();
  for (const row of dailyStats) {
    const currentDate = new Date(`${row.date}T00:00:00.000Z`);
    let key = row.date;
    let sortKey = row.date;
    let label = row.date;

    if (resolvedPeriod === 'weekly') {
      const day = currentDate.getUTCDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(currentDate);
      weekStart.setUTCDate(currentDate.getUTCDate() + diffToMonday);
      key = formatStatsDate(weekStart);
      sortKey = key;
      label = formatWeekRangeLabel(weekStart);
    } else if (resolvedPeriod === 'monthly') {
      key = formatYearMonth(currentDate);
      sortKey = key;
      label = `${key}월`;
    } else if (resolvedPeriod === 'yearly') {
      key = String(currentDate.getUTCFullYear());
      sortKey = key;
      label = `${key}년`;
    }

    const existing = map.get(key) || {
      key,
      label,
      sortKey,
      visitors: 0,
      pageViews: 0,
      posts: 0,
      comments: 0,
      signups: 0
    };

    existing.visitors += Number(row.visitors || 0);
    existing.pageViews += Number(row.pageViews || 0);
    existing.posts += Number(row.posts || 0);
    existing.comments += Number(row.comments || 0);
    existing.signups += Number(row.signups || 0);
    map.set(key, existing);
  }

  return Array.from(map.values())
    .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)))
    .map((item) => ({
      date: item.key,
      label: item.label,
      visitors: item.visitors,
      pageViews: item.pageViews,
      posts: item.posts,
      comments: item.comments,
      signups: item.signups
    }));
}

async function getDashboardStats(rangeDays = 14, { period = 'daily' } = {}) {
  const pool = getPool();
  const resolvedPeriod = normalizeStatsPeriod(period);
  const periodRangeByType = {
    daily: Math.max(7, Math.min(31, Number.parseInt(rangeDays, 10) || 14)),
    weekly: 7 * 12,
    monthly: 31 * 12,
    yearly: 366 * 5
  };
  const normalizedRangeDays = periodRangeByType[resolvedPeriod] || periodRangeByType.daily;

  const [summaryRows] = await pool.query(
    `SELECT
        (SELECT COUNT(DISTINCT visitor_key) FROM site_visit_logs) AS totalVisitors,
        (SELECT COUNT(DISTINCT visitor_key) FROM site_visit_logs WHERE visit_date = CURRENT_DATE()) AS todayVisitors,
        (SELECT COALESCE(SUM(page_views), 0) FROM site_visit_logs) AS totalPageViews,
        (SELECT COALESCE(SUM(page_views), 0) FROM site_visit_logs WHERE visit_date = CURRENT_DATE()) AS todayPageViews,
        (SELECT COUNT(*) FROM posts WHERE is_deleted = 0) AS totalPosts,
        (SELECT COUNT(*) FROM posts WHERE is_deleted = 0 AND DATE(created_at) = CURRENT_DATE()) AS todayPosts,
        (SELECT COUNT(*) FROM comments WHERE is_deleted = 0) AS totalComments,
        (SELECT COUNT(*) FROM comments WHERE is_deleted = 0 AND DATE(created_at) = CURRENT_DATE()) AS todayComments,
        (SELECT COUNT(*) FROM users WHERE role = 'MEMBER') AS totalUsers,
        (SELECT COUNT(*) FROM users WHERE role = 'MEMBER' AND DATE(created_at) = CURRENT_DATE()) AS todaySignups`
  );

  const [visitRows, postRows, commentRows, signupRows, boardRows] = await Promise.all([
    pool.query(
      `SELECT visit_date AS statsDate,
              COUNT(DISTINCT visitor_key) AS visitors,
              COALESCE(SUM(page_views), 0) AS pageViews
         FROM site_visit_logs
        WHERE visit_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
        GROUP BY visit_date
        ORDER BY visit_date ASC`,
      [normalizedRangeDays - 1]
    ).then(([rows]) => rows),
    pool.query(
      `SELECT DATE(created_at) AS statsDate, COUNT(*) AS postCount
         FROM posts
        WHERE is_deleted = 0
          AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC`,
      [normalizedRangeDays - 1]
    ).then(([rows]) => rows),
    pool.query(
      `SELECT DATE(created_at) AS statsDate, COUNT(*) AS commentCount
         FROM comments
        WHERE is_deleted = 0
          AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC`,
      [normalizedRangeDays - 1]
    ).then(([rows]) => rows),
    pool.query(
      `SELECT DATE(created_at) AS statsDate, COUNT(*) AS signupCount
         FROM users
        WHERE role = 'MEMBER'
          AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC`,
      [normalizedRangeDays - 1]
    ).then(([rows]) => rows),
    pool.query(
      `SELECT board_type AS boardType,
              COUNT(*) AS totalPosts,
              SUM(CASE WHEN DATE(created_at) = CURRENT_DATE() THEN 1 ELSE 0 END) AS todayPosts
         FROM posts
        WHERE is_deleted = 0
        GROUP BY board_type
        ORDER BY totalPosts DESC, board_type ASC`
    ).then(([rows]) => rows)
  ]);

  const visitMap = toDailySeriesMap(visitRows, (row) => ({
    visitors: Number(row.visitors || 0),
    pageViews: Number(row.pageViews || 0)
  }));
  const postMap = toDailySeriesMap(postRows, (row) => Number(row.postCount || 0));
  const commentMap = toDailySeriesMap(commentRows, (row) => Number(row.commentCount || 0));
  const signupMap = toDailySeriesMap(signupRows, (row) => Number(row.signupCount || 0));

  const daily = [];
  for (let offset = normalizedRangeDays - 1; offset >= 0; offset -= 1) {
    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);
    currentDate.setUTCDate(currentDate.getUTCDate() - offset);
    const dateKey = formatStatsDate(currentDate);
    const visitEntry = visitMap.get(dateKey) || { visitors: 0, pageViews: 0 };

    daily.push({
      date: dateKey,
      visitors: visitEntry.visitors,
      pageViews: visitEntry.pageViews,
      posts: postMap.get(dateKey) || 0,
      comments: commentMap.get(dateKey) || 0,
      signups: signupMap.get(dateKey) || 0
    });
  }

  const periodSeries = aggregateDailyStatsByPeriod(daily, resolvedPeriod);

  return {
    period: resolvedPeriod,
    summary: {
      totalVisitors: Number(summaryRows[0]?.totalVisitors || 0),
      todayVisitors: Number(summaryRows[0]?.todayVisitors || 0),
      totalPageViews: Number(summaryRows[0]?.totalPageViews || 0),
      todayPageViews: Number(summaryRows[0]?.todayPageViews || 0),
      totalPosts: Number(summaryRows[0]?.totalPosts || 0),
      todayPosts: Number(summaryRows[0]?.todayPosts || 0),
      totalComments: Number(summaryRows[0]?.totalComments || 0),
      todayComments: Number(summaryRows[0]?.todayComments || 0),
      totalUsers: Number(summaryRows[0]?.totalUsers || 0),
      todaySignups: Number(summaryRows[0]?.todaySignups || 0)
    },
    boardStats: boardRows.map((row) => ({
      boardType: row.boardType,
      totalPosts: Number(row.totalPosts || 0),
      todayPosts: Number(row.todayPosts || 0)
    })),
    daily,
    series: periodSeries
  };
}

module.exports = {
  createEntry,
  encodeEntryId,
  decodeEntryId,
  deleteEntry,
  listUsers,
  listEntryStores,
  listEntries,
  findUserById,
  findEntryById,
  findEntryByStoreAndName,
  getUserDetail,
  getUserActivityOverview,
  updateUserRole,
  updateUserMemberType,
  updateUserByAdmin,
  deleteUser,
  listAds,
  listLiveAdsByStore,
  listTopAdsByPlacement,
  createAd,
  findAdById,
  getStoreByNo,
  updateAd,
  deleteAd,
  listBusinessAdsByOwner,
  listPublicBusinessAds,
  increaseBusinessAdViewCounts,
  createBusinessAd,
  findBusinessAdById,
  updateBusinessAd,
  deleteBusinessAd,
  updateEntry,
  recordSiteVisit,
  getDashboardStats
};

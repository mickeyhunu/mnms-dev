/**
 * 파일 역할: 공지사항/FAQ 도메인 데이터의 DB 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

const SUPPORT_CATEGORIES = {
  NOTICE: 'NOTICE',
  FAQ: 'FAQ'
};

const SOURCE_TYPES = {
  SUPPORT: 'SUPPORT',
  POST: 'POST'
};

const BOARD_TYPES = {
  FREE: 'FREE',
  ANON: 'ANON',
  REVIEW: 'REVIEW',
  STORY: 'STORY',
  QUESTION: 'QUESTION',
  PROMOTION: 'PROMOTION'
};

const INQUIRY_STATUSES = {
  PENDING: 'PENDING',
  ANSWERED: 'ANSWERED'
};

const INQUIRY_TYPES = {
  QUESTION: 'question',
  POST_REPORT: 'post_report',
  COMMENT_REPORT: 'comment_report',
  ACCOUNT: 'account',
  SERVICE_ERROR: 'service_error',
  AD_INQUIRY: 'ad_inquiry',
  ETC: 'etc',
  OTHER: 'other'
};

function normalizeCategory(category) {
  const normalized = String(category || '').toUpperCase();
  return Object.values(SUPPORT_CATEGORIES).includes(normalized) ? normalized : null;
}

function normalizeInquiryStatus(status) {
  const normalized = String(status || '').toUpperCase();
  return Object.values(INQUIRY_STATUSES).includes(normalized) ? normalized : null;
}

function normalizeInquiryType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  return Object.values(INQUIRY_TYPES).includes(normalized) ? normalized : INQUIRY_TYPES.OTHER;
}

function normalizeSourceType(sourceType) {
  const normalized = String(sourceType || '').toUpperCase();
  return Object.values(SOURCE_TYPES).includes(normalized) ? normalized : null;
}

function normalizeBoardType(boardType) {
  const normalized = String(boardType || '').toUpperCase();
  return Object.values(BOARD_TYPES).includes(normalized) ? normalized : BOARD_TYPES.FREE;
}


function normalizeAttachmentUrls(attachmentUrls) {
  if (!Array.isArray(attachmentUrls)) return [];
  return attachmentUrls
    .map((url) => String(url || '').trim())
    .filter((url) => url.startsWith('http://') || url.startsWith('https://'))
    .slice(0, 3);
}

function parseAttachmentUrls(raw) {
  if (!raw) return [];

  try {
    return normalizeAttachmentUrls(JSON.parse(raw));
  } catch (error) {
    return [];
  }
}

function normalizeInquiryRow(row) {
  return {
    ...row,
    attachmentUrls: parseAttachmentUrls(row.attachmentUrls)
  };
}


async function listArticles(category, includeDeleted = false, { sourceType = null } = {}) {
  const pool = getPool();
  const normalizedCategory = normalizeCategory(category);
  if (!normalizedCategory) return [];

  const normalizedSourceType = normalizeSourceType(sourceType);
  if (normalizedSourceType === SOURCE_TYPES.POST && normalizedCategory !== SUPPORT_CATEGORIES.NOTICE) {
    return [];
  }

  if (normalizedSourceType === SOURCE_TYPES.POST) {
    const [rows] = await pool.query(
      `SELECT p.id, p.id AS sourceId, 'POST' AS sourceType,
              'NOTICE' AS category, p.title, p.content,
              p.user_id AS createdBy, p.user_id AS updatedBy,
              p.board_type AS boardType,
              p.is_notice AS isNotice, p.notice_type AS noticeType, p.is_pinned AS isPinned,
              p.created_at AS createdAt, p.updated_at AS updatedAt,
              COALESCE(u.nickname, '관리자') AS createdByNickname,
              COALESCE(u.nickname, '관리자') AS updatedByNickname
       FROM posts p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.is_notice = 1
         AND p.is_deleted = 0
       ORDER BY p.is_pinned DESC, p.created_at DESC, p.id DESC`
    );
    return rows;
  }

  const whereDeleted = includeDeleted ? '' : 'AND a.is_deleted = 0';
  const [rows] = await pool.query(
    `SELECT a.id, a.id AS sourceId, 'SUPPORT' AS sourceType,
            a.category, a.title, a.content, a.created_by AS createdBy, a.updated_by AS updatedBy,
            a.created_at AS createdAt, a.updated_at AS updatedAt,
            NULL AS boardType,
            0 AS isNotice, NULL AS noticeType, 0 AS isPinned,
            COALESCE(cu.nickname, '관리자') AS createdByNickname,
            COALESCE(uu.nickname, '관리자') AS updatedByNickname
     FROM support_articles a
     LEFT JOIN users cu ON cu.id = a.created_by
     LEFT JOIN users uu ON uu.id = a.updated_by
     WHERE a.category = ? ${whereDeleted}
     ORDER BY a.created_at DESC, a.id DESC`,
    [normalizedCategory]
  );

  return rows;
}

async function findArticleById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM support_articles WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findPublicArticleDetailById(id) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT a.id, a.category, a.title, a.content,
            a.created_by AS createdBy, a.updated_by AS updatedBy,
            a.created_at AS createdAt, a.updated_at AS updatedAt,
            COALESCE(cu.nickname, '운영팀') AS createdByNickname,
            COALESCE(uu.nickname, '운영팀') AS updatedByNickname
     FROM support_articles a
     LEFT JOIN users cu ON cu.id = a.created_by
     LEFT JOIN users uu ON uu.id = a.updated_by
     WHERE a.id = ?
       AND a.is_deleted = 0
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findPublicNoticePostDetailById(id) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT p.id, 'NOTICE' AS category, p.title, p.content,
            p.user_id AS createdBy, p.user_id AS updatedBy,
            p.board_type AS boardType,
            p.created_at AS createdAt, p.updated_at AS updatedAt,
            COALESCE(u.nickname, '운영팀') AS createdByNickname,
            COALESCE(u.nickname, '운영팀') AS updatedByNickname,
            p.is_notice AS isNotice, p.notice_type AS noticeType, p.is_pinned AS isPinned
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.id = ?
       AND p.is_notice = 1
       AND p.is_deleted = 0
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createArticle({ category, title, content, userId }) {
  const pool = getPool();
  const normalizedCategory = normalizeCategory(category);
  const [result] = await pool.query(
    'INSERT INTO support_articles (category, title, content, created_by, updated_by) VALUES (?, ?, ?, ?, ?)',
    [normalizedCategory, title, content, userId, userId]
  );
  return result.insertId;
}

async function updateArticle(id, { category, title, content, userId }) {
  const pool = getPool();
  const normalizedCategory = normalizeCategory(category) || SUPPORT_CATEGORIES.NOTICE;
  await pool.query(
    'UPDATE support_articles SET category = ?, title = ?, content = ?, updated_by = ? WHERE id = ?',
    [normalizedCategory, title, content, userId, id]
  );
}

async function deleteArticle(id) {
  const pool = getPool();
  await pool.query('UPDATE support_articles SET is_deleted = 1 WHERE id = ?', [id]);
}

async function createNoticePost({ title, content, userId, noticeType = 'NOTICE', isPinned = false, boardType = BOARD_TYPES.FREE }) {
  const pool = getPool();
  const normalizedNoticeType = String(noticeType || '').toUpperCase() === 'IMPORTANT' ? 'IMPORTANT' : 'NOTICE';
  const normalizedBoardType = normalizeBoardType(boardType);
  const [result] = await pool.query(
    `INSERT INTO posts
      (user_id, board_type, is_notice, notice_type, is_pinned, notice_target_boards, title, content, image_urls)
     VALUES (?, ?, 1, ?, ?, ?, ?, ?, '[]')`,
    [userId, normalizedBoardType, normalizedNoticeType, isPinned ? 1 : 0, normalizedBoardType, title, content]
  );
  return result.insertId;
}

async function findNoticePostById(id) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT p.id, p.id AS sourceId, 'POST' AS sourceType,
            'NOTICE' AS category, p.title, p.content,
            p.user_id AS createdBy, p.user_id AS updatedBy,
            p.board_type AS boardType,
            p.is_notice AS isNotice, p.notice_type AS noticeType, p.is_pinned AS isPinned,
            p.is_deleted,
            p.created_at AS createdAt, p.updated_at AS updatedAt
     FROM posts p
     WHERE p.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function updateNoticePost(id, { title, content, noticeType = 'NOTICE', isPinned = false, boardType = BOARD_TYPES.FREE }) {
  const pool = getPool();
  const normalizedNoticeType = String(noticeType || '').toUpperCase() === 'IMPORTANT' ? 'IMPORTANT' : 'NOTICE';
  const normalizedBoardType = normalizeBoardType(boardType);
  await pool.query(
    `UPDATE posts
     SET title = ?, content = ?, board_type = ?, is_notice = 1, notice_type = ?, is_pinned = ?, notice_target_boards = ?
     WHERE id = ?`,
    [title, content, normalizedBoardType, normalizedNoticeType, isPinned ? 1 : 0, normalizedBoardType, id]
  );
}

async function deleteNoticePost(id) {
  const pool = getPool();
  await pool.query("UPDATE posts SET is_deleted = 1, title = '[삭제된 게시글]', content = '삭제된 게시글입니다.' WHERE id = ?", [id]);
}

async function createInquiry({ userId, type, title, content, targetType = null, targetId = null, attachmentUrls = [] }) {
  const pool = getPool();
  const normalizedType = normalizeInquiryType(type);
  const normalizedTargetType = String(targetType || '').trim().toLowerCase() || null;
  const normalizedTargetId = Number.isInteger(Number(targetId)) && Number(targetId) > 0 ? Number(targetId) : null;

  const [result] = await pool.query(
    `INSERT INTO support_inquiries
      (user_id, inquiry_type, target_type, target_id, title, content, attachment_urls, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, normalizedType, normalizedTargetType, normalizedTargetId, title, content, JSON.stringify(normalizeAttachmentUrls(attachmentUrls)), INQUIRY_STATUSES.PENDING]
  );

  return result.insertId;
}

async function listInquiriesByUser(userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT i.id, i.user_id AS userId, i.inquiry_type AS type,
            i.target_type AS targetType, i.target_id AS targetId,
            i.title, i.content, i.attachment_urls AS attachmentUrls, i.status,
            i.answer_content AS answerContent, i.answered_at AS answeredAt,
            i.created_at AS createdAt, i.updated_at AS updatedAt
     FROM support_inquiries i
     WHERE i.user_id = ?
     ORDER BY i.created_at DESC, i.id DESC`,
    [userId]
  );
  return rows.map((row) => normalizeInquiryRow(row));
}

async function findInquiryById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT *, attachment_urls AS attachmentUrls FROM support_inquiries WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? normalizeInquiryRow(rows[0]) : null;
}

async function listInquiriesForAdmin({ status = null } = {}) {
  const pool = getPool();
  const normalizedStatus = normalizeInquiryStatus(status);
  const conditions = ['1 = 1'];
  const values = [];
  if (normalizedStatus) {
    conditions.push('i.status = ?');
    values.push(normalizedStatus);
  }

  const [rows] = await pool.query(
    `SELECT i.id, i.user_id AS userId,
            u.nickname AS userNickname, u.email AS userEmail,
            i.inquiry_type AS type,
            i.target_type AS targetType, i.target_id AS targetId,
            i.title, i.content, i.attachment_urls AS attachmentUrls, i.status,
            i.answer_content AS answerContent, i.answered_at AS answeredAt,
            i.created_at AS createdAt, i.updated_at AS updatedAt,
            i.answered_by AS answeredBy,
            au.nickname AS answeredByNickname
     FROM support_inquiries i
     INNER JOIN users u ON u.id = i.user_id
     LEFT JOIN users au ON au.id = i.answered_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY i.created_at DESC, i.id DESC`,
    values
  );
  return rows.map((row) => normalizeInquiryRow(row));
}


async function listAnsweredInquiriesByUser(userId, { limit = 20 } = {}) {
  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const [rows] = await pool.query(
    `SELECT i.id, i.user_id AS userId, i.inquiry_type AS type,
            i.title, i.answer_content AS answerContent,
            i.answered_at AS answeredAt, i.updated_at AS updatedAt
     FROM support_inquiries i
     WHERE i.user_id = ?
       AND i.status = ?
       AND i.answer_content IS NOT NULL
       AND TRIM(i.answer_content) <> ''
     ORDER BY i.answered_at DESC, i.id DESC
     LIMIT ?`,
    [userId, INQUIRY_STATUSES.ANSWERED, safeLimit]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.userId),
    type: row.type,
    title: row.title,
    answerContent: row.answerContent,
    answeredAt: row.answeredAt,
    updatedAt: row.updatedAt
  }));
}

async function answerInquiry(id, { answerContent, answeredBy }) {
  const pool = getPool();
  await pool.query(
    `UPDATE support_inquiries
     SET answer_content = ?, status = ?, answered_by = ?, answered_at = NOW()
     WHERE id = ?`,
    [answerContent, INQUIRY_STATUSES.ANSWERED, answeredBy, id]
  );
}

module.exports = {
  SUPPORT_CATEGORIES,
  SOURCE_TYPES,
  INQUIRY_STATUSES,
  INQUIRY_TYPES,
  normalizeCategory,
  normalizeInquiryStatus,
  normalizeInquiryType,
  normalizeSourceType,
  listArticles,
  findArticleById,
  findPublicArticleDetailById,
  findPublicNoticePostDetailById,
  createArticle,
  updateArticle,
  deleteArticle,
  createNoticePost,
  findNoticePostById,
  updateNoticePost,
  deleteNoticePost,
  createInquiry,
  listInquiriesByUser,
  findInquiryById,
  listInquiriesForAdmin,
  listAnsweredInquiriesByUser,
  answerInquiry
};

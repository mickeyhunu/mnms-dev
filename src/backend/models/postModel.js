/**
 * 파일 역할: postModel 도메인 데이터의 DB 조회/저장 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

const BOARD_TYPES = {
  FREE: 'FREE',
  ANON: 'ANON',
  REVIEW: 'REVIEW',
  STORY: 'STORY',
  QUESTION: 'QUESTION',
  PROMOTION: 'PROMOTION'
};

const BOARD_TYPE_SET = new Set(Object.values(BOARD_TYPES));

function normalizeBoardType(boardType) {
  const normalized = String(boardType || '').toUpperCase();
  return BOARD_TYPE_SET.has(normalized) ? normalized : BOARD_TYPES.FREE;
}

function normalizeBoardFilter(boardType) {
  const normalized = String(boardType || 'ALL').toUpperCase();
  return normalized === 'ALL' ? 'ALL' : normalizeBoardType(normalized);
}

function normalizeNoticeTargetBoards(noticeTargetBoards = []) {
  if (!Array.isArray(noticeTargetBoards)) return [];
  const unique = new Set();

  noticeTargetBoards.forEach((board) => {
    const normalized = normalizeBoardType(board);
    if (normalized) unique.add(normalized);
  });

  return Array.from(unique);
}

function serializeNoticeTargetBoards(noticeTargetBoards = []) {
  const normalized = normalizeNoticeTargetBoards(noticeTargetBoards);
  return normalized.length ? normalized.join(',') : null;
}

function parseNoticeTargetBoards(raw) {
  if (!raw) return [];
  return normalizeNoticeTargetBoards(String(raw).split(','));
}


function normalizeImageUrls(imageUrls) {
  if (!Array.isArray(imageUrls)) return [];
  return imageUrls
    .map((url) => String(url || '').trim())
    .filter((url) => url.startsWith('http://') || url.startsWith('https://'))
    .slice(0, 5);
}

function parseImageUrlsFromRow(row) {
  const raw = row?.imageUrls;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return normalizeImageUrls(parsed);
  } catch (error) {
    return [];
  }
}

function normalizePostImages(row) {
  const imageUrls = parseImageUrlsFromRow(row);
  return {
    ...row,
    imageUrls,
    imageUrl: imageUrls[0] || null
  };
}


async function listPosts(page = 0, size = 10, options = {}) {
  const pool = getPool();
  const offset = page * size;
  const keyword = typeof options.keyword === 'string' ? options.keyword.trim() : '';
  const searchType = options.searchType || 'bbs_title';
  const boardFilter = normalizeBoardFilter(options.boardType);

  const whereConditions = [
    'p.is_deleted = 0',
    "(p.is_notice = 0 OR (p.is_notice = 1 AND p.notice_type = 'IMPORTANT' AND p.is_pinned = 1))"
  ];
  const whereParams = [];

  if (boardFilter !== 'ALL') {
    whereConditions.push(`(
      p.board_type = ?
      OR (
        p.is_notice = 1
        AND FIND_IN_SET(?, REPLACE(COALESCE(p.notice_target_boards, ''), ' ', '')) > 0
      )
    )`);
    whereParams.push(boardFilter, boardFilter);
  }

  if (keyword) {
    const likeKeyword = `%${keyword}%`;

    if (searchType === 'bbs_review') {
      whereConditions.push('p.content LIKE ?');
      whereParams.push(likeKeyword);
    } else if (searchType === 'bbs_title_review') {
      whereConditions.push('(p.title LIKE ? OR p.content LIKE ?)');
      whereParams.push(likeKeyword, likeKeyword);
    } else {
      whereConditions.push('p.title LIKE ?');
      whereParams.push(likeKeyword);
    }
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const [[countRows], [rows]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS total
       FROM posts p
       ${whereClause}`,
      whereParams
    ),
    pool.query(
      `SELECT p.id, p.title, p.content, p.user_id AS userId, p.board_type AS boardType,
              p.is_notice AS isNotice, p.notice_type AS noticeType, p.is_pinned AS isPinned,
              p.notice_target_boards AS noticeTargetBoards,
              p.is_hidden AS isHidden,
              p.view_count AS viewCount, p.image_urls AS imageUrls, p.created_at AS createdAt, p.updated_at AS updatedAt,
              COALESCE(u.nickname, '비회원') AS authorNickname,
              COALESCE(u.role, 'MEMBER') AS authorRole
       FROM posts p
       LEFT JOIN users u ON u.id = p.user_id
       ${whereClause}
       ORDER BY p.is_pinned DESC,
                CASE WHEN p.is_notice = 1 AND p.notice_type = 'IMPORTANT' THEN 1 ELSE 0 END DESC,
                p.is_notice DESC,
                p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...whereParams, size, offset]
    )
  ]);

  const postIds = rows.map((row) => row.id);
  const commentCountMap = new Map();
  const likeCountMap = new Map();

  if (postIds.length) {
    const [commentCountRows, likeCountRows] = await Promise.all([
      pool.query(
        `SELECT c.post_id AS postId, COUNT(*) AS commentCount
         FROM comments c
         WHERE c.post_id IN (?)
           AND c.is_deleted = 0
         GROUP BY c.post_id`,
        [postIds]
      ),
      pool.query(
        `SELECT pl.post_id AS postId, COUNT(DISTINCT pl.user_id) AS likeCount
         FROM post_likes pl
         WHERE pl.post_id IN (?)
         GROUP BY pl.post_id`,
        [postIds]
      )
    ]);

    commentCountRows[0].forEach((row) => {
      commentCountMap.set(Number(row.postId), Number(row.commentCount || 0));
    });

    likeCountRows[0].forEach((row) => {
      likeCountMap.set(Number(row.postId), Number(row.likeCount || 0));
    });
  }

  return {
    rows: rows.map((row) => normalizePostImages({
      ...row,
      noticeTargetBoards: parseNoticeTargetBoards(row.noticeTargetBoards),
      commentCount: commentCountMap.get(Number(row.id)) || 0,
      likeCount: likeCountMap.get(Number(row.id)) || 0
    })),
    total: Number(countRows[0].total)
  };
}

async function createPost({ userId, title, content, imageUrls = [], boardType = BOARD_TYPES.FREE, isNotice = false, noticeType = null, isPinned = false, noticeTargetBoards = [] }) {
  const pool = getPool();
  const normalizedBoardType = normalizeBoardType(boardType);
  const normalizedNoticeType = isNotice ? (String(noticeType || '').toUpperCase() === 'IMPORTANT' ? 'IMPORTANT' : 'NOTICE') : null;
  const serializedNoticeTargetBoards = isNotice
    ? serializeNoticeTargetBoards(noticeTargetBoards.length ? noticeTargetBoards : [normalizedBoardType])
    : null;
  const [result] = await pool.query(
    'INSERT INTO posts (user_id, board_type, is_notice, notice_type, is_pinned, notice_target_boards, title, content, image_urls) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [userId || null, normalizedBoardType, isNotice ? 1 : 0, normalizedNoticeType, isNotice && isPinned ? 1 : 0, serializedNoticeTargetBoards, title, content, JSON.stringify(normalizeImageUrls(imageUrls))]
  );
  return result.insertId;
}

async function findPostById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM posts WHERE id = ? AND is_deleted = 0', [id]);
  return rows[0] || null;
}

async function findPostByIdIncludingDeleted(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [id]);
  return rows[0] || null;
}


async function findPostDetailById(id) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.content, p.user_id AS userId, p.board_type AS boardType,
            p.is_notice AS isNotice, p.notice_type AS noticeType, p.is_pinned AS isPinned,
            p.notice_target_boards AS noticeTargetBoards,
            p.is_hidden AS isHidden,
            p.view_count AS viewCount, p.image_urls AS imageUrls, p.created_at AS createdAt, p.updated_at AS updatedAt,
            COALESCE(u.nickname, '비회원') AS authorNickname,
            COALESCE(u.role, 'MEMBER') AS authorRole,
            COALESCE(u.member_type, 'MEMBER') AS authorMemberType,
            EXISTS (
              SELECT 1
                FROM business_ads ba
               WHERE ba.owner_user_id = u.id
                 AND ba.is_active = 1
               LIMIT 1
            ) AS authorHasActiveBusinessAd,
            CASE
              WHEN u.id IS NULL THEN NULL
              WHEN COALESCE(u.total_points, 0) >= 15000 THEN 7
              WHEN COALESCE(u.total_points, 0) >= 5000 THEN 6
              WHEN COALESCE(u.total_points, 0) >= 2000 THEN 5
              WHEN COALESCE(u.total_points, 0) >= 800 THEN 4
              WHEN COALESCE(u.total_points, 0) >= 300 THEN 3
              WHEN COALESCE(u.total_points, 0) >= 100 THEN 2
              ELSE 1
            END AS authorLevel,
            (SELECT COUNT(DISTINCT pl.user_id) FROM post_likes pl WHERE pl.post_id = p.id) AS likeCount
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.id = ? AND p.is_deleted = 0`,
    [id]
  );
  return rows[0]
    ? normalizePostImages({
      ...rows[0],
      noticeTargetBoards: parseNoticeTargetBoards(rows[0].noticeTargetBoards)
    })
    : null;
}

async function findAdjacentPosts(id) {
  const pool = getPool();
  const [currentRows] = await pool.query(
    'SELECT id, board_type AS boardType, created_at AS createdAt FROM posts WHERE id = ? AND is_deleted = 0 LIMIT 1',
    [id]
  );

  const current = currentRows[0] || null;
  if (!current) {
    return { previous: null, next: null };
  }

  const [previousRows] = await pool.query(
    `SELECT p.id, p.title
     FROM posts p
     WHERE p.is_deleted = 0
       AND p.board_type = ?
       AND (
         p.created_at > ?
         OR (p.created_at = ? AND p.id > ?)
       )
     ORDER BY p.created_at ASC, p.id ASC
     LIMIT 1`,
    [current.boardType, current.createdAt, current.createdAt, current.id]
  );

  const [nextRows] = await pool.query(
    `SELECT p.id, p.title
     FROM posts p
     WHERE p.is_deleted = 0
       AND p.board_type = ?
       AND (
         p.created_at < ?
         OR (p.created_at = ? AND p.id < ?)
       )
     ORDER BY p.created_at DESC, p.id DESC
     LIMIT 1`,
    [current.boardType, current.createdAt, current.createdAt, current.id]
  );

  return {
    previous: previousRows[0] || null,
    next: nextRows[0] || null
  };
}

async function incrementPostViewCount(id) {
  const pool = getPool();
  await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [id]);
}
async function updatePost(id, { title, content, imageUrls = [], isNotice, noticeType, isPinned, noticeTargetBoards = [] }) {
  const pool = getPool();
  const normalizedNoticeType = isNotice ? (String(noticeType || '').toUpperCase() === 'IMPORTANT' ? 'IMPORTANT' : 'NOTICE') : null;
  const serializedNoticeTargetBoards = isNotice ? serializeNoticeTargetBoards(noticeTargetBoards) : null;
  await pool.query(
    'UPDATE posts SET title = ?, content = ?, image_urls = ?, is_notice = ?, notice_type = ?, is_pinned = ?, notice_target_boards = ? WHERE id = ?',
    [title, content, JSON.stringify(normalizeImageUrls(imageUrls)), isNotice ? 1 : 0, normalizedNoticeType, isNotice && isPinned ? 1 : 0, serializedNoticeTargetBoards, id]
  );
}

async function setPostHidden(id, isHidden) {
  const pool = getPool();
  await pool.query('UPDATE posts SET is_hidden = ? WHERE id = ?', [isHidden ? 1 : 0, id]);
}

async function deletePost(id) {
  const pool = getPool();
  await pool.query("UPDATE posts SET is_deleted = 1, title = '[삭제된 게시글]', content = '삭제된 게시글입니다.' WHERE id = ?", [id]);
}

async function updatePostPointAwards(id, { createPointAwarded, reviewBonusPointAwarded }) {
  const pool = getPool();
  await pool.query(
    'UPDATE posts SET create_point_awarded = ?, review_bonus_point_awarded = ? WHERE id = ?',
    [createPointAwarded ? 1 : 0, reviewBonusPointAwarded ? 1 : 0, id]
  );
}

async function listComments(postId) {
  const pool = getPool();
  const [rows] = await pool.query(
      `SELECT c.id, c.post_id AS postId, c.user_id AS userId, c.parent_id AS parentId, c.is_secret AS isSecret, c.is_hidden AS isHidden, c.is_deleted AS isDeleted, c.content, c.created_at AS createdAt,
            COALESCE(u.nickname, '비회원') AS authorNickname,
            COALESCE(u.role, 'MEMBER') AS authorRole,
            COALESCE(u.member_type, 'MEMBER') AS authorMemberType,
            EXISTS (
              SELECT 1
                FROM business_ads ba
               WHERE ba.owner_user_id = u.id
                 AND ba.is_active = 1
               LIMIT 1
            ) AS authorHasActiveBusinessAd,
            CASE
              WHEN u.id IS NULL THEN NULL
              WHEN COALESCE(u.total_points, 0) >= 15000 THEN 7
              WHEN COALESCE(u.total_points, 0) >= 5000 THEN 6
              WHEN COALESCE(u.total_points, 0) >= 2000 THEN 5
              WHEN COALESCE(u.total_points, 0) >= 800 THEN 4
              WHEN COALESCE(u.total_points, 0) >= 300 THEN 3
              WHEN COALESCE(u.total_points, 0) >= 100 THEN 2
              ELSE 1
            END AS authorLevel
     FROM comments c
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC`,
    [postId]
  );
  return rows;
}

async function listAllCommentsForAdmin() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT c.id, c.post_id AS postId, c.user_id AS userId, c.parent_id AS parentId, c.is_secret AS isSecret, c.is_hidden AS isHidden, c.is_deleted AS isDeleted, c.content, c.created_at AS createdAt,
            COALESCE(u.nickname, '비회원') AS authorNickname
     FROM comments c
     LEFT JOIN users u ON u.id = c.user_id
     ORDER BY c.created_at DESC`
  );
  return rows;
}

async function findCommentById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [id]);
  return rows[0] || null;
}

async function createComment({ postId, userId, content, parentId = null, isSecret = false }) {
  const pool = getPool();
  const [result] = await pool.query(
    'INSERT INTO comments (post_id, user_id, parent_id, is_secret, content) VALUES (?, ?, ?, ?, ?)',
    [postId, userId, parentId, isSecret ? 1 : 0, content]
  );
  return result.insertId;
}

async function updateComment(id, content) {
  const pool = getPool();
  await pool.query('UPDATE comments SET content = ? WHERE id = ?', [content, id]);
}

async function setCommentHidden(id, isHidden) {
  const pool = getPool();
  await pool.query('UPDATE comments SET is_hidden = ? WHERE id = ?', [isHidden ? 1 : 0, id]);
}

async function deleteComment(id) {
  const pool = getPool();
  await pool.query('UPDATE comments SET is_deleted = 1 WHERE id = ?', [id]);
}

async function updateCommentPointAwarded(id, pointAwarded) {
  const pool = getPool();
  await pool.query('UPDATE comments SET point_awarded = ? WHERE id = ?', [pointAwarded ? 1 : 0, id]);
}

async function isPostLikedByUser(postId, userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1',
    [postId, userId]
  );
  return rows.length > 0;
}

async function togglePostLike(postId, userId) {
  const pool = getPool();
  const [likeRows] = await pool.query(
    'SELECT liker_point_awarded AS likerPointAwarded, author_point_awarded AS authorPointAwarded FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1',
    [postId, userId]
  );
  const liked = likeRows.length > 0;
  const existingLike = likeRows[0] || null;

  if (liked) {
    await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
  } else {
    await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
  }

  const [countRows] = await pool.query('SELECT COUNT(DISTINCT user_id) AS likeCount FROM post_likes WHERE post_id = ?', [postId]);
  return {
    isLiked: !liked,
    likeCount: Number(countRows[0].likeCount),
    likerPointAwarded: Boolean(existingLike?.likerPointAwarded),
    authorPointAwarded: Boolean(existingLike?.authorPointAwarded)
  };
}

async function updatePostLikePointAwards(postId, userId, { likerPointAwarded, authorPointAwarded }) {
  const pool = getPool();
  await pool.query(
    'UPDATE post_likes SET liker_point_awarded = ?, author_point_awarded = ? WHERE post_id = ? AND user_id = ?',
    [likerPointAwarded ? 1 : 0, authorPointAwarded ? 1 : 0, postId, userId]
  );
}

async function listPointAwardedCommentsByPostId(postId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id, user_id AS userId FROM comments WHERE post_id = ? AND is_deleted = 0 AND point_awarded = 1',
    [postId]
  );
  return rows;
}

async function listPointAwardedLikesByPostId(postId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT user_id AS userId, liker_point_awarded AS likerPointAwarded, author_point_awarded AS authorPointAwarded FROM post_likes WHERE post_id = ?',
    [postId]
  );
  return rows;
}

async function deletePostLikesByPostId(postId) {
  const pool = getPool();
  await pool.query('DELETE FROM post_likes WHERE post_id = ?', [postId]);
}

async function markCommentsDeletedByPostId(postId) {
  const pool = getPool();
  await pool.query('UPDATE comments SET is_deleted = 1, point_awarded = 0 WHERE post_id = ?', [postId]);
}

async function listBestPosts() {
  const pool = getPool();

  const selectQuery = `SELECT p.id, p.title, p.content, p.user_id AS userId, p.board_type AS boardType,
            p.is_notice AS isNotice, p.notice_type AS noticeType, p.is_pinned AS isPinned,
            p.view_count AS viewCount, p.image_urls AS imageUrls, p.created_at AS createdAt, p.updated_at AS updatedAt,
            COALESCE(u.nickname, '비회원') AS authorNickname,
            COALESCE(u.role, 'MEMBER') AS authorRole,
            COALESCE(stats.commentCount, 0) AS commentCount,
            COALESCE(stats.likeCount, 0) AS likeCount,
            ((COALESCE(stats.likeCount, 0) * 5) + (COALESCE(stats.commentCount, 0) * 2) + (p.view_count * 0.1)) AS score
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     LEFT JOIN (
       SELECT p2.id,
              COUNT(DISTINCT pl.user_id) AS likeCount,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p2.id) AS commentCount
       FROM posts p2
       LEFT JOIN post_likes pl ON pl.post_id = p2.id
       GROUP BY p2.id
     ) stats ON stats.id = p.id
     WHERE p.is_deleted = 0 AND p.is_notice = 0`;

  const [todayRows] = await pool.query(
    `${selectQuery}
     AND DATE(p.created_at) = CURDATE()
     AND COALESCE(stats.likeCount, 0) >= 3
     ORDER BY score DESC, p.created_at DESC
     LIMIT 5`
  );

  const [weeklyRows] = await pool.query(
    `${selectQuery}
     AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     AND COALESCE(stats.likeCount, 0) >= 5
     ORDER BY score DESC, p.created_at DESC
     LIMIT 3`
  );

  return {
    daily: todayRows.map((row) => normalizePostImages(row)),
    weekly: weeklyRows.map((row) => normalizePostImages(row))
  };
}

module.exports = {
  BOARD_TYPES,
  listPosts,
  createPost,
  findPostById,
  findPostDetailById,
  findAdjacentPosts,
  findPostByIdIncludingDeleted,
  incrementPostViewCount,
  updatePost,
  setPostHidden,
  deletePost,
  updatePostPointAwards,
  listComments,
  listAllCommentsForAdmin,
  findCommentById,
  createComment,
  updateComment,
  setCommentHidden,
  deleteComment,
  updateCommentPointAwarded,
  isPostLikedByUser,
  togglePostLike,
  updatePostLikePointAwards,
  listPointAwardedCommentsByPostId,
  listPointAwardedLikesByPostId,
  deletePostLikesByPostId,
  markCommentsDeletedByPostId,
  listBestPosts
};

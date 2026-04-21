/**
 * 파일 역할: 회원 포인트 적립/조회 관련 DB 쿼리를 담당하는 모델 파일.
 */
const { getPool } = require('../config/database');

const POINT_RULES = {
  REGISTER: { points: 20, dailyLimit: null },
  LOGIN_DAILY: { points: 5, dailyLimit: 1 },
  CREATE_POST: { points: 10, dailyLimit: 5 },
  CREATE_REVIEW_BONUS: { points: 10, dailyLimit: 5 },
  CREATE_COMMENT: { points: 2, dailyLimit: 20 },
  LIKE_POST: { points: 1, dailyLimit: 20 },
  RECEIVE_POST_LIKE: { points: 5, dailyLimit: null }
};

const POINT_REVOKE_ACTIONS = {
  CREATE_POST: 'REVOKE_CREATE_POST',
  CREATE_REVIEW_BONUS: 'REVOKE_CREATE_REVIEW_BONUS',
  CREATE_COMMENT: 'REVOKE_CREATE_COMMENT',
  LIKE_POST: 'REVOKE_LIKE_POST',
  RECEIVE_POST_LIKE: 'REVOKE_RECEIVE_POST_LIKE'
};

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

async function countTodayAction(connection, userId, actionType) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM point_histories
     WHERE user_id = ?
       AND action_type = ?
       AND created_at >= ?`,
    [userId, actionType, startOfToday()]
  );

  return Number(rows[0]?.count || 0);
}

async function awardPointByAction(userId, actionType) {
  const pool = getPool();
  const rule = POINT_RULES[actionType];

  if (!rule) {
    throw new Error(`지원하지 않는 포인트 액션입니다: ${actionType}`);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const todayCount = await countTodayAction(connection, userId, actionType);
    const reachedDailyLimit = rule.dailyLimit != null && todayCount >= rule.dailyLimit;

    if (reachedDailyLimit) {
      const [users] = await connection.query('SELECT total_points FROM users WHERE id = ?', [userId]);
      await connection.commit();
      return {
        awarded: false,
        awardedPoints: 0,
        actionType,
        dailyLimit: rule.dailyLimit,
        todayCount,
        totalPoints: Number(users[0]?.total_points || 0)
      };
    }

    await connection.query('UPDATE users SET total_points = total_points + ? WHERE id = ?', [rule.points, userId]);
    await connection.query('INSERT INTO point_histories (user_id, action_type, points) VALUES (?, ?, ?)', [userId, actionType, rule.points]);

    const [users] = await connection.query('SELECT total_points FROM users WHERE id = ?', [userId]);
    await connection.commit();

    return {
      awarded: true,
      awardedPoints: rule.points,
      actionType,
      dailyLimit: rule.dailyLimit,
      todayCount: todayCount + 1,
      totalPoints: Number(users[0]?.total_points || 0)
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function revokePointByAction(userId, actionType) {
  const pool = getPool();
  const rule = POINT_RULES[actionType];
  const revokeActionType = POINT_REVOKE_ACTIONS[actionType];

  if (!rule || !revokeActionType) {
    throw new Error(`지원하지 않는 포인트 회수 액션입니다: ${actionType}`);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      'UPDATE users SET total_points = GREATEST(total_points - ?, 0) WHERE id = ?',
      [rule.points, userId]
    );
    await connection.query(
      'INSERT INTO point_histories (user_id, action_type, points) VALUES (?, ?, ?)',
      [userId, revokeActionType, -rule.points]
    );

    const [users] = await connection.query('SELECT total_points FROM users WHERE id = ?', [userId]);
    await connection.commit();

    return {
      revoked: true,
      revokedPoints: rule.points,
      actionType,
      totalPoints: Number(users[0]?.total_points || 0)
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { POINT_RULES, awardPointByAction, revokePointByAction };

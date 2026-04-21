/**
 * 파일 역할: authMiddleware 요청 전처리/인증 검증을 수행하는 미들웨어 파일.
 */
const { findUserByToken, deleteSessionsByUserId } = require('../models/sessionModel');
const { formatRestrictionMessage, getLoginRestrictionState } = require('../utils/loginRestriction');
const { verifyAuthToken } = require('../utils/jwt');

async function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return res.status(401).json({ message: '인증이 필요합니다.' });

    let payload;
    try {
      payload = verifyAuthToken(token);
    } catch (_error) {
      return res.status(401).json({ message: '토큰이 유효하지 않거나 만료되었습니다.' });
    }

    const user = await findUserByToken(token);
    if (!user) return res.status(401).json({ message: '세션이 유효하지 않습니다.' });
    if (String(user.id) !== String(payload.sub || '')) {
      return res.status(401).json({ message: '세션이 유효하지 않습니다.' });
    }

    const restrictionState = getLoginRestrictionState(user);
    if (restrictionState.isRestricted) {
      await deleteSessionsByUserId(user.id);
      return res.status(403).json({ message: formatRestrictionMessage(user) });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
}

function optionalAuthMiddleware(req, _res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    req.user = null;
    return next();
  }

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch (_error) {
    req.user = null;
    return next();
  }

  findUserByToken(token)
    .then((user) => {
      req.user = user && String(user.id) === String(payload.sub || '') ? user : null;
      next();
    })
    .catch(next);
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }
  next();
}

module.exports = { authMiddleware, optionalAuthMiddleware, adminMiddleware };

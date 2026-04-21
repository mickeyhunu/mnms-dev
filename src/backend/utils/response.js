/**
 * 파일 역할: 백엔드에서 공통 응답 포맷/헬퍼 로직을 제공하는 유틸리티 파일.
 */
const { resolveMemberLevel } = require('./memberLevel');
const { getLoginRestrictionState, LOGIN_STATUS } = require('./loginRestriction');

const DEFAULT_MEMBER_TYPE = 'MEMBER';
const NICKNAME_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function toISOStringOrNull(value) {
  return value ? value.toISOString() : null;
}

function resolveMemberType(user) {
  return user.member_type || user.memberType || DEFAULT_MEMBER_TYPE;
}

function resolveNicknameChangeAvailableAt(lastChangedAt) {
  if (!lastChangedAt) return null;

  return new Date(new Date(lastChangedAt).getTime() + NICKNAME_CHANGE_COOLDOWN_MS).toISOString();
}

function pickUserRow(user) {
  const totalPoints = Number(user.total_points ?? user.totalPoints ?? 0);
  const memberLevel = resolveMemberLevel(totalPoints);
  const restrictionState = getLoginRestrictionState(user);
  const memberType = resolveMemberType(user);

  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    memberType,
    accountType: memberType,
    accountStatus: restrictionState.accountStatus || LOGIN_STATUS.ACTIVE,
    isLoginRestricted: restrictionState.isRestricted,
    loginRestrictedUntil: toISOStringOrNull(restrictionState.restrictedUntil),
    isLoginRestrictionPermanent: restrictionState.isPermanent,
    isAdmin: user.role === 'ADMIN',
    isAdvertiser: memberType === 'BUSINESS',
    isBusiness: user.role === 'BUSINESS' || memberType === 'BUSINESS',
    totalPoints,
    level: memberLevel.level,
    levelEmoji: memberLevel.emoji,
    levelTitle: memberLevel.title,
    levelLabel: memberLevel.label,
    phone: user.phone || '',
    name: user.name || '',
    birthDate: user.birth_date || null,
    smsConsent: Boolean(user.sms_consent),
    createdAt: user.created_at || user.createdAt || null,
    nicknameChangeAvailableAt: resolveNicknameChangeAvailableAt(user.last_nickname_changed_at)
  };
}

module.exports = { pickUserRow };

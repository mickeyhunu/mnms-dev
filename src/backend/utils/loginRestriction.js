/**
 * 파일 역할: 회원 로그인 제한 상태 계산/메시지 생성을 담당하는 유틸리티 파일.
 */
const LOGIN_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED'
};

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getLoginRestrictionState(user, now = new Date()) {
  const accountStatus = String(user?.account_status || user?.accountStatus || LOGIN_STATUS.ACTIVE).toUpperCase();
  const isPermanent = Boolean(user?.is_login_restriction_permanent ?? user?.isLoginRestrictionPermanent);
  const restrictedUntil = toDate(user?.login_restricted_until || user?.loginRestrictedUntil);
  const isSuspended = accountStatus === LOGIN_STATUS.SUSPENDED;
  const hasTimedRestriction = Boolean(restrictedUntil && restrictedUntil.getTime() > now.getTime());
  const isRestricted = isSuspended && (isPermanent || hasTimedRestriction);
  const isExpired = isSuspended && !isPermanent && restrictedUntil && restrictedUntil.getTime() <= now.getTime();

  return {
    accountStatus,
    isSuspended,
    isPermanent,
    restrictedUntil,
    isRestricted,
    isExpired
  };
}

function formatRestrictionMessage(user, now = new Date()) {
  const state = getLoginRestrictionState(user, now);
  if (!state.isRestricted) return '';
  if (state.isPermanent) return '정지된 계정입니다. 로그인 제한이 영구적으로 적용되어 있습니다.';

  const restrictedUntilDate = state.restrictedUntil.toISOString().split('T')[0];
  return `${restrictedUntilDate}까지 로그인이 제한되었습니다.`;
}

module.exports = {
  LOGIN_STATUS,
  getLoginRestrictionState,
  formatRestrictionMessage
};

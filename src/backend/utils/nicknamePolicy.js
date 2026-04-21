/**
 * 파일 역할: 닉네임 길이/금지어 정책을 서버 공통으로 검증하는 유틸리티 파일.
 */
const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 8;
const BLOCKED_NICKNAME_TERMS = [
  '시발',
  '씨발',
  '병신',
  '지랄',
  '개새끼',
  '좆'
];

function getNicknameLength(value) {
  return Array.from(String(value || '').trim()).length;
}

function normalizeNickname(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

function findBlockedNicknameTerm(value) {
  const normalized = normalizeNickname(value);
  if (!normalized) return null;
  return BLOCKED_NICKNAME_TERMS.find((term) => normalized.includes(term)) || null;
}

function validateNickname(value) {
  const nickname = String(value || '').trim();
  const length = getNicknameLength(nickname);

  if (length < NICKNAME_MIN_LENGTH || length > NICKNAME_MAX_LENGTH) {
    return {
      valid: false,
      message: `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 ${NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`
    };
  }

  const blockedTerm = findBlockedNicknameTerm(nickname);
  if (blockedTerm) {
    return {
      valid: false,
      message: '닉네임에 사용할 수 없는 표현이 포함되어 있습니다.'
    };
  }

  return { valid: true, message: '' };
}

module.exports = {
  NICKNAME_MIN_LENGTH,
  NICKNAME_MAX_LENGTH,
  findBlockedNicknameTerm,
  validateNickname
};

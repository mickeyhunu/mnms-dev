/**
 * 파일 역할: 인증 관련 아이디/비밀번호 정책 검증 유틸리티 파일.
 */
const LOGIN_ID_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[^\s]{8,}$/;

function validateLoginId(value) {
  const normalized = String(value || '').trim();
  const valid = LOGIN_ID_REGEX.test(normalized);
  return {
    valid,
    message: valid ? null : '아이디는 4자 이상 영문/숫자 조합으로 입력해주세요.'
  };
}

function validatePassword(value) {
  const normalized = String(value || '');
  const valid = PASSWORD_REGEX.test(normalized);
  return {
    valid,
    message: valid ? null : '비밀번호는 8자 이상 영문/숫자를 포함해야 하며 특수문자를 사용할 수 있습니다.'
  };
}

module.exports = {
  LOGIN_ID_REGEX,
  PASSWORD_REGEX,
  validateLoginId,
  validatePassword
};

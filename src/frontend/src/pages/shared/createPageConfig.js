/**
 * 파일 역할: 페이지 템플릿/스타일/스크립트 설정 객체를 일관된 형태로 생성하는 헬퍼 파일.
 */
export function createPageConfig({ template, styles = [], scripts = [] }) {
  return { template, styles, scripts };
}

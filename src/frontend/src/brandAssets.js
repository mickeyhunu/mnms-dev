/**
 * 파일 역할: 브랜드 로고/파비콘 경로와 공통 마크업을 관리하는 파일.
 */
export const BRAND_ASSETS = {
  logoPath: '/src/assets/live-avatars/brand-logo.png',
  faviconPath: '/src/assets/live-avatars/favicon.png'
};

export function createBrandLogoMarkup({ homePath = '/', title = '미드나잇 맨즈' } = {}) {
  return `<a href="${homePath}" class="logo" aria-label="${title} 홈"><img src="${BRAND_ASSETS.logoPath}" class="logo-image" alt="" /><span class="logo-text">${title}</span></a>`;
}
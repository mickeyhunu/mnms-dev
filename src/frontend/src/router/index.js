/**
 * 파일 역할: URL 경로를 페이지 렌더러와 연결하는 클라이언트 라우터 파일.
 */
import { createRouter, createWebHistory } from 'vue-router';
import PageView from '../views/PageView.js';

const BRAND_NAME = '미드나잇 맨즈';
const SITE_NAME = 'Midnight Men\'s';
const DEFAULT_TITLE = BRAND_NAME;
const DEFAULT_DESCRIPTION = '미드나잇 맨즈 커뮤니티에서 자유게시판, 익명게시판, 후기, 썰, 질문과 라이브 소식을 확인하세요.';

const routes = [
  { path: '/', component: PageView, meta: { pageKey: 'index', title: '홈', description: '실시간 인기글, 오늘의 베스트, 커뮤니티 소식을 한 번에 확인하세요.' } },
  { path: '/login', component: PageView, meta: { pageKey: 'login', title: '로그인', description: '미드나잇 맨즈 계정으로 로그인하고 커뮤니티 서비스를 이용하세요.', noindex: true } },
  { path: '/register', component: PageView, meta: { pageKey: 'register', title: '회원가입', description: '미드나잇 맨즈 회원가입으로 커뮤니티 활동을 시작하세요.', noindex: true } },
  { path: '/create', component: PageView, meta: { pageKey: 'create-post', title: '게시글 작성', description: '자유게시판, 후기, 질문 게시판에 새 글을 작성해보세요.', noindex: true } },
  { path: '/post-detail', component: PageView, meta: { pageKey: 'post-detail', title: '게시글 상세', description: '게시글 상세 내용을 확인하고 댓글, 추천, 공유를 이용하세요.' } },
  { path: '/bookmarks', component: PageView, meta: { pageKey: 'bookmarks', title: '북마크', description: '저장해둔 게시글을 빠르게 다시 확인하세요.', noindex: true } },
  { path: '/community', component: PageView, meta: { pageKey: 'community', title: '커뮤니티', description: '자유, 익명, 후기, 썰, 질문 게시판을 탐색해보세요.' } },
  { path: '/my-page', component: PageView, meta: { pageKey: 'my-page', title: '마이페이지', description: '내 계정 정보와 활동 내역, 포인트를 확인하세요.', noindex: true } },
  { path: '/my-page/profile', component: PageView, meta: { pageKey: 'my-page-profile', title: '내 프로필', description: '닉네임, 이메일 등 내 프로필 정보를 관리하세요.', noindex: true } },
  { path: '/my-page/activity', component: PageView, meta: { pageKey: 'my-page-activity', title: '내 활동', description: '내가 작성한 게시글, 댓글, 활동 기록을 확인하세요.', noindex: true } },
  { path: '/my-page/points', component: PageView, meta: { pageKey: 'my-page-points', title: '포인트', description: '보유 포인트와 적립/차감 내역을 확인하세요.', noindex: true } },
  { path: '/my-page/support', component: PageView, meta: { pageKey: 'my-page-support', title: '고객센터', description: '문의, FAQ, 공지사항 등 고객지원 메뉴를 확인하세요.' } },
  { path: '/my-page/policy', component: PageView, meta: { pageKey: 'my-page-policy', title: '약관 및 정책', description: '서비스 이용약관과 개인정보 처리방침을 확인하세요.' } },
  { path: '/admin', component: PageView, meta: { pageKey: 'admin', title: '관리자 페이지', description: '관리자 전용 대시보드입니다.', noindex: true } },
  { path: '/admin/support/create', component: PageView, meta: { pageKey: 'support-create', title: '공지/FAQ 작성', description: '관리자 전용 공지사항/FAQ 작성 페이지입니다.', noindex: true } },
  { path: '/admin/inquiries/:id/answer', component: PageView, meta: { pageKey: 'admin-inquiry-answer', title: '문의 답변', description: '관리자 전용 문의 답변 페이지입니다.', noindex: true } },
  { path: '/find-account', component: PageView, meta: { pageKey: 'find-account', title: '아이디/비밀번호 찾기', description: '아이디 또는 비밀번호를 안전하게 찾을 수 있습니다.', noindex: true } },
  { path: '/ad-purchase', component: PageView, meta: { pageKey: 'ad-purchase', title: '광고 구매', description: '광고 요금제와 상품 구성을 확인하고 구매를 진행하세요.', noindex: true } },
  { path: '/ad-order-history', component: PageView, meta: { pageKey: 'ad-order-history', title: '광고 구매 내역', description: '내가 주문한 광고 상품 내역을 확인하세요.', noindex: true } },
  { path: '/business-info', component: PageView, meta: { pageKey: 'business-info', title: '업체정보', description: '업체정보 메뉴 준비중 안내 페이지입니다.', noindex: true } },
  { path: '/ad-profile-management', component: PageView, meta: { pageKey: 'ad-profile-management', title: '광고프로필 관리', description: '광고프로필 기본 정보와 상세 소개를 등록하고 미리보기를 확인하세요.', noindex: true } },
  { path: '/business-management', component: PageView, meta: { pageKey: 'business-management', title: '사업자정보 관리', description: '사업자등록증, 사업자 상세정보, 계산서 발행 정보를 관리하세요.', noindex: true } },
  { path: '/live', component: PageView, meta: { pageKey: 'live', title: '라이브', description: '실시간 라이브 소식과 엔트리 정보를 확인하세요.' } },
  { path: '/support', component: PageView, meta: { pageKey: 'support-board', title: '고객지원', description: '공지사항, 고객센터 안내, 자주 묻는 질문을 확인하세요.' } },
  { path: '/support/faq', component: PageView, meta: { pageKey: 'support-board', title: 'FAQ', description: '자주 묻는 질문과 답변을 모아볼 수 있습니다.' } },
  { path: '/customer-service', component: PageView, meta: { pageKey: 'customer-service', title: '1:1 문의', description: '서비스 이용 중 문제를 1:1 문의로 접수하세요.', noindex: true } },
  { path: '/board/terms', component: PageView, meta: { pageKey: 'terms-policy', title: '약관 및 정책', description: '이용약관과 운영정책, 개인정보 정책을 확인하세요.' } },
  { path: '/my-inquiries', component: PageView, meta: { pageKey: 'my-inquiries', title: '내 문의 내역', description: '내가 접수한 1:1 문의 내역을 확인하세요.', noindex: true } },
  { path: '/my-inquiries/:id', component: PageView, meta: { pageKey: 'my-inquiry-detail', title: '문의 상세', description: '내 문의 내용과 답변 상세를 확인하세요.', noindex: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

function upsertMetaTag(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function upsertCanonicalTag(href) {
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', href);
}

function buildAbsoluteUrl(path, query = {}) {
  const url = new URL(path, window.location.origin);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

router.afterEach((to) => {
  const title = typeof to.meta?.title === 'string' && to.meta.title.trim().length > 0
    ? to.meta.title.trim()
    : DEFAULT_TITLE;
  const description = typeof to.meta?.description === 'string' && to.meta.description.trim().length > 0
    ? to.meta.description.trim()
    : DEFAULT_DESCRIPTION;
  const canonicalUrl = buildAbsoluteUrl(to.path, to.path === '/post-detail' ? { id: to.query?.id } : {});
  const robotsValue = to.meta?.noindex ? 'noindex, nofollow' : 'index, follow';

  document.title = title === DEFAULT_TITLE ? title : `${title} | ${BRAND_NAME}`;
  upsertMetaTag('meta[name="description"]', { name: 'description', content: description });
  upsertMetaTag('meta[property="og:title"]', { property: 'og:title', content: document.title });
  upsertMetaTag('meta[property="og:description"]', { property: 'og:description', content: description });
  upsertMetaTag('meta[property="og:type"]', { property: 'og:type', content: to.path === '/post-detail' ? 'article' : 'website' });
  upsertMetaTag('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
  upsertMetaTag('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
  upsertMetaTag('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary' });
  upsertMetaTag('meta[name="twitter:title"]', { name: 'twitter:title', content: document.title });
  upsertMetaTag('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
  upsertMetaTag('meta[name="robots"]', { name: 'robots', content: robotsValue });
  upsertCanonicalTag(canonicalUrl);
});

export default router;

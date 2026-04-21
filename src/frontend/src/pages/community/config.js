/**
 * 파일 역할: 커뮤니티 메인 페이지의 렌더링 설정을 정의하는 파일.
 */
import { createPageConfig } from '../shared/createPageConfig.js';

const communityTemplate = `
<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                </div>
                <div class="nav-user hidden" id="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container community-container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <button type="button" class="board-menu-toggle" id="board-menu-toggle" aria-label="카테고리 열기" aria-expanded="false" aria-controls="board-tabs-panel">
                        <span aria-hidden="true">☰</span>
                    </button>
                    <nav class="board-tabs hidden" id="board-tabs-panel" aria-label="게시판 카테고리">
                        <button type="button" class="board-tab active" data-board-type="ALL">전체</button>
                        <button type="button" class="board-tab" data-board-type="FREE">자유게시판</button>
                        <button type="button" class="board-tab" data-board-type="ANON">익명게시판</button>
                        <button type="button" class="board-tab" data-board-type="REVIEW">후기게시판</button>
                        <button type="button" class="board-tab" data-board-type="STORY">썰게시판</button>
                        <button type="button" class="board-tab" data-board-type="QUESTION">질문게시판</button>
                        <button type="button" class="board-tab" data-board-type="PROMOTION">홍보게시판</button>
                    </nav>
                    <span class="community-board-name">커뮤니티 게시글</span>
                </div>
                <div class="community-actions hidden" id="community-actions">
                    <a href="create-post.html" class="btn btn-primary btn-sm">글쓰기</a>
                </div>
            </header>

            <section class="top-ads hidden" id="top-ads-container" data-top-ad-placement="COMMUNITY" aria-label="커뮤니티 상단 광고"></section>

            <div class="error-banner hidden" id="error-banner">
                <span id="error-message"></span>
                <button id="retry-btn" class="btn btn-sm btn-outline">재시도</button>
            </div>

            <section class="best-posts-section" aria-label="베스트 게시글">
                <div class="best-posts-block">
                    <h2 class="best-posts-title">🔥 오늘의 베스트</h2>
                    <ul class="best-posts-list" id="daily-best-list"></ul>
                    <p class="best-posts-empty hidden" id="daily-best-empty">조건을 충족한 게시글이 없습니다.</p>
                </div>
                <div class="best-posts-block">
                    <h2 class="best-posts-title">📅 주간 베스트</h2>
                    <ul class="best-posts-list" id="weekly-best-list"></ul>
                    <p class="best-posts-empty hidden" id="weekly-best-empty">조건을 충족한 게시글이 없습니다.</p>
                </div>
            </section>

<ul class="article-list" id="post-list"></ul>

            <div class="loading" id="loading">게시글을 불러오는 중...</div>

            <div class="empty-state hidden" id="empty-state">
                등록된 게시글이 없습니다.
            </div>

            <div class="board-pagination hidden" id="pagination"></div>

            <div class="board-search-wrap">
                <form method="get" action="#" name="search_frm" id="search_frm" class="board-search-form">
                    <select name="search" id="search-type">
                        <option value="bbs_title">제목</option>
                        <option value="bbs_review">내용</option>
                        <option value="bbs_title_review">제목+내용</option>
                    </select>
                    <input type="text" name="keyword" id="search-keyword" placeholder="검색어를 입력하세요">
                    <button type="submit" id="search-btn" class="board-search-btn">검색</button>
                </form>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/utils/notifications.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/api/postAPI.js"></script>
    <script src="scripts/js/components/postCard.js"></script>
    <script src="scripts/js/components/topAds.js"></script>
    <script src="scripts/js/components/header.js"></script>
    <script src="scripts/js/pages/index.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>
`;

export const communityPageConfig = createPageConfig({
  template: communityTemplate,
  styles: ['styles/common.css', 'styles/layout.css', 'styles/components.css', 'styles/community-board.css'],
  scripts: ['scripts/js/utils/constants.js', 'scripts/js/utils/helpers.js', 'scripts/js/utils/auth.js', 'scripts/js/utils/notifications.js', 'scripts/js/api/apiClient.js', 'scripts/js/api/authAPI.js', 'scripts/js/api/postAPI.js', 'scripts/js/components/postCard.js', 'scripts/js/components/topAds.js', 'scripts/js/components/header.js', 'scripts/js/pages/index.js', 'scripts/js/components/footerNav.js']
});

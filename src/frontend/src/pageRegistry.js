/**
 * 파일 역할: 페이지 키와 실제 페이지 렌더링 모듈을 매핑하는 레지스트리 파일.
 */
import { adminPageConfig } from './pages/admin/config.js';
import { communityPageConfig } from './pages/community/config.js';
import { livePageConfig } from './pages/live/config.js';
import { postDetailPageConfig } from './pages/post-detail/config.js';

const pageRegistry = {
  'admin': adminPageConfig,
  'bookmarks': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <div class="community-section-header">
                <div class="community-header-left">
                    <a href="/community" class="community-back-link" aria-label="커뮤니티로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <h1>내 북마크</h1>
                </div>
                <p>북마크한 게시글을 확인하세요</p>
            </div>

            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>북마크 목록을 불러오는 중...</p>
            </div>

            <div class="error-banner hidden" id="error-banner">
                <p id="error-message"></p>
                <button class="btn btn-sm btn-primary" id="retry-btn">다시 시도</button>
            </div>

            <div class="empty-state hidden" id="empty-state">
                <h3>북마크한 게시글이 없습니다</h3>
                <p>마음에 드는 게시글에 북마크를 추가해보세요!</p>
                <a href="index.html" class="btn btn-primary">게시글 둘러보기</a>
            </div>

            <div id="bookmark-list"></div>

            <div class="pagination hidden" id="pagination">
                <button class="btn btn-outline btn-sm" id="prev-btn" disabled>이전</button>
                <div class="page-numbers" id="page-numbers"></div>
                <button class="btn btn-outline btn-sm" id="next-btn">다음</button>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/libs/koProfanityFilter.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/bookmarks.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/bookmarks.js", "scripts/js/components/footerNav.js"]
  },
  'business-info': {
    template: `<header class="header">
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
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <span class="community-board-name">업체정보</span>
                </div>
            </header>

            <section class="card business-directory-card">
                <div class="business-directory-filter-v2" aria-label="업체 필터">
                    <div class="business-filter-row business-filter-row--top">
                        <div class="business-filter-left">
                            <div href="#" class="business-geo" title="GPS" aria-label="위치">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6Zm0 8.5A2.5 2.5 0 1 1 12 5.5a2.5 2.5 0 0 1 0 5Z"></path></svg>
                            </div>
                            <a href="#" class="business-badge" data-filter-toggle="region"><span id="business-region-badge-label">지역 전체</span><i class="business-chevron" aria-hidden="true"></i></a>
                            <a href="#" class="business-badge hidden" id="business-district-trigger" data-filter-toggle="district"><span id="business-district-badge-label">세부 지역</span><i class="business-chevron" aria-hidden="true"></i></a>
                            <a href="#" class="business-badge" data-filter-toggle="category"><span id="business-category-badge-label">업종 전체</span><i class="business-chevron" aria-hidden="true"></i></a>
                        </div>
                        <div class="business-filter-right">
                            <div type="button" class="business-search-btn" id="business-search-btn" aria-label="업소검색">
                                <svg viewBox="0 0 512 512" aria-hidden="true">
                                    <path d="m495,466.1l-119.2-119.2c29.1-35.5 46.5-80.8 46.5-130.3 0-113.5-92.1-205.6-205.6-205.6-113.6,0-205.7,92.1-205.7,205.7s92.1,205.7 205.7,205.7c49.4,0 94.8-17.4 130.3-46.5l119.1,119.1c8,8 20.9,8 28.9,0 8-8 8-20.9 0-28.9zm-443.2-249.4c-1.42109e-14-91 73.8-164.8 164.8-164.8 91,0 164.8,73.8 164.8,164.8s-73.8,164.8-164.8,164.8c-91,0-164.8-73.8-164.8-164.8z"></path>
                                </svg>
                            </div>
                            <div class="business-filter-search">
                                <input type="search" id="business-keyword-filter" placeholder="제목/작성자 검색">
                            </div>
                        
                        </div>
                    </div>

                    <input type="hidden" id="business-region-filter" value="">
                    <input type="hidden" id="business-district-filter" value="">
                    <input type="hidden" id="business-category-filter" value="">
                    <input type="hidden" id="business-sort-filter" value="popular">

                    <div class="business-filter-menu" id="business-menu-region">
                        <div class="business-filter-menu__content" id="business-menu-region-items"></div>
                    </div>
                    <div class="business-filter-menu" id="business-menu-district">
                        <div class="business-filter-menu__content" id="business-menu-district-items"></div>
                    </div>
                    <div class="business-filter-menu" id="business-menu-category">
                        <div class="business-filter-menu__content" id="business-menu-category-items"></div>
                    </div>
                </div>
                <ul class="business-directory-list" id="business-directory-list"></ul>
                <p class="text-muted hidden" id="business-directory-empty">선택한 지역에 등록된 광고가 없습니다.</p>
            </section>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/components/header.js"></script>
    <script src="scripts/js/pages/businessInfo.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/businessInfo.js", "scripts/js/components/footerNav.js"]
  },
  'ad-profile-management': {
    template: `<header class="header">
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
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">광고프로필 관리</span>
                </div>
            </header>

            <section class="ad-profile-page" aria-label="광고프로필 관리 폼">
                <div class="ad-profile-notice">
                    <p>미드나잇맨즈에서 성매매와 관련된 광고를 할 경우,</p>
                    <p>서비스 이용이 제한되며 법적 처벌을 받을 수 있어요.</p>
                    <a href="/support/notice/provision">자세히 보기</a>
                </div>

                <div class="ad-profile-section">
                    <h3>광고프로필</h3>
                    <input id="ad-profile-name" type="text" maxlength="24" placeholder="업소명을 입력해주세요." required>
                    <input id="ad-profile-manager" type="text" maxlength="24" placeholder="담당자명을 입력해주세요." required>
                    <input id="ad-profile-manager-contact" type="text" maxlength="13" placeholder="담당자 연락처를 입력해주세요." required>

                    <div class="ad-profile-grid ad-profile-grid--region">
                        <label>
                            <span>지역</span>
                            <select id="ad-profile-region" required>
                                <option value="" selected>선택</option>
                            </select>
                        </label>
                        <label>
                            <span>세부 지역</span>
                            <select id="ad-profile-district" required>
                                <option value="" selected>선택</option>
                            </select>
                        </label>
                    </div>

                    <div class="ad-profile-grid">
                        <label>
                            <span>업종</span>
                            <select id="ad-profile-category" required>
                                <option value="" selected>선택</option>
                                <option value="룸">룸</option>
                                <option value="바">바</option>
                                <option value="클럽">클럽</option>
                                <option value="기타">기타</option>
                            </select>
                        </label>
                    </div>

                    <div class="ad-profile-grid">
                        <label>
                            <span>영업시간</span>
                            <div class="ad-profile-time-row">
                                <select id="ad-profile-open-hour" required></select>
                                <span class="ad-profile-time-separator">~</span>
                                <select id="ad-profile-close-hour" required></select>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="ad-profile-section">
                    <h3>상세정보</h3>
                    <input id="ad-profile-title" type="text" maxlength="50" placeholder="제목을 입력해주세요." required>
                    <div class="ad-profile-editor" aria-label="광고 상세정보 에디터">
                        <div class="ad-profile-editor-toolbar" role="toolbar" aria-label="텍스트 편집 도구">
                            <button type="button" class="ad-profile-editor-btn" data-editor-command="bold" title="굵게"><strong>B</strong></button>
                            <button type="button" class="ad-profile-editor-btn" data-editor-command="italic" title="기울임"><em>I</em></button>
                            <button type="button" class="ad-profile-editor-btn" data-editor-command="underline" title="밑줄"><span style="text-decoration: underline;">U</span></button>
                            <button type="button" class="ad-profile-editor-btn" data-editor-command="insertUnorderedList" title="목록">• 목록</button>
                            <button type="button" class="ad-profile-editor-btn" data-editor-command="justifyLeft" title="왼쪽 정렬">좌</button>
                            <button type="button" class="ad-profile-editor-btn" data-editor-command="justifyCenter" title="가운데 정렬">중</button>
                            <button type="button" class="ad-profile-editor-btn" data-editor-command="justifyRight" title="오른쪽 정렬">우</button>
                            <button type="button" class="ad-profile-editor-btn" id="ad-profile-editor-image-btn" title="이미지 첨부">이미지</button>
                        </div>
                        <input id="ad-profile-editor-image-input" class="hidden" accept="image/*" type="file">
                        <div id="ad-profile-description-editor" class="ad-profile-editor-content" contenteditable="true" data-placeholder="내용을 입력해주세요."></div>
                    </div>
                    <textarea id="ad-profile-description" class="hidden" maxlength="1000" placeholder="내용을 입력해주세요." required></textarea>
                </div>

                <div class="ad-profile-preview">
                    <h3>미리보기</h3>
                    <ul class="business-directory-list ad-profile-preview-list">
                        <li class="business-directory-item">
                            <div class="business-directory-main">
                                <h4 id="ad-profile-preview-title">[선택-업소명] 제목을 입력해주세요.</h4>
                                <p class="business-directory-region-detail" id="ad-profile-preview-detail">선택 선택 · 선택 · 시간선택 ~ 시간선택</p>
                                <div class="business-directory-meta">
                                    <span class="business-directory-manager" id="ad-profile-preview-manager">담당자 · 연락처</span>
                                    <span class="business-directory-views">조회수 43</span>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>

                <div class="ad-profile-notice ad-profile-notice--bottom">
                    <p>미드나잇맨즈 광고관리 규정에 위배되는 내용을 입력할 경우,</p>
                    <p>별도 안내 없이 수정되거나 반려될 수 있어요.</p>
                </div>
                <div class="ad-profile-submit-wrap">
                    <button id="ad-profile-draft-btn" class="btn btn-secondary hidden" type="button">임시저장</button>
                    <button id="ad-profile-save-btn" class="btn btn-primary" type="button">광고프로필 저장</button>
                </div>
            </section>
        </div>
    </main>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/adProfileManagement.js", "scripts/js/components/footerNav.js"]
  },
  'business-management': {
    template: `<header class="header">
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
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">사업자정보 관리</span>
                </div>
            </header>

            <section class="business-info-page" aria-label="사업자 정보 관리 폼">
                <div class="business-info-notice">
                    <p>미드나잇맨즈에서 성매매와 관련된 광고를 할 경우,</p>
                    <p>서비스 이용이 제한되며 법적 처벌을 받을 수 있어요.</p>
                    <a href="/support/notice/provision">자세히 보기</a>
                </div>

                <div class="business-info-section">
                    <h3>사업자등록증 이미지</h3>
                    <input id="business-license-input" class="hidden" type="file" accept="image/*">
                    <button id="business-license-upload-btn" class="business-license-upload-btn" type="button" aria-label="사업자등록증 업로드">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 20 20" width="18" height="18">
                            <path stroke-linecap="round" stroke-width="1.5" d="M9.754.75v18M18.75 9.753h-18"></path>
                        </svg>
                    </button>
                    <p id="business-license-file-name" class="business-license-file-name">등록할 이미지를 선택해주세요.</p>
                    <div class="business-info-guide">
                        <p>• 사업자등록증에 가려지는 부분이 없어야해요.</p>
                        <p>• 이미지에 왜곡이나 흐린 부분이 있는지 확인해주세요.</p>
                    </div>
                </div>

                <div class="business-info-section">
                    <h3>사업자 상세정보</h3>
                    <div class="business-verify-row">
                        <input id="business-number" type="text" maxlength="12" placeholder="사업자 번호를 입력해주세요.">
                        <button id="business-verify-btn" type="button" disabled>검증</button>
                    </div>
                    <input id="business-name" type="text" maxlength="100" placeholder="사업자 상호를 입력해주세요.">
                    <input id="business-owner" type="text" maxlength="24" placeholder="담당자명을 입력해주세요.">
                    <div class="business-address-wrap">
                        <input id="business-address" type="text" maxlength="100" placeholder="사업자 주소를 입력해주세요." readonly>
                        <button id="business-address-search-btn" type="button" aria-label="주소 검색">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" height="20" width="20">
                                <path d="M19.975 8.187c-.97-4.61-4.697-6.687-7.97-6.687h-.01c-3.264 0-7 2.066-7.97 6.677-1.082 5.15 1.951 9.424 4.596 12.17C9.6 21.363 10.742 22.5 12 22.5s2.408-1.136 3.38-2.154c2.644-2.745 5.677-7.008 4.595-12.159m-7.97 5.001c-1.61 0-2.913-1.407-2.913-3.144S10.396 6.9 12.005 6.9s2.912 1.407 2.912 3.144-1.303 3.144-2.912 3.144"></path>
                            </svg>
                        </button>
                    </div>
                    <input id="business-address-detail" type="text" maxlength="100" placeholder="(선택) 상세 주소를 입력해주세요.">
                </div>

                <div class="business-info-section business-billing">
                    <h3>계산서 발행</h3>
                    <label class="business-billing-option">
                        <input type="radio" name="billing-type" value="cash" checked>
                        <span>현금영수증</span>
                    </label>
                    <p class="business-billing-help">광고프로필에 등록한 연락처로 발급해드려요.</p>
                    <label class="business-billing-option">
                        <input type="radio" name="billing-type" value="tax">
                        <span>세금계산서</span>
                    </label>
                    <p class="business-billing-help">사업자정보에 등록한 사업자번호로 발급해드려요.</p>
                </div>

                <div class="business-info-notice business-info-notice--bottom">
                    <p>광고프로필과 다른 사업자이거나 상세정보에 오탈자가 있을 경우,</p>
                    <p>별도 안내 없이 수정되거나 반려될 수 있어요.</p>
                </div>

                <div class="ad-profile-actions">
                    <button id="business-info-draft-btn" class="btn btn-secondary hidden" type="button">임시저장</button>
                    <button id="business-info-save-btn" class="btn btn-primary" type="button">사업자정보 저장</button>
                </div>
            </section>
        </div>
    </main>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/businessInfo.js", "scripts/js/components/footerNav.js"]
  },
  'ad-purchase': {
    template: `<header class="header">
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
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">광고 구매</span>
                </div>
            </header>

            <section class="ad-purchase-layout" aria-label="광고 요금제 안내">
                <div class="ad-plan-tabs" role="tablist" aria-label="요금제 선택">
                    <button type="button" class="ad-plan-tab is-active" data-plan="basic" role="tab" aria-selected="true">
                        <img class="ad-plan-tab-icon" src="/src/assets/ad-plan-badges/basic-badge.png" alt="" aria-hidden="true">
                    </button>
                    <button type="button" class="ad-plan-tab" data-plan="plus" role="tab" aria-selected="false">
                        <img class="ad-plan-tab-icon" src="/src/assets/ad-plan-badges/plus-badge.png" alt="" aria-hidden="true">
                    </button>
                    <button type="button" class="ad-plan-tab" data-plan="premium" role="tab" aria-selected="false">
                        <img class="ad-plan-tab-icon" src="/src/assets/ad-plan-badges/premium-badge.png" alt="" aria-hidden="true">
                    </button>
                    <button type="button" class="ad-plan-tab" data-plan="banner" role="tab" aria-selected="false">
                        <img class="ad-plan-tab-icon" src="/src/assets/ad-plan-badges/banner-badge.png" alt="" aria-hidden="true">
                    </button>
                </div>

                <article class="ad-plan-detail" id="ad-plan-detail">
                    <ul class="ad-package-feature-list" id="ad-plan-features"></ul>
                    <div class="ad-price-options" id="ad-price-options"></div>
                </article>

                <hr class="ad-payment-divider">

                <article class="ad-payment-card" aria-label="결제 정보">
                    <h3 class="ad-payment-title">결제정보</h3>
                    <dl class="ad-payment-list">
                        <div class="ad-payment-row">
                            <dt>선택한 상품</dt>
                            <dd id="ad-selected-product">BASIC 30일</dd>
                        </div>
                        <div class="ad-payment-row">
                            <dt>상품 금액</dt>
                            <dd id="ad-product-price">190,000원</dd>
                        </div>
                        <div class="ad-payment-row">
                            <dt>부가세 (VAT)</dt>
                            <dd id="ad-vat-price">19,000원</dd>
                        </div>
                    </dl>
                    <div class="ad-payment-total">
                        <strong>총 결제 금액</strong>
                        <strong id="ad-total-price">209,000원</strong>
                    </div>
                    <button type="button" class="btn btn-primary ad-purchase-submit" id="ad-purchase-submit">광고 주문하기</button>
                    <a href="/ad-order-history" class="ad-order-history-link">광고 구매 내역 보기</a>
                </article>
            </section>
        </div>
    </main>

    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/components/footerNav.js", "scripts/js/pages/adPurchase.js"]
  },
  'ad-order-history': {
    template: `<header class="header">
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
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">광고 구매 내역</span>
                </div>
            </header>

            <section class="ad-order-history-card" aria-label="광고 구매 주문 내역">
                <p class="ad-order-history-caption">주문한 광고 상품의 결제 내역을 최신순으로 확인할 수 있어요.</p>
                <div class="ad-order-history-empty hidden" id="ad-order-history-empty">아직 주문한 광고가 없습니다.</div>
                <div class="ad-order-history-list" id="ad-order-history-list"></div>
            </section>
        </div>
    </main>

    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/adOrderHistory.js", "scripts/js/components/footerNav.js"]
  },
  'community': communityPageConfig,
  'create-post': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container" style="max-width: 800px;">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/community" class="community-back-link" aria-label="커뮤니티로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">새 글 작성</span>
                </div>
            </header>
            <p class="text-muted" style="margin: 12px 0 24px;">미드나잇 맨즈에 새로운 이야기를 공유해보세요</p>

            <div class="card">
                <form id="post-form" enctype="multipart/form-data">
                    <div class="error-banner hidden" id="error-banner">
                        <p id="error-message"></p>
                    </div>
                    
                    <div class="form-group">
                    <label for="board-type" class="form-label">게시판 선택</label>
                    <select id="board-type" name="boardType" class="form-control">
                    <option value="FREE">자유게시판</option>
                    <option value="ANON">익명게시판</option>
                    <option value="REVIEW">후기게시판</option>
                    <option value="STORY">썰게시판</option>
                    <option value="QUESTION">질문게시판</option>
                    <option value="PROMOTION">홍보게시판</option>
                    </select>
                    </div>

                    <div class="form-group hidden" id="notice-options-group">
                        <label class="form-label">관리자 공지 옵션</label>
                        <div style="display:flex;flex-direction:column;gap:8px;">
                            <label><input type="checkbox" id="is-notice"> 공지로 등록</label>
                            <div id="notice-target-group" class="hidden" style="padding:10px;border:1px solid #e8e8e8;border-radius:8px;">
                                <small class="text-muted" style="display:block;margin-bottom:6px;">필독/공지 노출 게시판</small>
                                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                                    <label><input type="checkbox" name="notice-target-board" value="FREE"> 자유</label>
                                    <label><input type="checkbox" name="notice-target-board" value="ANON"> 익명</label>
                                    <label><input type="checkbox" name="notice-target-board" value="REVIEW"> 후기</label>
                                    <label><input type="checkbox" name="notice-target-board" value="STORY"> 썰</label>
                                    <label><input type="checkbox" name="notice-target-board" value="QUESTION"> 질문</label>
                                    <label><input type="checkbox" name="notice-target-board" value="PROMOTION"> 홍보</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="title" class="form-label">제목</label>
                        <input type="text" id="title" name="title" class="form-control" placeholder="제목을 입력하세요" maxlength="255" required>
                        <div class="error-message hidden" id="title-error"></div>
                    </div>
                    

                    <div class="form-group">
                        <label for="content" class="form-label">내용</label>
                        <textarea id="content" name="content" class="form-control" placeholder="내용을 입력하세요" rows="15" required></textarea>
                        <div class="error-message hidden" id="content-error"></div>
                        <small class="text-muted">최소 10자 이상 입력해주세요</small>
                    </div>



                    <div class="form-group">
                        <label for="image-files" class="form-label">이미지 첨부</label>
                        <input type="file" id="image-files" name="files" class="form-control" multiple accept="image/*">
                        <small class="text-muted">최대 5개의 이미지를 업로드할 수 있습니다 (JPG, PNG, GIF)</small>
                        <div id="image-preview" class="image-preview mt-2"></div>
                    </div>

                    <div class="form-actions form-actions-inline" style="display: flex; style="justify-content: flex-end; gap: 8px;">
                        <button type="submit" class="btn btn-primary" id="submit-btn">등록</button>
                        <a href="index.html" class="btn btn-secondary">취소</a>
                    </div>
                </form>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/createPost.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/libs/koProfanityFilter.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/createPost.js", "scripts/js/components/footerNav.js"]
  },
  'support-create': {
    template: `<header class="header">
        <div class="header-container">
            <a href="/" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="/admin" class="btn btn-secondary btn-sm">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container" style="max-width: 800px;">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/admin" class="community-back-link" aria-label="관리자 페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">공지사항 새 글 작성</span>
                </div>
            </header>
            <p class="text-muted support-create-description" style="margin: 12px 0 24px;">커뮤니티 글쓰기 화면과 동일한 방식으로 공지사항 글을 등록할 수 있습니다.</p>

            <div class="card">
                <form id="support-post-form">
                    <div class="form-group">
                        <label for="support-form-category" class="form-label">구분</label>
                        <select id="support-form-category" class="form-control">
                            <option value="NOTICE">공지사항</option>
                            <option value="FAQ">FAQ</option>
                        </select>
                    </div>

                    <div class="form-group" id="support-pin-options">
                        <label class="form-label">커뮤니티 노출</label>
                        <div style="margin-bottom:8px;">
                            <label for="support-form-board-type" class="form-label">노출 게시판</label>
                            <select id="support-form-board-type" class="form-control" style="max-width:260px;">
                                <option value="FREE">자유게시판</option>
                                <option value="ANON">익명게시판</option>
                                <option value="REVIEW">후기게시판</option>
                                <option value="STORY">썰게시판</option>
                                <option value="QUESTION">질문게시판</option>
                                <option value="PROMOTION">홍보게시판</option>
                            </select>
                        </div>
                        <label><input type="checkbox" id="support-form-is-pinned"> 커뮤니티 필독 상단 고정으로 표시</label>
                    </div>

                    <div class="form-group">
                        <label for="title" class="form-label">제목</label>
                        <input type="text" id="title" class="form-control" maxlength="255" placeholder="제목을 입력하세요" required>
                    </div>

                    <div class="form-group">
                        <label for="content" class="form-label">내용</label>
                        <textarea id="content" class="form-control" rows="15" placeholder="내용을 입력하세요" required></textarea>
                        <small class="text-muted">최소 10자 이상 입력해주세요</small>
                    </div>

                    <div class="form-actions form-actions-inline" style="display:flex;justify-content:flex-end;gap:8px;">
                        <button type="submit" class="btn btn-primary" id="submit-btn">등록</button>
                        <a href="/admin" class="btn btn-secondary">취소</a>
                    </div>
                </form>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/supportCreate.js"></script>
    <script src="scripts/js/components/sectionHeader.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/supportCreate.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },

  'admin-inquiry-answer': {
    template: `<header class="header">
        <div class="header-container">
            <a href="/" class="logo"><h1>미드나잇 맨즈</h1></a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="/admin" class="btn btn-secondary btn-sm">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container" style="max-width: 900px;">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/admin" class="community-back-link" aria-label="관리자 페이지로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">1:1 문의 답변 작성</span>
                </div>
            </header>
            <p class="text-muted admin-inquiry-answer-description" style="margin: 12px 0 24px;">문의 상세 내용을 확인하고 답변을 저장할 수 있습니다.</p>

            <div class="card admin-inquiry-answer-card">
                <div class="loading" id="admin-inquiry-loading"><div class="spinner"></div><p>문의를 불러오는 중...</p></div>
                <form id="admin-inquiry-answer-form" class="hidden">
                    <div class="form-group">
                        <label class="form-label">문의 제목</label>
                        <div id="admin-inquiry-title" class="form-control admin-inquiry-readonly admin-inquiry-title-box"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">문의 정보</label>
                        <div id="admin-inquiry-meta" class="form-control admin-inquiry-readonly admin-inquiry-meta-grid"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">문의 내용</label>
                        <div id="admin-inquiry-content" class="form-control admin-inquiry-readonly admin-inquiry-content-box"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">첨부파일</label>
                        <div id="admin-inquiry-attachments" class="form-control admin-inquiry-readonly admin-inquiry-attachments-box">첨부파일이 없습니다.</div>
                    </div>
                    <div class="form-group">
                        <label for="admin-inquiry-answer-content" class="form-label">답변 내용</label>
                        <textarea id="admin-inquiry-answer-content" class="form-control" rows="8" placeholder="답변 내용을 입력해주세요." required></textarea>
                    </div>
                    <div class="form-actions form-actions-inline" style="display:flex;justify-content:flex-end;gap:8px;">
                        <a href="/admin" class="btn btn-secondary">목록으로</a>
                        <button type="submit" class="btn btn-primary" id="admin-inquiry-answer-save-btn">답변 저장</button>
                    </div>
                </form>
            </div>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/adminInquiryAnswer.js"></script>
    <script src="scripts/js/components/sectionHeader.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/adminInquiryAnswer.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'find-account': {
    template: `<header class="header">
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
    <div class="container auth-container auth-login">
        <div class="community-section-header">
            <h1>계정 찾기</h1>
            <p>본인인증 후 가입된 아이디를 확인하고 비밀번호를 재설정할 수 있습니다.</p>
        </div>

        <div class="card">
            <div class="form-actions">
                <button class="btn btn-primary w-full" id="find-account-btn" type="button">계정찾기 (본인인증)</button>
            </div>
            <p class="text-center mt-3" id="find-account-status" aria-live="polite"></p>
            <div class="form-group mt-3 hidden" id="found-account-section">
                <label class="form-label">가입된 아이디</label>
                <p class="form-control-static" id="found-login-id">본인인증 후 자동 입력됩니다.</p>
            </div>
            <form id="reset-password-form" class="hidden mt-3">
                <div class="form-group">
                    <label class="form-label" for="new-password">새 비밀번호</label>
                    <input class="form-control" id="new-password" type="password" minlength="8" required placeholder="새 비밀번호를 입력하세요">
                </div>
                <div class="form-group">
                    <label class="form-label" for="confirm-new-password">새 비밀번호 확인</label>
                    <input class="form-control" id="confirm-new-password" type="password" minlength="8" required placeholder="새 비밀번호를 다시 입력하세요">
                </div>
                <button class="btn btn-secondary w-full" type="submit">비밀번호 재설정</button>
            </form>
            <div class="text-center mt-3">
                <a href="login.html">로그인 화면으로 돌아가기</a>
            </div>
        </div>
    </div>
</main>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/pages/findAccount.js", "scripts/js/components/header.js", "scripts/js/components/footerNav.js"]
  },
  'index': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
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
        <div class="container"><section class="top-ads hidden" id="top-ads-container" data-top-ad-placement="HOME" aria-label="홈 상단 광고"></section></div>
        <div class="container home-service-wrap">
            <section class="service-category-grid" aria-label="홈 카테고리">
                <a class="service-item" href="live.html">
                    <span class="service-icon">🔴</span>
                    <span class="service-label">LIVE</span>
                </a>
                <a class="service-item" href="community.html">
                    <span class="service-icon">📝</span>
                    <span class="service-label">커뮤니티</span>
                </a>
                <a class="service-item" href="business-info.html">
                    <span class="service-icon">🏢</span>
                    <span class="service-label">업체정보</span>
                </a>
            </section>
        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/libs/koProfanityFilter.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/components/topAds.js"></script>
    <script src="scripts/js/pages/home.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/community-board.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/topAds.js", "scripts/js/pages/home.js", "scripts/js/components/footerNav.js"]
  },
  'live': livePageConfig,
  'login': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
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
        <div class="container age-notice-banner" aria-label="청소년 이용 제한 안내">
            <div class="age-notice-icon" aria-hidden="true"><span class="age-notice-number">19</span></div>
            <div class="age-notice-text">
                <p>본 정보내용은 청소년 유해매체물로서 정보통신망 이용촉진 및 정보보호 등에 관한 법률 및 청소년 보호법의 규정에 의하여</p>
                <p class="age-notice-warning">만 19세 미만의 청소년이 이용할 수 없습니다.</p>
            </div>
        </div>

        <div class="container auth-container auth-login">
            <div class="community-section-header">
                <h1>로그인</h1>
                <p>미드나잇 맨즈에 로그인하여 다양한 사람들과 소통하세요</p>
            </div>

            <div class="card">
                <form id="login-form">
                    <div class="error-banner hidden" id="error-banner">
                        <p id="error-message"></p>
                    </div>

                    <div class="form-group">
                        <label for="loginId" class="form-label">아이디</label>
                        <input type="text" id="loginId" name="loginId" class="form-control" placeholder="아이디를 입력하세요" required>
                        <div class="error-message hidden" id="loginId-error"></div>
                    </div>

                    <div class="form-group">
                        <label for="password" class="form-label">비밀번호</label>
                        <input type="password" id="password" name="password" class="form-control" placeholder="비밀번호를 입력하세요" required>
                        <div class="error-message hidden" id="password-error"></div>
                    </div>

                    <button type="submit" class="btn btn-primary w-full" id="submit-btn">로그인</button>
                </form>

                <div class="text-center mt-3">
                    <p>아직 계정이 없으신가요? <a href="register.html">회원가입</a></p>
                </div>

                <div class="grid grid-2 mt-3">
                    <a href="register.html" class="btn btn-outline btn-sm">회원가입</a>
                    <a href="find-account.html" class="btn btn-outline btn-sm">계정 찾기</a>
                </div>
            </div>
        </div>

        <footer class="company-footer-slot" aria-label="마이페이지 하단 정보">
            <div class="company-footer-top">
                <strong class="company-footer-logo">MIDNIGHT MENS</strong>
            </div>
            <div class="company-footer-links-row">
                <a href="/board/terms">이용약관</a>
                <span class="footer-divider" aria-hidden="true"></span>
                <a href="/board/terms">개인정보처리방침</a>
            </div>
            <p class="company-footer-notice">미드나잇 맨즈는 커뮤니티 서비스 제공 플랫폼입니다.</p>
            <p class="company-footer-notice">상호명 : MN컴퍼니 | 사업자번호 : 355-18-02505 | 대표자명 : 이상훈 | 대표번호 : 010-6567-4519</p>
            <p class="company-footer-copyright">© MIDNIGHT MENS. ALL RIGHTS RESERVED.</p>
        </footer>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/validation.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/pages/login.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/validation.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/login.js", "scripts/js/components/footerNav.js"]
  },
  'my-page': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <span class="community-board-name">마이페이지</span>
                </div>
            </header>

            <div class="container mypage-profile-container">
                <p class="mypage-mobile-title">내 정보</p>

                <section class="mypage-card mypage-info-card" id="my-stats">
                    <div class="loading">로딩 중...</div>
                </section>

                <section class="mypage-link-section hidden" id="ad-center-wrapper">
                    <p class="mypage-link-section-title">광고센터</p>
                    <div class="mypage-link-list" id="ad-center-section">
                        <a class="mypage-link-item" href="/ad-purchase"><span>광고 구매</span></a>
                        <a class="mypage-link-item" href="/business-info"><span>점프 관리</span></a>
                        <a class="mypage-link-item" href="/ad-profile-management">
                            <span>광고프로필 관리</span>
                            <span id="mypage-ad-profile-status" class="mypage-status-badge mypage-status-badge--unregistered">미등록</span>
                        </a>
                        <a class="mypage-link-item" href="/business-management">
                            <span>사업자정보 관리</span>
                            <span id="mypage-business-info-status" class="mypage-status-badge mypage-status-badge--unregistered">미등록</span>
                        </a>
                        <a class="mypage-link-item" href="/ad-order-history"><span>광고 구매 내역</span></a>
                    </div>
                </section>

                <section class="mypage-link-section">
                    <p class="mypage-link-section-title">고객센터</p>
                    <div class="mypage-link-list">
                        <a class="mypage-link-item" href="/customer-service"><span>1:1 고객센터</span></a><a class="mypage-link-item" href="/my-inquiries"><span>내 문의함</span></a>
                        <a class="mypage-link-item" href="/support/faq"><span>FAQ</span></a>
                    </div>
                </section>

                <div class="mypage-link-section">
                    <p class="mypage-link-section-title">ABOUT 미드나잇 맨즈</p>
                    <div class="mypage-link-list">
                        <a class="mypage-link-item" href="/support"><span>공지사항</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a>
                        <a class="mypage-link-item" href="/board/terms"><span>약관 및 정책</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a>
                    </div>
                </div>
            </div>

        </div>
    </main>

    <footer class="company-footer-slot" aria-label="마이페이지 하단 정보">
        <div class="company-footer-top">
            <strong class="company-footer-logo">MIDNIGHT MENS</strong>
        </div>
        <div class="company-footer-links-row">
            <a href="/board/terms">이용약관</a>
            <span class="footer-divider" aria-hidden="true"></span>
            <a href="/board/terms">개인정보처리방침</a>
        </div>
        <p class="company-footer-notice">미드나잇 맨즈는 커뮤니티 서비스 제공 플랫폼입니다.</p>
        <p class="company-footer-notice">상호명 : MN컴퍼니 | 사업자번호 : 355-18-02505 | 대표자명 : 이상훈 | 대표번호 : 010-6567-4519</p>
        <p class="company-footer-copyright">© MIDNIGHT MENS. ALL RIGHTS RESERVED.</p>
    </footer>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/myPage.js"></script>
    <script src="scripts/js/components/sectionHeader.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-profile': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname"></span>
                    <a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
      <div class="container">
        <header class="community-section-header">
          <div class="community-header-left">
            <a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a>
            <span class="community-board-name">마이페이지 - 정보 수정</span>
          </div>
        </header>

        <section class="mypage-card">
          <h3>회원정보수정</h3>
          <form id="profile-form">
            <div class="profile-form-grid">
              <label>아이디
                <input type="text" id="profile-login-id" name="loginId" readonly>
              </label>
              <label>비밀번호
                <input type="password" id="profile-password" name="password" minlength="8" placeholder="변경 시 입력">
              </label>
              <label>비밀번호 확인
                <input type="password" id="profile-password-confirm" name="passwordConfirm" minlength="8" placeholder="비밀번호 재입력">
                <small id="profile-password-match-result" class="help-text" role="status"></small>
              </label>
              <label>이름
                <input type="text" id="profile-name" name="name" readonly>
              </label>
              <label>
                <span class="profile-field-title">닉네임</span>
                <span class="profile-nickname-inline">
                  <input type="text" id="profile-nickname" name="nickname" minlength="2" maxlength="8" required>
                  <button type="button" class="btn btn-outline btn-sm hidden" id="nickname-check-btn">중복 확인</button>
                </span>
                <small id="nickname-check-result" class="help-text"></small>
                
              </label>
              <label>생년월일
                <input type="text" id="profile-birth" name="birthDate" readonly>
              </label>
              <label>연락처
                <span class="profile-nickname-inline">
                  <input type="text" id="profile-phone" name="phone" placeholder="본인인증 후 자동 입력" readonly>
                  <button type="button" class="btn btn-outline btn-sm" id="phone-verify-btn">연락처 변경</button>
                </span>
                <small id="phone-verify-result" class="help-text"></small>
                <span class="profile-consent-inline"><input type="checkbox" id="sms-consent" name="smsConsent"><span class="profile-consent-text">SMS 수신 동의</span></span>
              </label>
            </div>
            <div class="profile-form-actions">
              <button type="submit" class="btn btn-primary">저장</button>
            </div>
            <p id="profile-save-result" class="help-text" role="status"></p>
          </form>
        </section>
      </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/pages/myPage.js"></script>
    <script src="scripts/js/components/sectionHeader.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-activity': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지 - 활동 내역 보기</span></div></header>
    <div id="my-stats" class="activity-summary-grid"><div class="loading">로딩 중...</div></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-points': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지 - 포인트 내역 보기</span></div></header>
    <div id="my-stats" class="activity-summary-grid"><div class="loading">로딩 중...</div></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-support': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지</span></div></header><div class="container">
    <section class="support-link-section"><p class="support-link-section-title">고객센터</p><div class="support-link-list">
    <a class="support-link-item" href="/customer-service"><span>1:1 고객센터</span></a>
    <a class="support-link-item" href="/my-inquiries"><span>내 문의함</span></a>
    <a class="support-link-item" href="/support/faq"><span>FAQ</span></a>
    <a class="support-link-item" href="/board/customer/feedback"><span>피드백 보내기</span></a>
    </div></section><div class="section-header"><h2>약관 및 정책</h2></div><div class="mypage-link-section"><p class="mypage-link-section-title">ABOUT 미드나잇맨즈</p><div class="mypage-link-list"><a class="mypage-link-item" href="/support"><span>공지사항</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/about?type=event"><span>이벤트</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/terms"><span>약관 및 정책</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a target="_blank" rel="noopener noreferrer" class="mypage-link-item" href="https://12terrace.com/board/notice/33"><span>미드나잇맨즈 소개</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a></div></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'my-page-policy': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">마이페이지</span></div></header><div class="container">
    <div class="section-header"><h2>약관 및 정책</h2></div><div class="mypage-link-section"><p class="mypage-link-section-title">ABOUT 미드나잇맨즈</p><div class="mypage-link-list"><a class="mypage-link-item" href="/support"><span>공지사항</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/about?type=event"><span>이벤트</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a class="mypage-link-item" href="/board/terms"><span>약관 및 정책</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a><a target="_blank" rel="noopener noreferrer" class="mypage-link-item" href="https://12terrace.com/board/notice/33"><span>미드나잇맨즈 소개</span><span class="mypage-link-chevron" aria-hidden="true">›</span></a></div></div><section class="support-link-section"><p class="support-link-section-title">고객센터</p><div class="support-link-list"><a class="support-link-item" href="/customer-service"><span>1:1 고객센터</span></a><a class="support-link-item" href="/support/faq"><span>FAQ</span></a><a class="support-link-item" href="/board/customer/feedback"><span>피드백 보내기</span></a></div></section></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myPage.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myPage.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },


  'customer-service': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container customer-service-page mypage-linked-container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">1:1 고객센터</span></div></header>
    <div class="mypage-linked-content"><section class="customer-service-card"><div class="customer-service-intro"><h2>문의 / 신고 접수</h2><p>불편하신 사항을 접수해주시면 확인 후 신속하게 처리하겠습니다.<br>게시글 신고, 댓글 신고, 일반 문의 모두 동일한 화면에서 등록할 수 있습니다.</p></div>
    <form id="customer-service-form" class="customer-service-form" novalidate>
      <input type="hidden" id="inquiry-target-type" name="targetType" value="general">
      <input type="hidden" id="inquiry-target-id" name="targetId" value="">
      <div class="form-group"><label for="inquiry-type">문의 유형</label><select id="inquiry-type" name="inquiryType" class="form-control" required><option value="">-- 유형 선택 --</option><option value="question">일반 문의</option><option value="post_report">게시글 신고</option><option value="comment_report">댓글 신고</option><option value="account">계정 문의</option><option value="service_error">서비스 오류</option><option value="ad_inquiry">광고 문의</option><option value="etc">기타</option></select></div>
      <div class="form-group"><label for="inquiry-title">제목</label><input id="inquiry-title" name="title" type="text" class="form-control" maxlength="100" placeholder="문의 제목을 입력해주세요." required></div>
      <div class="form-group"><label for="inquiry-reason">신고/문의 사유</label><textarea id="inquiry-reason" name="content" class="form-control" rows="6" placeholder="상세 내용을 입력해주세요." required></textarea></div>
      <section class="customer-file-upload"><div class="file-upload-header">첨부파일</div><p class="file-upload-guide">* 파일 형식: JPG, PNG, GIF, WEBP, PDF (최대 50MB)</p>
        <div class="file-upload-item"><div class="file-input-wrapper"><input type="file" name="attachments[]" id="attachment_1" class="file-input" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,image/jpeg,image/png,image/gif,image/webp,application/pdf"><button type="button" class="cancel-button" data-target="attachment_1" aria-label="첫 번째 파일 제거">×</button></div></div>
        <div class="file-upload-item"><div class="file-input-wrapper"><input type="file" name="attachments[]" id="attachment_2" class="file-input" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,image/jpeg,image/png,image/gif,image/webp,application/pdf"><button type="button" class="cancel-button" data-target="attachment_2" aria-label="두 번째 파일 제거">×</button></div></div>
        <div class="file-upload-item"><div class="file-input-wrapper"><input type="file" name="attachments[]" id="attachment_3" class="file-input" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,image/jpeg,image/png,image/gif,image/webp,application/pdf"><button type="button" class="cancel-button" data-target="attachment_3" aria-label="세 번째 파일 제거">×</button></div></div>
      </section>
      <p class="customer-service-note">문의는 즉시 답변드릴 수 있도록 노력하고 있습니다.<br><br>답변 시간: 24시간 (순차처리)</p>
      <button type="submit" class="btn btn-primary btn-block btn-round">접수하기</button>
    </form>
    <div class="customer-service-actions"><a class="btn btn-outline btn-block" href="/my-inquiries">내 문의함 바로가기</a></div>
    </section></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/customerService.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/customerService.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },

  'my-inquiries': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container customer-service-page mypage-linked-container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="고객센터 메뉴로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">내 문의함</span></div></header>
    <div class="mypage-linked-content"><section class="customer-service-card"><div id="my-inquiries-list" class="my-inquiries-board"></div><p id="my-inquiries-empty" class="my-inquiries-empty">아직 접수된 문의가 없습니다.</p></section></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myInquiries.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myInquiries.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },

  'my-inquiry-detail': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><header class="community-section-header"><div class="community-header-left"><a href="/my-inquiries" class="community-back-link" aria-label="내 문의함으로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">문의 상세</span></div></header><div class="container customer-service-page mypage-linked-container">
    <div class="mypage-linked-content"><section id="my-inquiry-detail" class="customer-service-card my-inquiry-detail-card"></section></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/myInquiryDetail.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/myInquiryDetail.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },

  'support-board': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container community-container mypage-linked-container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">공지사항</span></div></header>
    <div class="mypage-linked-content"><div class="loading" id="support-public-loading"><div class="spinner"></div><p>불러오는 중...</p></div>
    <div class="error-banner hidden" id="support-public-error"><p id="support-public-error-message"></p></div>
    <div id="support-public-list" class="hidden"></div></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/pages/supportBoard.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/pages/supportBoard.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
  'post-detail': postDetailPageConfig,
  'register': {
    template: `<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-guest" id="nav-guest">
                    <a href="login.html" class="btn btn-outline btn-sm">로그인</a>
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
        <div class="container auth-container">
            <div class="community-section-header">
                <h1>회원가입</h1>
                <p>미드나잇 맨즈에 가입하여 다양한 사람들과 소통하세요</p>
            </div>

            <div class="card">
                <form id="register-form">
                    <div id="register-step-terms" class="legacy-terms-panel">
                        <div class="legacy-terms-section">
                            <p class="legacy-terms-title">[필수] 이용약관</p>
                            <div class="legacy-terms-scroll">
                                <h3>제1장 총칙</h3>
                                <p>본 약관은 미드나잇 맨즈가 제공하는 서비스 이용과 관련한 회사와 회원의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                                <p>회원가입 시 본 약관에 동의한 것으로 간주되며, 관련 법령 및 서비스 운영 정책에 따라 약관이 변경될 수 있습니다.</p>
                                <p>회사는 서비스 운영상 필요한 경우 공지사항을 통해 변경 내용을 안내하며, 회원은 변경된 약관에 동의하지 않을 경우 이용을 중단할 수 있습니다.</p>
                                <p>회원은 정확한 정보를 입력해야 하며, 타인의 정보를 도용하거나 허위 정보를 입력한 경우 서비스 이용이 제한될 수 있습니다.</p>
                                <p>회사는 안정적인 서비스 제공을 위해 최선을 다하며, 시스템 점검이나 불가항력적 사유에 따라 일시적으로 서비스가 중단될 수 있습니다.</p>
                            </div>
                            <label class="legacy-consent-item" for="termsConsent">
                                <input type="checkbox" id="termsConsent" name="termsConsent" required>
                                <span>[필수] 이용약관에 동의합니다.</span>
                            </label>
                        </div>

                        <div class="legacy-terms-section">
                            <p class="legacy-terms-title">[필수] 개인정보처리방침</p>
                            <div class="legacy-terms-scroll">
                                <p>회사는 회원의 개인정보를 중요하게 생각하며 관련 법령을 준수합니다.</p>
                                <p>수집된 개인정보는 회원관리, 서비스 제공, 본인확인, 고객 문의 대응 등의 목적에 한해 이용됩니다.</p>
                                <p>회원의 개인정보는 목적 달성 후 지체 없이 파기하며, 법령에 따라 보관이 필요한 경우 해당 기간 동안 안전하게 보관합니다.</p>
                                <p>개인정보 처리 방침이 변경되는 경우 서비스 내 공지사항을 통해 사전 안내합니다.</p>
                                <p>자세한 내용은 <a href="/board/terms" target="_blank" rel="noopener noreferrer">이용약관/정책 페이지</a>에서 확인할 수 있습니다.</p>
                            </div>
                            <label class="legacy-consent-item" for="privacyConsent">
                                <input type="checkbox" id="privacyConsent" name="privacyConsent">
                                <span>[필수] 개인정보처리방침에 동의합니다.</span>
                            </label>
                        </div>

                        <div class="legacy-terms-section">
                            <p class="legacy-terms-title">[선택] 마케팅 정보 수신 동의</p>
                            <div class="legacy-terms-scroll">
                                <p>이벤트, 혜택, 신규 서비스 안내 등 마케팅 정보를 문자(SMS)로 받아보실 수 있습니다.</p>
                                <p>본 동의는 선택사항이며, 동의하지 않아도 회원가입 및 서비스 이용이 가능합니다.</p>
                                <p>수신 동의 후에도 마이페이지 또는 수신 거부 안내를 통해 언제든지 변경할 수 있습니다.</p>
                            </div>
                            <label class="legacy-consent-item" for="marketingConsent">
                                <input type="checkbox" id="marketingConsent" name="marketingConsent">
                                <span>[선택] 마케팅 정보 수신에 동의합니다.</span>
                            </label>
                        </div>

                        <div class="legacy-terms-section">
                            <div class="error-message hidden" id="termsConsent-error">약관 및 정책 동의가 필요합니다.</div>
                            <button type="button" class="btn btn-secondary w-full" id="select-all-consent-btn">모두 동의</button>
                            <button type="button" class="btn btn-outline w-full" id="agree-terms-btn">본인(성인)인증하고 회원가입</button>
                        </div>
                    </div>

                    <div id="register-step-detail" class="hidden">
                        <div class="form-group">
                            <label for="loginId" class="form-label">아이디</label>
                            <input type="text" id="loginId" name="loginId" class="form-control" placeholder="아이디를 입력하세요" required>
                            <div class="error-message hidden" id="loginId-error"></div>
                            <small class="text-muted">4자 이상 영문/숫자 조합으로 입력해주세요</small>
                        </div>

                        <div class="form-group">
                            <label for="password" class="form-label">비밀번호</label>
                            <input type="password" id="password" name="password" class="form-control" placeholder="비밀번호를 입력하세요" required>
                            <div class="error-message hidden" id="password-error"></div>
                            <small class="text-muted">8자 이상, 영문/숫자를 포함하고 특수문자를 사용할 수 있습니다</small>
                        </div>

                        <div class="form-group">
                            <label for="confirmPassword" class="form-label">비밀번호 확인</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" class="form-control" placeholder="비밀번호를 다시 입력하세요" required>
                            <div class="error-message hidden" id="confirmPassword-error"></div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">이름</label>
                            <p class="form-control-static" id="name-display">본인인증 후 자동 입력됩니다.</p>
                            <input type="hidden" id="name" name="name" value="">
                        </div>

                        <div class="form-group">
                            <label for="nickname" class="form-label">닉네임</label>
                            <div class="grid grid-2">
                                <input type="text" id="nickname" name="nickname" class="form-control" placeholder="사용할 닉네임을 입력하세요" minlength="2" maxlength="8" required>
                                <button type="button" class="btn btn-outline" id="check-nickname-btn">중복 확인</button>
                            </div>
                            <small class="text-muted" id="nickname-status">닉네임 중복 확인이 필요합니다.</small>
                            <div class="error-message hidden" id="nickname-error"></div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">생년월일</label>
                            <p class="form-control-static" id="birthDate-display">본인인증 후 자동 입력됩니다.</p>
                            <input type="hidden" id="birthDate" name="birthDate" value="">
                        </div>

                        <div class="form-group">
                            <label class="form-label">연락처</label>
                            <p class="form-control-static" id="phone-display">본인인증 후 자동 입력됩니다.</p>
                            <input type="hidden" id="phone" name="phone" value="">
                            <div class="error-message hidden" id="phone-error"></div>
                        </div>

                        <div class="form-group">
                            <label class="register-consent-item" for="smsConsent">
                                <input type="checkbox" id="smsConsent" name="smsConsent" checked>
                                <span>SMS 수신 동의</span>
                            </label>
                        </div>

                        <input type="hidden" id="genderDigit" name="genderDigit" value="">
                        <input type="hidden" id="identityCi" name="identityCi" value="">
                        <input type="hidden" id="identityDi" name="identityDi" value="">
                        <input type="hidden" id="identityVerificationId" name="identityVerificationId" value="">
                        <input type="hidden" id="phoneVerified" name="phoneVerified" value="false">
                        <input type="hidden" id="identityVerified" name="identityVerified" value="false">
                        <input type="hidden" id="nicknameChecked" name="nicknameChecked" value="false">
                        <input type="hidden" id="nicknameAvailable" name="nicknameAvailable" value="false">

                        <button type="submit" class="btn btn-outline w-full" id="submit-btn">회원가입 완료</button>
                    </div>
                </form>

                <div class="text-center mt-3">
                    <p>이미 계정이 있으신가요? <a href="login.html">로그인</a></p>
                </div>
            </div>
        </div>

        <footer class="company-footer-slot" aria-label="마이페이지 하단 정보">
            <div class="company-footer-top">
                <strong class="company-footer-logo">MIDNIGHT MENS</strong>
            </div>
            <div class="company-footer-links-row">
                <a href="/board/terms">이용약관</a>
                <span class="footer-divider" aria-hidden="true"></span>
                <a href="/board/terms">개인정보처리방침</a>
            </div>
            <p class="company-footer-notice">미드나잇 맨즈는 커뮤니티 서비스 제공 플랫폼입니다.</p>
            <p class="company-footer-notice">상호명 : MN컴퍼니 | 사업자번호 : 355-18-02505 | 대표자명 : 이상훈 | 대표번호 : 010-6567-4519</p>
            <p class="company-footer-copyright">© MIDNIGHT MENS. ALL RIGHTS RESERVED.</p>
        </footer>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/validation.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/pages/register.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/libs/koProfanityFilter.js", "scripts/js/utils/helpers.js", "scripts/js/utils/validation.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/api/authAPI.js", "scripts/js/components/header.js", "scripts/js/pages/register.js", "scripts/js/components/footerNav.js"]
  },
  'terms-policy': {
    template: `<header class="header"><div class="header-container"><a href="index.html" class="logo"><h1>미드나잇 맨즈</h1></a><nav class="nav" id="navigation"><div class="nav-user"><span class="user-nickname" id="user-nickname"></span><a href="admin.html" class="btn btn-secondary btn-sm hidden" id="admin-link">관리자</a><button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button></div></nav></div></header>
    <main class="main-content"><div class="container customer-service-page mypage-linked-container"><header class="community-section-header"><div class="community-header-left"><a href="/my-page" class="community-back-link" aria-label="마이페이지로 이동"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg></a><span class="community-board-name">약관 및 정책</span></div></header>
    <div class="mypage-linked-content"><section class="customer-service-card terms-policy-card"><h2>서비스 이용약관</h2><p>본 약관은 MN컴퍼니(이하 “회사”)가 운영하는 미드나잇 맨즈 커뮤니티 서비스(이하 “서비스”)의 이용과 관련하여 회사와 회원의 권리·의무 및 책임사항을 규정합니다.</p><ul><li>회원은 정확한 정보로 가입해야 하며, 계정 공유·도용·명의 도용은 금지됩니다.</li><li>회원은 관련 법령, 본 약관, 커뮤니티 운영정책을 준수해야 합니다.</li><li>회사는 서비스 운영상 필요한 경우 기능 추가·변경·중단을 사전 공지 후 진행할 수 있습니다. 단, 긴급 장애 대응 등 불가피한 경우 사후 공지할 수 있습니다.</li></ul><p>회사는 회원이 등록한 게시물 중 관계 법령 위반, 권리 침해, 서비스 운영 방해, 스팸·광고·사기성 게시물 등에 해당하는 내용을 사전 통지 없이 제한·삭제할 수 있습니다.</p><h2>회원의 권리와 의무</h2><ul><li>회원은 언제든지 회원 탈퇴를 요청할 수 있으며, 회사는 관련 법령에 따라 처리합니다.</li><li>회원은 본인 계정 보안(아이디/비밀번호 관리)에 대한 책임이 있으며, 부정 사용 발견 시 즉시 회사에 알려야 합니다.</li><li>회원은 서비스를 통해 얻은 정보를 회사의 사전 승인 없이 상업적으로 이용하거나 제3자에게 제공할 수 없습니다.</li></ul><h2>개인정보처리방침</h2><p>MN컴퍼니(이하 “회사”)는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 권익을 보장하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.</p><p>회사는 서비스 제공에 필요한 범위에서만 개인정보를 수집·이용하며, 목적이 변경되는 경우 관련 법령에 따라 별도 동의를 받는 등 필요한 조치를 이행합니다.</p><ul><li>처리 목적: 회원 가입의사 확인, 본인 식별·인증, 계정 관리, 고객 문의 처리, 부정 이용 방지, 공지 전달</li><li>처리 항목: 아이디, 비밀번호, 휴대폰 번호, 닉네임(서비스 이용 과정에서 IP주소, 쿠키, 접속일시, 이용기록, 기기정보가 자동 수집될 수 있음)</li><li>보유 기간: 회원 탈퇴 시까지. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 별도 보관</li></ul><p>회사는 정보주체의 동의가 있거나 법령에 근거한 경우를 제외하고 개인정보를 제3자에게 제공하지 않으며, 위탁이 필요한 경우 수탁자·위탁업무를 사전에 고지하고 관리·감독합니다.</p><p>정보주체는 언제든지 개인정보 열람, 정정, 삭제, 처리정지 요구를 할 수 있으며 회사는 관련 법령에 따라 지체 없이 조치합니다. 다만, 법령상 보관의무가 있는 정보는 삭제가 제한될 수 있습니다.</p><ul><li>안전성 확보조치: 접근권한 관리, 비밀번호 등 주요 정보 암호화, 접속기록 보관 및 위변조 방지, 보안 프로그램 운영, 내부관리계획 수립·시행</li><li>쿠키 운영: 맞춤형 서비스 제공을 위해 쿠키를 사용할 수 있으며, 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.</li><li>권익침해 구제: 개인정보침해신고센터(국번없이 118), 개인정보분쟁조정위원회(1833-6972) 등을 통해 상담 및 구제를 받을 수 있습니다.</li></ul><p>개인정보 보호책임자 및 문의 창구는 고객센터를 통해 안내하며, 관련 문의에 대해 지체 없이 답변·처리합니다.</p><h2>커뮤니티 운영정책</h2><p>회사는 안전하고 건전한 커뮤니티 환경을 위해 아래 정책을 적용합니다.</p><ul><li>금지 콘텐츠: 불법 정보, 혐오·차별·비방, 음란물, 사칭, 사기·유도, 저작권·초상권 침해 게시물</li><li>제재 절차: 안내/경고 → 게시물 제한 또는 임시 이용제한 → 영구 이용제한</li><li>신고 처리: 접수된 신고는 내부 기준에 따라 검토 후 조치하며, 필요 시 추가 소명 자료를 요청할 수 있습니다.</li></ul><h2>면책 및 분쟁해결</h2><p>회사는 천재지변, 시스템 장애, 외부 서비스 연동 문제 등 불가항력으로 인한 서비스 중단에 대해 책임이 제한될 수 있습니다. 다만, 회사의 고의 또는 중대한 과실이 있는 경우는 예외로 합니다.</p><p>회사와 회원 간 분쟁은 상호 협의를 우선하며, 협의가 어려운 경우 대한민국 법령을 따르고 관할 법원은 관련 법령에 따릅니다.</p><p class="terms-policy-updated">시행일: 2026-04-03</p></section></div></div></main>
    <script src="scripts/js/utils/constants.js"></script><script src="scripts/js/utils/helpers.js"></script><script src="scripts/js/utils/auth.js"></script><script src="scripts/js/api/apiClient.js"></script><script src="scripts/js/components/sectionHeader.js"></script><script src="scripts/js/components/footerNav.js"></script>`,
    styles: ["styles/common.css", "styles/layout.css", "styles/components.css", "styles/section-header.css", "styles/pages.css"],
    scripts: ["scripts/js/utils/constants.js", "scripts/js/utils/helpers.js", "scripts/js/utils/auth.js", "scripts/js/api/apiClient.js", "scripts/js/components/sectionHeader.js", "scripts/js/components/footerNav.js"]
  },
};

export { pageRegistry };

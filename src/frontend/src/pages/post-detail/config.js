/**
 * 파일 역할: 게시글 상세 페이지의 렌더링 설정을 정의하는 파일.
 */
import { createPageConfig } from '../shared/createPageConfig.js';
import { shareSheetTemplate } from './templates/shareSheet.js';

const postDetailTemplate = `
<header class="header">
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
        <div class="container post-detail-page">
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>게시글을 불러오는 중...</p>
            </div>

            <div class="error-banner hidden" id="error-banner">
                <p id="error-message"></p>
                <button class="btn btn-sm btn-primary" id="retry-btn">다시 시도</button>
            </div>

            <div class="bbs-view max-contents post-detail hidden" id="post-detail">
                <header class="post-detail-header">
                    <div class="post-header-left">
                        <button type="button" class="icon-btn icon-btn-square" id="back-btn" aria-label="뒤로가기">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m15 18-6-6 6-6"></path>
                            </svg>
                        </button>
                        <span class="post-board-name" id="post-board-name">게시판</span>
                    </div>
                    <div class="post-header-right">
                        <button type="button" class="icon-btn icon-btn-square" id="share-btn" aria-label="공유하기">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                <polyline points="16 6 12 2 8 6"></polyline>
                                <line x1="12" x2="12" y1="2" y2="15"></line>
                            </svg>
                        </button>
                        <div class="post-more-wrapper">
                            <button type="button" class="icon-btn" id="post-more-btn" aria-label="더보기"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.4"></circle><circle cx="12" cy="12" r="1.4"></circle><circle cx="12" cy="19" r="1.4"></circle></svg></button>
                            <div class="post-more-menu hidden" id="post-more-menu">
                                <button type="button" class="menu-item" id="report-btn">신고하기</button>
                                <button type="button" class="menu-item hidden" id="edit-btn">수정</button>
                                <button type="button" class="menu-item danger hidden" id="delete-btn">삭제</button>
                            </div>
                        </div>
                    </div>
                </header>

                <div class="top">
                    <div class="tit">
                        <h1 id="post-title"></h1>
                    </div>

                    <div class="grid">
                        <div class="picture">
                            <span class="author-avatar" aria-hidden="true"></span>
                        </div>
                        <div class="user">
                            <span class="lv hidden" id="post-author-level" data-text=""></span>
                            <span id="post-author" class="s-fs-body"></span>
                        </div>
                        <div class="caption">
                            <span id="post-date"></span>
                            <span id="view-count">조회수 0</span>
                        </div>
                    </div>
                </div>

                <div class="body">
                    <div class="content" id="post-content"></div>
                    <div id="post-images" class="media hidden">
                        <div id="images-grid"></div>
                    </div>
                </div>

                <div class="post-actions">
                    <button class="like-btn" id="like-btn">
                        <span id="like-icon">🤍</span>
                        <span id="like-count">0</span>
                    </button>
                </div>
            </div>

            <div id="comments-section" class="reply hidden">
                <div class="tit">
                    <span class="mr-2">댓글</span>
                    <strong id="comment-count">0</strong>
                </div>

                <div class="comments-list" id="comments-list"></div>

                <div class="new" id="comment-form">
                    <form id="comment-create-form">
                        <div class="form-group">
                            <textarea id="comment-content" name="content" class="form-control" placeholder="댓글을 입력하세요" rows="3" required></textarea>
                            <label style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-size:14px;color:#555;">
                                <input type="checkbox" id="comment-secret" name="isSecret">
                                비밀댓글
                            </label>
                            <div class="error-message hidden" id="content-error"></div>
                                                    </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary btn-sm" id="comment-submit-btn">등록</button>
                        </div>
                    </form>
                </div>

                <div class="comment-pagination hidden" id="comment-pagination">
                    <button class="btn btn-outline btn-sm" id="load-more-comments">더 보기</button>
                </div>
            </div>

            <div class="adjacent-post-navigation hidden" id="post-adjacent-navigation">
                <a class="adjacent-post-link" id="previous-post-link" href="#">
                    <span class="adjacent-post-label"><span class="adjacent-post-direction" aria-hidden="true">˄</span>이전글</span>
                    <span class="adjacent-post-title">게시글이 없습니다.</span>
                </a>
                <a class="adjacent-post-link" id="next-post-link" href="#">
                    <span class="adjacent-post-label"><span class="adjacent-post-direction" aria-hidden="true">˅</span>다음글</span>
                    <span class="adjacent-post-title">게시글이 없습니다.</span>
                </a>
            </div>

            ${shareSheetTemplate}

        </div>
    </main>

    <script src="scripts/js/utils/constants.js"></script>
    <script src="scripts/js/libs/koProfanityFilter.js"></script>
    <script src="scripts/js/utils/helpers.js"></script>
    <script src="scripts/js/utils/auth.js"></script>
    <script src="scripts/js/api/apiClient.js"></script>
    <script src="scripts/js/api/authAPI.js"></script>
    <script src="scripts/js/api/postAPI.js"></script>
    <script src="scripts/js/api/commentAPI.js"></script>
    <script src="scripts/js/pages/postDetail.js"></script>
    <script src="scripts/js/components/footerNav.js"></script>
`;

export const postDetailPageConfig = createPageConfig({
  template: postDetailTemplate,
  styles: ['styles/common.css', 'styles/layout.css', 'styles/components.css', 'styles/postDetail.css'],
  scripts: ['scripts/js/utils/constants.js', 'scripts/js/libs/koProfanityFilter.js', 'scripts/js/utils/helpers.js', 'scripts/js/utils/auth.js', 'scripts/js/api/apiClient.js', 'scripts/js/api/authAPI.js', 'scripts/js/api/postAPI.js', 'scripts/js/api/commentAPI.js', 'scripts/js/pages/postDetail.js', 'scripts/js/components/footerNav.js']
});

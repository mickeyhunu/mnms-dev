/**
 * 파일 역할: 관리자 페이지 메인 템플릿을 섹션/모달 조합으로 구성하는 파일.
 */
import { userEditPanelTemplate } from './sections.js';
import { adminModalTemplates } from './modals.js';

export const adminTemplate = `
<header class="header">
        <div class="header-container">
            <a href="index.html" class="logo">
                <h1>미드나잇 맨즈</h1>
            </a>
            <nav class="nav" id="navigation">
                <div class="nav-user">
                    <span class="user-nickname" id="user-nickname">관리자</span>
                    <button class="btn btn-outline btn-sm" id="logout-btn">로그아웃</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <header class="community-section-header">
                <div class="community-header-left">
                    <a href="/" class="community-back-link" aria-label="홈으로 이동">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
                    </a>
                    <span class="community-board-name">관리자 페이지</span>
                </div>
            </header>


            <div class="admin-tabs">
                <button class="admin-tab active" data-tab="stats">통계 대시보드</button>
                <button class="admin-tab" data-tab="users">회원 관리</button>
                <button class="admin-tab" data-tab="posts">게시글 관리</button>
                <button class="admin-tab" data-tab="comments">댓글 관리</button>
                <button class="admin-tab" data-tab="banner-ads">배너광고관리</button>
                <button class="admin-tab" data-tab="business-ads">업체광고관리</button>
                <button class="admin-tab" data-tab="entries">엔트리 관리</button>
                <button class="admin-tab" data-tab="support">공지/FAQ 관리</button>
                <button class="admin-tab" data-tab="inquiries">1:1 문의 관리</button>
            </div>

            <div class="tab-content">
                <div id="stats-section" class="tab-pane active">
                    <div class="loading" id="stats-loading"><div class="spinner"></div><p>통계를 불러오는 중...</p></div>
                    <div class="error-banner hidden" id="stats-error"><p id="stats-error-message"></p><button class="btn btn-sm btn-primary" id="stats-retry-btn">다시 시도</button></div>
                    <div class="admin-table-container hidden admin-stats-content" id="stats-content">
                        <section class="admin-stats-summary" id="stats-summary-cards"></section>
                        <section class="admin-stats-grid">
                            <article class="admin-stats-panel">
                                <div class="admin-stats-panel__header">
                                    <div>
                                        <p class="admin-user-detail-eyebrow" id="stats-period-caption">최근 14일 추이</p>
                                        <h3 id="stats-period-title">방문/게시글/댓글/접속량</h3>
                                    </div>
                                    <select id="stats-period-select" class="form-control admin-list-toolbar__filter" aria-label="통계 기간 선택">
                                        <option value="daily">일별</option>
                                        <option value="weekly">주별</option>
                                        <option value="monthly">월별</option>
                                        <option value="yearly">연도별</option>
                                    </select>
                                </div>
                                <div class="admin-stats-chart" id="stats-chart"></div>
                            </article>
                            <article class="admin-stats-panel">
                                <div class="admin-stats-panel__header">
                                    <div>
                                        <p class="admin-user-detail-eyebrow">게시판 현황</p>
                                        <h3>게시판별 게시글 수</h3>
                                    </div>
                                </div>
                                <div class="admin-stats-board-list" id="stats-board-list"></div>
                            </article>
                        </section>
                        <section class="admin-stats-panel">
                            <div class="admin-stats-panel__header">
                                <div>
                                    <p class="admin-user-detail-eyebrow" id="stats-table-caption">일별 상세</p>
                                    <h3 id="stats-table-title">최근 14일 통계 테이블</h3>
                                </div>
                            </div>
                            <div class="admin-table-container">
                                <table class="admin-table">
                                    <thead><tr><th>날짜</th><th>지표 값</th></tr></thead>
                                    <tbody id="stats-daily-tbody"></tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>

                <div id="posts-section" class="tab-pane hidden">
                    <div class="loading" id="posts-loading"><div class="spinner"></div><p>게시글을 불러오는 중...</p></div>
                    <div class="error-banner hidden" id="posts-error"><p id="posts-error-message"></p><button class="btn btn-sm btn-primary" id="posts-retry-btn">다시 시도</button></div>
                    <div class="admin-list-toolbar">
                        <p class="admin-list-toolbar__meta">총 <strong id="posts-total">0</strong>건</p>
                        <div class="admin-list-toolbar__search-group">
                            <select id="posts-search-type" class="form-control admin-list-toolbar__filter" aria-label="게시글 관리 검색 구분">
                                <option value="post">게시글검색</option>
                                <option value="author">작성자검색</option>
                            </select>
                            <input type="search" id="posts-search-input" class="form-control admin-list-toolbar__search" placeholder="게시글 검색" aria-label="게시글 관리 검색어">
                        </div>
                    </div>
                    <div class="admin-table-container hidden" id="posts-content">
                        <table class="admin-table"><thead><tr><th>ID</th><th>제목</th><th>작성자</th><th>작성일</th><th>좋아요</th><th>댓글</th><th>관리</th></tr></thead><tbody id="posts-tbody"></tbody></table>
                    </div>
                    <div class="admin-pagination hidden" id="posts-pagination"></div>
                </div>

                <div id="comments-section" class="tab-pane hidden">
                    <div class="loading" id="comments-loading"><div class="spinner"></div><p>댓글을 불러오는 중...</p></div>
                    <div class="error-banner hidden" id="comments-error"><p id="comments-error-message"></p><button class="btn btn-sm btn-primary" id="comments-retry-btn">다시 시도</button></div>
                    <div class="admin-list-toolbar">
                        <p class="admin-list-toolbar__meta">총 <strong id="comments-total">0</strong>건</p>
                        <div class="admin-list-toolbar__search-group">
                            <select id="comments-search-type" class="form-control admin-list-toolbar__filter" aria-label="댓글 관리 검색 구분">
                                <option value="post">게시글검색</option>
                                <option value="author">작성자검색</option>
                            </select>
                            <input type="search" id="comments-search-input" class="form-control admin-list-toolbar__search" placeholder="게시글 검색" aria-label="댓글 관리 검색어">
                        </div>
                    </div>
                    <div class="admin-table-container hidden" id="comments-content">
                        <table class="admin-table"><thead><tr><th>ID</th><th>내용</th><th>게시글</th><th>작성자</th><th>작성일</th><th>관리</th></tr></thead><tbody id="comments-tbody"></tbody></table>
                    </div>
                    <div class="admin-pagination hidden" id="comments-pagination"></div>
                </div>

                <div id="users-section" class="tab-pane hidden">
                    ${userEditPanelTemplate}
                    <div class="loading" id="users-loading"><div class="spinner"></div><p>회원 정보를 불러오는 중...</p></div>
                    <div class="error-banner hidden" id="users-error"><p id="users-error-message"></p><button class="btn btn-sm btn-primary" id="users-retry-btn">다시 시도</button></div>
                    <div class="admin-list-toolbar">
                        <p class="admin-list-toolbar__meta">총 <strong id="users-total">0</strong>건</p>
                        <input type="search" id="users-search-input" class="form-control admin-list-toolbar__search" placeholder="회원 검색" aria-label="회원 검색">
                    </div>
                    <div class="admin-table-container hidden" id="users-content">
                        <table class="admin-table"><thead><tr><th>ID</th><th>이메일</th><th>닉네임</th><th>계정상태</th><th>포인트</th><th>가입일</th><th>권한</th><th>회원구분</th><th>관리</th></tr></thead><tbody id="users-tbody"></tbody></table>
                    </div>
                    <div class="admin-pagination hidden" id="users-pagination"></div>
                </div>

                <div id="entries-section" class="tab-pane hidden">
                    <div class="admin-entry-toolbar">
                        <div class="admin-entry-toolbar__group">
                            <label class="admin-entry-toolbar__label" for="entry-store-select">매장 선택</label>
                            <select id="entry-store-select" class="form-control"></select>
                        </div>
                        <button class="btn btn-outline btn-sm" id="entries-retry-btn" type="button">새로고침</button>
                    </div>
                    <section class="admin-entry-editor">
                        <div>
                            <p class="admin-user-detail-eyebrow">엔트리 항목 관리</p>
                            <h3 id="entry-editor-title">새 엔트리 추가</h3>
                            <p class="admin-user-detail-description">선택한 매장의 엔트리 이름을 추가하거나 수정할 수 있습니다.</p>
                        </div>
                        <div class="admin-entry-editor__form">
                            <input type="text" id="entry-name-input" class="form-control" maxlength="100" placeholder="엔트리 이름을 입력하세요">
                            <div class="admin-entry-editor__actions">
                                <button class="btn btn-secondary hidden" id="entry-cancel-btn" type="button">취소</button>
                                <button class="btn btn-primary" id="entry-save-btn" type="button">추가</button>
                            </div>
                        </div>
                        <p id="entry-form-help" class="help-text admin-user-save-result" role="status"></p>
                    </section>
                    <div class="loading" id="entries-loading"><div class="spinner"></div><p>엔트리 목록을 불러오는 중...</p></div>
                    <div class="error-banner hidden" id="entries-error"><p id="entries-error-message"></p><button class="btn btn-sm btn-primary" id="entries-retry-btn-secondary">다시 시도</button></div>
                    <div class="admin-list-toolbar">
                        <p class="admin-list-toolbar__meta">총 <strong id="entries-total">0</strong>건</p>
                        <input type="search" id="entries-search-input" class="form-control admin-list-toolbar__search" placeholder="엔트리 검색" aria-label="엔트리 검색">
                    </div>
                    <div class="admin-table-container hidden" id="entries-content">
                        <table class="admin-table"><thead><tr><th>이름</th><th>언급수</th><th>가산점</th><th>등록일</th><th>관리</th></tr></thead><tbody id="entries-tbody"></tbody></table>
                    </div>
                    <div class="admin-pagination hidden" id="entries-pagination"></div>
                </div>

                <div id="banner-ads-section" class="tab-pane hidden">
                    <section class="admin-entry-editor">
                        <div>
                            <p class="admin-user-detail-eyebrow">광고 등록/수정</p>
                            <h3 id="ads-editor-title">새 광고 등록</h3>
                            <p class="admin-user-detail-description">이미지를 첨부하면 S3에 저장되며, LIVE 광고는 매장 선택이 필요합니다.</p>
                        </div>
                        <div class="admin-user-form-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px;">
                            <div class="form-group">
                                <label class="form-label" for="ads-form-title">광고 제목</label>
                                <input type="text" id="ads-form-title" class="form-control" maxlength="255" placeholder="광고 제목을 입력하세요">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="ads-form-link-url">광고 링크 URL</label>
                                <input type="url" id="ads-form-link-url" class="form-control" placeholder="https://">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="ads-form-ad-type">광고 유형(스크롤 선택)</label>
                                <select id="ads-form-ad-type" class="form-control" size="3">
                                    <option value="LIVE">LIVE 광고</option>
                                    <option value="TOP">상단 광고</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="ads-form-store-no">매장 선택(storeNo, 스크롤 선택)</label>
                                <select id="ads-form-store-no" class="form-control" size="6"></select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="ads-form-image-file">광고 배너 이미지 첨부</label>
                                <input type="file" id="ads-form-image-file" class="form-control" accept="image/*">
                                <p class="help-text text-muted" id="ads-form-image-help">이미지를 선택하고 업로드 버튼을 누르세요.</p>
                                <button class="btn btn-outline btn-sm" id="ads-image-upload-btn" type="button">이미지 업로드</button>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="ads-form-image-url">업로드된 이미지 URL</label>
                                <input type="text" id="ads-form-image-url" class="form-control" readonly>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="ads-form-display-order">노출 순서</label>
                                <input type="number" id="ads-form-display-order" class="form-control" value="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="ads-form-is-active">노출 여부</label>
                                <select id="ads-form-is-active" class="form-control">
                                    <option value="true">노출</option>
                                    <option value="false">숨김</option>
                                </select>
                            </div>
                        </div>
                        <div class="admin-entry-editor__actions" style="margin-top:12px;">
                            <button class="btn btn-secondary hidden" id="ads-cancel-btn" type="button">수정 취소</button>
                            <button class="btn btn-primary" id="ads-save-btn" type="button">광고 등록</button>
                        </div>
                        <p id="ads-form-help" class="help-text admin-user-save-result" role="status"></p>
                    </section>
                    <div class="loading" id="ads-loading"><div class="spinner"></div><p>광고를 불러오는 중...</p></div>
                    <div class="error-banner hidden" id="ads-error"><p id="ads-error-message"></p><button class="btn btn-sm btn-primary" id="ads-retry-btn">다시 시도</button></div>
                    <div class="admin-list-toolbar">
                        <p class="admin-list-toolbar__meta">총 <strong id="ads-total">0</strong>건</p>
                        <input type="search" id="ads-search-input" class="form-control admin-list-toolbar__search" placeholder="광고 검색" aria-label="광고 검색">
                    </div>
                    <div class="admin-table-container hidden" id="ads-content">
                        <table class="admin-table"><thead><tr><th>ID</th><th>유형</th><th>매장번호</th><th>제목</th><th>링크</th><th>순서</th><th>노출</th><th>생성일</th><th>수정일</th><th>관리</th></tr></thead><tbody id="ads-tbody"></tbody></table>
                    </div>
                    <div class="admin-pagination hidden" id="ads-pagination"></div>
                </div>

                <div id="business-ads-section" class="tab-pane hidden">
                    <section class="admin-entry-editor">
                        <div>
                            <p class="admin-user-detail-eyebrow">업체 광고 등록/수정</p>
                            <h3 id="business-ads-editor-title">새 업체 광고 등록</h3>
                            <p class="admin-user-detail-description">업체 광고는 배너광고 DB와 분리되어 저장됩니다.</p>
                        </div>
                        <div class="admin-user-form-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px;">
                            <div class="form-group">
                                <label class="form-label" for="business-ads-form-title">광고 제목</label>
                                <input type="text" id="business-ads-form-title" class="form-control" maxlength="255" placeholder="광고 제목을 입력하세요">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="business-ads-form-link-url">광고 링크 URL</label>
                                <input type="url" id="business-ads-form-link-url" class="form-control" placeholder="https://">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="business-ads-form-image-file">광고 이미지 첨부</label>
                                <input type="file" id="business-ads-form-image-file" class="form-control" accept="image/*">
                                <p class="help-text text-muted" id="business-ads-form-image-help">이미지를 선택하고 업로드 버튼을 누르세요.</p>
                                <button class="btn btn-outline btn-sm" id="business-ads-image-upload-btn" type="button">이미지 업로드</button>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="business-ads-form-image-url">업로드된 이미지 URL</label>
                                <input type="text" id="business-ads-form-image-url" class="form-control" readonly>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="business-ads-form-display-order">노출 순서</label>
                                <input type="number" id="business-ads-form-display-order" class="form-control" value="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="business-ads-form-is-active">노출 여부</label>
                                <select id="business-ads-form-is-active" class="form-control">
                                    <option value="true">노출</option>
                                    <option value="false">숨김</option>
                                </select>
                            </div>
                        </div>
                        <div class="admin-entry-editor__actions" style="margin-top:12px;">
                            <button class="btn btn-secondary hidden" id="business-ads-cancel-btn" type="button">수정 취소</button>
                            <button class="btn btn-primary" id="business-ads-save-btn" type="button">광고 등록</button>
                        </div>
                        <p id="business-ads-form-help" class="help-text admin-user-save-result" role="status"></p>
                    </section>

                    <div class="admin-list-toolbar">
                        <p class="admin-list-toolbar__meta">총 <strong id="business-ads-total">0</strong>건</p>
                    </div>
                    <div class="admin-table-container">
                        <table class="admin-table">
                            <thead><tr><th>ID</th><th>제목</th><th>링크</th><th>순서</th><th>노출</th><th>생성일</th><th>수정일</th><th>관리</th></tr></thead>
                            <tbody id="business-ads-tbody"></tbody>
                        </table>
                    </div>
                </div>

                <div id="support-section" class="tab-pane hidden">
                    <div class="admin-support-toolbar admin-support-toolbar-split"><div class="admin-support-toolbar-start"><select id="support-category" class="form-control"><option value="NOTICE">공지사항</option><option value="FAQ">FAQ</option></select></div><div class="admin-support-toolbar-end"><button class="btn btn-primary btn-sm" id="support-new-btn">새 글 작성</button></div></div>
                    <div class="loading" id="support-loading"><div class="spinner"></div><p>글을 불러오는 중...</p></div>
                    <div class="error-banner hidden" id="support-error"><p id="support-error-message"></p><button class="btn btn-sm btn-primary" id="support-retry-btn">다시 시도</button></div>
                    <div class="admin-list-toolbar">
                        <p class="admin-list-toolbar__meta">총 <strong id="support-total">0</strong>건</p>
                        <input type="search" id="support-search-input" class="form-control admin-list-toolbar__search" placeholder="공지/FAQ 검색" aria-label="공지/FAQ 검색">
                    </div>
                    <div class="admin-table-container hidden" id="support-content">
                        <table class="admin-table"><thead><tr><th>ID</th><th>구분</th><th>제목</th><th>작성일</th><th>관리</th></tr></thead><tbody id="support-tbody"></tbody></table>
                    </div>
                    <div class="admin-pagination hidden" id="support-pagination"></div>
                </div>

                <div id="inquiries-section" class="tab-pane hidden">
                    <div class="admin-support-toolbar"><select id="inquiries-status" class="form-control"><option value="">전체</option><option value="PENDING">대기</option><option value="ANSWERED">답변완료</option></select></div>
                    <div class="loading" id="inquiries-loading"><div class="spinner"></div><p>문의를 불러오는 중...</p></div>
                    <div class="error-banner hidden" id="inquiries-error"><p id="inquiries-error-message"></p><button class="btn btn-sm btn-primary" id="inquiries-retry-btn">다시 시도</button></div>
                    <div class="admin-list-toolbar">
                        <p class="admin-list-toolbar__meta">총 <strong id="inquiries-total">0</strong>건</p>
                        <input type="search" id="inquiries-search-input" class="form-control admin-list-toolbar__search" placeholder="1:1 문의 검색" aria-label="1:1 문의 검색">
                    </div>
                    <div class="admin-table-container hidden" id="inquiries-content">
                        <table class="admin-table"><thead><tr><th>ID</th><th>회원</th><th>유형</th><th>제목</th><th>상태</th><th>접수일</th><th>관리</th></tr></thead><tbody id="inquiries-tbody"></tbody></table>
                    </div>
                    <div class="admin-pagination hidden" id="inquiries-pagination"></div>
                </div>
                </div>
            </div>
        </div>
    </main>

    ${adminModalTemplates}

`;

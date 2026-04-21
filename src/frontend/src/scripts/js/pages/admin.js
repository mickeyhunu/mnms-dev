/**
 * 파일 역할: admin 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let adminActionTarget = null;
let supportEditTarget = null;
let currentSupportCategory = 'NOTICE';
let currentInquiryStatus = '';
let inquiryAnswerTarget = null;
let editingUserId = null;
let editingEntryId = null;
let editingAdId = null;
let currentEntryStoreNo = null;
let entryStores = [];
let adStores = [];
const TOP_AD_PLACEMENT_OPTIONS = [
    { value: '1', label: '홈 상단' },
    { value: '2', label: '커뮤니티 상단' }
];
let isGlobalAdminClickBound = false;

const PHONE_PATTERN = /^01\d-\d{3,4}-\d{4}$/;
const ACCOUNT_STATUS = { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED' };
const ADMIN_TABS = ['stats', 'posts', 'comments', 'users', 'entries', 'banner-ads', 'business-ads', 'support', 'inquiries'];
const ADMIN_PAGE_SIZE = 20;
const ADMIN_STATS_RANGE_DAYS = 14;
const ADMIN_DASHBOARD_STATE = { summary: null, daily: [], series: [], period: 'daily', boardStats: [], selectedMetric: 'visitors' };
const ADMIN_STATS_PERIOD_META = {
    daily: { caption: '최근 14일 추이', tableCaption: '일별 상세', tableTitle: '최근 14일 통계 테이블' },
    weekly: { caption: '최근 12주 추이', tableCaption: '주별 상세', tableTitle: '최근 12주 통계 테이블' },
    monthly: { caption: '최근 12개월 추이', tableCaption: '월별 상세', tableTitle: '최근 12개월 통계 테이블' },
    yearly: { caption: '최근 5년 추이', tableCaption: '연도별 상세', tableTitle: '최근 5년 통계 테이블' }
};
const ADMIN_STATS_METRIC_META = {
    visitors: { key: 'visitors', label: '방문자수', colorClass: 'admin-stats-bar--visitors', unit: '명' },
    pageViews: { key: 'pageViews', label: '접속량', colorClass: 'admin-stats-bar--views', unit: '회' },
    posts: { key: 'posts', label: '게시글', colorClass: 'admin-stats-bar--posts', unit: '건' },
    comments: { key: 'comments', label: '댓글', colorClass: 'admin-stats-bar--comments', unit: '건' },
    signups: { key: 'signups', label: '가입자수', colorClass: 'admin-stats-bar--signups', unit: '명' }
};
const ADMIN_LIST_STATE = {
    posts: { items: [], query: '', searchType: 'post', page: 1 },
    comments: { items: [], query: '', searchType: 'post', page: 1 },
    users: { items: [], query: '', page: 1 },
    entries: { items: [], query: '', page: 1 },
    ads: { items: [], query: '', page: 1 },
    support: { items: [], query: '', page: 1 },
    inquiries: { items: [], query: '', page: 1 }
};
const ADMIN_SEARCH_PLACEHOLDERS = {
    posts: '게시글 검색',
    comments: '댓글 검색',
    users: '회원 검색',
    entries: '엔트리 검색',
    ads: '광고 검색',
    support: '공지/FAQ 검색',
    inquiries: '1:1 문의 검색'
};
const ADMIN_SEARCH_TYPE_OPTIONS = {
    posts: {
        post: { placeholder: '게시글 검색', matcher: ['id', 'title'] },
        author: { placeholder: '작성자 검색', matcher: ['authorNickname', 'user_id', 'userId'] }
    },
    comments: {
        post: { placeholder: '게시글 검색', matcher: ['postTitle', 'postId', 'post_id'] },
        author: { placeholder: '작성자 검색', matcher: ['authorNickname', 'user_id', 'userId'] }
    }
};

function getAdminPageState() {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get('tab');
    const activeTab = ADMIN_TABS.includes(requestedTab) ? requestedTab : 'stats';
    const editUserId = Number.parseInt(params.get('editUserId') || '', 10);

    return {
        activeTab,
        editUserId: Number.isInteger(editUserId) && editUserId > 0 ? editUserId : null
    };
}

function syncAdminPageState(nextState = {}, { replace = true } = {}) {
    const url = new URL(window.location.href);
    const currentState = getAdminPageState();
    const activeTab = ADMIN_TABS.includes(nextState.activeTab) ? nextState.activeTab : currentState.activeTab;
    const editUserId = Object.prototype.hasOwnProperty.call(nextState, 'editUserId') ? nextState.editUserId : currentState.editUserId;

    if (activeTab && activeTab !== 'stats') url.searchParams.set('tab', activeTab);
    else url.searchParams.delete('tab');

    if (Number.isInteger(editUserId) && editUserId > 0) url.searchParams.set('editUserId', String(editUserId));
    else url.searchParams.delete('editUserId');

    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', url);
}

async function activateAdminTab(tabKey, options = {}) {
    const { updateHistory = true, replaceHistory = true } = options;
    const resolvedTabKey = ADMIN_TABS.includes(tabKey) ? tabKey : 'stats';
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.tab === resolvedTabKey);
    });

    ADMIN_TABS.forEach((key) => {
        const isActive = key === resolvedTabKey;
        document.getElementById(`${key}-section`)?.classList.toggle('hidden', !isActive);
        document.getElementById(`${key}-section`)?.classList.toggle('active', isActive);
    });

    if (updateHistory) {
        syncAdminPageState({
            activeTab: resolvedTabKey,
            editUserId: resolvedTabKey === 'users' ? getAdminPageState().editUserId : null
        }, { replace: replaceHistory });
    }

    if (resolvedTabKey === 'stats') await loadStatsDashboard();
    else if (resolvedTabKey === 'posts') await loadPosts();
    else if (resolvedTabKey === 'comments') await loadComments();
    else if (resolvedTabKey === 'users') await loadUsers();
    else if (resolvedTabKey === 'entries') await loadEntries();
    else if (resolvedTabKey === 'banner-ads') await loadAds();
    else if (resolvedTabKey === 'business-ads') {
        // 업체광고 관리는 businessInfo.js에서 독립적으로 데이터를 초기화한다.
    }
    else if (resolvedTabKey === 'support') await loadSupportArticles();
    else if (resolvedTabKey === 'inquiries') await loadInquiries();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPage);
} else {
    initAdminPage();
}

async function initAdminPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    bindCommonEvents();

    try {
        const me = await APIClient.get('/auth/me');
        if (!me.isAdmin) {
            alert('관리자만 접근할 수 있습니다.');
            window.location.href = '/';
            return;
        }

        const nickname = document.getElementById('user-nickname');
        if (nickname) nickname.textContent = Auth.formatNicknameWithLevel(me);

        const pageState = getAdminPageState();
        await activateAdminTab(pageState.activeTab, { updateHistory: true, replaceHistory: true });

        if (pageState.activeTab === 'users' && pageState.editUserId) {
            await openUserEditModal(pageState.editUserId, { syncHistory: false });
        }
    } catch (error) {
        alert('관리자 권한 확인에 실패했습니다.');
        window.location.href = '/';
    }
}

function bindCommonEvents() {
    Auth.bindLogoutButton();

    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            await activateAdminTab(tab.dataset.tab, { updateHistory: true, replaceHistory: false });
        });
    });

    document.getElementById('stats-retry-btn')?.addEventListener('click', loadStatsDashboard);
    document.getElementById('stats-period-select')?.addEventListener('change', async (event) => {
        ADMIN_DASHBOARD_STATE.period = String(event.target.value || 'daily').toLowerCase();
        await loadStatsDashboard();
    });
    document.getElementById('stats-summary-cards')?.addEventListener('click', handleStatsCardInteraction);
    document.getElementById('stats-summary-cards')?.addEventListener('keydown', handleStatsCardKeyboard);
    document.getElementById('posts-retry-btn')?.addEventListener('click', loadPosts);
    document.getElementById('comments-retry-btn')?.addEventListener('click', loadComments);
    document.getElementById('users-retry-btn')?.addEventListener('click', loadUsers);
    document.getElementById('entries-retry-btn')?.addEventListener('click', loadEntries);
    document.getElementById('entries-retry-btn-secondary')?.addEventListener('click', loadEntries);
    document.getElementById('ads-retry-btn')?.addEventListener('click', loadAds);
    document.getElementById('support-retry-btn')?.addEventListener('click', loadSupportArticles);
    document.getElementById('inquiries-retry-btn')?.addEventListener('click', loadInquiries);

    document.getElementById('delete-cancel-btn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('delete-confirm-btn')?.addEventListener('click', confirmDelete);
    document.getElementById('user-edit-cancel-btn')?.addEventListener('click', closeUserEditModal);
    document.getElementById('user-edit-cancel-btn-secondary')?.addEventListener('click', closeUserEditModal);
    document.getElementById('user-edit-save-btn')?.addEventListener('click', saveUserDetail);
    bindUserEditForm();
    bindAdminListControls();

    document.getElementById('support-category')?.addEventListener('change', async (event) => {
        currentSupportCategory = event.target.value;
        await loadSupportArticles();
    });
    document.getElementById('support-cancel-btn')?.addEventListener('click', closeSupportModal);
    document.getElementById('support-save-btn')?.addEventListener('click', saveSupportArticle);

    document.getElementById('ads-save-btn')?.addEventListener('click', saveAd);
    document.getElementById('ads-cancel-btn')?.addEventListener('click', resetAdEditor);
    document.getElementById('ads-image-upload-btn')?.addEventListener('click', uploadAdImage);
    document.getElementById('ads-form-ad-type')?.addEventListener('change', handleAdTypeChange);
    document.getElementById('entry-store-select')?.addEventListener('change', async (event) => {
        currentEntryStoreNo = Number.parseInt(event.target.value || '', 10);
        resetEntryEditor();
        await loadEntries();
    });
    document.getElementById('entry-save-btn')?.addEventListener('click', saveEntry);
    document.getElementById('entry-cancel-btn')?.addEventListener('click', resetEntryEditor);

    document.getElementById('inquiries-status')?.addEventListener('change', async (event) => {
        currentInquiryStatus = event.target.value || '';
        await loadInquiries();
    });
    document.getElementById('inquiry-answer-cancel-btn')?.addEventListener('click', closeInquiryAnswerModal);
    document.getElementById('inquiry-answer-save-btn')?.addEventListener('click', saveInquiryAnswer);
    resetAdEditor();

    if (!isGlobalAdminClickBound) {
        document.addEventListener('click', handleGlobalAdminClick);
        isGlobalAdminClickBound = true;
    }
}

function bindAdminListControls() {
    Object.entries(ADMIN_SEARCH_PLACEHOLDERS).forEach(([prefix, placeholder]) => {
        const input = document.getElementById(`${prefix}-search-input`);
        const typeSelect = document.getElementById(`${prefix}-search-type`);
        if (!input || input.dataset.bound === 'true') return;

        updateAdminSearchInput(prefix, placeholder);
        input.addEventListener('input', () => {
            ADMIN_LIST_STATE[prefix].query = input.value || '';
            ADMIN_LIST_STATE[prefix].page = 1;
            renderAdminList(prefix);
        });

        if (typeSelect && typeSelect.dataset.bound !== 'true') {
            const availableTypes = ADMIN_SEARCH_TYPE_OPTIONS[prefix];
            const nextSearchType = availableTypes?.[typeSelect.value] ? typeSelect.value : Object.keys(availableTypes || {})[0];
            if (nextSearchType) {
                typeSelect.value = nextSearchType;
                ADMIN_LIST_STATE[prefix].searchType = nextSearchType;
                updateAdminSearchInput(prefix, placeholder);
            }

            typeSelect.addEventListener('change', () => {
                const resolvedSearchType = availableTypes?.[typeSelect.value] ? typeSelect.value : 'post';
                ADMIN_LIST_STATE[prefix].searchType = resolvedSearchType;
                ADMIN_LIST_STATE[prefix].page = 1;
                updateAdminSearchInput(prefix, placeholder);
                renderAdminList(prefix);
            });
            typeSelect.dataset.bound = 'true';
        }

        input.dataset.bound = 'true';
    });
}

function getAdminListState(prefix) {
    return ADMIN_LIST_STATE[prefix] || { items: [], query: '', page: 1 };
}

function getAdminSearchConfig(prefix) {
    const searchTypes = ADMIN_SEARCH_TYPE_OPTIONS[prefix];
    if (!searchTypes) return null;

    const state = getAdminListState(prefix);
    const searchType = searchTypes[state.searchType] ? state.searchType : Object.keys(searchTypes)[0];
    return searchTypes[searchType] || null;
}

function updateAdminSearchInput(prefix, fallbackPlaceholder = '') {
    const input = document.getElementById(`${prefix}-search-input`);
    if (!input) return;

    const config = getAdminSearchConfig(prefix);
    const placeholder = config?.placeholder || fallbackPlaceholder;
    input.placeholder = placeholder;
    input.setAttribute('aria-label', placeholder);
}

function normalizeAdminSearchValue(value) {
    return String(value || '').trim().toLowerCase();
}

function adminListMatchesQuery(item, query, fields = []) {
    if (!query) return true;
    return fields.some((field) => {
        const value = typeof field === 'function' ? field(item) : item?.[field];
        return normalizeAdminSearchValue(value).includes(query);
    });
}

function getAdminFilteredItems(prefix) {
    const state = getAdminListState(prefix);
    const query = normalizeAdminSearchValue(state.query);
    const items = Array.isArray(state.items) ? state.items : [];

    const matchers = {
        posts: ['id', 'title', 'authorNickname', 'user_id', 'userId'],
        comments: ['id', 'content', 'authorNickname', 'user_id', 'userId', 'postId', 'post_id'],
        users: ['id', 'email', 'nickname', 'role', 'memberType', 'member_type', 'phone'],
        entries: ['workerName', 'entryId'],
        ads: ['id', 'title', 'adType', 'storeNo', 'linkUrl', 'imageUrl', 'displayOrder'],
        support: ['id', 'title', 'category', 'sourceType'],
        inquiries: ['id', 'title', 'userNickname', 'userEmail', 'userId', 'type', 'status']
    };

    const searchConfig = getAdminSearchConfig(prefix);
    const fields = searchConfig?.matcher || matchers[prefix] || [];

    const queryMatchedItems = items.filter((item) => adminListMatchesQuery(item, query, fields));
    if (prefix !== 'ads') return queryMatchedItems;

    return queryMatchedItems.filter((item) => String(item?.adType || '').toUpperCase() !== 'BUSINESS');
}

function getAdminPagination(prefix) {
    const filteredItems = getAdminFilteredItems(prefix);
    const state = getAdminListState(prefix);
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / ADMIN_PAGE_SIZE));
    const page = Math.min(Math.max(1, state.page || 1), totalPages);
    state.page = page;
    const startIndex = (page - 1) * ADMIN_PAGE_SIZE;

    return {
        filteredItems,
        pageItems: filteredItems.slice(startIndex, startIndex + ADMIN_PAGE_SIZE),
        page,
        totalPages
    };
}

function updateAdminTotal(prefix, total) {
    const totalElement = document.getElementById(`${prefix}-total`);
    if (totalElement) totalElement.textContent = Number(total || 0).toLocaleString();
}

function renderAdminPagination(prefix, totalPages, currentPage) {
    const container = document.getElementById(`${prefix}-pagination`);
    if (!container) return;

    if (totalPages <= 1) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    const pages = [];
    for (let page = startPage; page <= endPage; page += 1) {
        pages.push(`
            <button type="button" class="btn btn-sm ${page === currentPage ? 'btn-primary' : 'btn-outline'}" data-admin-page="${page}" data-admin-page-prefix="${prefix}">
                ${page}
            </button>
        `);
    }

    container.classList.remove('hidden');
    container.innerHTML = `
        <button type="button" class="btn btn-sm btn-outline" data-admin-page="${currentPage - 1}" data-admin-page-prefix="${prefix}" ${currentPage <= 1 ? 'disabled' : ''}>이전</button>
        <div class="admin-pagination__pages">${pages.join('')}</div>
        <button type="button" class="btn btn-sm btn-outline" data-admin-page="${currentPage + 1}" data-admin-page-prefix="${prefix}" ${currentPage >= totalPages ? 'disabled' : ''}>다음</button>
    `;
}

function renderAdminList(prefix) {
    if (prefix === 'posts') renderPostsTable();
    else if (prefix === 'comments') renderCommentsTable();
    else if (prefix === 'users') renderUsersTable();
    else if (prefix === 'entries') renderEntriesTable();
    else if (prefix === 'ads') renderAdsTable();
    else if (prefix === 'support') renderSupportTable();
    else if (prefix === 'inquiries') renderInquiriesTable();
}

function formatStatsNumber(value) {
    return Number(value || 0).toLocaleString();
}

function getBoardTypeLabel(boardType) {
    const labels = {
        FREE: '자유',
        ANON: '익명',
        REVIEW: '후기',
        STORY: '썰',
        QUESTION: '질문',
        PROMOTION: '홍보'
    };
    return labels[String(boardType || '').toUpperCase()] || (boardType || '기타');
}

function renderStatsSummaryCards(summary) {
    const container = document.getElementById('stats-summary-cards');
    if (!container || !summary) return;

    const cards = [
        { label: '전체 방문자수', value: summary.totalVisitors, delta: `오늘 ${formatStatsNumber(summary.todayVisitors)}명`, metricKey: 'visitors' },
        { label: '전체 접속량', value: summary.totalPageViews, delta: `오늘 ${formatStatsNumber(summary.todayPageViews)}회`, metricKey: 'pageViews' },
        { label: '전체 게시글', value: summary.totalPosts, delta: `오늘 ${formatStatsNumber(summary.todayPosts)}건`, metricKey: 'posts' },
        { label: '전체 댓글', value: summary.totalComments, delta: `오늘 ${formatStatsNumber(summary.todayComments)}건`, metricKey: 'comments' },
        { label: '전체 회원', value: summary.totalUsers, delta: `오늘 가입 ${formatStatsNumber(summary.todaySignups)}명`, metricKey: 'signups' }
    ];

    container.innerHTML = cards.map((card) => `
        <article class="admin-stats-card ${ADMIN_DASHBOARD_STATE.selectedMetric === card.metricKey ? 'is-active' : ''}" data-admin-stats-metric="${card.metricKey}" role="button" tabindex="0" aria-label="${card.label} 기준 대시보드 보기">
            <span class="admin-stats-card__label">${card.label}</span>
            <strong class="admin-stats-card__value">${formatStatsNumber(card.value)}</strong>
            <span class="admin-stats-card__delta">${card.delta}</span>
        </article>
    `).join('');
}

function getStatsMetricMeta(metricKey = ADMIN_DASHBOARD_STATE.selectedMetric) {
    return ADMIN_STATS_METRIC_META[metricKey] || ADMIN_STATS_METRIC_META.visitors;
}

function renderStatsChart(dailyStats) {
    const container = document.getElementById('stats-chart');
    if (!container) return;

    const items = Array.isArray(dailyStats) ? dailyStats : [];
    const metric = getStatsMetricMeta();
    if (!items.length) {
        container.innerHTML = '<p class="text-muted">표시할 통계 데이터가 없습니다.</p>';
        return;
    }

    const maxValue = Math.max(...items.map((item) => Number(item[metric.key] || 0)), 1);

    container.innerHTML = items.map((item) => {
        const dateLabel = sanitizeHTML(item.label || String(item.date || '').slice(5).replace('-', '.'));
        const value = Number(item[metric.key] || 0);
        return `
            <div class="admin-stats-chart-row">
                <strong>${dateLabel}</strong>
                <div class="admin-stats-bar-track">
                    <div class="admin-stats-bar-group">
                        <div class="admin-stats-bar ${metric.colorClass}" title="${metric.label} ${formatStatsNumber(value)}">
                            <span style="width:${Math.max(8, (value / maxValue) * 100)}%"></span>
                        </div>
                    </div>
                </div>
                <div class="admin-stats-chart-meta">${metric.label} ${formatStatsNumber(value)}${metric.unit}</div>
            </div>
        `;
    }).join('');
}

function renderBoardStats(boardStats) {
    const container = document.getElementById('stats-board-list');
    if (!container) return;

    const items = Array.isArray(boardStats) ? boardStats : [];
    if (!items.length) {
        container.innerHTML = '<p class="text-muted">게시판 통계가 없습니다.</p>';
        return;
    }

    container.innerHTML = items.map((item) => `
        <div class="admin-stats-board-item">
            <div>
                <strong>${sanitizeHTML(getBoardTypeLabel(item.boardType))}</strong>
                <span>오늘 ${formatStatsNumber(item.todayPosts)}건 작성</span>
            </div>
            <strong>${formatStatsNumber(item.totalPosts)}건</strong>
        </div>
    `).join('');
}

function renderStatsDailyTable(dailyStats) {
    const tbody = document.getElementById('stats-daily-tbody');
    if (!tbody) return;

    const items = Array.isArray(dailyStats) ? dailyStats : [];
    const metric = getStatsMetricMeta();
    const valueHeader = document.querySelector('#stats-section table thead th:last-child');
    if (valueHeader) valueHeader.textContent = metric.label;

    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="2">표시할 통계 데이터가 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = items.map((item) => `
        <tr>
            <td>${sanitizeHTML(item.label || item.date)}</td>
            <td>${formatStatsNumber(item[metric.key])}${metric.unit}</td>
        </tr>
    `).join('');
}

function renderStatsPeriodMeta(period = 'daily') {
    const meta = ADMIN_STATS_PERIOD_META[period] || ADMIN_STATS_PERIOD_META.daily;
    const metric = getStatsMetricMeta();
    const caption = document.getElementById('stats-period-caption');
    const title = document.getElementById('stats-period-title');
    const tableCaption = document.getElementById('stats-table-caption');
    const tableTitle = document.getElementById('stats-table-title');
    const periodSelect = document.getElementById('stats-period-select');

    if (caption) caption.textContent = meta.caption;
    if (title) title.textContent = `${metric.label} (${period === 'daily' ? '일별' : period === 'weekly' ? '주별' : period === 'monthly' ? '월별' : '연도별'})`;
    if (tableCaption) tableCaption.textContent = meta.tableCaption;
    if (tableTitle) tableTitle.textContent = meta.tableTitle;
    if (periodSelect) periodSelect.value = period;
}

function renderStatsDashboard() {
    renderStatsPeriodMeta(ADMIN_DASHBOARD_STATE.period);
    renderStatsSummaryCards(ADMIN_DASHBOARD_STATE.summary);
    renderStatsChart(ADMIN_DASHBOARD_STATE.series);
    renderBoardStats(ADMIN_DASHBOARD_STATE.boardStats);
    renderStatsDailyTable(ADMIN_DASHBOARD_STATE.series);
}

async function handleGlobalAdminClick(event) {
    const pageButton = event.target.closest('[data-admin-page]');
    if (pageButton) {
        event.preventDefault();
        const prefix = pageButton.dataset.adminPagePrefix;
        const nextPage = Number.parseInt(pageButton.dataset.adminPage || '', 10);
        if (prefix && Number.isInteger(nextPage) && nextPage > 0 && ADMIN_LIST_STATE[prefix]) {
            ADMIN_LIST_STATE[prefix].page = nextPage;
            renderAdminList(prefix);
        }
        return;
    }

    const supportNewButton = event.target.closest('#support-new-btn');
    if (supportNewButton) {
        event.preventDefault();
        const category = encodeURIComponent(currentSupportCategory || 'NOTICE');
        window.location.href = `/admin/support/create?category=${category}`;
        return;
    }

    const actionButton = event.target.closest('[data-admin-action]');
    if (!actionButton) return;
    await handleAdminTableActionClick(event);
}

function setAdminStatsMetric(metricKey) {
    if (!Object.prototype.hasOwnProperty.call(ADMIN_STATS_METRIC_META, metricKey)) return;
    ADMIN_DASHBOARD_STATE.selectedMetric = metricKey;
    renderStatsDashboard();
}

function handleStatsCardInteraction(event) {
    const card = event.target.closest('[data-admin-stats-metric]');
    if (!card) return;
    setAdminStatsMetric(String(card.dataset.adminStatsMetric || 'visitors'));
}

function handleStatsCardKeyboard(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('[data-admin-stats-metric]');
    if (!card) return;
    event.preventDefault();
    setAdminStatsMetric(String(card.dataset.adminStatsMetric || 'visitors'));
}

async function loadPosts() {
    toggleLoading('posts', true);
    try {
        const response = await APIClient.get('/admin/posts');
        ADMIN_LIST_STATE.posts.items = response.content || [];
        renderPostsTable();
        showContent('posts');
    } catch (error) {
        showError('posts', error.message || '게시글을 불러오지 못했습니다.');
    }
}

async function loadComments() {
    toggleLoading('comments', true);
    try {
        const response = await APIClient.get('/admin/comments');
        ADMIN_LIST_STATE.comments.items = response.content || [];
        renderCommentsTable();
        showContent('comments');
    } catch (error) {
        showError('comments', error.message || '댓글을 불러오지 못했습니다.');
    }
}

async function loadUsers() {
    toggleLoading('users', true);
    try {
        const response = await APIClient.get('/admin/users');
        ADMIN_LIST_STATE.users.items = response.content || [];
        renderUsersTable();
        showContent('users');
    } catch (error) {
        showError('users', error.message || '회원 목록을 불러오지 못했습니다.');
    }
}

async function loadStatsDashboard() {
    toggleLoading('stats', true);
    try {
        const response = await APIClient.get('/admin/stats/dashboard', { rangeDays: ADMIN_STATS_RANGE_DAYS, period: ADMIN_DASHBOARD_STATE.period });
        ADMIN_DASHBOARD_STATE.summary = response.summary || null;
        ADMIN_DASHBOARD_STATE.daily = response.daily || [];
        ADMIN_DASHBOARD_STATE.series = response.series || response.daily || [];
        ADMIN_DASHBOARD_STATE.period = String(response.period || ADMIN_DASHBOARD_STATE.period || 'daily').toLowerCase();
        ADMIN_DASHBOARD_STATE.boardStats = response.boardStats || [];
        renderStatsDashboard();
        showContent('stats');
    } catch (error) {
        showError('stats', error.message || '통계 정보를 불러오지 못했습니다.');
    }
}

function setEntryHelpMessage(message, color = '#6c757d') {
    const help = document.getElementById('entry-form-help');
    if (!help) return;
    help.textContent = message;
    help.style.color = color;
}

function renderEntryStoreOptions() {
    const select = document.getElementById('entry-store-select');
    if (!select) return;

    if (!entryStores.length) {
        select.innerHTML = '<option value="">매장 없음</option>';
        select.disabled = true;
        currentEntryStoreNo = null;
        return;
    }

    if (!entryStores.some((store) => store.storeNo === currentEntryStoreNo)) {
        currentEntryStoreNo = entryStores[0].storeNo;
    }

    select.disabled = false;
    select.innerHTML = entryStores.map((store) => `
        <option value="${store.storeNo}" ${store.storeNo === currentEntryStoreNo ? 'selected' : ''}>${sanitizeHTML(store.storeName)}</option>
    `).join('');
}

async function ensureEntryStoresLoaded() {
    const response = await APIClient.get('/admin/entries/stores');
    entryStores = (response.content || []).map((store) => ({
        storeNo: Number.parseInt(store.storeNo, 10),
        storeName: String(store.storeName || '').trim()
    })).filter((store) => Number.isInteger(store.storeNo) && store.storeName);
    renderEntryStoreOptions();
}

function resetEntryEditor() {
    editingEntryId = null;
    const input = document.getElementById('entry-name-input');
    const saveButton = document.getElementById('entry-save-btn');
    const cancelButton = document.getElementById('entry-cancel-btn');
    const title = document.getElementById('entry-editor-title');

    if (input) input.value = '';
    if (saveButton) saveButton.textContent = '추가';
    if (cancelButton) cancelButton.classList.add('hidden');
    if (title) title.textContent = '새 엔트리 추가';
    setEntryHelpMessage('');
}

function startEntryEdit(entry) {
    editingEntryId = entry.entryId;
    const input = document.getElementById('entry-name-input');
    const saveButton = document.getElementById('entry-save-btn');
    const cancelButton = document.getElementById('entry-cancel-btn');
    const title = document.getElementById('entry-editor-title');

    if (input) {
        input.value = entry.workerName || '';
        input.focus();
    }
    if (saveButton) saveButton.textContent = '수정 저장';
    if (cancelButton) cancelButton.classList.remove('hidden');
    if (title) title.textContent = '엔트리 수정';
    setEntryHelpMessage(`"${entry.workerName || ''}" 항목을 수정 중입니다.`);
}

async function loadEntries() {
    toggleLoading('entries', true);

    try {
        await ensureEntryStoresLoaded();

        if (!currentEntryStoreNo) {
            const tbody = document.getElementById('entries-tbody');
            ADMIN_LIST_STATE.entries.items = [];
            updateAdminTotal('entries', 0);
            renderAdminPagination('entries', 1, 1);
            if (tbody) tbody.innerHTML = '<tr><td colspan="5">관리할 매장이 없습니다.</td></tr>';
            showContent('entries');
            return;
        }

        const response = await APIClient.get('/admin/entries', { storeNo: currentEntryStoreNo });
        ADMIN_LIST_STATE.entries.items = response.content || [];
        renderEntriesTable();
        showContent('entries');
    } catch (error) {
        showError('entries', error.message || '엔트리 목록을 불러오지 못했습니다.');
    }
}

async function saveEntry() {
    const input = document.getElementById('entry-name-input');
    const saveButton = document.getElementById('entry-save-btn');
    const workerName = input?.value?.trim() || '';

    if (!currentEntryStoreNo) {
        setEntryHelpMessage('먼저 매장을 선택해주세요.', '#dc3545');
        return;
    }

    if (!workerName) {
        setEntryHelpMessage('엔트리 이름을 입력해주세요.', '#dc3545');
        return;
    }

    try {
        if (saveButton) saveButton.disabled = true;
        setEntryHelpMessage(editingEntryId ? '엔트리를 수정하는 중입니다...' : '엔트리를 추가하는 중입니다...');

        if (editingEntryId) {
            await APIClient.put(`/admin/entries/${encodeURIComponent(editingEntryId)}`, { workerName });
        } else {
            await APIClient.post('/admin/entries', { storeNo: currentEntryStoreNo, workerName });
        }

        resetEntryEditor();
        await loadEntries();
    } catch (error) {
        setEntryHelpMessage(error.message || '엔트리 저장에 실패했습니다.', '#dc3545');
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

function renderPostsTable() {
    const tbody = document.getElementById('posts-tbody');
    if (!tbody) return;

    const { filteredItems, pageItems, page, totalPages } = getAdminPagination('posts');
    updateAdminTotal('posts', filteredItems.length);

    if (!pageItems.length) {
        tbody.innerHTML = `<tr><td colspan="7">${filteredItems.length ? '현재 페이지에 표시할 게시글이 없습니다.' : '게시글이 없습니다.'}</td></tr>`;
    } else {
        tbody.innerHTML = pageItems.map((post) => {
            const isHidden = isHiddenPost(post);
            return `
                <tr class="${getAdminPostRowClass(post)}">
                    <td>${post.id}</td>
                    <td>
                        <div class="admin-comment-cell">
                            <div class="admin-comment-flags">${renderAdminPostFlags(post)}</div>
                            <a href="/post-detail?id=${post.id}" target="_blank">${sanitizeHTML(post.title || '')}</a>
                        </div>
                    </td>
                    <td>${sanitizeHTML(post.authorNickname || `사용자#${post.user_id || post.userId}`)}</td>
                    <td>${formatDate(post.createdAt || post.created_at)}</td>
                    <td>${post.likeCount || 0}</td>
                    <td>${post.commentCount || 0}</td>
                    <td>
                        <button class="btn btn-sm ${isHidden ? 'btn-outline' : 'btn-secondary'}" type="button" data-admin-action="toggle-hide" data-target-type="post" data-target-id="${post.id}" data-current-hidden="${isHidden ? 'true' : 'false'}">${isHidden ? '가리기 해제' : '가리기'}</button>
                    </td>
                </tr>
            `;
        }).join('');
        bindAdminHideToggleButtons(tbody);
    }

    renderAdminPagination('posts', totalPages, page);
}

function renderCommentsTable() {
    const tbody = document.getElementById('comments-tbody');
    if (!tbody) return;

    const { filteredItems, pageItems, page, totalPages } = getAdminPagination('comments');
    updateAdminTotal('comments', filteredItems.length);

    if (!pageItems.length) {
        tbody.innerHTML = `<tr><td colspan="6">${filteredItems.length ? '현재 페이지에 표시할 댓글이 없습니다.' : '댓글이 없습니다.'}</td></tr>`;
    } else {
        tbody.innerHTML = pageItems.map((comment) => {
            const isHidden = isHiddenComment(comment);
            return `
                <tr class="${getAdminCommentRowClass(comment)}">
                    <td>${comment.id}</td>
                    <td>
                        <div class="admin-comment-cell">
                            <div class="admin-comment-flags">${renderAdminCommentFlags(comment)}</div>
                            <div class="admin-comment-text">${sanitizeHTML((comment.content || '').slice(0, 100))}</div>
                        </div>
                    </td>
                    <td><a href="/post-detail?id=${comment.postId || comment.post_id}" target="_blank">게시글 보기</a></td>
                    <td>${sanitizeHTML(comment.authorNickname || `사용자#${comment.user_id || comment.userId}`)}</td>
                    <td>${formatDate(comment.createdAt || comment.created_at)}</td>
                    <td><button class="btn btn-sm ${isHidden ? 'btn-outline' : 'btn-secondary'}" type="button" data-admin-action="toggle-hide" data-target-type="comment" data-target-id="${comment.id}" data-current-hidden="${isHidden ? 'true' : 'false'}">${isHidden ? '가리기 해제' : '가리기'}</button></td>
                </tr>
            `;
        }).join('');
        bindAdminHideToggleButtons(tbody);
    }

    renderAdminPagination('comments', totalPages, page);
}

function renderUsersTable() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    const { filteredItems, pageItems, page, totalPages } = getAdminPagination('users');
    updateAdminTotal('users', filteredItems.length);

    if (!pageItems.length) {
        tbody.innerHTML = `<tr><td colspan="9">${filteredItems.length ? '현재 페이지에 표시할 회원이 없습니다.' : '회원이 없습니다.'}</td></tr>`;
    } else {
        tbody.innerHTML = pageItems.map((user) => `
            <tr>
                <td>${user.id}</td>
                <td>${sanitizeHTML(user.email || '')}</td>
                <td>${sanitizeHTML(user.nickname || '')}</td>
                <td>${formatAdminRestrictionStatus(user)}</td>
                <td>${Number(user.totalPoints || 0).toLocaleString()} P</td>
                <td>${formatDate(user.createdAt || user.created_at)}</td>
                <td>${sanitizeHTML(user.role || 'MEMBER')}</td>
                <td>${user.memberType === 'BUSINESS' ? '기업 회원' : '일반 회원'}</td>
                <td>
                    <div class="admin-user-actions">
                        <a class="btn btn-sm btn-secondary" href="/admin?tab=users&editUserId=${user.id}" data-admin-action="edit-user" data-target-id="${user.id}">정보 수정</a>
                        <button type="button" class="btn btn-sm btn-danger" data-admin-action="delete" data-target-type="user" data-target-id="${user.id}">삭제</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderAdminPagination('users', totalPages, page);
}

function renderEntriesTable() {
    const tbody = document.getElementById('entries-tbody');
    if (!tbody) return;

    const { filteredItems, pageItems, page, totalPages } = getAdminPagination('entries');
    updateAdminTotal('entries', filteredItems.length);

    if (!pageItems.length) {
        tbody.innerHTML = `<tr><td colspan="5">${filteredItems.length ? '현재 페이지에 표시할 엔트리가 없습니다.' : '등록된 엔트리 항목이 없습니다.'}</td></tr>`;
    } else {
        tbody.innerHTML = pageItems.map((entry) => `
            <tr>
                <td>${sanitizeHTML(entry.workerName || '')}</td>
                <td>${Number(entry.mentionCount || 0).toLocaleString()}</td>
                <td>${Number(entry.insertCount || 0).toLocaleString()}</td>
                <td>${formatDate(entry.createdAt)}</td>
                <td>
                    <div class="admin-user-actions">
                        <button type="button" class="btn btn-sm btn-secondary" data-admin-action="edit-entry" data-entry-id="${sanitizeHTML(entry.entryId || '')}" data-entry-name="${sanitizeHTML(entry.workerName || '')}">수정</button>
                        <button type="button" class="btn btn-sm btn-danger" data-admin-action="delete" data-target-type="entry" data-entry-id="${sanitizeHTML(entry.entryId || '')}" data-entry-name="${sanitizeHTML(entry.workerName || '')}">삭제</button>
                    </div>
                </td>
            </tr>
        `).join('');
        bindEntryRowActionButtons(tbody);
    }

    renderAdminPagination('entries', totalPages, page);
}

function bindEntryRowActionButtons(container) {
    if (!container) return;

    const editButtons = container.querySelectorAll('[data-admin-action="edit-entry"]');
    editButtons.forEach((button) => {
        button.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();

            const entryId = button.dataset.entryId || '';
            const entryName = button.dataset.entryName || '';

            if (!entryId) {
                alert('엔트리 정보를 확인할 수 없어 요청을 처리하지 못했습니다. 목록을 새로고침 후 다시 시도해주세요.');
                return;
            }

            startEntryEdit({ entryId, workerName: entryName });
        };
    });

    const deleteButtons = container.querySelectorAll('[data-admin-action="delete"][data-target-type="entry"]');
    deleteButtons.forEach((button) => {
        button.onclick = async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const entryId = button.dataset.entryId || '';
            const entryName = button.dataset.entryName || '';

            if (!entryId) {
                alert('엔트리 정보를 확인할 수 없어 요청을 처리하지 못했습니다. 목록을 새로고침 후 다시 시도해주세요.');
                return;
            }

            const targetLabel = entryName || '선택한 엔트리';
            const shouldDelete = window.confirm(`"${targetLabel}" 엔트리 이름을 삭제하시겠습니까?`);
            if (!shouldDelete) return;

            const originalText = button.textContent;
            const originalDisabled = button.disabled;

            try {
                button.disabled = true;
                button.textContent = '삭제 중...';
                await APIClient.delete(`/admin/entries/${encodeURIComponent(entryId)}`);
                if (editingEntryId === entryId) resetEntryEditor();
                await loadEntries();
                setEntryHelpMessage(`"${targetLabel}" 엔트리 이름을 삭제했습니다.`, '#198754');
            } catch (error) {
                alert(error.message || '엔트리 삭제에 실패했습니다.');
            } finally {
                button.disabled = originalDisabled;
                button.textContent = originalText;
            }
        };
    });
}

function renderAdsTable() {
    const tbody = document.getElementById('ads-tbody');
    if (!tbody) return;

    const { filteredItems, pageItems, page, totalPages } = getAdminPagination('ads');
    updateAdminTotal('ads', filteredItems.length);

    if (!pageItems.length) {
        tbody.innerHTML = `<tr><td colspan="10">${filteredItems.length ? '현재 페이지에 표시할 광고가 없습니다.' : '등록된 광고가 없습니다.'}</td></tr>`;
    } else {
        tbody.innerHTML = pageItems.map((ad) => `
            <tr>
                <td>${ad.id}</td>
                <td>${sanitizeHTML(ad.adType || 'LIVE')}</td>
                <td>${Number.isInteger(Number(ad.storeNo)) ? Number(ad.storeNo) : '-'}</td>
                <td>${sanitizeHTML(ad.title || '')}</td>
                <td><a href="${sanitizeHTML(normalizeExternalUrl(ad.linkUrl))}" target="_blank" rel="noopener noreferrer">링크 열기</a></td>
                <td>${Number(ad.displayOrder || 0)}</td>
                <td>${ad.isActive ? '노출' : '숨김'}</td>
                <td>${formatDate(ad.createdAt || ad.created_at)}</td>
                <td>${formatDate(ad.updatedAt || ad.updated_at)}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-secondary" data-admin-action="edit-ad" data-target-id="${ad.id}">수정</button>
                    <button type="button" class="btn btn-sm btn-danger" data-admin-action="delete" data-target-type="ad" data-target-id="${ad.id}">삭제</button>
                </td>
            </tr>
        `).join('');
    }

    renderAdminPagination('ads', totalPages, page);
}

function renderSupportTable() {
    const tbody = document.getElementById('support-tbody');
    if (!tbody) return;

    const { filteredItems, pageItems, page, totalPages } = getAdminPagination('support');
    updateAdminTotal('support', filteredItems.length);

    if (!pageItems.length) {
        tbody.innerHTML = `<tr><td colspan="5">${filteredItems.length ? '현재 페이지에 표시할 글이 없습니다.' : '등록된 글이 없습니다.'}</td></tr>`;
    } else {
        tbody.innerHTML = pageItems.map((article) => `
            <tr>
                <td>${article.id}</td>
                <td>${article.category === 'FAQ' ? 'FAQ' : '공지사항'}</td>
                <td>${sanitizeHTML(article.title || '')}</td>
                <td>${formatDate(article.createdAt || article.created_at)}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-secondary" data-admin-action="edit-support" data-target-id="${article.sourceId || article.id}" data-source-type="${article.sourceType || 'SUPPORT'}">수정</button>
                    <button type="button" class="btn btn-sm btn-danger" data-admin-action="delete" data-target-type="support" data-target-id="${article.sourceId || article.id}" data-source-type="${article.sourceType || 'SUPPORT'}">삭제</button>
                </td>
            </tr>
        `).join('');
    }

    renderAdminPagination('support', totalPages, page);
}

function renderInquiriesTable() {
    const tbody = document.getElementById('inquiries-tbody');
    if (!tbody) return;

    const { filteredItems, pageItems, page, totalPages } = getAdminPagination('inquiries');
    updateAdminTotal('inquiries', filteredItems.length);

    if (!pageItems.length) {
        tbody.innerHTML = `<tr><td colspan="7">${filteredItems.length ? '현재 페이지에 표시할 문의가 없습니다.' : '접수된 문의가 없습니다.'}</td></tr>`;
    } else {
        tbody.innerHTML = pageItems.map((inquiry) => {
            const status = toInquiryStatusInfo(inquiry.status);
            return `
                <tr>
                    <td>${inquiry.id}</td>
                    <td>${sanitizeHTML(inquiry.userNickname || inquiry.userEmail || `회원#${inquiry.userId}`)}</td>
                    <td>${toInquiryTypeLabel(inquiry.type)}</td>
                    <td>${sanitizeHTML(inquiry.title || '')}</td>
                    <td><span class="my-inquiry-status ${status.className}">${status.text}</span></td>
                    <td>${formatDate(inquiry.createdAt || inquiry.created_at)}</td>
                    <td><a class="btn btn-sm btn-primary" href="/admin/inquiries/${inquiry.id}/answer">답변</a></td>
                </tr>
            `;
        }).join('');
    }

    renderAdminPagination('inquiries', totalPages, page);
}

function formatPhoneNumber(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

function setAdminUserHelpMessage(message, color = '#6c757d') {
    const result = document.getElementById('admin-user-save-result');
    if (!result) return;
    result.textContent = message;
    result.style.color = color;
}

function syncLoginRestrictionFields() {
    const accountStatusEl = document.getElementById('admin-user-account-status');
    const loginRestrictionDaysEl = document.getElementById('admin-user-login-restriction-days');
    const loginRestrictionPermanentEl = document.getElementById('admin-user-login-restriction-permanent');
    const loginRestrictedUntilEl = document.getElementById('admin-user-login-restricted-until');
    if (!accountStatusEl || !loginRestrictionDaysEl || !loginRestrictionPermanentEl || !loginRestrictedUntilEl) return;

    const isSuspended = accountStatusEl.value === ACCOUNT_STATUS.SUSPENDED;
    const isPermanent = loginRestrictionPermanentEl.checked;
    loginRestrictionDaysEl.disabled = !isSuspended || isPermanent;
    loginRestrictionDaysEl.placeholder = isSuspended
        ? (isPermanent ? '영구 제한은 일수 입력이 필요 없습니다.' : '예: 1, 7, 30')
        : '정상 계정은 제한이 없습니다.';

    if (!isSuspended) {
        loginRestrictionDaysEl.value = '';
        loginRestrictionPermanentEl.checked = false;
        loginRestrictedUntilEl.value = '';
    } else if (isPermanent) {
        loginRestrictionDaysEl.value = '';
        loginRestrictedUntilEl.value = '영구 제한';
    }
}

function formatAdminRestrictionStatus(user) {
    if (user.accountStatus !== ACCOUNT_STATUS.SUSPENDED) return '정상';
    if (user.isLoginRestrictionPermanent) return '정지 (영구 제한)';
    if (user.loginRestrictedUntil) return `정지 (${formatDate(user.loginRestrictedUntil)})`;
    return '정지';
}

function formatAdminActivityBoardLabel(boardType) {
    const normalized = String(boardType || '').toUpperCase();
    if (normalized === 'FREE') return '자유';
    if (normalized === 'ANON') return '익명';
    if (normalized === 'REVIEW') return '후기';
    if (normalized === 'STORY') return '썰';
    if (normalized === 'QUESTION') return '질문';
    if (normalized === 'PROMOTION') return '홍보';
    return normalized || '-';
}

function escapeHtmlAndPreserveLineBreaks(value, maxLength = 120) {
    const normalized = String(value || '').trim();
    if (!normalized) return '-';
    const truncated = normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized;
    return sanitizeHTML(truncated).replace(/\n/g, '<br>');
}

function renderAdminActivityItems(containerId, items, renderItem, emptyMessage) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!Array.isArray(items) || !items.length) {
        container.innerHTML = `<div class="admin-user-activity-empty">${sanitizeHTML(emptyMessage)}</div>`;
        return;
    }

    container.innerHTML = items.map(renderItem).join('');
}

function renderAdminUserActivity(activity = {}) {
    const stats = activity.stats || {};
    const statsContainer = document.getElementById('admin-user-activity-stats');
    if (statsContainer) {
        const statCards = [
            { label: '게시글', value: Number(stats.postCount || 0) },
            { label: '댓글', value: Number(stats.commentCount || 0) },
            { label: '출석', value: Number(stats.attendanceCount || 0) },
            { label: '후기', value: Number(stats.reviewCount || 0) },
            { label: '받은/준 추천', value: Number(stats.recommendCount || 0) }
        ];

        statsContainer.innerHTML = statCards.map((item) => `
            <article class="admin-user-activity-stat">
                <span class="admin-user-activity-stat__label">${item.label}</span>
                <strong class="admin-user-activity-stat__value">${item.value.toLocaleString()}</strong>
            </article>
        `).join('');
    }

    renderAdminActivityItems(
        'admin-user-activity-posts',
        activity.recentPosts,
        (post) => `
            <article class="admin-user-activity-item">
                <div class="admin-user-activity-item__meta">${formatDate(post.createdAt)} · ${sanitizeHTML(formatAdminActivityBoardLabel(post.boardType))}</div>
                <a class="admin-user-activity-item__title" href="/post-detail?id=${post.id}" target="_blank" rel="noopener noreferrer">${sanitizeHTML(post.title || `게시글 #${post.id}`)}</a>
                <div class="admin-user-activity-item__sub">좋아요 ${Number(post.likeCount || 0).toLocaleString()} · 댓글 ${Number(post.commentCount || 0).toLocaleString()}</div>
            </article>
        `,
        '최근 게시글이 없습니다.'
    );

    renderAdminActivityItems(
        'admin-user-activity-comments',
        activity.recentComments,
        (comment) => `
            <article class="admin-user-activity-item">
                <div class="admin-user-activity-item__meta">${formatDate(comment.createdAt)} · ${sanitizeHTML(formatAdminActivityBoardLabel(comment.postBoardType))}</div>
                <a class="admin-user-activity-item__title" href="/post-detail?id=${comment.postId}" target="_blank" rel="noopener noreferrer">${sanitizeHTML(comment.postTitle || `게시글 #${comment.postId}`)}</a>
                <div class="admin-user-activity-item__sub">${escapeHtmlAndPreserveLineBreaks(comment.content, 100)}</div>
            </article>
        `,
        '최근 댓글이 없습니다.'
    );

    renderAdminActivityItems(
        'admin-user-activity-likes',
        activity.recentLikedPosts,
        (post) => `
            <article class="admin-user-activity-item">
                <div class="admin-user-activity-item__meta">${formatDate(post.likedAt)} · ${sanitizeHTML(formatAdminActivityBoardLabel(post.boardType))}</div>
                <a class="admin-user-activity-item__title" href="/post-detail?id=${post.id}" target="_blank" rel="noopener noreferrer">${sanitizeHTML(post.title || `게시글 #${post.id}`)}</a>
                <div class="admin-user-activity-item__sub">작성일 ${formatDate(post.createdAt)} · 전체 좋아요 ${Number(post.likeCount || 0).toLocaleString()}</div>
            </article>
        `,
        '최근 좋아요 기록이 없습니다.'
    );

    renderAdminActivityItems(
        'admin-user-login-history',
        activity.loginHistories,
        (history) => `
            <article class="admin-user-activity-item">
                <div class="admin-user-activity-item__meta">${formatDate(history.createdAt)}</div>
                <div class="admin-user-activity-item__title admin-user-activity-item__title--plain">${sanitizeHTML(history.ipAddress || 'unknown')}</div>
                <div class="admin-user-activity-item__sub">${escapeHtmlAndPreserveLineBreaks(history.userAgent || 'User-Agent 정보 없음', 140)}</div>
            </article>
        `,
        '기록된 접속 IP가 없습니다.'
    );
}

function resetAdminUserActivity() {
    renderAdminUserActivity({
        stats: { postCount: 0, commentCount: 0, attendanceCount: 0, reviewCount: 0, recommendCount: 0 },
        recentPosts: [],
        recentComments: [],
        recentLikedPosts: [],
        loginHistories: []
    });
}

function bindUserEditForm() {
    const phoneInput = document.getElementById('admin-user-phone');
    const passwordInput = document.getElementById('admin-user-password');
    const passwordConfirmInput = document.getElementById('admin-user-password-confirm');
    const passwordMatchResult = document.getElementById('admin-user-password-match-result');
    const accountStatusEl = document.getElementById('admin-user-account-status');
    const loginRestrictionPermanentEl = document.getElementById('admin-user-login-restriction-permanent');

    phoneInput?.addEventListener('input', () => {
        phoneInput.value = formatPhoneNumber(phoneInput.value);
    });

    const syncPasswordMatchMessage = () => {
        if (!passwordMatchResult || !passwordConfirmInput) return;

        const password = passwordInput?.value.trim() || '';
        const passwordConfirm = passwordConfirmInput.value.trim();

        if (!password && !passwordConfirm) {
            passwordMatchResult.textContent = '';
            return;
        }

        if (!passwordConfirm) {
            passwordMatchResult.textContent = '변경할 비밀번호를 한 번 더 입력해주세요.';
            passwordMatchResult.style.color = '#6c757d';
            return;
        }

        if (password !== passwordConfirm) {
            passwordMatchResult.textContent = '비밀번호와 비밀번호 확인이 다릅니다.';
            passwordMatchResult.style.color = '#dc3545';
            return;
        }

        passwordMatchResult.textContent = '비밀번호와 비밀번호 확인이 일치합니다.';
        passwordMatchResult.style.color = '#198754';
    };

    passwordInput?.addEventListener('input', syncPasswordMatchMessage);
    passwordConfirmInput?.addEventListener('input', syncPasswordMatchMessage);
    accountStatusEl?.addEventListener('change', syncLoginRestrictionFields);
    loginRestrictionPermanentEl?.addEventListener('change', syncLoginRestrictionFields);
}

function fillUserEditForm(user) {
    document.getElementById('admin-user-email').value = user.email || '';
    document.getElementById('admin-user-email-display').value = user.email || '';
    document.getElementById('admin-user-name').value = user.name || user.nickname || '';
    document.getElementById('admin-user-birth').value = user.birthDate || '';
    document.getElementById('admin-user-nickname').value = user.nickname || '';
    document.getElementById('admin-user-phone').value = formatPhoneNumber(user.phone || '');
    document.getElementById('admin-user-sms-consent').checked = Boolean(user.smsConsent);
    document.getElementById('admin-user-total-points').value = Number(user.totalPoints || 0);
    document.getElementById('admin-user-role').value = user.role || 'MEMBER';
    document.getElementById('admin-user-member-type').value = user.memberType || 'MEMBER';
    document.getElementById('admin-user-account-status').value = user.accountStatus || ACCOUNT_STATUS.ACTIVE;
    document.getElementById('admin-user-login-restriction-permanent').checked = Boolean(user.isLoginRestrictionPermanent);
    document.getElementById('admin-user-login-restriction-days').value = '';
    document.getElementById('admin-user-login-restricted-until').value = user.isLoginRestrictionPermanent
        ? '영구 제한'
        : (user.loginRestrictedUntil ? formatDate(user.loginRestrictedUntil) : '');
    document.getElementById('admin-user-created-at').value = formatDate(user.createdAt || user.created_at);
    document.getElementById('admin-user-password').value = '';
    document.getElementById('admin-user-password-confirm').value = '';
    document.getElementById('admin-user-password-match-result').textContent = '';
    setAdminUserHelpMessage('');
    syncLoginRestrictionFields();
}

async function openUserEditModal(userId, options = {}) {
    const { syncHistory = true, replaceHistory = true } = options;

    try {
        const response = await APIClient.get(`/admin/users/${userId}`);
        const user = response.user;
        if (!user) throw new Error('회원 정보를 찾을 수 없습니다.');

        editingUserId = userId;
        document.getElementById('user-edit-modal-title').textContent = `회원 정보 수정 #${userId}`;
        fillUserEditForm(user);
        renderAdminUserActivity(response.activity || {});
        document.getElementById('user-edit-modal')?.classList.remove('hidden');
        document.getElementById('user-edit-modal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (syncHistory) {
            syncAdminPageState({ activeTab: 'users', editUserId: userId }, { replace: replaceHistory });
        }
    } catch (error) {
        if (syncHistory) {
            syncAdminPageState({ activeTab: 'users', editUserId: null }, { replace: true });
        }
        alert(error.message || '회원 정보를 불러오지 못했습니다.');
    }
}

function closeUserEditModal() {
    editingUserId = null;
    document.getElementById('user-edit-form')?.reset();
    document.getElementById('admin-user-password-match-result').textContent = '';
    setAdminUserHelpMessage('');
    resetAdminUserActivity();
    document.getElementById('user-edit-modal')?.classList.add('hidden');
    syncAdminPageState({ activeTab: 'users', editUserId: null }, { replace: true });
}

async function saveUserDetail() {
    if (!editingUserId) return;

    const nickname = document.getElementById('admin-user-nickname')?.value?.trim() || '';
    const password = document.getElementById('admin-user-password')?.value?.trim() || '';
    const passwordConfirm = document.getElementById('admin-user-password-confirm')?.value?.trim() || '';
    const phone = formatPhoneNumber(document.getElementById('admin-user-phone')?.value?.trim() || '');
    const totalPoints = Number.parseInt(document.getElementById('admin-user-total-points')?.value || '0', 10);
    const role = document.getElementById('admin-user-role')?.value || 'MEMBER';
    const memberType = document.getElementById('admin-user-member-type')?.value || 'MEMBER';
    const smsConsent = document.getElementById('admin-user-sms-consent')?.checked || false;
    const accountStatus = document.getElementById('admin-user-account-status')?.value || ACCOUNT_STATUS.ACTIVE;
    const loginRestrictionDaysValue = document.getElementById('admin-user-login-restriction-days')?.value || '';
    const isLoginRestrictionPermanent = document.getElementById('admin-user-login-restriction-permanent')?.checked || false;
    const saveButton = document.getElementById('user-edit-save-btn');

    document.getElementById('admin-user-phone').value = phone;

    const nicknameLength = Array.from(nickname).length;
    if (nicknameLength < VALIDATION.NICKNAME_MIN_LENGTH || nicknameLength > VALIDATION.NICKNAME_MAX_LENGTH) {
        setAdminUserHelpMessage(`닉네임은 ${VALIDATION.NICKNAME_MIN_LENGTH}자 이상 ${VALIDATION.NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`, '#dc3545');
        return;
    }

    if (!validateNoBlockedExpression(nickname, '닉네임')) {
        setAdminUserHelpMessage('닉네임에 사용할 수 없는 표현이 포함되어 있습니다.', '#dc3545');
        return;
    }

    if (password && password !== passwordConfirm) {
        setAdminUserHelpMessage('비밀번호와 비밀번호 확인이 일치하지 않습니다.', '#dc3545');
        return;
    }

    if (phone && !PHONE_PATTERN.test(phone)) {
        setAdminUserHelpMessage('연락처 형식은 010-0000-0000으로 입력해 주세요.', '#dc3545');
        return;
    }

    if (!Number.isInteger(totalPoints) || totalPoints < 0) {
        setAdminUserHelpMessage('포인트는 0 이상의 정수만 입력할 수 있습니다.', '#dc3545');
        return;
    }

    if (accountStatus === ACCOUNT_STATUS.SUSPENDED && !isLoginRestrictionPermanent) {
        const loginRestrictionDays = Number.parseInt(loginRestrictionDaysValue, 10);
        if (!Number.isInteger(loginRestrictionDays) || loginRestrictionDays < 1) {
            setAdminUserHelpMessage('로그인 제한 일수는 1일 이상의 정수로 입력해주세요.', '#dc3545');
            return;
        }
    }

    const payload = {
        nickname,
        phone,
        totalPoints,
        role,
        memberType,
        accountStatus,
        loginRestrictionDays: accountStatus === ACCOUNT_STATUS.SUSPENDED && !isLoginRestrictionPermanent
            ? Number.parseInt(loginRestrictionDaysValue, 10)
            : null,
        isLoginRestrictionPermanent,
        smsConsent
    };

    if (password) payload.password = password;

    try {
        if (saveButton) saveButton.disabled = true;
        setAdminUserHelpMessage('저장 중입니다...');
        await APIClient.put(`/admin/users/${editingUserId}`, payload);
        closeUserEditModal();
        await loadUsers();
        alert('회원 정보가 저장되었습니다.');
    } catch (error) {
        setAdminUserHelpMessage(error.message || '회원 정보 저장에 실패했습니다.', '#dc3545');
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

async function loadAds() {
    toggleLoading('ads', true);
    try {
        await ensureAdStoresLoaded();
        const response = await APIClient.get('/admin/ads');
        ADMIN_LIST_STATE.ads.items = response.content || [];
        renderAdsTable();
        showContent('ads');
    } catch (error) {
        showError('ads', error.message || '광고 목록을 불러오지 못했습니다.');
    }
}

async function ensureAdStoresLoaded() {
    if (adStores.length) return;
    const response = await APIClient.get('/admin/entries/stores');
    adStores = Array.isArray(response.content) ? response.content : [];
    renderAdStoreOptions();
}

function renderAdStoreOptions() {
    const select = document.getElementById('ads-form-store-no');
    const adType = String(document.getElementById('ads-form-ad-type')?.value || 'LIVE').trim().toUpperCase();
    const storeLabel = document.querySelector('label[for="ads-form-store-no"]');
    if (!select) return;

    if (adType === 'TOP') {
        if (storeLabel) storeLabel.textContent = '노출 위치(스크롤 선택)';
        select.innerHTML = ['<option value="">전체/미지정</option>', ...TOP_AD_PLACEMENT_OPTIONS.map((placement) => (
            `<option value="${placement.value}">${placement.label}</option>`
        ))].join('');
        return;
    }

    if (storeLabel) storeLabel.textContent = '매장 선택(storeNo, 스크롤 선택)';
    select.innerHTML = ['<option value="">전체/미지정</option>', ...adStores.map((store) => (
        `<option value="${store.storeNo}">#${store.storeNo} ${sanitizeHTML(store.storeName || '')}</option>`
    ))].join('');
}

function handleAdTypeChange() {
    const select = document.getElementById('ads-form-store-no');
    if (!select) return;
    select.value = '';
    renderAdStoreOptions();
}

function setAdHelpMessage(message, color = '#6c757d') {
    const help = document.getElementById('ads-form-help');
    if (!help) return;
    help.textContent = message;
    help.style.color = color;
}

function fillAdEditorForm(ad = null) {
    const isEdit = Boolean(ad && Number.isInteger(Number(ad.id)));
    editingAdId = isEdit ? Number(ad.id) : null;

    document.getElementById('ads-editor-title').textContent = isEdit ? `광고 수정 #${ad.id}` : '새 광고 등록';
    document.getElementById('ads-save-btn').textContent = isEdit ? '광고 수정 저장' : '광고 등록';
    document.getElementById('ads-cancel-btn')?.classList.toggle('hidden', !isEdit);
    document.getElementById('ads-form-title').value = ad?.title || '';
    document.getElementById('ads-form-link-url').value = ad?.linkUrl || '';
    document.getElementById('ads-form-ad-type').value = ad?.adType || 'LIVE';
    renderAdStoreOptions();
    document.getElementById('ads-form-store-no').value = ad?.storeNo ? String(ad.storeNo) : '';
    document.getElementById('ads-form-image-url').value = ad?.imageUrl || '';
    document.getElementById('ads-form-display-order').value = Number(ad?.displayOrder || 0);
    document.getElementById('ads-form-is-active').value = String(Boolean(ad?.isActive));
    document.getElementById('ads-form-image-file').value = '';
    document.getElementById('ads-form-image-help').textContent = ad?.imageUrl ? '현재 이미지를 사용 중입니다. 새 파일 업로드 시 교체됩니다.' : '이미지를 선택하고 업로드 버튼을 누르세요.';
    setAdHelpMessage('');
}

function resetAdEditor() {
    fillAdEditorForm(null);
}

async function openAdEditor(adId) {
    const target = (ADMIN_LIST_STATE.ads.items || []).find((item) => Number(item.id) === Number(adId));
    if (!target) {
        alert('광고 정보를 찾을 수 없습니다.');
        return;
    }
    fillAdEditorForm(target);
    document.getElementById('ads-editor-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function uploadAdImage() {
    const fileInput = document.getElementById('ads-form-image-file');
    const help = document.getElementById('ads-form-image-help');
    const imageUrlInput = document.getElementById('ads-form-image-url');
    const uploadButton = document.getElementById('ads-image-upload-btn');
    const file = fileInput?.files?.[0];

    if (!file) {
        setAdHelpMessage('먼저 업로드할 이미지를 선택해주세요.', '#dc3545');
        return;
    }

    if (!String(file.type || '').startsWith('image/')) {
        setAdHelpMessage('이미지 파일만 업로드할 수 있습니다.', '#dc3545');
        return;
    }

    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('이미지 파일을 읽지 못했습니다.'));
        reader.readAsDataURL(file);
    });

    try {
        if (uploadButton) {
            uploadButton.disabled = true;
            uploadButton.textContent = '업로드 중...';
        }
        const response = await APIClient.post('/uploads/ads/images', {
            files: [{ dataUrl, fileName: file.name }]
        });
        const uploaded = Array.isArray(response.files) ? response.files[0] : null;
        if (!uploaded?.url) throw new Error('업로드 URL을 받지 못했습니다.');

        if (imageUrlInput) imageUrlInput.value = uploaded.url;
        if (help) help.textContent = '이미지 업로드가 완료되었습니다.';
        setAdHelpMessage('광고 이미지가 S3에 업로드되었습니다.', '#198754');
    } catch (error) {
        setAdHelpMessage(error.message || '광고 이미지 업로드에 실패했습니다.', '#dc3545');
    } finally {
        if (uploadButton) {
            uploadButton.disabled = false;
            uploadButton.textContent = '이미지 업로드';
        }
    }
}

async function saveAd() {
    const saveButton = document.getElementById('ads-save-btn');
    const wasEdit = Boolean(editingAdId);
    const payload = {
        title: document.getElementById('ads-form-title')?.value?.trim() || '',
        imageUrl: document.getElementById('ads-form-image-url')?.value?.trim() || '',
        linkUrl: document.getElementById('ads-form-link-url')?.value?.trim() || '',
        adType: String(document.getElementById('ads-form-ad-type')?.value || 'LIVE').trim().toUpperCase(),
        storeNo: (() => {
            const raw = document.getElementById('ads-form-store-no')?.value || '';
            return raw ? Number.parseInt(raw, 10) : null;
        })(),
        displayOrder: Number(document.getElementById('ads-form-display-order')?.value || 0) || 0,
        isActive: String(document.getElementById('ads-form-is-active')?.value || 'true') === 'true'
    };

    if (!payload.title || !payload.imageUrl || !payload.linkUrl) {
        setAdHelpMessage('제목, 이미지 URL, 링크 URL은 필수입니다.', '#dc3545');
        return;
    }
    if (!isValidExternalUrl(payload.linkUrl)) {
        setAdHelpMessage('광고 링크 URL은 http:// 또는 https:// 형식이어야 합니다.', '#dc3545');
        return;
    }
    if (payload.adType === 'LIVE' && (!Number.isInteger(payload.storeNo) || payload.storeNo <= 0)) {
        setAdHelpMessage('LIVE 광고는 매장을 선택해야 합니다.', '#dc3545');
        return;
    }

    try {
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = '저장 중...';
        }
        if (wasEdit) await APIClient.put(`/admin/ads/${editingAdId}`, payload);
        else await APIClient.post('/admin/ads', payload);
        resetAdEditor();
        await loadAds();
        setAdHelpMessage('광고가 저장되었습니다.', '#198754');
    } catch (error) {
        setAdHelpMessage(error.message || '광고 저장에 실패했습니다.', '#dc3545');
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = wasEdit ? '광고 수정 저장' : '광고 등록';
        }
    }
}

function isValidExternalUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function normalizeExternalUrl(url) {
    const target = String(url || '').trim();
    return isValidExternalUrl(target) ? target : '#';
}

async function loadSupportArticles() {
    toggleLoading('support', true);
    try {
        const articles = await fetchSupportArticles();
        ADMIN_LIST_STATE.support.items = articles;
        renderSupportTable();
        showContent('support');
    } catch (error) {
        showError('support', error.message || '공지/FAQ를 불러오지 못했습니다.');
    }
}

async function fetchSupportArticles() {
    if (currentSupportCategory !== 'NOTICE') {
        const response = await APIClient.get('/admin/support', {
            category: currentSupportCategory,
            sourceType: 'SUPPORT'
        });
        return response.content || [];
    }

    const [postResponse, supportResponse] = await Promise.all([
        APIClient.get('/admin/support', { category: 'NOTICE', sourceType: 'POST' }),
        APIClient.get('/admin/support', { category: 'NOTICE', sourceType: 'SUPPORT' })
    ]);

    const merged = [...(postResponse.content || []), ...(supportResponse.content || [])];
    return merged.sort((a, b) => {
        const pinnedGap = Number(b.isPinned || 0) - Number(a.isPinned || 0);
        if (pinnedGap !== 0) return pinnedGap;

        const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
        if (timeA !== timeB) return timeB - timeA;

        return Number(b.id || 0) - Number(a.id || 0);
    });
}

async function openSupportModal(id = null, sourceType = 'SUPPORT') {
    const titleEl = document.getElementById('support-modal-title');
    const categoryEl = document.getElementById('support-form-category');
    const noticeOptionEl = document.getElementById('support-notice-options');
    const noticeTypeEl = document.getElementById('support-form-notice-type');
    const isPinnedEl = document.getElementById('support-form-is-pinned');
    const subjectEl = document.getElementById('support-form-title');
    const contentEl = document.getElementById('support-form-content');

    if (!categoryEl || !subjectEl || !contentEl) return;

    const syncNoticeOptionVisibility = () => {
        if (!noticeOptionEl) return;
        noticeOptionEl.classList.toggle('hidden', categoryEl.value !== 'NOTICE');
    };

    if (!id) {
        supportEditTarget = null;
        titleEl.textContent = '공지/FAQ 작성';
        categoryEl.value = currentSupportCategory;
        subjectEl.value = '';
        contentEl.value = '';
        if (noticeTypeEl) noticeTypeEl.value = 'NOTICE';
        if (isPinnedEl) isPinnedEl.checked = false;
    } else {
        let target;
        try {
            target = await APIClient.get(`/admin/support/article/${id}`, {
                sourceType
            });
        } catch (error) {
            alert(error.message || '글을 찾을 수 없습니다.');
            return;
        }

        supportEditTarget = { id: Number(target.sourceId || target.id), sourceType: String(target.sourceType || sourceType || 'SUPPORT') };
        titleEl.textContent = '공지/FAQ 수정';
        categoryEl.value = target.category || currentSupportCategory;
        subjectEl.value = target.title || '';
        contentEl.value = target.content || '';
        if (noticeTypeEl) noticeTypeEl.value = target.noticeType || 'NOTICE';
        if (isPinnedEl) isPinnedEl.checked = Boolean(target.isPinned);
    }

    categoryEl.onchange = syncNoticeOptionVisibility;
    syncNoticeOptionVisibility();

    document.getElementById('support-modal')?.classList.remove('hidden');
}

async function handleAdminTableActionClick(event) {
    const actionElement = event.target.closest('[data-admin-action]');
    if (!actionElement || actionElement.disabled) return;

    event.preventDefault();

    const action = actionElement.dataset.adminAction;
    const targetIdRaw = actionElement.dataset.targetId;
    const targetId = Number.parseInt(targetIdRaw, 10);
    const targetType = actionElement.dataset.targetType;
    const sourceType = actionElement.dataset.sourceType || 'SUPPORT';
    const entryId = actionElement.dataset.entryId;
    const entryName = actionElement.dataset.entryName || '';

    if (action === 'delete' && targetType === 'entry' && entryId) {
        openAdminActionModal({
            action,
            type: targetType,
            entryId,
            entryName
        });
        return;
    }

    if (action === 'delete' && Number.isInteger(targetId) && targetType) {
        openAdminActionModal({
            action,
            type: targetType,
            id: targetId,
            sourceType
        });
        return;
    }

    if (action === 'edit-entry' && entryId) {
        startEntryEdit({ entryId, workerName: entryName });
        return;
    }

    if (action === 'edit-ad' && Number.isInteger(targetId)) {
        await openAdEditor(targetId);
        return;
    }

    if (action === 'edit-support' && Number.isInteger(targetId)) {
        const category = encodeURIComponent(currentSupportCategory || 'NOTICE');
        const query = `?id=${targetId}&sourceType=${encodeURIComponent(sourceType)}&category=${category}`;
        window.location.href = `/admin/support/create${query}`;
        return;
    }

    if (action === 'edit-user' && Number.isInteger(targetId)) {
        await openUserEditModal(targetId);
        return;
    }

    if (action === 'answer-inquiry' && Number.isInteger(targetId)) {
        await openInquiryAnswerModal(targetId);
        return;
    }

    if (action === 'edit-entry' && !entryId) {
        alert('엔트리 정보를 확인할 수 없어 요청을 처리하지 못했습니다. 목록을 새로고침 후 다시 시도해주세요.');
        return;
    }

    if (['delete', 'toggle-hide', 'edit-ad', 'edit-support', 'edit-user', 'answer-inquiry'].includes(action) && !entryId && !Number.isInteger(targetId)) {
        alert('대상 정보를 확인할 수 없어 요청을 처리하지 못했습니다. 목록을 새로고침 후 다시 시도해주세요.');
    }
}

function closeSupportModal() {
    supportEditTarget = null;
    document.getElementById('support-modal')?.classList.add('hidden');
}

async function saveSupportArticle() {
    const category = document.getElementById('support-form-category')?.value || 'NOTICE';
    const noticeType = document.getElementById('support-form-notice-type')?.value || 'NOTICE';
    const isPinned = document.getElementById('support-form-is-pinned')?.checked || false;
    const title = document.getElementById('support-form-title')?.value?.trim();
    const content = document.getElementById('support-form-content')?.value?.trim();

    if (!title || !content) {
        alert('제목과 내용을 입력해주세요.');
        return;
    }

    try {
        if (supportEditTarget) {
            await APIClient.put(`/admin/support/${supportEditTarget.id}?sourceType=${encodeURIComponent(supportEditTarget.sourceType)}`, { category, title, content, noticeType, isPinned, sourceType: supportEditTarget.sourceType });
        } else {
            await APIClient.post('/admin/support', { category, title, content, noticeType, isPinned, sourceType: category === 'NOTICE' ? 'POST' : 'SUPPORT' });
        }

        currentSupportCategory = category;
        const categorySelect = document.getElementById('support-category');
        if (categorySelect) categorySelect.value = category;

        closeSupportModal();
        await loadSupportArticles();
    } catch (error) {
        alert(error.message || '저장에 실패했습니다.');
    }
}



function toInquiryTypeLabel(type) {
    const normalized = String(type || '').toLowerCase();
    if (normalized === 'post_report') return '게시글 신고';
    if (normalized === 'comment_report') return '댓글 신고';
    if (normalized === 'question') return '일반 문의';
    if (normalized === 'account') return '계정 문의';
    if (normalized === 'service_error') return '서비스 오류';
    if (normalized === 'ad_inquiry') return '광고 문의';
    if (normalized === 'etc' || normalized === 'other') return '기타';
    return '기타';
}

function toInquiryStatusInfo(status) {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'ANSWERED') return { text: '답변완료', className: 'is-completed' };
    return { text: '대기', className: '' };
}

async function loadInquiries() {
    toggleLoading('inquiries', true);
    try {
        const params = currentInquiryStatus ? { status: currentInquiryStatus } : {};
        const response = await APIClient.get('/admin/support/inquiries', params);
        ADMIN_LIST_STATE.inquiries.items = response.content || [];
        renderInquiriesTable();
        showContent('inquiries');
    } catch (error) {
        showError('inquiries', error.message || '문의 목록을 불러오지 못했습니다.');
    }
}

async function openInquiryAnswerModal(inquiryId) {
    try {
        const response = await APIClient.get('/admin/support/inquiries', currentInquiryStatus ? { status: currentInquiryStatus } : {});
        const target = (response.content || []).find((item) => Number(item.id) === Number(inquiryId));
        if (!target) {
            alert('문의를 찾을 수 없습니다.');
            return;
        }

        inquiryAnswerTarget = target;
        document.getElementById('inquiry-answer-modal-title').textContent = `문의 #${target.id} 답변`;
        document.getElementById('inquiry-answer-target').textContent = `${toInquiryTypeLabel(target.type)} · ${target.userNickname || target.userEmail || `회원#${target.userId}`} · ${target.title || ''}`;
        document.getElementById('inquiry-answer-content').value = target.answerContent || '';
        document.getElementById('inquiry-answer-modal')?.classList.remove('hidden');
    } catch (error) {
        alert(error.message || '문의 정보를 불러오지 못했습니다.');
    }
}

function closeInquiryAnswerModal() {
    inquiryAnswerTarget = null;
    document.getElementById('inquiry-answer-modal')?.classList.add('hidden');
}

async function saveInquiryAnswer() {
    if (!inquiryAnswerTarget) return;
    const answerContent = document.getElementById('inquiry-answer-content')?.value?.trim() || '';
    if (!answerContent) {
        alert('답변 내용을 입력해주세요.');
        return;
    }

    try {
        await APIClient.put(`/admin/support/inquiries/${inquiryAnswerTarget.id}/answer`, { answerContent });
        closeInquiryAnswerModal();
        await loadInquiries();
    } catch (error) {
        alert(error.message || '답변 저장에 실패했습니다.');
    }
}


function bindAdminHideToggleButtons(container) {
    if (!container) return;

    const buttons = container.querySelectorAll('[data-admin-action="toggle-hide"]');
    buttons.forEach((button) => {
        button.onclick = async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const targetId = Number.parseInt(button.dataset.targetId || '', 10);
            const targetType = button.dataset.targetType;
            const isHidden = button.dataset.currentHidden === 'true';

            if (!Number.isInteger(targetId) || !targetType) {
                alert('대상 정보를 확인할 수 없어 요청을 처리하지 못했습니다. 목록을 새로고침 후 다시 시도해주세요.');
                return;
            }

            await toggleAdminHiddenState(button, {
                type: targetType,
                id: targetId,
                isHidden
            });
        };
    });
}

function renderAdminPostFlags(post) {
    const flags = [];
    if (isHiddenPost(post)) {
        flags.push('<span class="admin-comment-flag hidden">가려짐</span>');
    }
    return flags.join('');
}

function getAdminPostRowClass(post) {
    return isHiddenPost(post) ? 'admin-comment-row-hidden' : '';
}

function renderAdminCommentFlags(comment) {
    const flags = [];
    if (isHiddenComment(comment)) {
        flags.push('<span class="admin-comment-flag hidden">가려짐</span>');
    }
    if (isDeletedComment(comment)) {
        flags.push('<span class="admin-comment-flag deleted">삭제됨</span>');
    }
    if (isSecretComment(comment)) {
        flags.push('<span class="admin-comment-flag secret">비밀댓글</span>');
    }
    return flags.join('');
}

function getAdminCommentRowClass(comment) {
    const classes = [];
    if (isHiddenComment(comment)) classes.push('admin-comment-row-hidden');
    if (isDeletedComment(comment)) classes.push('admin-comment-row-deleted');
    if (isSecretComment(comment)) classes.push('admin-comment-row-secret');
    return classes.join(' ');
}

function isHiddenPost(post) {
    return Boolean(post.isHidden || post.is_hidden);
}

function isHiddenComment(comment) {
    return Boolean(comment.isHidden || comment.is_hidden);
}

function isDeletedComment(comment) {
    return Boolean(comment.isDeleted || comment.is_deleted);
}

function isSecretComment(comment) {
    return Boolean(comment.isSecret || comment.is_secret);
}

function toggleLoading(prefix, isLoading) {
    document.getElementById(`${prefix}-loading`)?.classList.toggle('hidden', !isLoading);
    document.getElementById(`${prefix}-error`)?.classList.add('hidden');
    if (isLoading) {
        document.getElementById(`${prefix}-content`)?.classList.add('hidden');
    }
}

function showContent(prefix) {
    document.getElementById(`${prefix}-loading`)?.classList.add('hidden');
    document.getElementById(`${prefix}-error`)?.classList.add('hidden');
    document.getElementById(`${prefix}-content`)?.classList.remove('hidden');
}

function showError(prefix, message) {
    document.getElementById(`${prefix}-loading`)?.classList.add('hidden');
    document.getElementById(`${prefix}-content`)?.classList.add('hidden');
    const errorBox = document.getElementById(`${prefix}-error`);
    const errorMessage = document.getElementById(`${prefix}-error-message`);
    if (errorMessage) errorMessage.textContent = message;
    if (errorBox) errorBox.classList.remove('hidden');
}

function openAdminActionModal(target) {
    adminActionTarget = target;
    const modal = document.getElementById('delete-modal');
    const title = document.getElementById('delete-modal-title');
    const message = document.getElementById('delete-modal-message');
    const helpText = modal?.querySelector('.text-muted.text-sm');

    if (target.type === 'post') {
        if (title) title.textContent = '게시글 삭제';
        if (message) message.textContent = '이 게시글을 삭제하시겠습니까?';
    } else if (target.type === 'comment') {
        if (title) title.textContent = '댓글 삭제';
        if (message) message.textContent = '이 댓글을 삭제하시겠습니까?';
    } else if (target.type === 'user') {
        if (title) title.textContent = '회원 삭제';
        if (message) message.textContent = '이 회원을 삭제하시겠습니까?';
    } else if (target.type === 'ad') {
        if (title) title.textContent = '광고 삭제';
        if (message) message.textContent = '이 광고를 삭제하시겠습니까?';
        if (helpText) helpText.textContent = '삭제된 내용은 복구할 수 없습니다.';
    } else if (target.type === 'entry') {
        if (title) title.textContent = '엔트리 삭제';
        if (message) message.textContent = `"${target.entryName || '선택한 엔트리'}" 항목을 삭제하시겠습니까?`;
        if (helpText) helpText.textContent = '삭제된 엔트리 이름은 복구할 수 없습니다.';
    } else {
        if (title) title.textContent = '공지/FAQ 삭제';
        if (message) message.textContent = '이 글을 삭제하시겠습니까?';
        if (helpText) helpText.textContent = '삭제된 내용은 복구할 수 없습니다.';
    }

    if (helpText && target.type !== 'entry') helpText.textContent = '삭제된 내용은 복구할 수 없습니다.';
    modal?.classList.remove('hidden');
}

function closeDeleteModal() {
    adminActionTarget = null;
    document.getElementById('delete-modal')?.classList.add('hidden');
}

async function toggleAdminHiddenState(actionElement, target) {
    const nextHidden = !target.isHidden;
    const originalText = actionElement.textContent;
    const originalDisabled = actionElement.disabled;

    actionElement.disabled = true;
    actionElement.textContent = nextHidden ? '처리 중...' : '해제 중...';

    try {
        await APIClient.put(`/admin/${target.type === 'post' ? 'posts' : 'comments'}/${target.id}/hide`, { isHidden: nextHidden });
        if (target.type === 'post') await loadPosts();
        else await loadComments();
    } catch (error) {
        actionElement.disabled = originalDisabled;
        actionElement.textContent = originalText;
        alert(error.message || '가리기 설정 변경에 실패했습니다.');
    }
}

async function confirmDelete() {
    if (!adminActionTarget) return;
    const confirmButton = document.getElementById('delete-confirm-btn');
    const originalText = confirmButton?.textContent || '삭제';

    try {
        if (confirmButton) {
            confirmButton.disabled = true;
            confirmButton.textContent = '삭제 중...';
        }
        if (adminActionTarget.type === 'post') {
            await APIClient.delete(`/admin/posts/${adminActionTarget.id}`);
            closeDeleteModal();
            await loadPosts();
        } else if (adminActionTarget.type === 'comment') {
            await APIClient.delete(`/admin/comments/${adminActionTarget.id}`);
            closeDeleteModal();
            await loadComments();
        } else if (adminActionTarget.type === 'user') {
            await APIClient.delete(`/admin/users/${adminActionTarget.id}`);
            closeDeleteModal();
            await loadUsers();
        } else if (adminActionTarget.type === 'ad') {
            await APIClient.delete(`/admin/ads/${adminActionTarget.id}`);
            closeDeleteModal();
            await loadAds();
        } else if (adminActionTarget.type === 'entry') {
            await APIClient.delete(`/admin/entries/${encodeURIComponent(adminActionTarget.entryId)}`);
            if (editingEntryId === adminActionTarget.entryId) resetEntryEditor();
            closeDeleteModal();
            await loadEntries();
        } else {
            await APIClient.delete(`/admin/support/${adminActionTarget.id}?sourceType=${encodeURIComponent(adminActionTarget.sourceType || 'SUPPORT')}`);
            closeDeleteModal();
            await loadSupportArticles();
        }
    } catch (error) {
        const fallbackMessage = adminActionTarget.action === 'toggle-hide' ? '가리기 설정 변경에 실패했습니다.' : '삭제에 실패했습니다.';
        alert(error.message || fallbackMessage);
    } finally {
        if (confirmButton) {
            confirmButton.disabled = false;
            confirmButton.textContent = originalText;
        }
    }
}

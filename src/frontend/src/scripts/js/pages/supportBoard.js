/**
 * 파일 역할: 공지사항/FAQ 공개 목록을 불러와 렌더링하는 페이지 스크립트 파일.
 */
let activeTab = window.location.pathname === '/support/faq' ? 'faq' : 'notice';
let latestLoadRequestId = 0;
const FAQ_TOPICS = ['서비스', '채팅', '기업회원', '회원/계정', '기타'];
const FAQ_ALL_TOPIC = '전체';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupportBoardPage, { once: true });
} else {
    initSupportBoardPage();
}

function withTimeout(promise, ms = 8000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')), ms);
        })
    ]);
}

async function initSupportBoardPage() {
    const list = document.getElementById('support-public-list');
    if (!list || list.dataset.initialized === 'true') return;
    list.dataset.initialized = 'true';

    Auth.bindLogoutButton();

    const params = new URLSearchParams(window.location.search);
    const articleId = String(params.get('articleId') || '').trim();
    const sourceType = String(params.get('sourceType') || '').toUpperCase();

    if (articleId) {
        await loadArticleDetail(articleId, sourceType);
        return;
    }

    bindTabEvents();
    await loadArticles();
}

function bindTabEvents() {
    const tabs = document.querySelectorAll('.board-tab');
    tabs.forEach((tabLink) => {
        const isFaqLink = tabLink.getAttribute('href') === '/support/faq';
        const tabType = isFaqLink ? 'faq' : 'notice';
        tabLink.classList.toggle('active', tabType === activeTab);
    });

    syncBoardTitle();

    if (activeTab === 'faq') {
        document.body.classList.add('faq-page-body');
    }
}

function syncBoardTitle() {
    const boardName = document.querySelector('.community-board-name');
    if (boardName) {
        boardName.textContent = activeTab === 'faq' ? 'FAQ' : '공지사항';
    }
}

async function loadArticles() {
    const requestId = ++latestLoadRequestId;
    const loading = document.getElementById('support-public-loading');
    const errorBox = document.getElementById('support-public-error');
    const list = document.getElementById('support-public-list');

    loading?.classList.remove('hidden');
    errorBox?.classList.add('hidden');
    list?.classList.add('hidden');

    try {
        const response = await withTimeout(APIClient.get(`/support/${activeTab}`));
        if (requestId !== latestLoadRequestId) return;
        const rows = response.content || [];

        if (!rows.length) {
            if (list) {
                list.innerHTML = activeTab === 'faq'
                    ? createEmptyFaqState()
                    : '<div class="card">등록된 글이 없습니다.</div>';
                list.classList.remove('hidden');
            }
            return;
        }

        if (list) {
            if (activeTab === 'faq') {
                list.innerHTML = createFaqLayout(rows);
                bindFaqEvents();
            } else {
                list.innerHTML = rows.map((item) => createSupportNoticeCard(item)).join('');
            }
            list.classList.remove('hidden');
        }
    } catch (error) {
        if (requestId !== latestLoadRequestId) return;
        if (errorBox) {
            errorBox.classList.remove('hidden');
            const message = document.getElementById('support-public-error-message');
            if (message) message.textContent = error.message || '목록을 불러오지 못했습니다.';
        }
    } finally {
        if (requestId === latestLoadRequestId) {
            loading?.classList.add('hidden');
        }
    }
}

function createSupportNoticeCard(item) {
    const createdAt = formatDateOnly(item.createdAt || item.created_at);
    const title = sanitizeHTML(item.title || '제목 없음');
    const articleId = encodeURIComponent(item.id || '');
    const sourceType = encodeURIComponent(String(item.sourceType || 'SUPPORT').toUpperCase());

    return `
        <a class="post-card admin-notice" href="/support?articleId=${articleId}&sourceType=${sourceType}" style="display:block;text-decoration:none;color:inherit;">
            <div class="post-header">
                <div class="post-header-left">
                    <h3 class="post-title">[공지] ${title}</h3>
                    <div class="post-meta support-notice-meta">
                        <span class="post-date support-notice-date">${createdAt}</span>
                    </div>
                </div>
            </div>
        </a>
    `;
}

function createSupportFaqCard(item) {
    const createdAt = formatDateOnly(item.createdAt || item.created_at);
    const title = sanitizeHTML(item.title || '제목 없음');
    const content = sanitizeHTML(item.content || '').replace(/\n/g, '<br>');

    return `
        <article class="post-card" style="cursor:default;">
            <div class="post-header">
                <div class="post-header-left">
                    <h3 class="post-title">[FAQ] ${title}</h3>
                    <div class="post-meta support-notice-meta">
                        <span class="post-author">운영팀</span>
                        <span class="post-date support-notice-date">${createdAt}</span>
                    </div>
                </div>
            </div>
            <div class="post-content" style="white-space:normal;line-height:1.7;">${content}</div>
        </article>
    `;
}

function createEmptyFaqState() {
    return `
        <section class="faq-layout">
            <div class="faq-hero"><p class="faq-title">자주 묻는 질문</p></div>
            <div class="faq-empty">등록된 FAQ가 없습니다.</div>
        </section>
    `;
}

function createFaqLayout(rows) {
    const faqItems = rows.map((item) => {
        const topic = inferFaqTopic(item);
        return {
            topic,
            question: sanitizeHTML(item.title || '제목 없음'),
            answer: sanitizeHTML(item.content || '').replace(/\n/g, '<br>')
        };
    });

    const tabsMarkup = [FAQ_ALL_TOPIC, ...FAQ_TOPICS].map((topic, index) => `
        <button type="button" class="faq-topic-tab ${index === 0 ? 'active' : ''}" data-topic="${topic}">${topic}</button>
    `).join('');

    const itemsMarkup = faqItems.map((item) => `
        <article class="faq-item" data-topic="${item.topic}" data-search-text="${(item.question + ' ' + item.answer).toLowerCase()}">
            <button type="button" class="faq-question" data-faq-toggle>
                <span class="faq-question-text">Q. ${item.question}</span>
                <span class="faq-chevron" aria-hidden="true">⌄</span>
            </button>
            <div class="faq-answer-wrap">
                <div class="faq-answer">${item.answer}</div>
            </div>
        </article>
    `).join('');

    return `
        <section class="faq-layout" id="faq-layout">
            <div class="faq-hero">
                <p class="faq-title">자주 묻는 질문</p>
                <div class="faq-search-box">
                    <span class="faq-search-icon" aria-hidden="true">🔍</span>
                    <input id="faq-search-input" class="faq-search-input" type="text" placeholder="찾으시는 질문을 검색해보세요.">
                </div>
            </div>
            <div class="faq-topic-tabs" id="faq-topic-tabs">${tabsMarkup}</div>
            <div id="faq-items">${itemsMarkup}</div>
        </section>
    `;
}

function inferFaqTopic(item) {
    const rawTopic = String(item.topic || item.subCategory || item.sub_category || item.section || '').trim();
    if (FAQ_TOPICS.includes(rawTopic)) return rawTopic;

    const text = `${item.title || ''} ${item.content || ''}`;
    if (/채팅|메시지|대화/i.test(text)) return '채팅';
    if (/기업|비즈니스|파트너/i.test(text)) return '기업회원';
    if (/회원|계정|로그인|가입|비밀번호|인증/i.test(text)) return '회원/계정';
    if (/서비스|이용|운영|앱|웹|플랫폼/i.test(text)) return '서비스';
    return '기타';
}

function bindFaqEvents() {
    const searchInput = document.getElementById('faq-search-input');
    const topicTabs = document.querySelectorAll('.faq-topic-tab');
    const items = document.querySelectorAll('.faq-item');

    let selectedTopic = FAQ_ALL_TOPIC;

    const applyFilter = () => {
        const query = String(searchInput?.value || '').trim().toLowerCase();
        items.forEach((item) => {
            const topic = item.dataset.topic;
            const text = item.dataset.searchText || '';
            const matchTopic = selectedTopic === FAQ_ALL_TOPIC || topic === selectedTopic;
            const matchQuery = !query || text.includes(query);

            item.classList.toggle('hidden', !(matchTopic && matchQuery));
        });
    };

    topicTabs.forEach((tab) => {
        tab.classList.toggle('active', (tab.dataset.topic || '') === selectedTopic);

        tab.addEventListener('click', () => {
            selectedTopic = tab.dataset.topic || FAQ_ALL_TOPIC;
            topicTabs.forEach((button) => button.classList.remove('active'));
            tab.classList.add('active');
            applyFilter();
        });
    });

    items.forEach((item) => {
        const toggleButton = item.querySelector('[data-faq-toggle]');
        const answerWrap = item.querySelector('.faq-answer-wrap');
        if (!toggleButton || !answerWrap) return;

        toggleButton.addEventListener('click', () => {
            answerWrap.classList.toggle('open');
            item.classList.toggle('expanded', answerWrap.classList.contains('open'));
        });

        if (answerWrap.classList.contains('open')) {
            item.classList.add('expanded');
        }
    });

    searchInput?.addEventListener('input', applyFilter);
    applyFilter();
}

function applyDetailModeHeader() {
    const tabs = document.getElementById('board-tabs-panel');
    if (tabs) {
        tabs.classList.add('hidden');
    }

    const toggleButton = document.getElementById('board-menu-toggle');
    if (toggleButton) {
        toggleButton.classList.add('hidden');
    }

    const boardName = document.querySelector('.community-board-name');
    if (boardName) {
        boardName.textContent = '공지사항';
    }
}

async function loadArticleDetail(articleId, sourceType) {
    const loading = document.getElementById('support-public-loading');
    const errorBox = document.getElementById('support-public-error');
    const list = document.getElementById('support-public-list');

    applyDetailModeHeader();

    loading?.classList.remove('hidden');
    errorBox?.classList.add('hidden');
    list?.classList.add('hidden');

    try {
        const query = sourceType ? { sourceType } : {};
        const article = await withTimeout(APIClient.get(`/support/article/${encodeURIComponent(articleId)}`, query));

        if (!list) return;

        const detailCreatedAt = formatDateOnly(article.createdAt || article.created_at) || '';
        const detailTitle = sanitizeHTML(article.title || '제목 없음');
        const detailContent = sanitizeHTML(article.content || '').replace(/\n/g, '<br>');

        list.innerHTML = `
            <article class="post-card admin-notice" style="cursor:default;">
                <div class="post-header">
                    <div class="post-header-left">
                        <h3 class="post-title">${detailTitle}</h3>
                        <div class="post-meta support-notice-meta">
                            <span class="post-date support-notice-date">${detailCreatedAt}</span>
                        </div>
                    </div>
                </div>
                <div class="post-content" style="white-space:normal;line-height:1.7;">${detailContent}</div>
            </article>
            <div style="margin-top:12px;">
                <a class="btn btn-outline btn-sm" href="/support">목록으로</a>
            </div>
        `;

        list.classList.remove('hidden');
    } catch (error) {
        if (errorBox) {
            errorBox.classList.remove('hidden');
            const message = document.getElementById('support-public-error-message');
            if (message) message.textContent = error.message || '글을 불러오지 못했습니다.';
        }
    } finally {
        loading?.classList.add('hidden');
    }
}

function formatDateOnly(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return String(dateString);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}.${month}.${day}`;
}

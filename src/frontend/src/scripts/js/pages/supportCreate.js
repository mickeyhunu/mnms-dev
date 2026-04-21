/**
 * 파일 역할: 관리자 공지/FAQ 작성 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let isSubmitting = false;
let editingTarget = null;

function initSupportCreatePage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    applyInitialCategory();
    bindSupportCreateEvents();
    validateSupportForm();
    Auth.bindLogoutButton();
    fillUserInfo();
    loadEditTargetIfNeeded();
}

function getSearchParams() {
    return new URLSearchParams(window.location.search || '');
}

function getInitialSupportCategory() {
    const params = getSearchParams();
    const category = String(params.get('category') || '').toUpperCase();
    return category === 'FAQ' ? 'FAQ' : 'NOTICE';
}

function applyPageTitle(category, isEdit) {
    const heading = document.querySelector('.community-board-name');
    const description = document.querySelector('.support-create-description');
    if (!heading) return;

    const isFaq = category === 'FAQ';

    if (isEdit) {
        heading.textContent = isFaq ? 'FAQ 글 수정' : '공지사항 글 수정';
        if (description) {
            description.textContent = isFaq
                ? '등록된 FAQ 글을 수정할 수 있습니다.'
                : '등록된 공지사항 글을 수정할 수 있습니다.';
        }
        return;
    }

    heading.textContent = isFaq ? 'FAQ 새 글 작성' : '공지사항 새 글 작성';
    if (description) {
        description.textContent = isFaq
            ? '자주 묻는 질문으로 안내할 내용을 작성해보세요.'
            : '커뮤니티 글쓰기 화면과 동일한 방식으로 공지사항 글을 등록할 수 있습니다.';
    }
}

function togglePinOptions(category) {
    const pinOptionEl = document.getElementById('support-pin-options');
    if (!pinOptionEl) return;
    pinOptionEl.classList.toggle('hidden', String(category || '').toUpperCase() !== 'NOTICE');
}

function syncBoardTypeByCategory(category) {
    const boardTypeEl = document.getElementById('support-form-board-type');
    if (!boardTypeEl) return;

    const isNotice = String(category || '').toUpperCase() === 'NOTICE';
    boardTypeEl.disabled = !isNotice;
    if (!isNotice) {
        boardTypeEl.value = 'FREE';
    }
}

function applyInitialCategory() {
    const category = getInitialSupportCategory();
    const categorySelect = document.getElementById('support-form-category');
    if (categorySelect) categorySelect.value = category;
    togglePinOptions(category);
    syncBoardTypeByCategory(category);
    applyPageTitle(category, false);
}

function toggleNoticeOptions(category) {
    const noticeOptionEl = document.getElementById('support-notice-options');
    if (!noticeOptionEl) return;
    noticeOptionEl.classList.toggle('hidden', String(category || '').toUpperCase() !== 'NOTICE');
}

async function loadEditTargetIfNeeded() {
    const params = getSearchParams();
    const targetId = Number.parseInt(params.get('id') || '', 10);
    if (!Number.isInteger(targetId)) return;

    const sourceType = String(params.get('sourceType') || 'SUPPORT').toUpperCase() === 'POST' ? 'POST' : 'SUPPORT';

    try {
        const article = await APIClient.get(`/admin/support/article/${targetId}`, { sourceType });
        if (!article) return;

        editingTarget = { id: targetId, sourceType };

        const category = String(article.category || getInitialSupportCategory()).toUpperCase() === 'FAQ' ? 'FAQ' : 'NOTICE';
        const categorySelect = document.getElementById('support-form-category');
        if (categorySelect) categorySelect.value = category;

        const titleInput = document.getElementById('title');
        const contentInput = document.getElementById('content');
        const pinnedInput = document.getElementById('support-form-is-pinned');
        const boardTypeInput = document.getElementById('support-form-board-type');
        if (titleInput) titleInput.value = article.title || '';
        if (contentInput) contentInput.value = article.content || '';
        if (pinnedInput) pinnedInput.checked = Boolean(article.isPinned) && String(article.noticeType || '').toUpperCase() === 'IMPORTANT';
        if (boardTypeInput) boardTypeInput.value = String(article.boardType || 'FREE').toUpperCase();

        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) submitBtn.textContent = '수정';

        togglePinOptions(category);
        syncBoardTypeByCategory(category);
        applyPageTitle(category, true);
        validateSupportForm();
    } catch (error) {
        alert(error.message || '수정할 글 정보를 불러오지 못했습니다.');
        window.location.href = '/admin';
    }
}

async function fillUserInfo() {
    try {
        const me = await APIClient.get('/auth/me');
        if (!me.isAdmin) {
            alert('관리자만 접근할 수 있습니다.');
            window.location.href = '/';
            return;
        }

        const nickname = document.getElementById('user-nickname');
        if (nickname) nickname.textContent = Auth.formatNicknameWithLevel(me);
    } catch (error) {
        alert('관리자 권한 확인에 실패했습니다.');
        window.location.href = '/admin';
    }
}

function bindSupportCreateEvents() {
    const form = document.getElementById('support-post-form');
    const categoryInput = document.getElementById('support-form-category');
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');

    form?.addEventListener('submit', submitSupportPost);
    categoryInput?.addEventListener('change', () => {
        const category = String(categoryInput.value || 'NOTICE').toUpperCase();
        togglePinOptions(category);
        syncBoardTypeByCategory(category);

        if (category !== 'NOTICE') {
            const pinnedInput = document.getElementById('support-form-is-pinned');
            if (pinnedInput) pinnedInput.checked = false;
        }

        applyPageTitle(category, Boolean(editingTarget));
    });
    titleInput?.addEventListener('input', validateSupportForm);
    contentInput?.addEventListener('input', validateSupportForm);
}

function validateSupportForm() {
    const title = document.getElementById('title')?.value?.trim() || '';
    const content = document.getElementById('content')?.value?.trim() || '';
    const submitBtn = document.getElementById('submit-btn');
    if (!submitBtn) return;

    submitBtn.disabled = isSubmitting || !title || content.length < 10;
}

async function submitSupportPost(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const category = document.getElementById('support-form-category')?.value || 'NOTICE';
    const isPinned = Boolean(document.getElementById('support-form-is-pinned')?.checked);
    const boardType = document.getElementById('support-form-board-type')?.value || 'FREE';
    const noticeType = isPinned ? 'IMPORTANT' : 'NOTICE';
    const title = document.getElementById('title')?.value?.trim() || '';
    const content = document.getElementById('content')?.value?.trim() || '';
    const submitBtn = document.getElementById('submit-btn');

    if (!title || !content) {
        alert('제목과 내용을 입력해주세요.');
        return;
    }

    if (content.length < 10) {
        alert('내용은 최소 10자 이상 입력해주세요.');
        return;
    }

    try {
        isSubmitting = true;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = editingTarget ? '수정 중...' : '등록 중...';
        }

        const payload = {
            category,
            title,
            content,
            ...(category === 'NOTICE' ? { noticeType, isPinned, boardType } : {})
        };

        if (editingTarget) {
            await APIClient.put(`/admin/support/${editingTarget.id}?sourceType=${encodeURIComponent(editingTarget.sourceType)}`, {
                ...payload,
                sourceType: editingTarget.sourceType
            });
            alert('공지/FAQ 글이 수정되었습니다.');
        } else {
            await APIClient.post('/admin/support', payload);
            alert('공지/FAQ 글이 등록되었습니다.');
        }

        window.location.href = '/admin';
    } catch (error) {
        alert(error.message || (editingTarget ? '공지/FAQ 수정에 실패했습니다.' : '공지/FAQ 등록에 실패했습니다.'));
    } finally {
        isSubmitting = false;
        if (submitBtn) {
            submitBtn.textContent = editingTarget ? '수정' : '등록';
        }
        validateSupportForm();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupportCreatePage);
} else {
    initSupportCreatePage();
}

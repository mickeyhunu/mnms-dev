/**
 * 파일 역할: 관리자 1:1 문의 답변 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let inquiryTarget = null;
let isSaving = false;

function getInquiryIdFromPath() {
    const matched = window.location.pathname.match(/\/admin\/inquiries\/(\d+)\/answer/i);
    const parsed = Number.parseInt(matched?.[1] || '', 10);
    return Number.isInteger(parsed) ? parsed : null;
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

function toInquiryStatusLabel(status) {
    return String(status || '').toUpperCase() === 'ANSWERED' ? '답변완료' : '대기';
}

function formatDateTime(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderAttachmentList(attachmentUrls = []) {
    if (!Array.isArray(attachmentUrls) || attachmentUrls.length === 0) {
        return '<p class="admin-inquiry-attachments-empty">첨부파일이 없습니다.</p>';
    }

    const items = attachmentUrls.map((url, index) => {
        const normalizedUrl = String(url || '').trim();
        if (!normalizedUrl) return '';

        const safeUrl = escapeHtml(normalizedUrl);
        const isPdf = normalizedUrl.startsWith('data:application/pdf') || normalizedUrl.toLowerCase().endsWith('.pdf');
        if (isPdf) {
            return `
                <li class="admin-inquiry-attachment-item">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">첨부파일 ${index + 1} (PDF)</a>
                </li>
            `;
        }

        return `
            <li class="admin-inquiry-attachment-item">
                <img class="admin-inquiry-attachment-image" src="${safeUrl}" alt="첨부 이미지 ${index + 1}" onerror="this.style.display='none'; this.nextElementSibling?.classList.remove('hidden');">
                <a class="hidden" href="${safeUrl}" target="_blank" rel="noopener noreferrer">첨부파일 ${index + 1} (열기)</a>
            </li>
        `;
    }).filter(Boolean).join('');

    if (!items) return '<p class="admin-inquiry-attachments-empty">첨부파일이 없습니다.</p>';
    return `<ul class="admin-inquiry-attachments">${items}</ul>`;
}


function applyPageTitle(isEditMode) {
    const heading = document.querySelector('.community-board-name');
    const description = document.querySelector('.admin-inquiry-answer-description');

    if (heading) {
        heading.textContent = isEditMode ? '1:1 문의 답변 수정' : '1:1 문의 답변 작성';
    }

    if (description) {
        description.textContent = isEditMode
            ? '등록된 답변을 수정하고 저장할 수 있습니다.'
            : '문의 상세 내용을 확인하고 답변을 저장할 수 있습니다.';
    }
}

function validateForm() {
    const answer = document.getElementById('admin-inquiry-answer-content')?.value?.trim() || '';
    const saveButton = document.getElementById('admin-inquiry-answer-save-btn');
    if (!saveButton) return;
    saveButton.disabled = isSaving || !answer;
}

function renderMetaItem(label, value, modifierClass = '') {
    const safeValue = value || '-';
    const className = modifierClass ? `admin-inquiry-meta-value ${modifierClass}` : 'admin-inquiry-meta-value';
    return `
        <div class="admin-inquiry-meta-item">
            <span class="admin-inquiry-meta-label">${label}</span>
            <span class="${className}">${safeValue}</span>
        </div>
    `;
}

function renderInquiryInfo(inquiry) {
    const titleEl = document.getElementById('admin-inquiry-title');
    const metaEl = document.getElementById('admin-inquiry-meta');
    const contentEl = document.getElementById('admin-inquiry-content');
    const attachmentsEl = document.getElementById('admin-inquiry-attachments');
    const answerEl = document.getElementById('admin-inquiry-answer-content');

    if (titleEl) titleEl.textContent = inquiry.title || '(제목 없음)';

    const userLabel = inquiry.userNickname || inquiry.userEmail || `회원#${inquiry.userId}`;
    const statusLabel = toInquiryStatusLabel(inquiry.status);
    const statusClass = String(inquiry.status || '').toUpperCase() === 'ANSWERED'
        ? 'admin-inquiry-meta-status is-completed'
        : 'admin-inquiry-meta-status';
    if (metaEl) {
        metaEl.innerHTML = [
            renderMetaItem('문의번호', `#${inquiry.id}`),
            renderMetaItem('문의자', userLabel),
            renderMetaItem('문의유형', toInquiryTypeLabel(inquiry.type)),
            renderMetaItem('진행상태', statusLabel, statusClass),
            renderMetaItem('접수일시', formatDateTime(inquiry.createdAt || inquiry.created_at))
        ].join('');
    }
    if (contentEl) contentEl.textContent = inquiry.content || '-';
    if (attachmentsEl) attachmentsEl.innerHTML = renderAttachmentList(inquiry.attachmentUrls);
    const hasExistingAnswer = Boolean((inquiry.answerContent || '').trim());
    if (answerEl) answerEl.value = inquiry.answerContent || '';

    const saveButton = document.getElementById('admin-inquiry-answer-save-btn');
    if (saveButton) saveButton.textContent = hasExistingAnswer ? '답변 수정' : '답변 저장';

    applyPageTitle(hasExistingAnswer);
    validateForm();
}

async function loadInquiryDetail() {
    const inquiryId = getInquiryIdFromPath();
    if (!inquiryId) {
        alert('문의 번호를 확인할 수 없습니다.');
        window.location.href = '/admin';
        return;
    }

    const loadingEl = document.getElementById('admin-inquiry-loading');
    const formEl = document.getElementById('admin-inquiry-answer-form');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (formEl) formEl.classList.add('hidden');

    try {
        const response = await APIClient.get('/admin/support/inquiries');
        const target = (response.content || []).find((item) => Number(item.id) === inquiryId);
        if (!target) {
            alert('문의를 찾을 수 없습니다.');
            window.location.href = '/admin';
            return;
        }

        inquiryTarget = target;
        renderInquiryInfo(target);

        if (loadingEl) loadingEl.classList.add('hidden');
        if (formEl) formEl.classList.remove('hidden');
    } catch (error) {
        alert(error.message || '문의 정보를 불러오지 못했습니다.');
        window.location.href = '/admin';
    }
}

async function submitAnswer(event) {
    event.preventDefault();
    if (!inquiryTarget || isSaving) return;

    const answerContent = document.getElementById('admin-inquiry-answer-content')?.value?.trim() || '';
    if (!answerContent) {
        alert('답변 내용을 입력해주세요.');
        return;
    }

    const saveButton = document.getElementById('admin-inquiry-answer-save-btn');

    try {
        isSaving = true;
        if (saveButton) saveButton.textContent = '저장 중...';
        validateForm();

        await APIClient.put(`/admin/support/inquiries/${inquiryTarget.id}/answer`, { answerContent });
        alert('답변이 저장되었습니다.');
        window.location.href = '/admin';
    } catch (error) {
        alert(error.message || '답변 저장에 실패했습니다.');
    } finally {
        isSaving = false;
        if (saveButton) saveButton.textContent = '답변 저장';
        validateForm();
    }
}

function bindEvents() {
    Auth.bindLogoutButton();
    document.getElementById('admin-inquiry-answer-form')?.addEventListener('submit', submitAnswer);
    document.getElementById('admin-inquiry-answer-content')?.addEventListener('input', validateForm);
}

async function initAdminInquiryAnswerPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    bindEvents();

    try {
        const me = await APIClient.get('/auth/me');
        if (!me.isAdmin) {
            alert('관리자만 접근할 수 있습니다.');
            window.location.href = '/';
            return;
        }

        const nickname = document.getElementById('user-nickname');
        if (nickname) nickname.textContent = Auth.formatNicknameWithLevel(me);

        await loadInquiryDetail();
    } catch (error) {
        alert('관리자 권한 확인에 실패했습니다.');
        window.location.href = '/';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminInquiryAnswerPage);
} else {
    initAdminInquiryAnswerPage();
}

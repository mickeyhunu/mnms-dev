/**
 * 파일 역할: 내 문의함 목록 화면 동작을 담당하는 페이지 스크립트 파일.
 */

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyInquiriesPage, { once: true });
} else {
    initMyInquiriesPage();
}

async function initMyInquiriesPage() {
    Auth.bindLogoutButton();
    if (!Auth.requireAuth()) return;
    await renderMyInquiries();
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getStatusInfo(status) {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'ANSWERED') return { text: '처리완료', className: 'is-completed' };
    return { text: '대기', className: '' };
}

function getInquiryTypeLabel(type) {
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

async function renderMyInquiries() {
    const listContainer = document.getElementById('my-inquiries-list');
    const emptyMessage = document.getElementById('my-inquiries-empty');

    if (!listContainer || !emptyMessage) return;

    try {
        const response = await APIClient.get('/support/inquiries/me');
        const inquiries = response.content || [];

        if (!inquiries.length) {
            listContainer.innerHTML = '';
            emptyMessage.classList.remove('hidden');
            return;
        }

        emptyMessage.classList.add('hidden');

        const rows = inquiries.map((inquiry) => {
            const status = getStatusInfo(inquiry.status);
            const createdAt = inquiry.createdAt ? formatDate(inquiry.createdAt) : '-';
            const type = escapeHtml(getInquiryTypeLabel(inquiry.type));
            const title = escapeHtml(inquiry.title || '제목 없음');
            const href = `/my-inquiries/${encodeURIComponent(inquiry.id)}`;

            return `
                <tr class="my-inquiries-row" data-href="${href}" role="link" tabindex="0">
                    <td class="my-inquiries-type-cell">${type}</td>
                    <td class="my-inquiries-title-cell">${title}</td>
                    <td class="my-inquiries-date-cell">${escapeHtml(createdAt)}</td>
                    <td class="my-inquiries-status-cell"><span class="my-inquiry-status ${status.className}">${status.text}</span></td>
                </tr>
            `;
        }).join('');

        listContainer.innerHTML = `
        <table class="my-inquiries-table" aria-label="내 문의 목록">
            <thead>
            <tr>
                <th class="my-inquiries-type-cell">분류</th>
                <th class="my-inquiries-title-cell">제목</th>
                <th class="my-inquiries-date-cell">날짜</th>
                <th class="my-inquiries-status-cell">처리상태</th>
            </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        `;

        bindRowNavigation(listContainer);
    } catch (error) {
        listContainer.innerHTML = `<p class="my-inquiries-empty">${escapeHtml(error.message || '문의 목록을 불러오지 못했습니다.')}</p>`;
        emptyMessage.classList.add('hidden');
    }
}

function bindRowNavigation(root) {
    const rows = root.querySelectorAll('.my-inquiries-row[data-href]');
    rows.forEach((row) => {
        row.addEventListener('click', () => {
            window.location.href = row.dataset.href;
        });

        row.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                window.location.href = row.dataset.href;
            }
        });
    });
}

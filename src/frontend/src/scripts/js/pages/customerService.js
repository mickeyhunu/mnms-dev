/**
 * 파일 역할: 1:1 고객센터 문의/신고 작성 화면 동작을 담당하는 페이지 스크립트 파일.
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomerServicePage, { once: true });
} else {
    initCustomerServicePage();
}

function initCustomerServicePage() {
    const form = document.getElementById('customer-service-form');
    if (!form || form.dataset.initialized === 'true') return;
    form.dataset.initialized = 'true';

    Auth.bindLogoutButton();
    applyTargetContextFromQuery();
    bindFileValidation();

    form.addEventListener('submit', handleCustomerServiceSubmit);
}

function applyTargetContextFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const type = String(params.get('type') || '').toLowerCase();
    const targetId = String(params.get('targetId') || '').trim();

    const targetTypeInput = document.getElementById('inquiry-target-type');
    const targetIdInput = document.getElementById('inquiry-target-id');
    const inquiryTypeSelect = document.getElementById('inquiry-type');

    const mappings = {
        post: { targetType: 'post', inquiryType: 'post_report' },
        comment: { targetType: 'comment', inquiryType: 'comment_report' },
        inquiry: { targetType: 'general', inquiryType: 'question' }
    };

    const selected = mappings[type] || { targetType: 'general', inquiryType: '' };

    if (targetTypeInput) targetTypeInput.value = selected.targetType;
    if (targetIdInput) targetIdInput.value = targetId;
    if (inquiryTypeSelect && selected.inquiryType) inquiryTypeSelect.value = selected.inquiryType;
}

function bindFileValidation() {
    const fileInputs = document.querySelectorAll('.file-input');
    fileInputs.forEach((input) => {
        input.addEventListener('change', () => validateFileUpload(input));
    });

    const cancelButtons = document.querySelectorAll('.cancel-button[data-target]');
    cancelButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
                targetInput.value = '';
            }
        });
    });
}


function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'));
        reader.readAsDataURL(file);
    });
}

async function collectAttachmentUrls(form) {
    const fileInputs = Array.from(form.querySelectorAll('.file-input'));
    const selectedFiles = fileInputs
        .map((input) => input.files?.[0])
        .filter(Boolean);

    const attachmentUrls = await Promise.all(selectedFiles.map((file) => readFileAsDataUrl(file)));
    return attachmentUrls.filter((url) => typeof url === 'string' && (url.startsWith('data:image/') || url.startsWith('data:application/pdf')));
}

function validateFileUpload(fileInput) {
    const file = fileInput.files?.[0];
    if (!file) return true;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        alert('이미지(JPG, PNG, GIF, WEBP) 또는 PDF 파일만 업로드할 수 있습니다.');
        fileInput.value = '';
        return false;
    }

    if (file.size > MAX_FILE_SIZE) {
        alert('파일 크기가 50MB를 초과했습니다.');
        fileInput.value = '';
        return false;
    }

    return true;
}

async function handleCustomerServiceSubmit(event) {
    event.preventDefault();

    if (!Auth.requireAuth()) return;

    const form = event.currentTarget;
    const typeSelect = document.getElementById('inquiry-type');
    const titleInput = document.getElementById('inquiry-title');
    const contentInput = document.getElementById('inquiry-reason');
    const targetTypeInput = document.getElementById('inquiry-target-type');
    const targetIdInput = document.getElementById('inquiry-target-id');

    const type = String(typeSelect?.value || '').trim();
    const title = String(titleInput?.value || '').trim();
    const content = String(contentInput?.value || '').trim();
    const targetType = String(targetTypeInput?.value || '').trim();
    const targetId = String(targetIdInput?.value || '').trim();

    if (!type) {
        showNotification('문의 유형을 선택해주세요.', 'warning');
        typeSelect?.focus();
        return;
    }

    if (!title) {
        showNotification('문의 제목을 입력해주세요.', 'warning');
        titleInput?.focus();
        return;
    }

    if (!content) {
        showNotification('신고/문의 사유를 입력해주세요.', 'warning');
        contentInput?.focus();
        return;
    }

    const invalidFile = Array.from(form.querySelectorAll('.file-input')).some((input) => !validateFileUpload(input));
    if (invalidFile) return;

    try {
        const attachmentUrls = await collectAttachmentUrls(form);

        await APIClient.post('/support/inquiries', {
            type,
            title,
            content,
            targetType,
            targetId,
            attachmentUrls
        });

        showNotification('문의가 접수되었습니다. 내 문의함에서 처리 상태를 확인할 수 있습니다.', 'success');
        form.reset();
        applyTargetContextFromQuery();

        setTimeout(() => {
            window.location.href = '/my-inquiries';
        }, 700);
    } catch (error) {
        showNotification(error.message || '문의 접수에 실패했습니다.', 'error');
    }
}

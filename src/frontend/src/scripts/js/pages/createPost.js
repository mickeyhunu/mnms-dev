/**
 * 파일 역할: createPost 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let isSubmitting = false;
let isEditMode = false;
let editingPostId = null;
let existingImageUrls = [];
let isAdminUser = false;
let isBusinessUser = false;
let businessPromotionFixedTitle = '';

function getModeFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const postId = params.get('postId') || params.get('id');

    isEditMode = mode === 'edit' && Boolean(postId);
    editingPostId = isEditMode ? postId : null;
}

async function initCreatePost() {
    getModeFromQuery();
    setupEventListeners();
    setupImageUpload();
    await setupBoardOptions();
    await setupBusinessPromotionTitle();
    setupModeUI();
    await setupAdminNoticeOptions();
    validateForm();

    if (isEditMode) {
        await loadPostForEdit();
    }
}

function setupModeUI() {
    const submitBtn = document.getElementById('submit-btn');
    const boardName = document.querySelector('.community-board-name');
    const description = document.querySelector('.main-content .text-muted');

    if (boardName) {
        boardName.textContent = isEditMode ? '게시글 수정' : '새 글 작성';
    }

    if (description) {
        description.textContent = isEditMode
            ? '기존 게시글 내용을 수정해보세요'
            : '미드나잇 맨즈에 새로운 이야기를 공유해보세요';
    }

    if (submitBtn) {
        submitBtn.textContent = isEditMode ? '수정' : '등록';
    }
}

async function setupBoardOptions() {
    const boardTypeSelect = document.getElementById('board-type');
    if (!boardTypeSelect) return;

    let me = Auth.getUser();
    if (!me) {
        try {
            me = await APIClient.get('/auth/me');
        } catch (_error) {
            me = null;
        }
    }

    isBusinessUser = Boolean(me?.isBusiness || me?.isAdvertiser || String(me?.role || '').toUpperCase() === 'BUSINESS');
    const isAdmin = Boolean(me?.isAdmin || String(me?.role || '').toUpperCase() === 'ADMIN');

    if (!isBusinessUser && !isAdmin) {
        const promotionOption = Array.from(boardTypeSelect.options).find((option) => option.value === 'PROMOTION');
        if (promotionOption) {
            promotionOption.remove();
        }
        if (boardTypeSelect.value === 'PROMOTION') {
            boardTypeSelect.value = 'FREE';
        }
        return;
    }

    if (!isBusinessUser) return;

    boardTypeSelect.value = 'PROMOTION';
    Array.from(boardTypeSelect.options)
        .filter((option) => option.value !== 'PROMOTION')
        .forEach((option) => option.remove());
}

function applyBusinessTitleLock(title) {
    const titleInput = document.getElementById('title');
    if (!titleInput) return;

    businessPromotionFixedTitle = String(title || '').trim();
    if (!businessPromotionFixedTitle) return;

    titleInput.value = businessPromotionFixedTitle;
    titleInput.readOnly = true;
    titleInput.dataset.fixedTitle = '1';
    titleInput.title = '기업회원 홍보글 제목은 광고정보 기준으로 자동 고정됩니다.';
    titleInput.classList.add('is-readonly');
    updateCharCount('title', 255);
}

function resolveBusinessPromotionTitleFromAds(ads, me) {
    const normalizedAds = Array.isArray(ads) ? ads : [];
    const activeAd = normalizedAds.find((ad) => Boolean(ad?.isActive)) || normalizedAds[0] || null;
    const adTitle = String(activeAd?.title || '').trim();
    const managerName = String(me?.name || me?.nickname || '').trim();

    if (!adTitle) return '';

    const parts = adTitle.split('/').map((item) => item.trim()).filter(Boolean);
    if (parts.length >= 3) return parts.slice(0, 3).join('/');
    if (parts.length === 2 && managerName) return `${parts[0]}/${parts[1]}/${managerName}`;
    if (parts.length === 1 && managerName) return `${parts[0]}/${managerName}`;
    return adTitle;
}

async function setupBusinessPromotionTitle() {
    if (!isBusinessUser || isEditMode) return;

    let me = Auth.getUser();
    if (!me) {
        try {
            me = await APIClient.get('/auth/me');
        } catch (_error) {
            me = null;
        }
    }

    try {
        const response = await APIClient.get('/users/me/business-ads');
        const fixedTitle = resolveBusinessPromotionTitleFromAds(response?.content, me);
        if (fixedTitle) {
            applyBusinessTitleLock(fixedTitle);
            return;
        }
    } catch (_error) {
        // 광고 정보가 없는 경우 기본 사용자 정보로 폴백
    }

    const fallbackManagerName = String(me?.name || me?.nickname || '').trim();
    if (fallbackManagerName) {
        applyBusinessTitleLock(fallbackManagerName);
    }
}



async function setupAdminNoticeOptions() {
    const noticeGroup = document.getElementById('notice-options-group');
    const isNoticeInput = document.getElementById('is-notice');
    const noticeTargetGroup = document.getElementById('notice-target-group');

    if (!noticeGroup || !isNoticeInput || !noticeTargetGroup) return;

    try {
        const me = await APIClient.get('/auth/me');
        isAdminUser = Boolean(me?.isAdmin);
    } catch (error) {
        isAdminUser = false;
    }

    if (!isAdminUser) return;

    noticeGroup.classList.remove('hidden');

    isNoticeInput.addEventListener('change', () => {
        noticeTargetGroup.classList.toggle('hidden', !isNoticeInput.checked);
    });
}

function getSelectedNoticeTargetBoards() {
    const checkboxes = Array.from(document.querySelectorAll('input[name="notice-target-board"]:checked'));
    return checkboxes.map((checkbox) => checkbox.value);
}

function setNoticeTargetBoards(boards = []) {
    const normalized = new Set(boards.map((board) => String(board || '').toUpperCase()));
    document.querySelectorAll('input[name="notice-target-board"]').forEach((checkbox) => {
        checkbox.checked = normalized.has(String(checkbox.value || '').toUpperCase());
    });
}

function setupEventListeners() {
    const postForm = document.getElementById('post-form');
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');

    if (postForm) {
        postForm.addEventListener('submit', handleSubmit);
    }

    if (titleInput) {
        titleInput.addEventListener('input', function() {
            updateCharCount('title', 255);
            validateForm();
        });
    }

    if (contentInput) {
        contentInput.addEventListener('input', function() {
            updateCharCount('content', 1000);
            validateForm();
        });
    }

}

function setupImageUpload() {
    const imageInput = document.getElementById('image-files');
    if (!imageInput) return;

    imageInput.addEventListener('change', function(event) {
        const files = event.target.files;
        const maxNewImageCount = 5 - existingImageUrls.length;

        if (files.length > maxNewImageCount) {
            alert(`현재 기존 이미지를 포함해 최대 5개까지 업로드할 수 있습니다. (추가 가능: ${Math.max(0, maxNewImageCount)}개)`);
            imageInput.value = '';
            renderImagePreview();
            return;
        }

        renderImagePreview();
    });
}

function renderImagePreview() {
    const previewContainer = document.getElementById('image-preview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    existingImageUrls.forEach((imageUrl, index) => {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'image-preview-item';
        previewDiv.style.cssText = 'position: relative; display:inline-block; margin:5px;';
        previewDiv.innerHTML = `
            <img src="${sanitizeHTML(imageUrl)}" alt="기존 이미지 ${index + 1}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #ddd;">
            <button type="button" onclick="removeExistingImage(${index})" class="remove-image-btn" aria-label="기존 이미지 삭제" style="position:absolute;top:4px;right:4px;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;">×</button>
            <small style="display:block;text-align:center;margin-top:4px;color:#666;">기존 이미지</small>
        `;
        previewContainer.appendChild(previewDiv);
    });

    const files = document.getElementById('image-files')?.files || [];

    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview-item';
            previewDiv.style.cssText = 'position: relative; display:inline-block; margin:5px;';
            previewDiv.innerHTML = `
                <img src="${e.target.result}" alt="미리보기 ${index + 1}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #ddd;">
                <button type="button" onclick="removeImage(${index})" class="remove-image-btn" style="position:absolute;top:4px;right:4px;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;">×</button>
                <small style="display:block;text-align:center;margin-top:4px;color:#666;">새 이미지</small>
            `;
            previewContainer.appendChild(previewDiv);
        };
        reader.readAsDataURL(file);
    });
}

function isUploadDebugMode() {
    const params = new URLSearchParams(window.location.search || '');
    if (params.get('debugUpload') === '1') return true;

    try {
        return window.localStorage.getItem('mnms_debug_upload') === '1';
    } catch (error) {
        return false;
    }
}

function handlePostSubmitSuccess(result, { isEdit = false } = {}) {
    if (isUploadDebugMode()) {
        console.group('[S3 Upload Debug] 게시글 저장 결과');
        console.log('mode:', isEdit ? 'edit' : 'create');
        console.log('result:', result);
        console.log('post image urls:', result?.post?.image_urls || result?.post?.imageUrls || []);
        console.groupEnd();

        alert('디버그 모드: 업로드 결과를 콘솔에 출력했습니다. 확인 후 직접 이동해주세요.');
        return;
    }

    window.location.href = '/community';
}

function removeImage(index) {
    const imageInput = document.getElementById('image-files');
    if (!imageInput || !imageInput.files) return;

    const dt = new DataTransfer();
    Array.from(imageInput.files).forEach((file, i) => {
        if (i !== index) dt.items.add(file);
    });

    imageInput.files = dt.files;
    renderImagePreview();
}

function removeExistingImage(index) {
    existingImageUrls = existingImageUrls.filter((_, i) => i !== index);
    renderImagePreview();
}

function updateCharCount(fieldId, maxLength) {
    const field = document.getElementById(fieldId);
    const counter = document.getElementById(`${fieldId}-count`);

    if (!field || !counter) return;

    const currentLength = field.value.length;
    counter.textContent = `${currentLength}/${maxLength}`;
    counter.style.color = currentLength > maxLength ? '#dc3545' : '#6c757d';
}

function validateForm() {
    const title = document.getElementById('title');
    const content = document.getElementById('content');
    const submitBtn = document.getElementById('submit-btn');
    if (!title || !content || !submitBtn) return;

    const isValid = title.value.trim().length > 0 &&
        content.value.trim().length >= 10 &&
        title.value.length <= 255 &&
        content.value.length <= 1000;

    submitBtn.disabled = !isValid || isSubmitting;
}

function readSelectedImagesAsDataUrls() {
    const imageInput = document.getElementById('image-files');
    if (!imageInput || !imageInput.files || imageInput.files.length === 0) {
        return Promise.resolve([]);
    }

    const imageFiles = Array.from(imageInput.files)
        .filter((file) => file.type.startsWith('image/'))
        .slice(0, 5);

    return Promise.all(imageFiles.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('이미지 읽기에 실패했습니다.'));
        reader.readAsDataURL(file);
    })));
}

async function loadPostForEdit() {
    try {
        const response = await APIClient.get(`/posts/${editingPostId}`);
        const post = response.post || response;

        const titleInput = document.getElementById('title');
        const contentInput = document.getElementById('content');

        if (titleInput) titleInput.value = post.title || '';
        if (contentInput) contentInput.value = post.content || '';

        const normalizedImageUrls = Array.isArray(post.imageUrls)
            ? post.imageUrls
            : Array.isArray(post.images)
                ? post.images
                : (post.imageUrl ? [post.imageUrl] : []);

        existingImageUrls = normalizedImageUrls
            .map((url) => String(url || '').trim())
            .filter((url) => url.length > 0)
            .slice(0, 5);
        renderImagePreview();

        updateCharCount('title', 255);
        updateCharCount('content', 1000);

        const isNoticeInput = document.getElementById('is-notice');
        const noticeTargetGroup = document.getElementById('notice-target-group');
        if (isAdminUser && isNoticeInput && noticeTargetGroup) {
            const isNotice = Boolean(post.isNotice);
            isNoticeInput.checked = isNotice;
            noticeTargetGroup.classList.toggle('hidden', !isNotice);
            setNoticeTargetBoards(Array.isArray(post.noticeTargetBoards) ? post.noticeTargetBoards : []);
        }

        validateForm();
    } catch (error) {
        console.error('수정할 게시글 로드 실패:', error);
        alert('수정할 게시글을 불러오지 못했습니다.');
        window.location.href = '/';
    }
}

async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    const enteredTitle = document.getElementById('title')?.value.trim() || '';
    const titleValue = (isBusinessUser && !isEditMode && businessPromotionFixedTitle)
        ? businessPromotionFixedTitle
        : enteredTitle;
    const contentValue = document.getElementById('content')?.value.trim() || '';
    const submitBtn = document.getElementById('submit-btn');
    const boardType = isBusinessUser
        ? 'PROMOTION'
        : (document.getElementById('board-type')?.value || 'FREE');
    const isNotice = Boolean(document.getElementById('is-notice')?.checked) && isAdminUser;
    const noticeTargetBoards = isNotice ? getSelectedNoticeTargetBoards() : [];

    if (!titleValue || !contentValue) {
        alert('제목과 내용을 모두 입력해주세요.');
        return;
    }

    if (contentValue.length < 10) {
        alert('내용은 최소 10자 이상 입력해주세요.');
        return;
    }

    if (!validateNoBlockedExpression(titleValue, '게시글 제목')) {
        return;
    }

    if (!validateNoBlockedExpression(contentValue, '게시글 내용')) {
        return;
    }

    isSubmitting = true;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '등록 중...';
    }

    try {
        const imageUrls = await readSelectedImagesAsDataUrls();
        if (isNotice && noticeTargetBoards.length === 0) {
            alert('공지 노출 게시판을 1개 이상 선택해주세요.');
            return;
        }

        const payload = {
            title: titleValue,
            content: contentValue,
            boardType,
            isNotice,
            noticeType: isNotice ? 'IMPORTANT' : null,
            noticeTargetBoards,
            imageUrls: [...existingImageUrls, ...imageUrls].slice(0, 5)
        };

        let submitResult;
        if (isEditMode) {
            submitResult = await APIClient.put(`/posts/${editingPostId}`, payload);
        } else {
            submitResult = await APIClient.post('/posts', payload);
        }

        alert(isEditMode ? '글이 수정되었습니다!' : '글이 작성되었습니다!');
        handlePostSubmitSuccess(submitResult, { isEdit: isEditMode });
    } catch (error) {
        console.error('글 작성 에러:', error);
        if (error.status === 401) {
            alert('로그인이 필요합니다. 다시 로그인해주세요.');
            window.location.href = '/login';
            return;
        }

        alert(error.message || '글 작성 중 오류가 발생했습니다.');
    } finally {
        isSubmitting = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = isEditMode ? '수정' : '등록';
        }
        validateForm();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCreatePost);
} else {
    initCreatePost();
}

/**
 * 파일 역할: postDetail 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let postId = null;
let currentCommentsPage = 1;
let currentPostAuthor = null;
let currentPostBoardType = '';
let selectedMessageRecipient = null;
let replyingTo = null;
let activeCommentActionId = null;
let shareSheetOpen = false;
const POST_DETAIL_DEFAULT_DESCRIPTION = '미드나잇 맨즈 커뮤니티 게시글 상세 페이지입니다.';

function isBusinessUser(user) {
    const role = String(user?.role || '').toUpperCase();
    const memberType = String(user?.memberType || user?.member_type || '').toUpperCase();
    return Boolean(user?.isBusiness || user?.isAdvertiser || role === 'BUSINESS' || memberType === 'BUSINESS');
}

function syncSecretCommentOptionByUser() {
    const secretCheckbox = document.getElementById('comment-secret');
    if (!secretCheckbox) return;

    const secretLabel = secretCheckbox.closest('label');
    const hideSecretOption = isBusinessUser(Auth.getUser());
    if (hideSecretOption) {
        secretCheckbox.checked = false;
    }

    if (secretLabel) {
        secretLabel.style.display = hideSecretOption ? 'none' : 'inline-flex';
    } else {
        secretCheckbox.style.display = hideSecretOption ? 'none' : '';
    }
}

function upsertHeadMeta(selector, attributes) {
    let element = document.head.querySelector(selector);
    if (!element) {
        element = document.createElement('meta');
        document.head.appendChild(element);
    }
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
}

function upsertCanonical(href) {
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', href);
}

function updatePostSeo(post, boardName) {
    const safeTitle = String(post?.title || '').trim();
    const safeContent = String(post?.content || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 140);
    const pageTitle = safeTitle ? `${safeTitle} | 미드나잇 맨즈` : '게시글 상세 | 미드나잇 맨즈';
    const description = safeContent || `${boardName || '커뮤니티'} 게시글 상세 내용을 확인하세요.`;
    const canonicalUrl = new URL('/post-detail', window.location.origin);
    if (postId) canonicalUrl.searchParams.set('id', String(postId));

    document.title = pageTitle;
    upsertHeadMeta('meta[name="description"]', { name: 'description', content: description || POST_DETAIL_DEFAULT_DESCRIPTION });
    upsertHeadMeta('meta[property="og:title"]', { property: 'og:title', content: pageTitle });
    upsertHeadMeta('meta[property="og:description"]', { property: 'og:description', content: description || POST_DETAIL_DEFAULT_DESCRIPTION });
    upsertHeadMeta('meta[property="og:type"]', { property: 'og:type', content: 'article' });
    upsertHeadMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl.toString() });
    upsertHeadMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: pageTitle });
    upsertHeadMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description || POST_DETAIL_DEFAULT_DESCRIPTION });
    upsertCanonical(canonicalUrl.toString());
}

function initPostDetailPage() {
    if (typeof Auth !== 'undefined') {
        Auth.updateHeaderUI();
    }

    const urlParams = getURLParams();
    postId = urlParams.id;
    if (!postId) {
        const pathParts = window.location.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && !isNaN(lastPart)) {
            postId = lastPart;
        }
    }

    if (!postId) {
        showError('게시글 ID를 찾을 수 없습니다.');
        return;
    }

    syncSecretCommentOptionByUser();
    loadPost();
    setupEventListeners();
}

function setupEventListeners() {
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => loadPost());
    }
    
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeletePost);
    }

    const editBtn = document.getElementById('edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', handleEditPost);
    }
    
    const likeBtn = document.getElementById('like-btn');
    if (likeBtn) {
        likeBtn.addEventListener('click', handleToggleLike);
    }
        
    const commentForm = document.getElementById('comment-create-form');
    if (commentForm) {
        commentForm.addEventListener('submit', handleCreateComment);
    }

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
                return;
            }
            window.location.href = '/';
        });
    }

    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', handleSharePost);
    }

    const moreBtn = document.getElementById('post-more-btn');
    if (moreBtn) {
        moreBtn.addEventListener('click', togglePostMoreMenu);
    }

    const reportBtn = document.getElementById('report-btn');
    if (reportBtn) {
        reportBtn.addEventListener('click', reportPost);
    }

    document.addEventListener('click', (e) => {
        const moreWrapper = document.querySelector('.post-more-wrapper');
        const menu = document.getElementById('post-more-menu');
        if (!moreWrapper || !menu) return;
        if (!moreWrapper.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('.comment-actions-wrapper')) {
            return;
        }
        hideActiveCommentActionMenu();
    });

    setupMessageModal();
    setupShareSheet();
}

function setupMessageModal() {
    const messageBtn = document.getElementById('message-btn');
    if (messageBtn) {
        messageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleOpenMessageModal(currentPostAuthor);
        });
    }

    const messageModal = document.getElementById('message-modal');
    const messageCancelBtn = document.getElementById('message-cancel-btn');
    const messageSendBtn = document.getElementById('message-send-btn');

    if (messageCancelBtn) {
        messageCancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleCloseMessageModal();
        });
    }

    if (messageSendBtn) {
        messageSendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleSendMessage();
        });
    }

    if (messageModal) {
        messageModal.addEventListener('click', (e) => {
            if (e.target === messageModal) {
                handleCloseMessageModal();
            }
        });
    }
}

function handleOpenMessageModal(recipient) {
    if (!recipient || !recipient.nickname) {
        alert('사용자 정보를 찾을 수 없습니다.');
        return;
    }

    selectedMessageRecipient = recipient;

    const modal = document.getElementById('message-modal');
    const recipientInput = document.getElementById('message-recipient');
    const contentTextarea = document.getElementById('message-content');

    if (recipientInput) {
        recipientInput.value = recipient.nickname;
    }

    if (contentTextarea) {
        contentTextarea.value = '';
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        if (contentTextarea) {
            setTimeout(() => contentTextarea.focus(), 100);
        }
    }
}

function handleCloseMessageModal() {
    const modal = document.getElementById('message-modal');
    const contentTextarea = document.getElementById('message-content');

    selectedMessageRecipient = null;

    if (contentTextarea) {
        contentTextarea.value = '';
    }

    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

async function handleSendMessage() {
    const contentTextarea = document.getElementById('message-content');
    const sendBtn = document.getElementById('message-send-btn');

    const content = contentTextarea.value.trim();

    if (!content) {
        alert('쪽지 내용을 입력해주세요.');
        contentTextarea.focus();
        return;
    }

    if (!selectedMessageRecipient || !selectedMessageRecipient.id) {
        alert('받는 사람 정보를 찾을 수 없습니다.');
        return;
    }


    try {
        sendBtn.disabled = true;
        sendBtn.textContent = '전송중...';

        if (typeof MessageAPI !== 'undefined') {
            await MessageAPI.sendMessage(selectedMessageRecipient.id, content);
            
            if (typeof NotificationSettings !== 'undefined' && NotificationSettings.isMessageNotificationEnabled()) {
                showNotification('쪽지가 전송되었습니다.', 'message');
            } else {
                alert('쪽지가 전송되었습니다.');
            }
            
            handleCloseMessageModal();
        } else {
            alert('MessageAPI가 로드되지 않았습니다.');
        }

    } catch (error) {
        console.error('쪽지 전송 실패:', error);
        alert('쪽지 전송에 실패했습니다.');

    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = '전송';
    }
}

function navigateBackFromRestrictedPost() {
    if (window.history.length > 1) {
        window.history.back();
        return;
    }

    window.location.href = '/';
}

function handleRestrictedPostAccess(error) {
    const message = error?.data?.message || error?.message || '제한된 게시글 입니다.';
    alert(message);
    navigateBackFromRestrictedPost();
}

function showError(message) {
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    const loading = document.getElementById('loading');

    if (loading) loading.classList.add('hidden');
    if (errorMessage) errorMessage.textContent = message;
    if (errorBanner) errorBanner.classList.remove('hidden');
}

async function loadPost() {
    const loading = document.getElementById('loading');
    const errorBanner = document.getElementById('error-banner');
    const postDetail = document.getElementById('post-detail');
    const commentsSection = document.getElementById('comments-section');

    try {
        if (loading) loading.classList.remove('hidden');
        if (errorBanner) errorBanner.classList.add('hidden');

        const response = await PostAPI.getPost(postId);
        const normalizedPost = normalizePostDetailResponse(response);

        renderPostDetail(normalizedPost);

        if (loading) loading.classList.add('hidden');
        if (postDetail) postDetail.classList.remove('hidden');
        if (commentsSection) commentsSection.classList.remove('hidden');

        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            commentForm.classList.toggle('hidden', Boolean(normalizedPost.isHidden));
        }

        loadComments();

    } catch (error) {
        console.error('게시글 로드 실패:', error);
        if (loading) loading.classList.add('hidden');

        if (error?.status === 403) {
            handleRestrictedPostAccess(error);
            return;
        }

        showError(error?.message || '게시글을 불러오는 중 오류가 발생했습니다.');
    }
}

function normalizePostDetailResponse(post) {
    const normalizedImageUrls = Array.isArray(post.imageUrls)
        ? post.imageUrls
        : post.imageUrl
            ? [post.imageUrl]
            : [];

    const authorLevelRaw = post.authorLevel ?? post.level ?? post.authorRank ?? post.rank ?? post.authorGrade ?? post.grade;
    const authorLevel = Number(authorLevelRaw);

    return {
        ...post,
        id: post.id,
        authorId: post.authorId ?? post.userId,
        imageUrls: normalizedImageUrls,
        authorLevel: Number.isFinite(authorLevel) && authorLevel > 0 ? authorLevel : null,
        isAuthor: Boolean(post.isAuthor),
        isHidden: Boolean(post.isHidden),
        isLiked: Boolean(post.isLiked)
    };
}


function resolveLevelEmoji(level) {
    const numericLevel = Number(level);
    if (!Number.isFinite(numericLevel) || numericLevel <= 0) {
        return '';
    }

    if (numericLevel >= 7) return '🔱';
    if (numericLevel >= 6) return '👑';
    if (numericLevel >= 5) return '💎';
    if (numericLevel >= 4) return '🎓';
    if (numericLevel >= 3) return '🧠';
    if (numericLevel >= 2) return '🍻';
    return '🐣';
}

function isBusinessAuthor(author = {}) {
    const role = String(author?.authorRole || author?.role || '').toUpperCase();
    const memberType = String(author?.authorMemberType || author?.memberType || author?.member_type || '').toUpperCase();
    return role === 'BUSINESS' || memberType === 'BUSINESS' || Boolean(author?.authorIsBusiness);
}

function normalizeBusinessAdPlan(plan) {
    const normalized = String(plan || '').trim().toLowerCase();
    if (!normalized) return '';
    if (['basic', 'plus', 'premium'].includes(normalized)) return normalized;
    if (normalized === 'banner') return 'premium';
    return '';
}

function resolveBusinessBadgeImage(author = {}) {
    if (!isBusinessAuthor(author)) {
        return '';
    }

    const rawPlan = author?.authorAdPlan
        || author?.adPlan
        || author?.plan
        || author?.businessAdPlan
        || author?.businessPlan;
    const adPlan = normalizeBusinessAdPlan(rawPlan);
    if (adPlan) {
        return `/src/assets/ad-plan-badges/${adPlan}-badge.png`;
    }

    return Boolean(author?.authorHasActiveBusinessAd || author?.hasActiveBusinessAd)
        ? '/src/assets/ad-plan-badges/premium-badge.png'
        : '/src/assets/ad-plan-badges/none-badge.png';
}

function resolveAuthorBadgeMarkup(author = {}) {
    const businessBadgeImage = resolveBusinessBadgeImage(author);
    if (businessBadgeImage) {
        return `<img class="author-plan-badge" src="${businessBadgeImage}" alt="기업회원 광고 등급 배지">`;
    }

    const emoji = resolveLevelEmoji(author?.authorLevel ?? author?.level);
    return emoji ? `<span class="comment-level-badge" aria-hidden="true">${emoji}</span>` : '';
}

function isCurrentUserPostAuthor(post) {
    const currentUser = Auth.getUser();
    if (!currentUser) {
        return false;
    }

    const postAuthorId = post.authorId ?? post.userId;
    if (!postAuthorId) {
        return false;
    }

    return String(currentUser.id) === String(postAuthorId);
}


function renderPostDetail(post) {
    const titleElement = document.getElementById('post-title');
    const contentElement = document.getElementById('post-content');
    const authorElement = document.getElementById('post-author');
    const dateElement = document.getElementById('post-date');

    const boardNameMap = { FREE: '자유게시판', ANON: '익명게시판', REVIEW: '후기게시판', STORY: '썰게시판', QUESTION: '질문게시판', PROMOTION: '홍보게시판' };
    const boardTagMap = { FREE: '자유', ANON: '익명', REVIEW: '후기', STORY: '썰', QUESTION: '질문', PROMOTION: '홍보' };
    const boardType = String(post.boardType || '').toUpperCase();
    currentPostBoardType = boardType;
    const isCurrentAuthor = post.isAuthor || isCurrentUserPostAuthor(post);
    const isHiddenPost = Boolean(post.isHidden);
    const authorBadgeMarkup = resolveAuthorBadgeMarkup(post);
    const postAuthorLabel = boardType === 'ANON' && !post.authorIsBusiness
        ? `익명${isCurrentAuthor ? ' (본인)' : ''}`
        : `${post.authorNickname || ''}`;

    if (titleElement) titleElement.textContent = `[${boardTagMap[boardType] || '자유'}] ${post.title || ''}`;
    if (contentElement) {
        contentElement.innerHTML = (post.content || '').replace(/\n/g, '<br>');
        contentElement.classList.toggle('admin-restricted-content', isHiddenPost);
    }
    const boardNameEl = document.getElementById('post-board-name');
    if (boardNameEl) boardNameEl.textContent = boardNameMap[boardType] || '게시판';
    updatePostSeo(post, boardNameMap[boardType]);

    if (authorElement) {
        authorElement.innerHTML = `${sanitizeHTML(postAuthorLabel)}${authorBadgeMarkup ? ` ${authorBadgeMarkup}` : ''}`;
    }
    if (dateElement) dateElement.textContent = formatDateTime(post.createdAt) || '';

    const levelElement = document.getElementById('post-author-level');
    if (levelElement) {
        levelElement.textContent = '';
        levelElement.classList.add('hidden');
    }

    currentPostAuthor = {
        id: post.authorId ?? post.userId,
        nickname: post.authorNickname
    };


    const messageBtn = document.getElementById('message-btn');
    const ownerActions = document.getElementById('post-owner-actions');
    const editBtn = document.getElementById('edit-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const reportBtn = document.getElementById('report-btn');
    const isGuestPost = !post.authorId && !post.userId;
    if (isHiddenPost) {
        if (messageBtn) messageBtn.style.display = 'none';
        if (ownerActions) ownerActions.classList.add('hidden');
        if (editBtn) editBtn.classList.add('hidden');
        if (deleteBtn) deleteBtn.classList.add('hidden');
        if (reportBtn) reportBtn.classList.add('hidden');
    } else if (isCurrentAuthor || isGuestPost) {
        if (messageBtn) messageBtn.style.display = 'none';
        if (ownerActions) ownerActions.classList.remove('hidden');
        if (editBtn) editBtn.classList.remove('hidden');
        if (deleteBtn) deleteBtn.classList.remove('hidden');
        if (reportBtn) reportBtn.classList.add('hidden');
    } else {
        if (ownerActions) ownerActions.classList.add('hidden');
        if (messageBtn && Auth.isAuthenticated()) {
            messageBtn.style.display = 'inline-block';
        }
        if (editBtn) editBtn.classList.add('hidden');
        if (deleteBtn) deleteBtn.classList.add('hidden');
        if (reportBtn) reportBtn.classList.remove('hidden');
    }

    renderAdjacentPosts(post.previousPost, post.nextPost);

    if (post.imageUrls && post.imageUrls.length > 0 && !isHiddenPost) {
        renderPostImages(post.imageUrls);
    } else {
        renderPostImages([]);
    }

    const likeBtn = document.getElementById('like-btn');
    const likeIcon = document.getElementById('like-icon');
    const likeCount = document.getElementById('like-count');
    
    if (likeBtn && likeIcon && likeCount) {
        likeBtn.className = post.isLiked ? 'like-btn liked' : 'like-btn';
        likeBtn.classList.toggle('is-disabled', isHiddenPost);
        likeBtn.disabled = isHiddenPost;
        likeIcon.textContent = post.isLiked ? '❤️' : '🤍';
        likeCount.textContent = post.likeCount;
    }

    const viewCount = document.getElementById('view-count');
    if (viewCount) {
        viewCount.textContent = `조회수 ${post.viewCount || 0}`;
    }
}

function togglePostMoreMenu() {
    const menu = document.getElementById('post-more-menu');
    if (!menu) return;
    menu.classList.toggle('hidden');
}

function setupShareSheet() {
    const shareSheet = document.getElementById('share-sheet');
    if (!shareSheet) {
        return;
    }

    document.getElementById('share-sheet-overlay')?.addEventListener('click', closeShareSheet);
    document.getElementById('share-sheet-close')?.addEventListener('click', closeShareSheet);
    document.getElementById('share-kakao-btn')?.addEventListener('click', handleKakaoShare);
    document.getElementById('share-sms-btn')?.addEventListener('click', handleSmsShare);
    document.getElementById('share-copy-btn')?.addEventListener('click', handleCopyShareLink);

    document.addEventListener('keydown', handleShareSheetKeydown);
}

function handleShareSheetKeydown(event) {
    if (event.key === 'Escape' && shareSheetOpen) {
        closeShareSheet();
    }
}

function getShareData() {
    return {
        title: document.getElementById('post-title')?.textContent?.trim() || '게시글',
        text: '게시글을 공유합니다.',
        url: window.location.href
    };
}

function openShareSheet() {
    const shareSheet = document.getElementById('share-sheet');
    if (!shareSheet) {
        return;
    }

    shareSheet.classList.remove('hidden');
    shareSheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('share-sheet-open');
    shareSheetOpen = true;
}

function closeShareSheet() {
    const shareSheet = document.getElementById('share-sheet');
    if (!shareSheet) {
        return;
    }

    shareSheet.classList.add('hidden');
    shareSheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('share-sheet-open');
    shareSheetOpen = false;
}

async function handleSharePost() {
    openShareSheet();
}

async function handleKakaoShare() {
    const shareData = getShareData();

    try {
        if (window.Kakao && window.Kakao.Share && typeof window.Kakao.Share.sendDefault === 'function') {
            window.Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                    title: shareData.title,
                    description: shareData.text,
                    link: {
                        mobileWebUrl: shareData.url,
                        webUrl: shareData.url
                    }
                },
                buttons: [
                    {
                        title: '게시글 보기',
                        link: {
                            mobileWebUrl: shareData.url,
                            webUrl: shareData.url
                        }
                    }
                ]
            });
            closeShareSheet();
            return;
        }

        if (navigator.share) {
            await navigator.share(shareData);
            closeShareSheet();
            return;
        }

        await copyTextToClipboard(shareData.url);
        closeShareSheet();
        alert('카카오톡 공유를 직접 열 수 없어 링크를 복사했습니다. 카카오톡에 붙여넣어 공유해주세요.');
    } catch (error) {
        if (error?.name === 'AbortError') {
            return;
        }

        console.error('카카오톡 공유 실패:', error);
        alert('카카오톡 공유에 실패했습니다.');
    }
}

function handleSmsShare() {
    const shareData = getShareData();
    const message = `미드나인 맨즈 커뮤니티
제목 ${shareData.title}
주소 ${shareData.url}`;
    const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isAppleDevice ? '&' : '?';
    window.location.href = `sms:${separator}body=${encodeURIComponent(message)}`;
    closeShareSheet();
}

async function handleCopyShareLink() {
    try {
        await copyTextToClipboard(getShareData().url);
        closeShareSheet();
        alert('게시글 링크가 복사되었습니다.');
    } catch (error) {
        console.error('링크 복사 실패:', error);
        closeShareSheet();
        prompt('아래 링크를 복사하세요.', getShareData().url);
    }
}

async function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const success = document.execCommand('copy');
    textarea.remove();

    if (!success) {
        throw new Error('clipboard copy failed');
    }
}

function reportPost() {
    if (!Auth.requireAuth()) return;

    const menu = document.getElementById('post-more-menu');
    if (menu) {
        menu.classList.add('hidden');
    }

    window.location.href = `/customer-service?type=post&targetId=${encodeURIComponent(postId)}`;
}

function renderAdjacentPosts(previousPost, nextPost) {
    const navigation = document.getElementById('post-adjacent-navigation');
    const previousLink = document.getElementById('previous-post-link');
    const nextLink = document.getElementById('next-post-link');

    if (!navigation || !previousLink || !nextLink) {
        return;
    }

    const updateLink = (element, post, label, directionSymbol) => {
        if (!post || !post.id) {
            element.classList.add('is-empty');
            element.removeAttribute('href');
            element.innerHTML = `<span class="adjacent-post-label"><span class="adjacent-post-direction" aria-hidden="true">${directionSymbol}</span>${label}</span><span class="adjacent-post-title">게시글이 없습니다.</span>`;
            return;
        }

        element.classList.remove('is-empty');
        element.href = `/post-detail?id=${post.id}`;
        element.innerHTML = `<span class="adjacent-post-label"><span class="adjacent-post-direction" aria-hidden="true">${directionSymbol}</span>${label}</span><span class="adjacent-post-title">${sanitizeHTML(post.title || '')}</span>`;
    };

    updateLink(previousLink, previousPost, '이전글', '˄');
    updateLink(nextLink, nextPost, '다음글', '˅');
    navigation.classList.remove('hidden');
}

function renderPostImages(imageUrls) {
    const imagesContainer = document.getElementById('post-images');
    const imagesGrid = document.getElementById('images-grid');

    if (!imagesContainer || !imagesGrid) {
        return;
    }

    if (!imageUrls || imageUrls.length === 0) {
        imagesGrid.innerHTML = '';
        imagesContainer.classList.add('hidden');
        return;
    }

    imagesGrid.className = 'images-grid';
    if (imageUrls.length === 1) {
        imagesGrid.classList.add('single-image');
    } else if (imageUrls.length === 2) {
        imagesGrid.classList.add('two-images');
    } else if (imageUrls.length === 3) {
        imagesGrid.classList.add('three-images');
    } else {
        imagesGrid.classList.add('many-images');
    }

    let html = '';
    imageUrls.forEach((url, index) => {
        const cleanUrl = url.trim();
        html += `
            <div class="image-item ${imageUrls.length === 1 ? 'single' : ''}" onclick="showImageModal(${JSON.stringify(imageUrls)}, ${index})">
                <img src="${cleanUrl}" alt="게시글 이미지 ${index + 1}" loading="lazy" 
                     onerror="this.parentElement.style.display='none'" 
                     onload="this.style.opacity='1'">
                <div class="image-overlay">
                    <span>🔍</span>
                </div>
            </div>
        `;
    });

    imagesGrid.innerHTML = html;
    imagesContainer.classList.remove('hidden');
}

async function loadComments() {
    try {
        const response = await CommentAPI.getComments(postId, currentCommentsPage);
        const comments = Array.isArray(response)
            ? response
            : response.comments || response.content || [];
        const totalElements = response.totalElements ?? comments.length;
        
        const commentCount = document.getElementById('comment-count');
        if (commentCount) {
            commentCount.textContent = totalElements;
        }
        
        renderComments(comments);
        
    } catch (error) {
        console.error('댓글 로드 실패:', error);
    }
}

function renderComments(comments) {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;
    
    commentsList.innerHTML = '';
    
    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<p class="no-comments">아직 댓글이 없습니다.</p>';
        return;
    }
    
    const commentsTree = buildCommentsTree(comments);
    commentsTree.forEach(comment => {
        const commentItem = createCommentItem(comment);
        commentsList.appendChild(commentItem);
    });
}

function buildCommentsTree(comments) {
    const commentMap = new Map();
    const rootComments = [];
    
    comments.forEach(comment => {
        comment.children = [];
        commentMap.set(comment.id, comment);
    });
    
    comments.forEach(comment => {
        if (comment.parentId && commentMap.has(comment.parentId)) {
            commentMap.get(comment.parentId).children.push(comment);
        } else {
            rootComments.push(comment);
        }
    });
    
    return rootComments;
}

function createCommentItem(comment, depth = 0) {
    const div = document.createElement('div');
    div.className = `comment-item ${depth > 0 ? 'reply' : ''}`;
    div.setAttribute('data-depth', depth);
    
    const currentUser = Auth.getUser();
    
    const isAuthor = currentUser && (
        currentUser.id == (comment.authorId ?? comment.userId) ||
        String(currentUser.id) === String(comment.authorId ?? comment.userId) || 
        Number(currentUser.id) === Number(comment.authorId ?? comment.userId)
    );
    
    const isAdminComment = comment.authorRole === 'admin' || 
                          comment.authorRole === 'ADMIN' || 
                          comment.role === 'admin' || 
                          comment.role === 'ADMIN';
    const isSecretComment = Boolean(comment.isSecret);
    const isDeletedComment = Boolean(comment.isDeleted);
    const isHiddenComment = Boolean(comment.isHidden);
    const isAnonymousComment = (!comment.authorIsBusiness && currentPostBoardType === 'ANON')
        || String(comment.authorNickname || '').trim() === '익명';
    const showOwnBadge = isAuthor && (isAnonymousComment || isSecretComment);
    const authorName = sanitizeHTML(comment.authorNickname || '익명');
    const commentAuthorLevel = Number(comment.authorLevel ?? comment.level ?? comment.authorRank ?? comment.rank ?? comment.authorGrade ?? comment.grade);
    const commentBadgeMarkup = resolveAuthorBadgeMarkup({
        ...comment,
        authorLevel: commentAuthorLevel
    });
    const canReplyByServer = comment.canReply !== false;
    const canReply = Auth.isAuthenticated() && depth < 3 && !isDeletedComment && !isHiddenComment && canReplyByServer;
    const canGuestEdit = !Auth.isAuthenticated() && !comment.userId;
    const isOtherUser = Auth.isAuthenticated() && currentUser && !isAuthor;
    const hasActionMenu = !isDeletedComment && !isHiddenComment && (isAuthor || canGuestEdit || isOtherUser);
    const replyMarker = depth > 0 ? '<span class="comment-reply-marker" aria-hidden="true"></span>' : '';
    
    
    div.innerHTML = `
        <div class="comment-layout">
            ${replyMarker}
            <span class="comment-avatar" aria-hidden="true"></span>
            <div class="comment-body">
                <div class="comment-meta">
                    <div class="comment-meta-main">
                        <span class="comment-author ${isAdminComment ? 'admin-comment-author' : ''}">${authorName}${commentBadgeMarkup ? ` ${commentBadgeMarkup}` : ''}</span>
                        ${showOwnBadge ? '<span class="own-content-badge">본인</span>' : ''}
                        ${isSecretComment ? '<span style="margin-left:6px;font-size:12px;color:#7a5;">🔒 비밀댓글</span>' : ''}
                        ${isHiddenComment ? '<span style="margin-left:6px;font-size:12px;color:#9a6700;">관리자 제한</span>' : ''}
                        ${isDeletedComment ? '<span style="margin-left:6px;font-size:12px;color:#999;">삭제됨</span>' : ''}
                    </div>
                    <div class="comment-meta-actions">
                        ${hasActionMenu ? `
                            <div class="comment-actions-wrapper">
                                <button class="comment-more-btn" type="button" aria-label="댓글 더보기" onclick="toggleCommentActions(${comment.id})">⋯</button>
                                <div class="comment-actions-menu hidden" id="comment-actions-${comment.id}">
                                    ${(isAuthor || canGuestEdit) ? `
                                        <button class="comment-action-menu-btn" type="button" onclick="showCommentEditForm(${comment.id})">수정</button>
                                        <button class="comment-action-menu-btn danger" type="button" onclick="deleteComment(${comment.id})">삭제</button>
                                    ` : ''}
                                    ${isOtherUser ? `<button class="comment-action-menu-btn danger" type="button" onclick="reportComment(${comment.id})">신고</button>` : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="comment-content ${isAdminComment ? 'admin-comment-content' : ''} ${isHiddenComment ? 'admin-restricted-content' : ''}" id="comment-content-${comment.id}">${sanitizeHTML(comment.content).replace(/\n/g, '<br>')}</div>
                <div class="comment-footer">
                    <span class="comment-date">${formatDateTime(comment.createdAt)}</span>
                    ${canReply ? `<button class="comment-reply-link" onclick="showReplyForm(${comment.id}, '${sanitizeHTML(comment.authorNickname)}')">답글쓰기</button>` : ''}
                </div>
            </div>
        </div>
        <div id="reply-form-${comment.id}" class="reply-form-container" style="display: none;">
            <form class="reply-form" onsubmit="handleReplySubmit(event, ${comment.id})">
                <div class="reply-input-container">
                    <textarea id="reply-content-${comment.id}" placeholder="답글을 작성하세요..." required rows="3"></textarea>
                </div>
                <div class="reply-form-actions">
                    <button type="submit" class="btn btn-sm btn-primary">등록</button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="hideReplyForm(${comment.id})">취소</button>
                </div>
            </form>
        </div>
        <div id="replies-${comment.id}" class="replies-container"></div>
    `;
    
    if (comment.children && comment.children.length > 0) {
        const repliesContainer = div.querySelector(`#replies-${comment.id}`);
        comment.children.forEach(reply => {
            const replyItem = createCommentItem(reply, depth + 1);
            repliesContainer.appendChild(replyItem);
        });
    }
    
    return div;
}


function showCommentEditForm(commentId) {
    hideAllReplyForms();

    const container = document.getElementById(`reply-form-${commentId}`);
    const contentElement = document.getElementById(`comment-content-${commentId}`);
    if (!container || !contentElement) return;

    const currentContent = (contentElement.textContent || '').trim();

    container.innerHTML = `
        <form class="reply-form" onsubmit="handleCommentEditSubmit(event, ${commentId})">
            <div class="reply-input-container">
                <textarea id="comment-edit-content-${commentId}" placeholder="댓글을 수정하세요..." required rows="3">${sanitizeHTML(currentContent)}</textarea>
            </div>
            <div class="reply-form-actions">
                <button type="submit" class="btn btn-sm btn-primary">수정</button>
                <button type="button" class="btn btn-sm btn-secondary" onclick="hideReplyForm(${commentId})">취소</button>
            </div>
        </form>
    `;

    container.style.display = 'block';

    const textarea = document.getElementById(`comment-edit-content-${commentId}`);
    if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
}

async function handleCommentEditSubmit(e, commentId) {
    e.preventDefault();

    const textarea = document.getElementById(`comment-edit-content-${commentId}`);
    if (!textarea) return;

    const content = textarea.value.trim();
    if (!content) {
        addInputError(textarea, '댓글 내용을 입력해주세요');
        return;
    }

    if (!validateNoBlockedExpression(content, '댓글')) {
        return;
    }

    try {
        await CommentAPI.updateComment(commentId, { content });
        showNotification('댓글이 수정되었습니다.', 'success');
        hideReplyForm(commentId);
        loadComments();
    } catch (error) {
        console.error('댓글 수정 실패:', error);
        Auth.handleAuthError(error);
    }
}


function toggleCommentActions(commentId) {
    const actions = document.getElementById(`comment-actions-${commentId}`);
    if (!actions) return;

    if (activeCommentActionId && activeCommentActionId !== commentId) {
        hideCommentActionMenu(activeCommentActionId);
    }

    const shouldOpen = actions.classList.contains('hidden');
    actions.classList.toggle('hidden', !shouldOpen);
    activeCommentActionId = shouldOpen ? commentId : null;
}

function hideCommentActionMenu(commentId) {
    const actions = document.getElementById(`comment-actions-${commentId}`);
    if (!actions) return;
    actions.classList.add('hidden');
}

function hideActiveCommentActionMenu() {
    if (!activeCommentActionId) return;
    hideCommentActionMenu(activeCommentActionId);
    activeCommentActionId = null;
}

function showReplyForm(parentId, parentAuthor) {
    hideAllReplyForms();

    const replyForm = document.getElementById(`reply-form-${parentId}`);
    if (!replyForm) return;

    replyForm.innerHTML = `
        <form class="reply-form" onsubmit="handleReplySubmit(event, ${parentId})">
            <div class="reply-input-container">
                <textarea id="reply-content-${parentId}" placeholder="답글을 작성하세요..." required rows="3"></textarea>
            </div>
            <div class="reply-form-actions">
                <button type="submit" class="btn btn-sm btn-primary">등록</button>
                <button type="button" class="btn btn-sm btn-secondary" onclick="hideReplyForm(${parentId})">취소</button>
            </div>
        </form>
    `;

    const textarea = document.getElementById(`reply-content-${parentId}`);

    replyForm.style.display = 'block';
    if (textarea) {
        textarea.focus();
    }
    replyingTo = { id: parentId, author: parentAuthor };
}

function hideReplyForm(parentId) {
    const replyForm = document.getElementById(`reply-form-${parentId}`);
    if (replyForm) {
        replyForm.style.display = 'none';
        const textarea = document.getElementById(`reply-content-${parentId}`);
        if (textarea) {
            textarea.value = '';
        }
        replyForm.innerHTML = '';
    }
    replyingTo = null;
}

function hideAllReplyForms() {
    const replyForms = document.querySelectorAll('.reply-form-container');
    replyForms.forEach(form => {
        form.style.display = 'none';
        const textarea = form.querySelector('textarea');
        if (textarea) {
            textarea.value = '';
        }
        form.innerHTML = '';
    });
    replyingTo = null;
}

async function handleReplySubmit(e, parentId) {
    e.preventDefault();
    
    if (!Auth.requireAuth()) return;
    
    const textarea = document.getElementById(`reply-content-${parentId}`);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    const content = textarea.value.trim();
    
    if (!content) {
        addInputError(textarea, '답글 내용을 입력해주세요');
        return;
    }

    if (!validateNoBlockedExpression(content, '답글')) {
        return;
    }
    
    try {
        setLoading(submitBtn, true);
        
        await CommentAPI.createComment(postId, { 
            content: content,
            parentId: parentId
        });
        
        if (typeof NotificationSettings !== 'undefined' && NotificationSettings.isCommentNotificationEnabled()) {
            showNotification('답글이 작성되었습니다.', 'comment');
        } else {
            showNotification('답글이 작성되었습니다.', 'success');
        }
        
        hideReplyForm(parentId);
        loadComments();
        
    } catch (error) {
        console.error('답글 작성 실패:', error);
        showNotification('답글 작성에 실패했습니다.', 'error');
        Auth.handleAuthError(error);
        
    } finally {
        setLoading(submitBtn, false);
    }
}

function openCommentMessageModal(authorId, authorNickname) {
    const recipient = {
        id: authorId,
        nickname: authorNickname
    };
    
    handleOpenMessageModal(recipient);
}

function reportComment(commentId) {
    if (!Auth.requireAuth()) return;

    window.location.href = `/customer-service?type=comment&targetId=${encodeURIComponent(commentId)}`;
}

async function handleToggleLike() {
    if (!Auth.requireAuth()) return;
    
    try {
        const response = await PostAPI.toggleLike(postId);
        
        const likeBtn = document.getElementById('like-btn');
        const likeIcon = document.getElementById('like-icon');
        const likeCount = document.getElementById('like-count');
        
        if (likeBtn && likeIcon && likeCount) {
            likeBtn.className = response.isLiked ? 'like-btn liked' : 'like-btn';
            likeIcon.textContent = response.isLiked ? '❤️' : '🤍';
            likeCount.textContent = response.likeCount;
        }
        
    } catch (error) {
        console.error('좋아요 토글 실패:', error);
        Auth.handleAuthError(error);
    }
}

async function handleCreateComment(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('comment-submit-btn');
    const contentTextarea = document.getElementById('comment-content');
    
    const content = contentTextarea.value.trim();
    const secretCheckbox = document.getElementById('comment-secret');
    const blockSecretForBusiness = isBusinessUser(Auth.getUser());
    
    if (!content) {
        addInputError(contentTextarea, '댓글 내용을 입력해주세요');
        return;
    }

    if (!validateNoBlockedExpression(content, '댓글')) {
        return;
    }

    
    try {
        setLoading(submitBtn, true);
        
        await CommentAPI.createComment(postId, {
            content,
            isSecret: Boolean(!blockSecretForBusiness && secretCheckbox && secretCheckbox.checked)
        });
        
        if (typeof NotificationSettings !== 'undefined' && NotificationSettings.isCommentNotificationEnabled()) {
            showNotification('댓글이 작성되었습니다.', 'comment');
        } else {
            showNotification('댓글이 작성되었습니다.', 'success');
        }
        
        form.reset();
        if (secretCheckbox) secretCheckbox.checked = false;
        removeInputError(contentTextarea);
        
        loadComments();
        
    } catch (error) {
        console.error('댓글 작성 실패:', error);
        showNotification('댓글 작성에 실패했습니다.', 'error');
        Auth.handleAuthError(error);
        
    } finally {
        setLoading(submitBtn, false);
    }
}

async function handleEditPost(e) {
    e.preventDefault();
    window.location.href = `/create?mode=edit&postId=${postId}`;
}

async function handleDeletePost() {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await APIClient.delete(`/posts/${postId}`);
        
        showNotification('게시글이 삭제되었습니다.', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        console.error('게시글 삭제 실패:', error);
        Auth.handleAuthError(error);
    }
}

async function deleteComment(commentId) {
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await CommentAPI.deleteComment(commentId);
        
        showNotification('댓글이 삭제되었습니다.', 'success');
        
        loadComments();
        
    } catch (error) {
        console.error('댓글 삭제 실패:', error);
        Auth.handleAuthError(error);
    }
}

function addInputError(element, message) {
    removeInputError(element);
    
    if (element) {
        element.classList.add('error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'input-error';
        errorDiv.textContent = message;
        
        element.parentElement.appendChild(errorDiv);
    }
}

function removeInputError(element) {
    if (element) {
        element.classList.remove('error');
        
        const errorDiv = element.parentElement.querySelector('.input-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
}

function setLoading(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = '처리중...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || '작성';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
        background-color: ${type === 'success' ? '#28a745' : 
                          type === 'error' ? '#dc3545' : 
                          type === 'comment' ? '#17a2b8' :
                          type === 'message' ? '#6f42c1' : '#007bff'};
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

function sanitizeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}.${month}.${day}. ${hour}:${minute}`;
}

function getURLParams() {
    const params = {};
    const urlParams = new URLSearchParams(window.location.search);
    for (const [key, value] of urlParams.entries()) {
        params[key] = value;
    }
    return params;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPostDetailPage);
} else {
    initPostDetailPage();
}

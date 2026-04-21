/**
 * 파일 역할: postCard UI 상호작용을 담당하는 재사용 컴포넌트 스크립트 파일.
 */
function renderPostList(posts, container) {
    if (!container) return;

    const noticeList = document.getElementById('notice-list');
    const includeAds = window.boardFilters ? window.boardFilters.includeAds : false;
    const hotFirst = window.boardFilters ? window.boardFilters.hotFirst : true;

    const visiblePosts = includeAds
        ? posts
        : posts.filter((post) => {
            const normalized = `${post.title || ''} ${post.content || ''}`.toLowerCase();
            return !normalized.includes('광고');
        });

    const sortedPosts = [...visiblePosts].sort((a, b) => {
        if (!hotFirst) {
            return (b.id || 0) - (a.id || 0);
        }

        const likeDiff = (b.likeCount || 0) - (a.likeCount || 0);
        if (likeDiff !== 0) {
            return likeDiff;
        }

        return (b.id || 0) - (a.id || 0);
    });

    const notices = sortedPosts.filter((post) => Boolean(post.isNotice));
    const normalPosts = sortedPosts.filter((post) => !post.isNotice);

    if (noticeList) {
        noticeList.innerHTML = notices.map((post) => createBoardRow(post, true)).join('');
    }

    container.innerHTML = normalPosts.map((post, index) => createBoardRow(post, false, index)).join('');
}

function createBoardRow(post, isNotice = false, index = 0) {
    const noticeType = String(post.noticeType || 'NOTICE').toUpperCase();
    const noticeText = noticeType === 'IMPORTANT' ? '필독' : '공지';
    const noticeBadge = isNotice ? `<span class="badge-notice">[${noticeText}]</span>` : '';
    const hotBadge = !isNotice && (post.likeCount || 0) >= 5 ? '<span class="badge-hot">추천</span>' : '';
    const newBadge = isPostWithin24Hours(post.createdAt)
        ? '<span class="badge-new" aria-label="24시간 이내 새 글">N</span>'
        : '';
    const numberLabel = isNotice ? (post.isPinned ? '📌' : noticeText) : post.id || index + 1;

    const authorName = getDisplayAuthorName(post);

    return `
        <tr class="${isNotice ? 'notice-row' : 'post-row'}" data-post-id="${post.id}">
            <td class="col-num">${numberLabel}</td>
            <td class="col-title">
                ${noticeBadge}${hotBadge}
                <a href="/post-detail?id=${post.id}">${sanitizeHTML(post.title || '제목 없음')}</a>
                ${newBadge}
                ${post.commentCount > 0 ? `<small>[${post.commentCount}]</small>` : ''}
            </td>
            <td class="col-author">${sanitizeHTML(authorName || `작성자 #${post.authorId || ''}`)}</td>
            <td class="col-date">${formatDate(post.createdAt)}</td>
            <td class="col-like">${post.likeCount || 0}</td>
            <td class="col-view">${post.viewCount || 0}</td>
        </tr>
    `;
}

function isPostWithin24Hours(createdAt) {
    if (!createdAt) return false;

    const createdTime = new Date(createdAt).getTime();
    if (Number.isNaN(createdTime)) return false;

    const DAY_IN_MS = 24 * 60 * 60 * 1000;
    return (Date.now() - createdTime) < DAY_IN_MS;
}

function createPostCard(post) {
    const user = Auth.getUser();
    const isLoggedIn = !!user;
    const isAuthor = isLoggedIn && user.id === post.authorId;
    const isAdminNotice = Boolean(post.isNotice);
    const cardClass = isAdminNotice ? 'post-card admin-notice' : 'post-card';
    const noticeLabel = String(post.noticeType || 'NOTICE').toUpperCase() === 'IMPORTANT' ? '필독' : '공지';
    const pinPrefix = post.isPinned ? '📌 ' : '';
    const titlePrefix = isAdminNotice ? `${pinPrefix}[${noticeLabel}] ` : '';
    const commentIcon = getCommentIcon(post, isAdminNotice);

    const isLikedByMe = Boolean(post.isLiked || post.liked || post.likedByMe);

    const authorName = getDisplayAuthorName(post);

    return `
        <div class="${cardClass}" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-header-left">
                    <h3 class="post-title">
                        <a href="/post-detail?id=${post.id}" onclick="handlePostClick(${post.id}); return false;">${titlePrefix}${sanitizeHTML(post.title)}</a>
                    </h3>
                    <div class="post-meta">
                        <span class="post-author">${sanitizeHTML(authorName || '작성자 #' + post.authorId)}</span>
                        <span class="post-date">${formatDate(post.createdAt)}</span>
                        <span class="post-stats">
                            <span class="like-count">👍 ${post.likeCount || 0}</span>
                            <span class="comment-count">${commentIcon} ${post.commentCount || 0}</span>
                        </span>
                    </div>
                </div>
            </div>
            <div class="post-content">
                ${sanitizeHTML(truncateText(post.content, 150))}
            </div>
            ${post.imageUrls && post.imageUrls.length > 0 ? createImagePreview(post.imageUrls) : ''}
            <div class="post-actions">
                ${isLoggedIn ? `
                    <button class="btn btn-sm btn-outline like-btn ${isLikedByMe ? 'liked' : ''}" onclick="handlePostLike(${post.id})" ${isLikedByMe ? 'data-liked="true"' : ''}>
                        <span class="like-icon">${isLikedByMe ? '❤️' : '🤍'}</span>
                        <span class="like-count-value">${post.likeCount || 0}</span>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}


function getCommentIcon(post, isAdminNotice) {
    if (isAdminNotice) {
        return '📢';
    }

    const authorRole = String(post?.authorRole || post?.author_role || post?.role || '').toUpperCase();
    const authorMemberType = String(post?.authorMemberType || post?.memberType || post?.member_type || '').toUpperCase();

    if (authorRole === 'BUSINESS' || authorMemberType === 'BUSINESS') {
        return '🎯';
    }

    return '💬';
}

function getDisplayAuthorName(post) {
    const boardType = String(post?.boardType || post?.board_type || '').toUpperCase();
    if (boardType === 'ANON') {
        return '익명';
    }

    return post?.authorNickname;
}

function handlePostClick(postId) {
    window.location.href = `/post-detail?id=${postId}`;
}

function createImagePreview(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return '';
    
    const maxPreview = 3;
    const previewUrls = imageUrls.slice(0, maxPreview);
    const remainingCount = imageUrls.length - maxPreview;
    
    let html = '<div class="post-images">';
    
    previewUrls.forEach((url, index) => {
        html += `<img src="${sanitizeHTML(url)}" alt="게시글 이미지 ${index + 1}" class="post-image-preview" loading="lazy">`;
    });
    
    if (remainingCount > 0) {
        html += `<div class="more-images">+${remainingCount}개 더</div>`;
    }
    
    html += '</div>';
    return html;
}

function attachPostCardEvents(container) {
    const postCards = container.querySelectorAll('.post-card');
    
    postCards.forEach(card => {
        const titleLink = card.querySelector('.post-title a');
        if (titleLink) {
            titleLink.addEventListener('click', (e) => {
                e.preventDefault();
                const postId = card.dataset.postId;
                window.location.href = `/post-detail?id=${postId}`;
            });
        }
    });
}

async function handlePostLike(postId) {
    if (!Auth.isAuthenticated()) {
        showNotification('로그인이 필요합니다.', 'warning');
        return;
    }
    
    try {
        const response = await PostAPI.toggleLike(postId);
        
        const likeBtn = document.querySelector(`[data-post-id="${postId}"] .like-btn`);
        const likeCountSpan = document.querySelector(`[data-post-id="${postId}"] .like-count`);
        
        if (likeBtn && response) {
            if (response.isLiked) {
                likeBtn.setAttribute('data-liked', 'true');
                likeBtn.classList.add('liked');
                likeBtn.innerHTML = `<span class="like-icon">❤️</span><span class="like-count-value">${response.likeCount}</span>`;
            } else {
                likeBtn.removeAttribute('data-liked');
                likeBtn.classList.remove('liked');
                likeBtn.innerHTML = `<span class="like-icon">🤍</span><span class="like-count-value">${response.likeCount}</span>`;
            }
            
            if (likeCountSpan) {
                likeCountSpan.textContent = `👍 ${response.likeCount}`;
            }
        }
        
    } catch (error) {
        console.error('Like toggle error:', error);
        showNotification('좋아요 처리 중 오류가 발생했습니다.', 'error');
    }
}

async function handlePostDelete(postId) {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await PostAPI.deletePost(postId);
        showNotification('게시글이 삭제되었습니다.', 'success');
        
        const postCard = document.querySelector(`[data-post-id="${postId}"]`);
        if (postCard) {
            postCard.remove();
        }
        
    } catch (error) {
        console.error('Post delete error:', error);
        showNotification('게시글 삭제 중 오류가 발생했습니다.', 'error');
    }
}

function navigateToPost(postId) {
    window.location.href = `/post-detail?id=${postId}`;
}

async function toggleLike(postId, event) {
    event.stopPropagation();
    
    if (!Auth.requireAuth()) return;
    
    try {
        const response = await PostAPI.toggleLike(postId);
        
        const button = event.currentTarget;
        const icon = button.querySelector('.action-icon');
        const likeCountElements = document.querySelectorAll(`[data-post-id="${postId}"] .stat-count`);
        
        if (response.isLiked) {
            button.classList.remove('btn-outline');
            button.classList.add('btn-primary');
            icon.textContent = '❤️';
        } else {
            button.classList.remove('btn-primary');
            button.classList.add('btn-outline');
            icon.textContent = '🤍';
        }
        
        likeCountElements.forEach(element => {
            if (element.previousElementSibling && element.previousElementSibling.textContent === '👍') {
                element.textContent = response.likeCount;
            }
        });
        
    } catch (error) {
        console.error('좋아요 토글 실패:', error);
        Auth.handleAuthError(error);
    }
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}


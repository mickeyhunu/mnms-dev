let currentPage = 0;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', function() {
    if (!Auth.requireAuth()) {
        return;
    }
    
    initHeader();
    loadBookmarks(currentPage);
    setupEventListeners();
});

function initHeader() {
    const user = Auth.getUser();
    const userNickname = document.getElementById('user-nickname');
    const adminLink = document.getElementById('admin-link');
    
    if (user && userNickname) {
        userNickname.textContent = user.nickname;
        
        if (user.role === 'ADMIN' && adminLink) {
            showElement(adminLink);
        }
    }
}

function setupEventListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('로그아웃 하시겠습니까?')) {
                Auth.logout();
            }
        });
    }
    
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => loadBookmarks(currentPage));
    }
}

async function loadBookmarks(page = 0) {
    const loading = document.getElementById('loading');
    const errorBanner = document.getElementById('error-banner');
    const emptyState = document.getElementById('empty-state');
    const bookmarkList = document.getElementById('bookmark-list');
    const pagination = document.getElementById('pagination');
    
    try {
        showElement(loading);
        hideElement(errorBanner);
        hideElement(emptyState);
        hideElement(pagination);
        
        const response = await APIClient.get(`/bookmarks/my?page=${page}&size=10`);
        
        if (response.posts && response.posts.length > 0) {
            renderBookmarkList(response.posts, bookmarkList);
            
            currentPage = response.currentPage || page;
            totalPages = response.totalPages || 1;
            
            if (totalPages > 1) {
                createPagination();
                showElement(pagination);
            }
        } else {
            showElement(emptyState);
        }
        
    } catch (error) {
        console.error('북마크 로드 실패:', error);
        
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = error.message || '북마크 목록을 불러오는데 실패했습니다.';
        }
        showElement(errorBanner);
        
    } finally {
        hideElement(loading);
    }
}

function renderBookmarkList(posts, container) {
    if (!container) return;
    
    let html = '';
    
    posts.forEach(post => {
        html += createBookmarkCard(post);
    });
    
    container.innerHTML = html;
}

function createBookmarkCard(post) {
    const date = formatDate(post.createdAt);
    const content = post.content ? truncateText(post.content, 100) : '';
    const isAdmin = post.isAdminPost || post.adminPost;
    const cardClass = isAdmin ? 'post-card admin-notice' : 'post-card';
    const titlePrefix = isAdmin ? '📌 [공지] ' : '';
    
    return `
        <div class="${cardClass}" onclick="goToPost(${post.id})">
            <div class="post-header">
                <div>
                    <h3 class="post-title">${titlePrefix}${sanitizeHTML(post.title)}</h3>
                    <div class="post-meta">
                        <span>${sanitizeHTML(post.authorNickname)}</span>
                        <span>${date}</span>
                    </div>
                </div>
                <button class="bookmark-btn bookmarked" onclick="removeBookmark(${post.id}, event)" title="북마크 제거">
                    ⭐
                </button>
            </div>
            
            ${content ? `<div class="post-content">
                <p>${sanitizeHTML(content)}</p>
            </div>` : ''}
            
            ${post.imageUrls && post.imageUrls.length > 0 ? createImagePreview(post.imageUrls) : ''}
            
            <div class="post-stats">
                <div class="stat-item">
                    <span>❤️</span>
                    <span>${post.likeCount || 0}</span>
                </div>
                <div class="stat-item">
                    <span>💬</span>
                    <span>${post.commentCount || 0}</span>
                </div>
            </div>
        </div>
    `;
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

function goToPost(postId) {
    window.location.href = `/post-detail?id=${postId}`;
}

async function removeBookmark(postId, event) {
    event.stopPropagation();
    
    try {
        if (!confirm('북마크를 제거하시겠습니까?')) {
            return;
        }
        
        const response = await APIClient.post(`/bookmarks/${postId}/toggle`);
        
        if (response.success && !response.isBookmarked) {
            const bookmarkCard = document.querySelector(`[onclick="goToPost(${postId})"]`);
            if (bookmarkCard) {
                bookmarkCard.style.opacity = '0.5';
                setTimeout(() => {
                    bookmarkCard.remove();
                }, 300);
            }
            
            showNotification('북마크가 제거되었습니다.', 'success');
            
            setTimeout(() => {
                loadBookmarks(currentPage);
            }, 500);
        }
        
    } catch (error) {
        console.error('북마크 제거 실패:', error);
        showNotification('북마크 제거 중 오류가 발생했습니다.', 'error');
    }
}

function createPagination() {
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageNumbers = document.getElementById('page-numbers');
    
    if (!pagination) return;
    
    prevBtn.disabled = currentPage <= 0;
    nextBtn.disabled = currentPage >= totalPages - 1;
    
    let pageNumbersHtml = '';
    const maxVisiblePages = 5;
    
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage ? 'active' : '';
        pageNumbersHtml += `
            <button class="btn btn-sm btn-outline ${isActive}" onclick="handlePageChange(${i})">
                ${i + 1}
            </button>
        `;
    }
    
    pageNumbers.innerHTML = pageNumbersHtml;
    
    prevBtn.onclick = () => handlePageChange(currentPage - 1);
    nextBtn.onclick = () => handlePageChange(currentPage + 1);
}

function handlePageChange(page) {
    if (page < 0 || page >= totalPages) return;
    
    currentPage = page;
    loadBookmarks(currentPage);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
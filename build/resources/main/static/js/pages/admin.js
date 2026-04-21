let currentUser = null;
let currentTab = 'posts';
let currentPage = 0;
let pageSize = 20;

function initAdminPage() {
    console.log('관리자 페이지 초기화 시작');
    
    if (!Auth.isAuthenticated()) {
        alert('로그인이 필요합니다.');
        window.location.href = '/login';
        return;
    }
    
    checkAdminAccess();
}

async function checkAdminAccess() {
    try {
        console.log('관리자 권한 확인 중...');
        
        const userInfo = await APIClient.get('/api/auth/me');
        
        if (!userInfo || !userInfo.id) {
            throw new Error('로그인 정보를 찾을 수 없습니다.');
        }
        
        currentUser = userInfo;
        console.log('현재 사용자:', userInfo);
        
        if (!userInfo.isAdmin) {
            alert('관리자만 접근할 수 있습니다.');
            window.location.href = '/';
            return;
        }
        
        console.log('관리자 권한 확인됨');
        
        setupAdminInterface();
        loadPosts();
        
    } catch (error) {
        console.error('관리자 권한 확인 실패:', error);
        
        if (error.status === 401) {
            alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
            window.location.href = '/login';
        } else {
            alert('관리자 페이지 로드에 실패했습니다.');
            window.location.href = '/';
        }
    }
}

function setupAdminInterface() {
    console.log('관리자 인터페이스 설정');
    
    const adminContainer = document.getElementById('admin-container');
    const loading = document.getElementById('loading');
    
    if (adminContainer) {
        showElement(adminContainer);
    }
    
    if (loading) {
        hideElement(loading);
    }
    
    setupTabs();
    setupEventListeners();
    updateStats();
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.admin-tab-btn');
    const tabContents = document.querySelectorAll('.admin-tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            tabButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            const targetContent = document.getElementById(`${tabName}-tab`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
            
            currentTab = tabName;
            currentPage = 0;
            
            if (tabName === 'posts') {
                loadPosts();
            } else if (tabName === 'users') {
                loadUsers();
            } else if (tabName === 'comments') {
                loadComments();
            }
        });
    });
}

function setupEventListeners() {
    const refreshPostsBtn = document.getElementById('refresh-posts-btn');
    const refreshUsersBtn = document.getElementById('refresh-users-btn');
    const refreshCommentsBtn = document.getElementById('refresh-comments-btn');
    
    if (refreshPostsBtn) {
        refreshPostsBtn.addEventListener('click', function() {
            loadPosts();
        });
    }
    
    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener('click', function() {
            loadUsers();
        });
    }
    
    if (refreshCommentsBtn) {
        refreshCommentsBtn.addEventListener('click', function() {
            loadComments();
        });
    }
}

async function loadPosts() {
    const container = document.getElementById('posts-container');
    const loading = document.getElementById('posts-loading');
    
    try {
        console.log('게시글 목록 로딩 중...');
        
        if (loading) showElement(loading);
        
        const response = await APIClient.get(`/api/admin/posts?page=${currentPage}&size=${pageSize}`);
        
        if (response && response.posts && response.posts.length > 0) {
            renderPostsList(response.posts, container);
            console.log(`게시글 ${response.posts.length}개 로드됨`);
        } else {
            container.innerHTML = '<div class="empty-state"><p>게시글이 없습니다.</p></div>';
        }
        
    } catch (error) {
        console.error('게시글 로드 실패:', error);
        
        if (error.status === 401) {
            alert('권한이 없습니다.');
            window.location.href = '/login';
        } else {
            container.innerHTML = '<div class="error-banner"><p>게시글을 불러오는데 실패했습니다.</p></div>';
        }
    } finally {
        if (loading) hideElement(loading);
    }
}

async function loadUsers() {
    const container = document.getElementById('users-container');
    const loading = document.getElementById('users-loading');
    
    try {
        console.log('사용자 목록 로딩 중...');
        
        if (loading) showElement(loading);
        
        const users = await APIClient.get('/api/admin/users');
        
        if (users && users.length > 0) {
            renderUsersList(users, container);
            console.log(`사용자 ${users.length}명 로드됨`);
        } else {
            container.innerHTML = '<div class="empty-state"><p>사용자가 없습니다.</p></div>';
        }
        
    } catch (error) {
        console.error('사용자 로드 실패:', error);
        
        if (error.status === 401) {
            alert('권한이 없습니다.');
            window.location.href = '/login';
        } else {
            container.innerHTML = '<div class="error-banner"><p>사용자 목록을 불러오는데 실패했습니다.</p></div>';
        }
    } finally {
        if (loading) hideElement(loading);
    }
}

async function loadComments() {
    const container = document.getElementById('comments-container');
    const loading = document.getElementById('comments-loading');
    
    try {
        console.log('댓글 목록 로딩 중...');
        
        if (loading) showElement(loading);
        
        const response = await APIClient.get(`/api/admin/comments?page=${currentPage}&size=${pageSize}`);
        
        if (response && response.comments && response.comments.length > 0) {
            renderCommentsList(response.comments, container);
            console.log(`댓글 ${response.comments.length}개 로드됨`);
        } else {
            container.innerHTML = '<div class="empty-state"><p>댓글이 없습니다.</p></div>';
        }
        
    } catch (error) {
        console.error('댓글 로드 실패:', error);
        
        if (error.status === 401) {
            alert('권한이 없습니다.');
            window.location.href = '/login';
        } else {
            container.innerHTML = '<div class="error-banner"><p>댓글을 불러오는데 실패했습니다.</p></div>';
        }
    } finally {
        if (loading) hideElement(loading);
    }
}

function renderPostsList(posts, container) {
    if (!container) {
        console.error('Posts container not found');
        return;
    }
    
    let html = '<div class="admin-posts-table">';
    html += `
        <div class="table-header">
            <div class="header-cell">ID</div>
            <div class="header-cell">제목</div>
            <div class="header-cell">작성자</div>
            <div class="header-cell">작성일</div>
            <div class="header-cell">좋아요</div>
            <div class="header-cell">댓글</div>
            <div class="header-cell">관리</div>
        </div>
    `;
    
    posts.forEach(post => {
        html += createPostRow(post);
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function createPostRow(post) {
    const createdAt = new Date(post.createdAt).toLocaleDateString('ko-KR');
    const isAdminPost = post.isAdminPost ? '<span class="admin-badge">관리자</span>' : '';
    const titleClass = post.isAdminPost ? 'admin-post-title' : '';
    
    return `
        <div class="table-row" data-post-id="${post.id}">
            <div class="table-cell">${post.id}</div>
            <div class="table-cell title-cell">
                <div class="post-title-container">
                    <a href="/post-detail?id=${post.id}" target="_blank" class="${titleClass}">
                        ${sanitizeHTML(post.title)}
                    </a>
                    ${isAdminPost}
                </div>
            </div>
            <div class="table-cell">${sanitizeHTML(post.authorNickname)}</div>
            <div class="table-cell">${createdAt}</div>
            <div class="table-cell">${post.likeCount || 0}</div>
            <div class="table-cell">${post.commentCount || 0}</div>
            <div class="table-cell">
                <button onclick="deletePost(${post.id})" class="btn btn-sm btn-danger">삭제</button>
            </div>
        </div>
    `;
}

function renderUsersList(users, container) {
    if (!container) {
        console.error('Users container not found');
        return;
    }
    
    let html = '<div class="admin-users-table">';
    html += `
        <div class="users-header">
            <div class="header-cell">ID</div>
            <div class="header-cell">이메일</div>
            <div class="header-cell">닉네임</div>
            <div class="header-cell">부서</div>
            <div class="header-cell">직책</div>
            <div class="header-cell">권한</div>
            <div class="header-cell">가입일</div>
        </div>
    `;
    
    users.forEach(user => {
        html += createUserRow(user);
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function createUserRow(user) {
    const createdAt = new Date(user.createdAt).toLocaleDateString('ko-KR');
    const roleText = user.role === 'ADMIN' ? '관리자' : '일반사용자';
    const roleClass = user.role === 'ADMIN' ? 'admin-badge' : 'user-badge';
    
    return `
        <div class="users-row" data-user-id="${user.id}">
            <div class="table-cell">${user.id}</div>
            <div class="table-cell">${sanitizeHTML(user.email)}</div>
            <div class="table-cell">${sanitizeHTML(user.nickname)}</div>
            <div class="table-cell">${sanitizeHTML(user.department || '-')}</div>
            <div class="table-cell">${sanitizeHTML(user.jobPosition || '-')}</div>
            <div class="table-cell">
                <span class="role-badge ${roleClass}">${roleText}</span>
            </div>
            <div class="table-cell">${createdAt}</div>
        </div>
    `;
}

function renderCommentsList(comments, container) {
    if (!container) {
        console.error('Comments container not found');
        return;
    }
    
    let html = '<div class="admin-comments-table">';
    html += `
        <div class="table-header">
            <div class="header-cell">ID</div>
            <div class="header-cell">내용</div>
            <div class="header-cell">작성자</div>
            <div class="header-cell">게시글</div>
            <div class="header-cell">작성일</div>
            <div class="header-cell">관리</div>
        </div>
    `;
    
    comments.forEach(comment => {
        html += createCommentRow(comment);
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function createCommentRow(comment) {
    const createdAt = new Date(comment.createdAt).toLocaleDateString('ko-KR');
    const shortContent = comment.content.length > 50 ? comment.content.substring(0, 50) + '...' : comment.content;
    
    return `
        <div class="table-row" data-comment-id="${comment.id}">
            <div class="table-cell">${comment.id}</div>
            <div class="table-cell comment-content">
                <div title="${sanitizeHTML(comment.content)}">
                    ${sanitizeHTML(shortContent)}
                </div>
            </div>
            <div class="table-cell">${sanitizeHTML(comment.authorNickname)}</div>
            <div class="table-cell">
                <a href="/post-detail?id=${comment.postId}" target="_blank" class="post-link">
                    게시글 보기
                </a>
            </div>
            <div class="table-cell">${createdAt}</div>
            <div class="table-cell">
                <button onclick="deleteComment(${comment.id})" class="btn btn-sm btn-danger">삭제</button>
            </div>
        </div>
    `;
}

async function updateStats() {
    try {
        const [postsResponse, usersResponse, commentsResponse] = await Promise.allSettled([
            APIClient.get('/api/admin/stats/posts'),
            APIClient.get('/api/admin/stats/users'),
            APIClient.get('/api/admin/stats/comments')
        ]);
        
        if (postsResponse.status === 'fulfilled' && postsResponse.value) {
            const totalPostsEl = document.getElementById('total-posts-stat');
            if (totalPostsEl) {
                totalPostsEl.textContent = postsResponse.value.total || 0;
            }
        }
        
        if (usersResponse.status === 'fulfilled' && usersResponse.value) {
            const totalUsersEl = document.getElementById('total-users-stat');
            const totalAdminsEl = document.getElementById('total-admins-stat');
            
            if (totalUsersEl) {
                totalUsersEl.textContent = usersResponse.value.total || 0;
            }
            
            if (totalAdminsEl) {
                totalAdminsEl.textContent = usersResponse.value.admins || 0;
            }
        }
        
        if (commentsResponse.status === 'fulfilled' && commentsResponse.value) {
            const totalCommentsEl = document.getElementById('total-comments-stat');
            if (totalCommentsEl) {
                totalCommentsEl.textContent = commentsResponse.value.total || 0;
            }
        }
    } catch (error) {
        console.error('통계 업데이트 실패:', error);
    }
}

async function deletePost(postId) {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        console.log(`게시글 ${postId} 삭제 중...`);
        
        await APIClient.delete(`/api/admin/posts/${postId}`);
        
        showNotification('게시글이 삭제되었습니다.', 'success');
        
        loadPosts();
        updateStats();
        
    } catch (error) {
        console.error('게시글 삭제 실패:', error);
        
        if (error.status === 401) {
            alert('권한이 없습니다.');
        } else if (error.status === 404) {
            alert('게시글을 찾을 수 없습니다.');
        } else {
            alert('게시글 삭제에 실패했습니다.');
        }
    }
}

async function deleteComment(commentId) {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        console.log(`댓글 ${commentId} 삭제 중...`);
        
        await APIClient.delete(`/api/admin/comments/${commentId}`);
        
        showNotification('댓글이 삭제되었습니다.', 'success');
        
        loadComments();
        updateStats();
        
    } catch (error) {
        console.error('댓글 삭제 실패:', error);
        
        if (error.status === 401) {
            alert('권한이 없습니다.');
        } else if (error.status === 404) {
            alert('댓글을 찾을 수 없습니다.');
        } else {
            alert('댓글 삭제에 실패했습니다.');
        }
    }
}

function showElement(element) {
    if (element) {
        element.classList.remove('hidden');
    }
}

function hideElement(element) {
    if (element) {
        element.classList.add('hidden');
    }
}

function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPage);
} else {
    initAdminPage();
}
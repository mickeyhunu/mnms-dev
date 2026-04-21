// 댓글 컴포넌트 관련 함수들
// post-detail.html의 댓글 섹션에서 사용되는 스크립트

let currentPostId = null;
let currentCommentsPage = 0;
let totalCommentsPages = 1;

// 댓글 시스템 초기화 (게시글 상세 페이지에서 호출)
function initCommentSystem(postId) {
    currentPostId = postId;
    setupCommentForm();
    loadComments();
}

// 댓글 작성 폼 설정
function setupCommentForm() {
    const commentForm = document.getElementById('comment-create-form');
    if (!commentForm) return;
    
    commentForm.addEventListener('submit', handleCommentSubmit);
}

// 댓글 작성 폼 제출 처리
async function handleCommentSubmit(event) {
    event.preventDefault();
    
    // 로그인 체크
    if (!Auth.isAuthenticated()) {
        showNotification('로그인이 필요합니다.', 'error');
        return;
    }
    
    const form = event.target;
    const contentInput = form.querySelector('#comment-content');
    const submitBtn = form.querySelector('#comment-submit-btn');
    const content = contentInput.value.trim();
    
    // 내용 검증
    if (content.length < 2) {
        showNotification('댓글은 2자 이상 입력해주세요.', 'error');
        return;
    }
    
    try {
        // 버튼 로딩 상태
        setLoading(submitBtn, true);
        
        // API 호출
        await CommentAPI.createComment(currentPostId, content);
        
        // 폼 초기화
        contentInput.value = '';
        
        // 댓글 목록 새로고침
        loadComments();
        
    } catch (error) {
        console.error('댓글 작성 실패:', error);
        // 에러 메시지는 CommentAPI에서 처리됨
    } finally {
        setLoading(submitBtn, false);
    }
}

// 댓글 목록 로드
async function loadComments() {
    const commentsSection = document.getElementById('comments-section');
    const commentsList = document.getElementById('comments-list');
    const commentCount = document.getElementById('comment-count');
    
    if (!commentsSection || !commentsList) return;
    
    try {
        // 로딩 상태 표시
        commentsList.innerHTML = '<div class="loading"><div class="spinner"></div><p>댓글을 불러오는 중...</p></div>';
        
        const response = await CommentAPI.getComments(currentPostId, currentCommentsPage);
        
        if (response.comments && response.comments.length > 0) {
            renderComments(response.comments, commentsList);
            
            // 댓글 수 업데이트
            if (commentCount) {
                commentCount.textContent = response.totalElements || response.comments.length;
            }
            
            // 페이지네이션 정보 업데이트
            totalCommentsPages = response.totalPages || 1;
            
        } else {
            commentsList.innerHTML = '<p class="text-muted text-center">댓글이 없습니다. 첫 번째 댓글을 작성해보세요!</p>';
            
            if (commentCount) {
                commentCount.textContent = '0';
            }
        }
        
        // 댓글 섹션 표시
        showElement(commentsSection);
        
    } catch (error) {
        console.error('댓글 로드 실패:', error);
        commentsList.innerHTML = '<div class="error-banner"><p>댓글을 불러오는데 실패했습니다.</p></div>';
    }
}

// 댓글 목록 렌더링
function renderComments(comments, container) {
    let html = '';
    
    comments.forEach(comment => {
        html += createCommentElement(comment);
        
        // 대댓글이 있으면 렌더링
        if (comment.replies && comment.replies.length > 0) {
            comment.replies.forEach(reply => {
                html += createCommentElement(reply, true);
            });
        }
    });
    
    container.innerHTML = html;
}

// 댓글 요소 생성
function createCommentElement(comment, isReply = false) {
    const currentUser = Auth.getUser();
    const isMyComment = currentUser && comment.authorId === currentUser.id;
    const isAdmin = Auth.isAdmin();
    
    // 수정/삭제 버튼 (본인 댓글이거나 관리자인 경우만)
    const editDeleteButtons = (isMyComment || isAdmin) ? `
        <button class="btn btn-sm btn-outline" onclick="editComment(${comment.id})">수정</button>
        <button class="btn btn-sm btn-danger" onclick="deleteComment(${comment.id})">삭제</button>
    ` : '';
    
    // 답글 버튼 (대댓글이 아니고 로그인한 경우만)
    const replyButton = (!isReply && Auth.isAuthenticated()) ? `
        <button class="btn btn-sm btn-outline" onclick="showReplyForm(${comment.id})">답글</button>
    ` : '';
    
    const replyClass = isReply ? 'reply-item' : '';
    
    return `
        <div class="comment-item ${replyClass}" id="comment-${comment.id}">
            <div class="comment-meta">
                <div>
                    <span class="comment-author">${sanitizeHTML(comment.authorNickname)}</span>
                    <span class="comment-date">${formatDate(comment.createdAt)}</span>
                </div>
                <div class="comment-actions">
                    ${replyButton}
                    ${editDeleteButtons}
                </div>
            </div>
            <div class="comment-content" id="comment-content-${comment.id}">
                ${sanitizeHTML(comment.content)}
            </div>
            ${!isReply ? `<div class="reply-form-container hidden" id="reply-form-${comment.id}"></div>` : ''}
        </div>
    `;
}

// 답글 작성 폼 표시
function showReplyForm(parentCommentId) {
    // 기존 답글 폼들 숨기기
    hideAllReplyForms();
    
    const container = document.getElementById(`reply-form-${parentCommentId}`);
    if (!container) return;
    
    container.innerHTML = `
        <form onsubmit="handleReplySubmit(event, ${parentCommentId})" class="reply-form">
            <div class="form-group">
                <textarea id="reply-content-${parentCommentId}" class="form-control" placeholder="답글을 입력하세요" rows="3" required></textarea>
            </div>
            <div class="form-actions" style="justify-content: flex-end; gap: 8px;">
                <button type="button" onclick="hideReplyForm(${parentCommentId})" class="btn btn-sm btn-secondary">취소</button>
                <button type="submit" class="btn btn-sm btn-primary">답글 작성</button>
            </div>
        </form>
    `;
    
    showElement(container);
    
    // 텍스트 영역에 포커스
    const textarea = document.getElementById(`reply-content-${parentCommentId}`);
    if (textarea) {
        textarea.focus();
    }
}

// 답글 폼 숨기기
function hideReplyForm(parentCommentId) {
    const container = document.getElementById(`reply-form-${parentCommentId}`);
    if (container) {
        hideElement(container);
        container.innerHTML = '';
    }
}

// 모든 답글 폼 숨기기
function hideAllReplyForms() {
    const replyForms = document.querySelectorAll('.reply-form-container');
    replyForms.forEach(form => {
        hideElement(form);
        form.innerHTML = '';
    });
}

// 답글 작성 처리
async function handleReplySubmit(event, parentCommentId) {
    event.preventDefault();
    
    const form = event.target;
    const textarea = form.querySelector(`#reply-content-${parentCommentId}`);
    const submitBtn = form.querySelector('button[type="submit"]');
    const content = textarea.value.trim();
    
    if (content.length < 2) {
        showNotification('답글은 2자 이상 입력해주세요.', 'error');
        return;
    }
    
    try {
        setLoading(submitBtn, true);
        
        // 대댓글 작성 (parentId 포함)
        await CommentAPI.createComment(currentPostId, content, parentCommentId);
        
        // 답글 폼 숨기기
        hideReplyForm(parentCommentId);
        
        // 댓글 목록 새로고침
        loadComments();
        
    } catch (error) {
        console.error('답글 작성 실패:', error);
    } finally {
        setLoading(submitBtn, false);
    }
}

// 댓글 수정
async function editComment(commentId) {
    const contentElement = document.getElementById(`comment-content-${commentId}`);
    if (!contentElement) return;
    
    const currentContent = contentElement.textContent.trim();
    const newContent = prompt('댓글을 수정하세요:', currentContent);
    
    if (!newContent || newContent.trim().length < 2) {
        return;
    }
    
    if (newContent.trim() === currentContent) {
        return; // 변경사항 없음
    }
    
    try {
        await CommentAPI.updateComment(commentId, newContent.trim());
        
        // 댓글 목록 새로고침
        loadComments();
        
    } catch (error) {
        console.error('댓글 수정 실패:', error);
    }
}

// 댓글 삭제
async function deleteComment(commentId) {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await CommentAPI.deleteComment(commentId);
        
        // 댓글 목록 새로고침
        loadComments();
        
    } catch (error) {
        console.error('댓글 삭제 실패:', error);
    }
}

// 댓글 더 보기 (페이지네이션)
async function loadMoreComments() {
    if (currentCommentsPage >= totalCommentsPages - 1) {
        return; // 더 이상 댓글이 없음
    }
    
    currentCommentsPage++;
    
    try {
        const response = await CommentAPI.getComments(currentPostId, currentCommentsPage);
        
        if (response.comments && response.comments.length > 0) {
            const commentsList = document.getElementById('comments-list');
            const additionalHtml = response.comments.map(comment => {
                let html = createCommentElement(comment);
                if (comment.replies && comment.replies.length > 0) {
                    comment.replies.forEach(reply => {
                        html += createCommentElement(reply, true);
                    });
                }
                return html;
            }).join('');
            
            commentsList.innerHTML += additionalHtml;
        }
        
    } catch (error) {
        console.error('추가 댓글 로드 실패:', error);
        currentCommentsPage--; // 실패시 페이지 번호 복원
    }
}
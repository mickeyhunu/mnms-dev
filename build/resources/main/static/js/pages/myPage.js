let currentUser = null;
let currentUserId = null;
let currentMessageTab = 'received';
let allUsers = [];

document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
    initTabNavigation();
    initProfileForm();
    initPasswordForm();
    initMessageModalEvents();
});

async function loadUserProfile() {
    try {
        currentUser = await AuthAPI.getCurrentUser();
        if (!currentUser) {
            window.location.href = '/login.html';
            return;
        }
        
        currentUserId = currentUser.id;
        displayUserProfile(currentUser);
        showProfileContainer();
        loadMyPosts();
        await loadAllUsers();
    } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
        showError('사용자 정보를 불러오는 중 오류가 발생했습니다.');
        window.location.href = '/login.html';
    }
}

function showProfileContainer() {
    const loading = document.getElementById('loading');
    const profileContainer = document.getElementById('profile-container');
    
    if (loading) loading.classList.add('hidden');
    if (profileContainer) profileContainer.classList.remove('hidden');
}

function displayUserProfile(user) {
    const profileEmail = document.getElementById('profile-email');
    const profileNickname = document.getElementById('profile-nickname');
    const emailInput = document.getElementById('email');
    const departmentInput = document.getElementById('department');
    const jobPositionInput = document.getElementById('job-position');
    const nicknameInput = document.getElementById('nickname');
    const companyInput = document.getElementById('company');

    if (profileEmail) profileEmail.textContent = user.email;
    if (profileNickname) profileNickname.textContent = user.nickname;
    if (emailInput) emailInput.value = user.email;
    if (departmentInput) departmentInput.value = user.department || '';
    if (jobPositionInput) jobPositionInput.value = user.jobPosition || '';
    if (nicknameInput) nicknameInput.value = user.nickname || '';
    if (companyInput) companyInput.value = user.company || '';
}

function initTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            if (tabName === 'messages') {
                openMessageModal();
                return;
            }
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            this.classList.add('active');
            const targetPane = document.getElementById(tabName + '-tab');
            if (targetPane) {
                targetPane.classList.add('active');
            }

            if (tabName === 'posts') {
                loadMyPosts();
            } else if (tabName === 'stats') {
                loadUserStats();
            }
        });
    });
}

function initMessageModalEvents() {
    const tabBtns = document.querySelectorAll('.modal-message-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            switchModalMessageTab(tab);
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });

    const composeForm = document.getElementById('composeForm');
    if (composeForm) {
        composeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendModalMessage();
        });
    }
}

function initProfileForm() {
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const profileData = {
                department: formData.get('department'),
                jobPosition: formData.get('jobPosition'),
                nickname: formData.get('nickname'),
                company: formData.get('company')
            };

            try {
                const response = await APIClient.put(`/users/${currentUser.id}`, null, profileData);
                showSuccess('프로필이 업데이트되었습니다.');
                await loadUserProfile();
            } catch (error) {
                console.error('프로필 업데이트 실패:', error);
                showError('프로필 업데이트에 실패했습니다.');
            }
        });
    }
}

function initPasswordForm() {
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmPassword');

            if (newPassword !== confirmPassword) {
                showError('새 비밀번호가 일치하지 않습니다.');
                return;
            }

            if (newPassword.length < 8) {
                showError('비밀번호는 8자 이상이어야 합니다.');
                return;
            }

            try {
                await APIClient.put(`/users/${currentUser.id}/password`, null, {
                    newPassword: newPassword
                });
                
                showSuccess('비밀번호가 변경되었습니다.');
                this.reset();
            } catch (error) {
                console.error('비밀번호 변경 실패:', error);
                showError('비밀번호 변경에 실패했습니다.');
            }
        });
    }
}

async function loadMyPosts() {
    try {
        if (!currentUser) return;
        
        const response = await APIClient.get(`/posts?authorId=${currentUser.id}&page=0&size=20`);
        displayMyPosts(response.posts);
    } catch (error) {
        console.error('내 게시글 로드 실패:', error);
        const postsContainer = document.getElementById('my-posts-list');
        if (postsContainer) {
            postsContainer.innerHTML = '<div class="error-message">게시글을 불러오는 중 오류가 발생했습니다.</div>';
        }
    }
}

function displayMyPosts(posts) {
    const container = document.getElementById('my-posts-list');
    if (!container) return;

    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="no-data">작성한 게시글이 없습니다.</div>';
        return;
    }

    container.innerHTML = posts.map(post => `
        <div class="my-post-card" onclick="location.href='/posts/detail?id=${post.id}'">
            <div class="post-title">${post.title}</div>
            <div class="post-meta">
                <span class="post-date">${formatDate(post.createdAt)}</span>
                <div class="post-stats">
                    <span>좋아요: ${post.likeCount}</span>
                    <span>댓글: ${post.commentCount}</span>
                </div>
            </div>
            <div class="post-content">${truncateText(post.content, 100)}</div>
        </div>
    `).join('');
}

async function loadUserStats() {
    try {
        if (!currentUser || !currentUser.id) {
            return;
        }
        
        const response = await APIClient.get(`/users/${currentUser.id}/stats`);
        
        const totalPostsElement = document.getElementById('total-posts');
        const totalCommentsElement = document.getElementById('total-comments');
        const totalLikesElement = document.getElementById('total-likes');
        
        if (totalPostsElement) totalPostsElement.textContent = response.postCount || 0;
        if (totalCommentsElement) totalCommentsElement.textContent = response.commentCount || 0;
        if (totalLikesElement) totalLikesElement.textContent = response.likeCount || 0;
        
    } catch (error) {
        console.error('통계 로딩 오류:', error);
        if (document.getElementById('total-posts')) document.getElementById('total-posts').textContent = '오류';
        if (document.getElementById('total-comments')) document.getElementById('total-comments').textContent = '오류';
        if (document.getElementById('total-likes')) document.getElementById('total-likes').textContent = '오류';
    }
}

async function loadAllUsers() {
    try {
        const response = await APIClient.get('/users');
        allUsers = response.filter(user => user.id !== currentUserId);
        return allUsers;
    } catch (error) {
        console.error('사용자 목록 로드 실패:', error);
        return [];
    }
}

function openMessageModal() {
    const modal = document.getElementById('messageModal');
    if (modal) {
        modal.classList.add('active');
        loadModalMessages();
    }
}

function closeMessageModal() {
    const modal = document.getElementById('messageModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function openMessageDetailModal(messageId) {
    loadMessageDetail(messageId);
    const modal = document.getElementById('messageDetailModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeMessageDetailModal() {
    const modal = document.getElementById('messageDetailModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function openComposeModal() {
    const modal = document.getElementById('composeModal');
    const receiverContainer = document.getElementById('receiverContainer');
    
    if (receiverContainer) {
        createUserDropdown();
    }
    
    const titleInput = document.getElementById('messageTitle');
    const contentInput = document.getElementById('messageContent');
    if (titleInput) titleInput.value = '';
    if (contentInput) contentInput.value = '';
    
    if (modal) modal.classList.add('active');
}

function openReplyModal(senderNickname, originalTitle) {
    const modal = document.getElementById('composeModal');
    
    const receiverContainer = document.getElementById('receiverContainer');
    if (receiverContainer) {
        receiverContainer.innerHTML = `
            <label>받는 사람 (답장)</label>
            <div style="display: flex; align-items: center; gap: 10px; background: #e8f5e8; padding: 8px; border-radius: 4px;">
                <strong style="color: #28a745;">${senderNickname}</strong>
                <span style="color: #666; font-size: 12px;">답장 대상 고정됨</span>
            </div>
            <input type="hidden" id="receiverNickname" value="${senderNickname}">
        `;
    }
    
    const titleInput = document.getElementById('messageTitle');
    if (titleInput) {
        const replyTitle = originalTitle.startsWith('Re: ') ? originalTitle : `Re: ${originalTitle}`;
        titleInput.value = replyTitle;
    }
    
    const contentInput = document.getElementById('messageContent');
    if (contentInput) {
        contentInput.value = '';
        contentInput.focus();
    }
    
    if (modal) modal.classList.add('active');
}

function createUserDropdown() {
    const receiverContainer = document.getElementById('receiverContainer');
    if (!receiverContainer || allUsers.length === 0) return;
    
    const options = allUsers.map(user => 
        `<option value="${user.nickname}">${user.nickname} (${user.department || '부서없음'})</option>`
    ).join('');
    
    receiverContainer.innerHTML = `
        <label for="receiverSelect">받는 사람</label>
        <select id="receiverSelect" class="form-control-modal" onchange="selectReceiver()">
            <option value="">받는 사람을 선택하세요</option>
            ${options}
        </select>
        <input type="hidden" id="receiverNickname" value="">
    `;
}

function selectReceiver() {
    const select = document.getElementById('receiverSelect');
    const hidden = document.getElementById('receiverNickname');
    
    if (select && hidden) {
        hidden.value = select.value;
    }
}

function closeComposeModal() {
    const modal = document.getElementById('composeModal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    const titleInput = document.getElementById('messageTitle');
    const contentInput = document.getElementById('messageContent');
    if (titleInput) titleInput.value = '';
    if (contentInput) contentInput.value = '';
}

function switchModalMessageTab(tab) {
    currentMessageTab = tab;
    
    document.querySelectorAll('.modal-message-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`.modal-message-tab-btn[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    const receivedContainer = document.getElementById('modal-received-messages');
    const sentContainer = document.getElementById('modal-sent-messages');
    
    if (receivedContainer && sentContainer) {
        receivedContainer.style.display = tab === 'received' ? 'block' : 'none';
        sentContainer.style.display = tab === 'sent' ? 'block' : 'none';
    }
    
    loadModalMessages();
}

async function loadModalMessages() {
    const container = document.getElementById(currentMessageTab === 'received' ? 'modal-received-messages' : 'modal-sent-messages');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-modal">쪽지를 불러오는 중...</div>';
    
    try {
        const url = currentMessageTab === 'received' 
            ? `/Message/List/Received?userId=${currentUserId}` 
            : `/Message/List/Sent?userId=${currentUserId}`;
        
        const response = await fetch(url);
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const rows = doc.querySelectorAll('tbody tr');
        
        if (rows.length === 0 || (rows.length === 1 && rows[0].querySelector('td[colspan]'))) {
            container.innerHTML = `
                <div class="empty-state-modal">
                    <h4>쪽지가 없습니다</h4>
                    <p>${currentMessageTab === 'received' ? '받은' : '보낸'} 쪽지가 없습니다.</p>
                </div>
            `;
            return;
        }
        
        let messagesHTML = '';
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                const personName = cells[0].textContent.trim();
                const titleCell = cells[1];
                const title = titleCell.querySelector('a') ? titleCell.querySelector('a').textContent.trim() : titleCell.textContent.trim();
                const date = cells[2].textContent.trim();
                const isUnread = titleCell.classList.contains('unread');
                const messageId = titleCell.querySelector('a') ? titleCell.querySelector('a').getAttribute('href').split('id=')[1] : '';
                
                messagesHTML += `
                    <div class="modal-message-card ${isUnread ? 'unread' : ''}" onclick="openMessageDetailModal('${messageId}')">
                        <div class="modal-message-meta">
                            <strong>${currentMessageTab === 'received' ? '보낸 사람' : '받는 사람'}: ${personName}</strong>
                            <span class="modal-message-date">${date}</span>
                        </div>
                        <div class="modal-message-content">${title}</div>
                        <div class="modal-message-actions">
                            ${currentMessageTab === 'received' ? 
                                `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openReplyModal('${personName}', '${title}')">답장</button>` :
                                `<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); openComposeModal()">재전송</button>`
                            }
                            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteModalMessage('${messageId}')">삭제</button>
                        </div>
                    </div>
                `;
            }
        });
        
        container.innerHTML = messagesHTML;
        
    } catch (error) {
        console.error('메시지 로딩 오류:', error);
        container.innerHTML = `
            <div class="empty-state-modal">
                <h4>오류가 발생했습니다</h4>
                <p>쪽지를 불러오는 중 문제가 발생했습니다.</p>
                <button class="btn btn-primary" onclick="loadModalMessages()">다시 시도</button>
            </div>
        `;
    }
}

async function loadMessageDetail(messageId) {
    const container = document.getElementById('messageDetailContent');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-modal">쪽지를 불러오는 중...</div>';
    
    try {
        const response = await fetch(`/Message/View?id=${messageId}`);
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const msgInfo = doc.querySelector('.msg-info');
        const msgContent = doc.querySelector('.msg-content');
        
        if (msgInfo && msgContent) {
            const sender = msgInfo.querySelector('p:nth-child(1)').textContent.replace('보낸 사람:', '').trim();
            const title = msgInfo.querySelector('p:nth-child(3)').textContent.replace('제목:', '').trim();
            const date = msgInfo.querySelector('p:nth-child(4)').textContent.replace('보낸 날짜:', '').trim();
            const content = msgContent.innerHTML;
            
            container.innerHTML = `
                <div class="message-detail-header">
                    <h4>${title}</h4>
                    <div class="message-detail-info">
                        <span>보낸 사람: ${sender}</span>
                        <span>${date}</span>
                    </div>
                </div>
                <div class="message-detail-content">
                    ${content}
                </div>
                <div class="message-detail-actions">
                    <button class="btn btn-outline" onclick="closeMessageDetailModal()">닫기</button>
                    <button class="btn btn-primary" onclick="openReplyModal('${sender}', '${title}'); closeMessageDetailModal();">답장</button>
                </div>
            `;
        } else {
            throw new Error('메시지 내용을 찾을 수 없습니다.');
        }
        
    } catch (error) {
        console.error('메시지 상세 로딩 오류:', error);
        container.innerHTML = `
            <div class="empty-state-modal">
                <h4>오류가 발생했습니다</h4>
                <p>쪽지를 불러오는 중 문제가 발생했습니다.</p>
                <button class="btn btn-primary" onclick="closeMessageDetailModal()">닫기</button>
            </div>
        `;
    }
}

async function sendModalMessage() {
    const receiverNickname = document.getElementById('receiverNickname').value.trim();
    const title = document.getElementById('messageTitle').value.trim();
    const content = document.getElementById('messageContent').value.trim();
    
    if (!receiverNickname || !title || !content) {
        alert('모든 필드를 입력해주세요.');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('sender_id', currentUserId);
        formData.append('receiver_nickname', receiverNickname);
        formData.append('title', title);
        formData.append('content', content);
        
        const response = await fetch('/Message/Send', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            alert('쪽지가 전송되었습니다.');
            closeComposeModal();
            loadModalMessages();
        } else {
            throw new Error(`서버 오류: ${response.status}`);
        }
        
    } catch (error) {
        console.error('쪽지 전송 오류:', error);
        alert('쪽지 전송 중 오류가 발생했습니다: ' + error.message);
    }
}

async function deleteModalMessage(messageId) {
    if (!confirm('이 쪽지를 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/Message/ReceiverDelete?id=${messageId}`);
        if (response.ok) {
            loadModalMessages();
        } else {
            throw new Error('삭제 실패');
        }
    } catch (error) {
        console.error('쪽지 삭제 오류:', error);
        alert('쪽지 삭제 중 오류가 발생했습니다.');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay) {
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
}

function truncateText(text, maxLength) {
    return text && text.length > maxLength ? text.substring(0, maxLength) + '...' : text || '';
}

function showSuccess(message) {
    alert(message);
}

function showError(message) {
    alert(message);
}
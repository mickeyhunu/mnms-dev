function initHeader() {
    Auth.updateHeaderUI();
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

function handleLogout(e) {
    e.preventDefault();
    
    if (confirm('로그아웃 하시겠습니까?')) {
        AuthAPI.logout();
        window.location.href = '/';
    }
}

function updateHeaderForUser(user) {
    const navGuest = document.getElementById('nav-guest');
    const navUser = document.getElementById('nav-user');
    const userNickname = document.getElementById('user-nickname');
    const adminLink = document.getElementById('admin-link');

    if (user) {
        hideElement(navGuest);
        showElement(navUser);
        
        if (userNickname) {
            userNickname.textContent = user.nickname;
        }
        
        if (adminLink) {
            toggleElement(adminLink, user.isAdmin);
        }
    } else {
        showElement(navGuest);
        hideElement(navUser);
    }
}

function setupHeaderNotifications() {
    const user = Auth.getUser();
    if (!user) return;
    
    updateMessageNotificationBadge();
    
    setInterval(updateMessageNotificationBadge, 60000);
}

async function updateMessageNotificationBadge() {
    try {
        const user = Auth.getUser();
        if (!user) return;
        
        const token = Auth.getToken();
        if (!token) return;
        
        const response = await fetch('/api/posts/messages/unread-count', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const unreadCount = data.count || 0;
        
        const badge = document.getElementById('message-notification-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Failed to update notification badge:', error);
    }
}

console.log('Header loaded');
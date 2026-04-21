const Auth = {
    getToken() {
        return localStorage.getItem(STORAGE_KEYS.TOKEN);
    },
    setToken(token) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    },
    getUser() {
        const userData = localStorage.getItem(STORAGE_KEYS.USER);
        return userData ? JSON.parse(userData) : null;
    },
    setUser(user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        this.updateHeaderUI();
    },
    isAuthenticated() {
        return !!this.getToken();
    },
    requireAuth() {
        if (!this.isAuthenticated()) {
            showNotification('로그인이 필요합니다.', 'warning');
            window.location.href = '/login';
            return false;
        }
        return true;
    },
    logout() {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        this.updateHeaderUI();
        window.location.href = '/index';
    },
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            window.location.href = '/index';
            return true;
        }
        return false;
    },
    redirectIfNotAuthenticated() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login';
            return true;
        }
        return false;
    },
    handleAuthError(error) {
        if (error && (error.status === 401 || error.message?.includes('401'))) {
            this.logout();
            showNotification('세션이 만료되었습니다. 다시 로그인해주세요.', 'warning');
        } else if (error && error.status === 403) {
            showNotification('권한이 없습니다.', 'error');
        } else {
            showNotification('오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
        }
    },
    updateHeaderUI() {
        const user = this.getUser();
        const navGuest = document.getElementById('nav-guest');
        const navUser = document.getElementById('nav-user');
        const userNickname = document.getElementById('user-nickname');
        const adminLink = document.getElementById('admin-link');

        if (user && this.isAuthenticated()) {
            if (navGuest) navGuest.classList.add('hidden');
            if (navUser) navUser.classList.remove('hidden');
            if (userNickname) {
                userNickname.textContent = user.nickname;
            }
            if (adminLink && user.isAdmin) {
                adminLink.classList.remove('hidden');
            } else if (adminLink) {
                adminLink.classList.add('hidden');
            }
        } else {
            if (navGuest) navGuest.classList.remove('hidden');
            if (navUser) navUser.classList.add('hidden');
        }
    }
};

console.log('Auth loaded');
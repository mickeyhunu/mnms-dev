/**
 * 파일 역할: auth에서 사용하는 공통 보조 함수/상수를 제공하는 유틸리티 파일.
 */
const Auth = {
    resolveNicknameDisplayElement() {
        const label = document.getElementById('user-nickname-label');
        if (label) return label;

        const legacy = document.getElementById('user-nickname');
        if (!legacy) return null;

        if (legacy.querySelector && legacy.querySelector('#user-nickname-label')) {
            return legacy.querySelector('#user-nickname-label');
        }

        return legacy;
    },
    isBusinessAccount(user) {
        if (!user) return false;

        if (typeof user.isBusiness === 'boolean') return user.isBusiness;
        if (typeof user.isAdvertiser === 'boolean') return user.isAdvertiser;

        const role = String(user.role || '').toUpperCase();
        const memberType = String(user.memberType || user.member_type || user.accountType || '').toUpperCase();

        return role === 'BUSINESS' || memberType === 'BUSINESS';
    },
    normalizeBusinessAdPlan(plan) {
        const normalized = String(plan || '').trim().toLowerCase();
        if (['basic', 'plus', 'premium', 'banner'].includes(normalized)) {
            return normalized;
        }

        return '';
    },
    isBusinessAdActive(user) {
        if (!user) return false;

        const activeFlagCandidates = [
            user?.hasActiveBusinessAd,
            user?.businessAdActive,
            user?.isBusinessAdActive,
            user?.isAdvertising,
            user?.adActive
        ];

        const explicitFlag = activeFlagCandidates.find((value) => typeof value === 'boolean');
        if (typeof explicitFlag === 'boolean') return explicitFlag;

        return false;
    },
    resolveBusinessBadge(user) {
        if (!this.isBusinessAccount(user)) {
            return { image: '', label: '' };
        }

        const rawPlan = user?.adPlan
            || user?.plan
            || user?.businessAdPlan
            || user?.businessPlan
            || user?.ad_plan
            || user?.business_ad_plan;
        const adPlan = this.normalizeBusinessAdPlan(rawPlan);

        if (adPlan) {
            const labelMap = {
                basic: '베이직',
                plus: '플러스',
                premium: '프리미엄',
                banner: '배너'
            };
            return {
                image: `/src/assets/ad-plan-badges/${adPlan}-badge.png`,
                label: labelMap[adPlan] || adPlan
            };
        }

        if (this.isBusinessAdActive(user)) {
            return {
                image: '/src/assets/ad-plan-badges/premium-badge.png',
                label: '프리미엄'
            };
        }

        return {
            image: '/src/assets/ad-plan-badges/none-badge.png',
            label: '미광고'
        };
    },
    resolveBusinessBadgeImage(user) {
        return this.resolveBusinessBadge(user).image;
    },
    resolveBusinessBadgeLabel(user) {
        return this.resolveBusinessBadge(user).label;
    },
    formatNicknameWithLevel(user) {
        if (!user) return '';

        const nickname = user.nickname || user.email || '';
        const levelEmoji = this.isBusinessAccount(user) ? '' : (user.levelEmoji || '');

        return levelEmoji ? `${nickname} ${levelEmoji}` : nickname;
    },
    applyNicknameDisplay(element, user) {
        if (!element) return;

        element.textContent = this.formatNicknameWithLevel(user);
        const badgeImage = this.resolveBusinessBadgeImage(user);
        if (!badgeImage) return;

        const badge = document.createElement('img');
        badge.className = 'user-business-badge';
        badge.src = badgeImage;
        badge.alt = '기업회원 광고 등급 배지';
        badge.loading = 'lazy';
        element.appendChild(document.createTextNode(' '));
        element.appendChild(badge);
    },
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
        window.location.href = '/';
    },
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            window.location.href = '/';
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
        const userNickname = this.resolveNicknameDisplayElement();
        const adminLink = document.getElementById('admin-link');

        if (typeof HeaderUserMenu !== 'undefined') {
            HeaderUserMenu.setOpenState(false);
        }

        if (user && this.isAuthenticated()) {
            if (navGuest) navGuest.classList.add('hidden');
            if (navUser) navUser.classList.remove('hidden');
            if (userNickname) this.applyNicknameDisplay(userNickname, user);
            if (adminLink && user.isAdmin) {
                adminLink.classList.remove('hidden');
            } else if (adminLink) {
                adminLink.classList.add('hidden');
            }
        } else {
            if (navGuest) navGuest.classList.remove('hidden');
            if (navUser) navUser.classList.add('hidden');
            if (userNickname) {
                userNickname.textContent = '';
            }
        }

        this.bindLogoutButton();
    },
    bindLogoutButton() {
        const logoutBtn = document.getElementById('logout-btn');
        if (!logoutBtn || logoutBtn.dataset.boundLogout === 'true') {
            return;
        }

        logoutBtn.dataset.boundLogout = 'true';
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!confirm('로그아웃 하시겠습니까?')) {
                return;
            }

            if (typeof AuthAPI !== 'undefined' && AuthAPI.logout) {
                await AuthAPI.logout();
                return;
            }

            Auth.logout();
        });
    }
};

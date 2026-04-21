/**
 * 파일 역할: header UI 상호작용을 담당하는 재사용 컴포넌트 스크립트 파일.
 */
const HeaderNotificationCenter = {
    refreshTimer: null,
    outsideClickHandler: null,

    async init() {
        const user = Auth.getUser();
        const button = document.getElementById('header-notification-button');
        const panel = document.getElementById('header-notification-panel');

        if (!user || !button || !panel || typeof APIClient === 'undefined') {
            this.teardown();
            return;
        }

        this.bindEvents();
        await this.refresh();
        this.startAutoRefresh();
    },

    teardown() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }

        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
            this.outsideClickHandler = null;
        }
    },

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            this.refresh();
        }, 60000);
    },

    bindEvents() {
        const button = document.getElementById('header-notification-button');
        const panel = document.getElementById('header-notification-panel');
        const readAllButton = document.getElementById('header-notification-read-all');

        if (button && button.dataset.boundNotification !== 'true') {
            button.dataset.boundNotification = 'true';
            button.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const isHidden = panel.classList.contains('hidden');
                if (isHidden) {
                    panel.classList.remove('hidden');
                    button.setAttribute('aria-expanded', 'true');
                    await this.refresh();
                } else {
                    panel.classList.add('hidden');
                    button.setAttribute('aria-expanded', 'false');
                }
            });
        }

        if (readAllButton && readAllButton.dataset.boundNotificationReadAll !== 'true') {
            readAllButton.dataset.boundNotificationReadAll = 'true';
            readAllButton.addEventListener('click', () => {
                this.markAllAsRead();
            });
        }

        const list = document.getElementById('header-notification-list');
        if (list && list.dataset.boundNotificationList !== 'true') {
            list.dataset.boundNotificationList = 'true';
            list.addEventListener('click', async (event) => {
                const item = event.target.closest('[data-notification-key]');
                if (!item) return;
                const notificationKey = item.dataset.notificationKey;
                await this.markAsRead(notificationKey);
                const targetUrl = item.dataset.notificationUrl;
                if (targetUrl) {
                    window.location.href = targetUrl;
                }
            });
        }

        if (!this.outsideClickHandler) {
            this.outsideClickHandler = (event) => {
                const wrapper = document.querySelector('.header-notification-wrapper');
                if (!wrapper || wrapper.contains(event.target)) {
                    return;
                }
                if (panel && !panel.classList.contains('hidden')) {
                    panel.classList.add('hidden');
                }
                if (button) {
                    button.setAttribute('aria-expanded', 'false');
                }
            };
            document.addEventListener('click', this.outsideClickHandler);
        }
    },

    async markAsRead(notificationKey) {
        if (!notificationKey) return;
        try {
            await APIClient.post('/users/me/notifications/read', {
                notificationKeys: [notificationKey]
            });
            if (Array.isArray(this.currentNotifications)) {
                this.currentNotifications = this.currentNotifications.map((item) => (
                    item.notificationKey === notificationKey
                        ? { ...item, isRead: true, readAt: new Date().toISOString() }
                        : item
                ));
            }
            this.renderCurrentState();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    },

    async markAllAsRead() {
        try {
            await APIClient.post('/users/me/notifications/read-all', { limit: 100 });
            if (Array.isArray(this.currentNotifications)) {
                const readAt = new Date().toISOString();
                this.currentNotifications = this.currentNotifications.map((item) => ({
                    ...item,
                    isRead: true,
                    readAt
                }));
            }
            this.renderCurrentState();
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    },

    async refresh() {
        try {
            const response = await APIClient.get('/users/me/notifications', { limit: 30 });
            this.currentNotifications = Array.isArray(response.content) ? response.content : [];
            this.renderCurrentState();
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            this.currentNotifications = [];
            this.renderErrorState();
        }
    },

    renderCurrentState() {
        const list = document.getElementById('header-notification-list');
        const dot = document.getElementById('header-notification-dot');
        if (!list || !dot) return;

        const notifications = this.currentNotifications || [];
        const hasUnread = notifications.some((item) => !item.isRead);

        dot.classList.toggle('hidden', !hasUnread);

        if (!notifications.length) {
            list.innerHTML = '<div class="header-notification-empty">새로운 알림이 없습니다.</div>';
            return;
        }

        list.innerHTML = notifications.map((item) => {
            const isUnread = !item.isRead;
            return `
                <button type="button" class="header-notification-item ${isUnread ? 'is-unread' : ''}" data-notification-key="${item.notificationKey}" data-notification-url="${item.targetUrl || ''}">
                    <div class="header-notification-item-top">
                        <span class="header-notification-item-type">${this.getTypeLabel(item.type)}</span>
                        <span class="header-notification-item-date">${this.formatDate(item.createdAt)}</span>
                    </div>
                    <div class="header-notification-item-message">${this.escapeHtml(item.message || '')}</div>
                    <div class="header-notification-item-sub">${this.buildSubText(item)}</div>
                </button>
            `;
        }).join('');
    },

    renderErrorState() {
        const list = document.getElementById('header-notification-list');
        if (!list) return;
        list.innerHTML = '<div class="header-notification-empty">알림을 불러오지 못했습니다.</div>';
        const dot = document.getElementById('header-notification-dot');
        if (dot) {
            dot.classList.add('hidden');
        }
    },

    getTypeLabel(type) {
        if (type === 'post_comment') return '내 글 댓글';
        if (type === 'comment_reply') return '내 댓글 대댓글';
        if (type === 'admin_notice') return '관리자 알림';
        if (type === 'inquiry_answer') return '1:1 문의 답변';
        return '알림';
    },

    buildSubText(item) {
        const chunks = [];
        if (item.actorNickname) chunks.push(this.escapeHtml(item.actorNickname));
        if (item.postTitle) chunks.push(this.escapeHtml(item.postTitle));
        if (item.title) chunks.push(this.escapeHtml(item.title));
        return chunks.join(' · ');
    },

    formatDate(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return new Intl.DateTimeFormat('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};


const HeaderUserMenu = {
    outsideClickHandler: null,

    init() {
        const button = document.getElementById('user-nickname');
        const dropdown = document.getElementById('header-user-dropdown');
        const menu = document.getElementById('header-user-menu');

        if (!button || !dropdown || !menu) {
            this.teardown();
            return;
        }

        if (button.dataset.boundUserMenu !== 'true') {
            button.dataset.boundUserMenu = 'true';
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const willOpen = dropdown.classList.contains('hidden');
                this.setOpenState(willOpen);
            });
        }

        if (!this.outsideClickHandler) {
            this.outsideClickHandler = (event) => {
                if (menu.contains(event.target)) {
                    return;
                }
                this.setOpenState(false);
            };
            document.addEventListener('click', this.outsideClickHandler);
        }
    },

    setOpenState(isOpen) {
        const button = document.getElementById('user-nickname');
        const dropdown = document.getElementById('header-user-dropdown');
        if (!button || !dropdown) return;

        dropdown.classList.toggle('hidden', !isOpen);
        button.setAttribute('aria-expanded', String(isOpen));
    },

    teardown() {
        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
            this.outsideClickHandler = null;
        }
    }
};

function initHeader() {
    Auth.updateHeaderUI();
    Auth.bindLogoutButton();
    HeaderUserMenu.init();
    HeaderNotificationCenter.init();
}

function autoInitHeader() {
    const hasHeaderAuthTargets = document.getElementById('nav-guest')
        || document.getElementById('nav-user')
        || document.getElementById('logout-btn')
        || document.getElementById('user-nickname')
        || document.getElementById('header-user-dropdown');

    if (!hasHeaderAuthTargets || typeof Auth === 'undefined') {
        return;
    }

    initHeader();
}

function updateHeaderForUser(user) {
    const navGuest = document.getElementById('nav-guest');
    const navUser = document.getElementById('nav-user');
    const userNickname = (typeof Auth !== 'undefined' && typeof Auth.resolveNicknameDisplayElement === 'function')
        ? Auth.resolveNicknameDisplayElement()
        : document.getElementById('user-nickname-label');
    const adminLink = document.getElementById('admin-link');

    if (user) {
        hideElement(navGuest);
        showElement(navUser);

        if (userNickname) {
            Auth.applyNicknameDisplay(userNickname, user);
        }

        HeaderUserMenu.setOpenState(false);

        if (adminLink) {
            toggleElement(adminLink, user.isAdmin);
        }
    } else {
        HeaderUserMenu.setOpenState(false);
        showElement(navGuest);
        hideElement(navUser);
    }
}


autoInitHeader();

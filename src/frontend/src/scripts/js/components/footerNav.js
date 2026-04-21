/**
 * 파일 역할: footerNav UI 상호작용을 담당하는 재사용 컴포넌트 스크립트 파일.
 */
(function () {
    function createIcon(type) {
        const icons = {
            home: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 10.5L12 4L20 10.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.5 9.5V19.5H16.5V9.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            live: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.9"/><path d="M10 9L15 12L10 15V9Z" fill="currentColor"/></svg>',
            community: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 7.5H17C18.1046 7.5 19 8.39543 19 9.5V14C19 15.1046 18.1046 16 17 16H12.4L9.1 18.5V16H7C5.89543 16 5 15.1046 5 14V9.5C5 8.39543 5.89543 7.5 7 7.5Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>',
            business: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 20V7.5H17.5V20" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M9.5 20V16H14.5V20" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M9 10.5H10.5M13.5 10.5H15" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M8 7.5V5H16V7.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
            me: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="9" r="3" stroke="currentColor" stroke-width="1.9"/><path d="M6.5 18.5C7.5 16.2 9.5 15 12 15C14.5 15 16.5 16.2 17.5 18.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
        };

        return icons[type] || icons.home;
    }

    const footerItems = [
        { label: '홈', href: '/', icon: createIcon('home') },
        { label: 'LIVE', href: '/live', icon: createIcon('live') },
        { label: '커뮤니티', href: '/community', icon: createIcon('community') },
        { label: '업체정보', href: '/business-info', icon: createIcon('business') },
        { label: '내 정보', href: '/my-page', icon: createIcon('me') }
    ];

    function normalizePath(pathname) {
        if (!pathname || pathname === '/') {
            return '/';
        }

        return pathname.replace(/\/$/, '');
    }

    function createFooterNav() {
        const currentPath = normalizePath(window.location.pathname);
        const existingFooter = document.querySelector('.bottom-nav-footer');

        if (existingFooter) {
            existingFooter.remove();
        }

        const footer = document.createElement('footer');
        footer.className = 'bottom-nav-footer';

        const nav = document.createElement('nav');
        nav.className = 'bottom-nav';
        nav.setAttribute('aria-label', '하단 메뉴');

        const list = document.createElement('ul');
        list.className = 'bottom-nav-list';

        footerItems.forEach((item) => {
            const listItem = document.createElement('li');
            listItem.className = 'bottom-nav-item';

            const link = document.createElement('a');
            link.className = 'bottom-nav-link';
            link.href = item.href;
            link.innerHTML = `<span class="bottom-nav-icon" aria-hidden="true">${item.icon}</span><span class="bottom-nav-label">${item.label}</span>`;

            if (currentPath === item.href) {
                link.classList.add('is-active');
                link.setAttribute('aria-current', 'page');
            }

            listItem.appendChild(link);
            list.appendChild(listItem);
        });

        nav.appendChild(list);
        footer.appendChild(nav);
        document.body.appendChild(footer);
        document.body.classList.add('has-bottom-nav');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createFooterNav);
    } else {
        createFooterNav();
    }
})();

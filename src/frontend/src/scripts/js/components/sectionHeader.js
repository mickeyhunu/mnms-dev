(function initSectionHeaderMenu() {
    const tabsPanel = document.getElementById('board-tabs-panel');
    const toggleButton = document.getElementById('board-menu-toggle');

    if (!window.__communityBackLinkBound) {
        document.addEventListener('click', (event) => {
            const backLink = event.target.closest('.community-back-link');
            if (!backLink) {
                return;
            }

            event.preventDefault();

            if (window.history.length > 1) {
                window.history.back();
                return;
            }

            window.location.href = backLink.getAttribute('href') || '/';
        });
        window.__communityBackLinkBound = true;
    }

    if (!tabsPanel || !toggleButton) {
        return;
    }

    const closeTabsPanel = () => {
        tabsPanel.classList.add('hidden');
        toggleButton.setAttribute('aria-expanded', 'false');
    };

    toggleButton.addEventListener('click', () => {
        const isOpen = !tabsPanel.classList.contains('hidden');
        if (isOpen) {
            closeTabsPanel();
            return;
        }

        tabsPanel.classList.remove('hidden');
        toggleButton.setAttribute('aria-expanded', 'true');
    });

    document.addEventListener('click', (event) => {
        const backLink = event.target.closest('.community-back-link');
        if (backLink) {
            event.preventDefault();

            if (window.history.length > 1) {
                window.history.back();
                return;
            }

            window.location.href = backLink.getAttribute('href') || '/';
            return;
        }

        if (tabsPanel.classList.contains('hidden')) {
            return;
        }
        if (tabsPanel.contains(event.target) || toggleButton.contains(event.target)) {
            return;
        }

        closeTabsPanel();
    });
})();

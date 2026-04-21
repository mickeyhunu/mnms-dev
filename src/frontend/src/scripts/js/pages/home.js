/**
 * 파일 역할: home 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
function initHomePage() {
    Auth.updateHeaderUI();
    Auth.bindLogoutButton();
    if (typeof initTopAds === 'function') {
        initTopAds({
            containerId: 'top-ads-container',
            placement: 'HOME'
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomePage);
} else {
    initHomePage();
}

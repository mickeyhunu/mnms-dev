/**
 * 파일 역할: ad-order-history 페이지의 광고 주문 내역 목록 렌더링을 담당하는 스크립트 파일.
 */
(() => {
    const ORDER_STORAGE_KEY = 'mnmsAdOrderHistory';
    const listElement = document.getElementById('ad-order-history-list');
    const emptyElement = document.getElementById('ad-order-history-empty');

    if (!listElement || !emptyElement) return;

    const formatPrice = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`;
    const formatDateTime = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';

        return new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const readOrderHistory = () => {
        try {
            const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    };

    const renderOrders = () => {
        const orders = readOrderHistory();

        if (!orders.length) {
            emptyElement.classList.remove('hidden');
            listElement.innerHTML = '';
            return;
        }

        emptyElement.classList.add('hidden');
        listElement.innerHTML = orders
            .map((order) => `
                <article class="ad-order-history-item" aria-label="광고 주문 ${order.id}">
                    <div class="ad-order-history-item-top">
                        <strong>${sanitizeHTML(order.planName || '-')} ${Number(order.durationDays || 0)}일</strong>
                        <span class="ad-order-history-status">${sanitizeHTML(order.status || '결제완료')}</span>
                    </div>
                    <dl class="ad-order-history-meta">
                        <div><dt>주문번호</dt><dd>${sanitizeHTML(order.id || '-')}</dd></div>
                        <div><dt>주문일시</dt><dd>${formatDateTime(order.orderedAt)}</dd></div>
                        <div><dt>공급가액</dt><dd>${formatPrice(order.supplyPrice)}</dd></div>
                        <div><dt>부가세</dt><dd>${formatPrice(order.vat)}</dd></div>
                        <div class="ad-order-history-meta-total"><dt>결제금액</dt><dd>${formatPrice(order.totalPrice)}</dd></div>
                    </dl>
                </article>
            `)
            .join('');
    };

    renderOrders();
})();

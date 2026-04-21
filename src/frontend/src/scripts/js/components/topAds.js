/**
 * 파일 역할: HOME/커뮤니티 상단 광고 배너(캐러셀) 로딩/렌더링을 담당하는 공통 컴포넌트 스크립트 파일.
 */
const TOP_AD_AUTOPLAY_INTERVAL_MS = 5000;
const topAdsState = {
    autoPlayTimerId: null
};

function initTopAds(options = {}) {
    const container = document.getElementById(options.containerId || 'top-ads-container');
    const placement = String(options.placement || container?.dataset.topAdPlacement || 'HOME').trim().toUpperCase();
    if (!container) return;

    loadTopAds(container, placement).catch((error) => {
        console.error('TOP ads load error:', error);
        container.classList.add('hidden');
    });
}

async function loadTopAds(container, placement) {
    const response = await APIClient.get('/live/top-ads', { placement });
    const ads = Array.isArray(response?.content) ? response.content : [];
    renderTopAds(container, ads);
}

function renderTopAds(container, ads = []) {
    clearTopAdsAutoPlay();

    if (!Array.isArray(ads) || !ads.length) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    const bannerItems = ads.map((ad, index) => {
        const imageUrl = sanitizeHTML(ad.imageUrl || '');
        const title = sanitizeHTML(ad.title || '상단 광고');
        const linkUrl = sanitizeHTML(normalizeTopAdExternalUrl(ad.linkUrl));
        return `
            <a class="top-ad-banner" href="${linkUrl}" target="_blank" rel="noopener noreferrer" draggable="false" role="group" aria-roledescription="slide" aria-label="${index + 1} / ${ads.length}: ${title}">
                <img class="top-ad-banner__image" src="${imageUrl}" alt="${title}" loading="${index === 0 ? 'eager' : 'lazy'}" draggable="false">
            </a>
        `;
    }).join('');

    container.innerHTML = `
        <div class="top-ads__viewport" tabindex="0" role="region" aria-roledescription="carousel" aria-label="상단 광고 목록">
            <div class="top-ads__track" role="list">
                ${bannerItems}
            </div>
        </div>
        <p class="top-ads__indicator" aria-live="polite">1/${ads.length}</p>
    `;

    bindTopAdsCarousel(container, ads.length);
}

function clearTopAdsAutoPlay() {
    if (!topAdsState.autoPlayTimerId) return;
    window.clearInterval(topAdsState.autoPlayTimerId);
    topAdsState.autoPlayTimerId = null;
}

function bindTopAdsCarousel(container, totalCount) {
    const viewport = container.querySelector('.top-ads__viewport');
    const indicator = container.querySelector('.top-ads__indicator');
    if (!viewport || !indicator) return;
    const wheelStepThresholdPx = {
        horizontal: 12,
        vertical: 40
    };
    let isPointerDragging = false;
    let pointerDragStartX = 0;
    let pointerDragStartScrollLeft = 0;
    let pointerDragStartIndex = 0;
    let didPointerMove = false;
    let pointerDragStartAt = 0;
    let wheelDeltaAccumulator = 0;
    let wheelResetTimerId = null;

    const getCurrentIndex = () => {
        const pageWidth = viewport.clientWidth || 1;
        return Math.min(totalCount - 1, Math.max(0, Math.round(viewport.scrollLeft / pageWidth)));
    };

    const updateIndicator = () => {
        const activeIndex = getCurrentIndex();
        indicator.textContent = `${activeIndex + 1}/${totalCount}`;
    };

    const moveToIndex = (nextIndex) => {
        const pageWidth = viewport.clientWidth;
        if (!pageWidth) return;
        const clampedIndex = Math.min(totalCount - 1, Math.max(0, nextIndex));
        viewport.scrollTo({
            left: clampedIndex * pageWidth,
            behavior: 'smooth'
        });
        window.requestAnimationFrame(updateIndicator);
    };

    const moveByStep = (step) => {
        const current = getCurrentIndex();
        const next = (current + step + totalCount) % totalCount;
        moveToIndex(next);
    };

    viewport.addEventListener('scroll', () => {
        window.requestAnimationFrame(updateIndicator);
    }, { passive: true });

    updateIndicator();

    if (totalCount <= 1) return;

    const handlePointerDragStart = (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.preventDefault();
        isPointerDragging = true;
        didPointerMove = false;
        pointerDragStartX = event.clientX;
        pointerDragStartScrollLeft = viewport.scrollLeft;
        pointerDragStartIndex = getCurrentIndex();
        pointerDragStartAt = event.timeStamp;
        viewport.classList.add('is-dragging');
        viewport.setPointerCapture(event.pointerId);
    };

    const handlePointerDragMove = (event) => {
        if (!isPointerDragging) return;
        const deltaX = event.clientX - pointerDragStartX;
        if (!didPointerMove && Math.abs(deltaX) > 4) {
            didPointerMove = true;
        }
        viewport.scrollLeft = pointerDragStartScrollLeft - deltaX;
    };

    const handlePointerDragEnd = (event) => {
        if (!isPointerDragging) return;
        isPointerDragging = false;
        viewport.classList.remove('is-dragging');
        if (viewport.hasPointerCapture(event.pointerId)) {
            viewport.releasePointerCapture(event.pointerId);
        }

        const pageWidth = viewport.clientWidth || 1;
        const scrollDelta = viewport.scrollLeft - pointerDragStartScrollLeft;
        const dragDistance = Math.abs(scrollDelta);
        const direction = scrollDelta > 0 ? 1 : (scrollDelta < 0 ? -1 : 0);
        const dragThreshold = pageWidth * 0.18;
        const elapsedMs = Math.max(1, event.timeStamp - pointerDragStartAt);
        const velocityPxPerMs = dragDistance / elapsedMs;
        const velocityThreshold = 0.45;

        if (direction !== 0 && (dragDistance >= dragThreshold || velocityPxPerMs >= velocityThreshold)) {
            moveToIndex(pointerDragStartIndex + direction);
            return;
        }

        moveToIndex(pointerDragStartIndex);
    };

    const restartAutoPlay = () => {
        clearTopAdsAutoPlay();
        topAdsState.autoPlayTimerId = window.setInterval(() => {
            if (document.hidden) return;
            moveByStep(1);
        }, TOP_AD_AUTOPLAY_INTERVAL_MS);
    };

    const handleWheelStep = (event) => {
        const isHorizontalIntent = Math.abs(event.deltaX) >= Math.abs(event.deltaY);
        const dominantDelta = isHorizontalIntent ? event.deltaX : event.deltaY;
        const threshold = isHorizontalIntent ? wheelStepThresholdPx.horizontal : wheelStepThresholdPx.vertical;
        if (Math.abs(dominantDelta) < 1) return;

        event.preventDefault();
        clearTopAdsAutoPlay();
        wheelDeltaAccumulator += dominantDelta;

        if (wheelResetTimerId) {
            window.clearTimeout(wheelResetTimerId);
        }

        wheelResetTimerId = window.setTimeout(() => {
            wheelDeltaAccumulator = 0;
            restartAutoPlay();
        }, 150);

        if (Math.abs(wheelDeltaAccumulator) < threshold) {
            return;
        }

        const direction = wheelDeltaAccumulator > 0 ? 1 : -1;
        wheelDeltaAccumulator = 0;
        moveByStep(direction);
    };

    viewport.addEventListener('pointerdown', (event) => {
        clearTopAdsAutoPlay();
        handlePointerDragStart(event);
    });
    viewport.addEventListener('pointermove', handlePointerDragMove);
    viewport.addEventListener('pointerup', (event) => {
        handlePointerDragEnd(event);
        restartAutoPlay();
    });
    viewport.addEventListener('pointercancel', (event) => {
        handlePointerDragEnd(event);
        restartAutoPlay();
    });
    viewport.addEventListener('pointerleave', (event) => {
        if (!isPointerDragging) return;
        handlePointerDragEnd(event);
        restartAutoPlay();
    });
    viewport.addEventListener('mouseenter', clearTopAdsAutoPlay);
    viewport.addEventListener('mouseleave', restartAutoPlay);
    viewport.addEventListener('focusin', clearTopAdsAutoPlay);
    viewport.addEventListener('focusout', restartAutoPlay);
    viewport.addEventListener('wheel', handleWheelStep, { passive: false });
    viewport.addEventListener('click', (event) => {
        if (!didPointerMove) return;
        event.preventDefault();
        event.stopPropagation();
        didPointerMove = false;
    }, true);
    restartAutoPlay();
}

function isValidTopAdExternalUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function normalizeTopAdExternalUrl(url) {
    const target = String(url || '').trim();
    return isValidTopAdExternalUrl(target) ? target : '#';
}

window.initTopAds = initTopAds;

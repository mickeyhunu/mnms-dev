/**
 * 파일 역할: LIVE 페이지의 필터/목록 렌더링과 이벤트를 초기화하는 페이지 스크립트 파일.
 */
const LIVE_CATEGORIES = {
    choice: { key: 'choice', label: '초이스톡' },
    chojoong: { key: 'chojoong', label: '초중' },
    waiting: { key: 'waiting', label: '룸/웨이팅' },
    entry: { key: 'entry', label: '엔트리' }
};

const LIVE_FILTERS_CACHE_KEY = 'liveFiltersCache:v1';
const LIVE_HISTORY_PAGE_SIZE = 30;
const LIVE_ENTRY_PAGE_SIZE = 200;
const LIVE_REFRESH_INTERVAL_MS = 30000;
const LIVE_HISTORY_TOP_THRESHOLD_PX = 160;
const LIVE_BOTTOM_BUTTON_THRESHOLD_PX = 220;
const LIVE_AVATAR_IMAGE_BASE_PATH = '/src/assets/live-avatars';
const LIVE_AD_AUTOPLAY_INTERVAL_MS = 5000;
let shareSheetOpen = false;

function removeLivePageSharedChrome() {
    document.querySelectorAll('body > .bottom-nav-footer, .page-shell--live > .bottom-nav-footer, .page-shell--live > .header').forEach((element) => {
        element.remove();
    });

    const sharedHeader = document.querySelector('.page-shell--live > div:first-child > .header');
    if (sharedHeader) {
        const wrapper = sharedHeader.parentElement;
        sharedHeader.remove();
        if (wrapper && !wrapper.childElementCount && !wrapper.textContent.trim()) {
            wrapper.remove();
        }
    }

    document.body.classList.remove('has-bottom-nav');
}

const liveState = {
    stores: [],
    categories: [],
    selectedStoreNo: null,
    selectedCategoryKey: 'choice',
    refreshTimerId: null,
    entriesRequestId: 0,
    filtersRequestId: 0,
    hasBoundEvents: false,
    hasCachedEntries: false,
    rawRows: [],
    rows: [],
    totalCount: 0,
    titleColumn: null,
    hasMoreHistory: false,
    nextOffset: 0,
    isLoadingOlder: false,
    hasAlignedInitialViewport: false,
    lastSeenLatestSignature: '',
    pendingLatestSignature: '',
    pendingLatestStoreName: '',
    hasUnseenLatestCard: false,
    ads: [],
    adsRequestId: 0,
    adsLoadedStoreNo: null,
    adAutoPlayTimerId: null,
    canDeleteChojoong: false,
    accessRules: {
        level: 0,
        levelLabel: '',
        todayPostCount: 0,
        todayCommentCount: 0,
        hasDailyActivity: false,
        access: {
            choice: true,
            chojoong: false,
            waiting: false,
            entry: false
        }
    }
};

function initializeScrollableFilter(element) {
    if (!element || element.dataset.scrollCueBound === 'true') return;

    const updateScrollState = () => {
        window.requestAnimationFrame(() => {
            syncScrollableFilterState(element);
        });
    };

    element.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    element.dataset.scrollCueBound = 'true';
}

function syncScrollableFilterState(element) {
    if (!element) return;

    const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
    const scrollLeft = Math.max(0, element.scrollLeft);
    const hasOverflow = maxScrollLeft > 4;
    const canScrollLeft = scrollLeft > 4;
    const canScrollRight = scrollLeft < maxScrollLeft - 4;

    element.classList.toggle('has-overflow', hasOverflow);
    element.classList.toggle('can-scroll-left', hasOverflow && canScrollLeft);
    element.classList.toggle('can-scroll-right', hasOverflow && canScrollRight);
}

async function initLivePage() {
    removeLivePageSharedChrome();
    Auth.updateHeaderUI();
    liveState.canDeleteChojoong = Boolean(Auth.getUser()?.isAdmin);
    await loadLiveAccessRules();

    if (typeof initHeader === 'function') {
        initHeader();
    }

    bindLiveEvents();
    hydrateLiveFiltersCache();
    startLiveAutoRefresh();

    try {
        resetLiveEntriesState();
        await refreshLiveData({ showLoading: true, syncToLatest: true });
    } catch (error) {
        if (!liveState.hasCachedEntries) {
            showLiveError(error.message || 'LIVE 데이터를 불러오지 못했습니다.');
        }
    }
}

function getDefaultLiveAccessRules() {
    const level = Number(Auth.getUser()?.level || 0);
    return {
        level,
        levelLabel: String(Auth.getUser()?.levelLabel || ''),
        todayPostCount: 0,
        todayCommentCount: 0,
        hasDailyActivity: false,
        access: {
            choice: true,
            chojoong: level >= 3,
            waiting: level >= 3,
            entry: level >= 4
        }
    };
}

async function loadLiveAccessRules() {
    liveState.accessRules = getDefaultLiveAccessRules();

    if (!Auth.isAuthenticated()) {
        return liveState.accessRules;
    }

    try {
        const response = await APIClient.get('/users/me/live-access');
        liveState.accessRules = {
            level: Number(response?.level || 0),
            levelLabel: String(response?.levelLabel || ''),
            todayPostCount: Number(response?.todayPostCount || 0),
            todayCommentCount: Number(response?.todayCommentCount || 0),
            hasDailyActivity: Boolean(response?.hasDailyActivity),
            access: {
                choice: Boolean(response?.access?.choice ?? true),
                chojoong: Boolean(response?.access?.chojoong),
                waiting: Boolean(response?.access?.waiting),
                entry: Boolean(response?.access?.entry)
            }
        };
    } catch (error) {
        console.error('LIVE access rules load error:', error);
    }

    return liveState.accessRules;
}

function bindLiveEvents() {
    if (liveState.hasBoundEvents) return;

    const backBtn = document.getElementById('back-btn');
    const storeFilter = document.getElementById('live-store-filter');
    const categoryFilter = document.getElementById('live-category-filter');
    const listElement = document.getElementById('live-entry-list');
    const scrollBottomButton = document.getElementById('live-scroll-bottom-button');
    const scrollMessageButton = document.getElementById('live-scroll-message-button');
    const shareButton = document.getElementById('share-btn');

    initializeScrollableFilter(storeFilter);
    initializeScrollableFilter(categoryFilter);

    backBtn?.addEventListener('click', () => {
        if (window.history.length > 1) {
            window.history.back();
            return;
        }

        window.location.href = '/';
    });
    shareButton?.addEventListener('click', handleSharePost);

    storeFilter?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-store-option]');
        if (!button) return;

        const nextStoreNo = Number.parseInt(button.dataset.storeOption || '', 10);
        if (!Number.isInteger(nextStoreNo) || liveState.selectedStoreNo === nextStoreNo) return;

        liveState.selectedStoreNo = nextStoreNo;
        renderStoreButtons();
        resetLiveEntriesState();
        await loadLiveAds();
        await loadLiveEntries({ showLoading: true, syncToLatest: true });
    });

    categoryFilter?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-category-option]');
        if (!button) return;
        if (button.dataset.locked === 'true') {
            showLiveAccessConditionMessage(button.dataset.deniedReason || '열람 조건을 충족해야 합니다.');
            return;
        }

        const nextCategoryKey = button.dataset.categoryOption || 'choice';
        if (liveState.selectedCategoryKey === nextCategoryKey) return;

        liveState.selectedCategoryKey = nextCategoryKey;
        renderCategoryButtons(liveState.categories);
        resetLiveEntriesState();
        await loadLiveEntries({ showLoading: true, syncToLatest: true });
    });

    listElement?.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('[data-live-chojoong-delete]');
        if (!deleteButton || !liveState.canDeleteChojoong) return;

        const targetId = Number.parseInt(deleteButton.dataset.liveChojoongDelete || '', 10);
        if (!Number.isInteger(targetId) || targetId <= 0) return;

        if (!window.confirm('이 초중 메시지를 삭제할까요? 삭제 후 복구할 수 없습니다.')) {
            return;
        }

        deleteButton.disabled = true;

        try {
            await APIClient.delete(`/admin/live/chojoong/${targetId}`);
            await loadLiveEntries({ showLoading: false, syncToLatest: false });
        } catch (error) {
            alert(error.message || '초중 메시지 삭제에 실패했습니다.');
        } finally {
            deleteButton.disabled = false;
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            refreshLiveData({ showLoading: false, syncToLatest: isLiveViewportNearBottom() }).catch((error) => {
                console.error('LIVE visibility refresh error:', error);
            });
        }
    });

    window.addEventListener('scroll', () => {
        updateLiveScrollBottomButton();
        maybeLoadOlderLiveHistory().catch((error) => {
            console.error('LIVE history load error:', error);
        });
    }, { passive: true });

    window.addEventListener('resize', updateLiveScrollBottomButton, { passive: true });

    scrollBottomButton?.addEventListener('click', () => {
        scrollLiveToLatest();
    });

    scrollMessageButton?.addEventListener('click', () => {
        scrollLiveToLatest();
    });

    setupShareSheet();
    document.addEventListener('keydown', handleShareSheetKeydown);

    liveState.hasBoundEvents = true;
    updateLiveScrollBottomButton();
}

function startLiveAutoRefresh() {
    if (liveState.refreshTimerId) {
        clearInterval(liveState.refreshTimerId);
    }

    liveState.refreshTimerId = window.setInterval(() => {
        if (document.hidden) return;

        refreshLiveData({ showLoading: false, syncToLatest: isLiveViewportNearBottom() }).catch((error) => {
            console.error('LIVE auto refresh error:', error);
        });
    }, LIVE_REFRESH_INTERVAL_MS);
}

async function refreshLiveData({ showLoading = false, syncToLatest = false } = {}) {
    await loadLiveAccessRules();
    await loadLiveFilters();
    await ensureLiveAdsLoadedForSelectedStore();
    await loadLiveEntries({ showLoading, syncToLatest });
}

function hydrateLiveFiltersCache() {
    const cachedFilters = readLiveCache(LIVE_FILTERS_CACHE_KEY);
    if (!cachedFilters?.data) {
        renderStoreNameList();
        renderCategoryButtons([]);
        return false;
    }

    liveState.stores = normalizeStores(cachedFilters.data.stores);
    liveState.categories = Array.isArray(cachedFilters.data.categories) ? cachedFilters.data.categories : [];
    syncSelectedStoreNo();

    renderStoreNameList();
    renderStoreButtons();
    renderCategoryButtons(liveState.categories);
    return true;
}

async function loadLiveFilters() {
    const requestId = ++liveState.filtersRequestId;
    const response = await APIClient.get('/live/filters');

    if (requestId !== liveState.filtersRequestId) {
        return;
    }

    liveState.stores = normalizeStores(response?.stores);
    liveState.categories = Array.isArray(response?.categories) ? response.categories : [];
    syncSelectedStoreNo();

    writeLiveCache(LIVE_FILTERS_CACHE_KEY, {
        stores: liveState.stores,
        categories: liveState.categories
    });

    renderStoreNameList();
    renderStoreButtons();
    renderCategoryButtons(liveState.categories);
}

async function loadLiveEntries({ showLoading = false, appendOlder = false, syncToLatest = false } = {}) {
    const loadingElement = document.getElementById('live-loading');
    const errorElement = document.getElementById('live-error');
    const emptyElement = document.getElementById('live-empty');
    const listElement = document.getElementById('live-entry-list');
    const requestId = ++liveState.entriesRequestId;
    const scrollAnchor = appendOlder ? createLiveScrollAnchor() : null;

    hideElement(errorElement);

    if (showLoading) {
        hideElement(emptyElement);
        showElement(loadingElement);
    } else {
        hideElement(loadingElement);
    }

    try {
        const response = await APIClient.get('/live/entries', buildLiveEntriesQuery({ appendOlder }));

        if (requestId !== liveState.entriesRequestId) {
            return;
        }

        updateLiveEntriesState(response, { appendOlder });
        liveState.hasCachedEntries = true;
        applyLiveEntriesResponse();

        if (appendOlder) {
            restoreLiveScrollAnchor(scrollAnchor);
        } else if (syncToLatest && shouldUseHistoryPagination()) {
            const isInitialViewportSync = !liveState.hasAlignedInitialViewport;
            scrollLiveToLatest({
                behavior: isInitialViewportSync ? 'auto' : 'smooth',
                alignToBottom: isInitialViewportSync
            });
            liveState.hasAlignedInitialViewport = true;
        }
    } catch (error) {
        if (requestId !== liveState.entriesRequestId) {
            return;
        }

        if (!listElement?.children.length) {
            renderLiveEntries([], null);
            showLiveError(error.message || 'LIVE 데이터를 불러오지 못했습니다.');
        }

        console.error('LIVE entries load error:', error);
        throw error;
    } finally {
        if (appendOlder) {
            liveState.isLoadingOlder = false;
        }
        hideElement(loadingElement);
    }
}

function applyLiveEntriesResponse() {
    renderLiveSummary({
        totalCount: liveState.totalCount
    });
    renderLiveEntries(liveState.rows, liveState.titleColumn);
    syncLiveLatestCardNotificationState();
    updateLiveScrollBottomButton();

    const hasRows = Array.isArray(liveState.rows) && liveState.rows.length > 0;
    const shouldShowSummaryCard = liveState.selectedCategoryKey === 'entry';
    const emptyElement = document.getElementById('live-empty');

    if (hasRows || shouldShowSummaryCard) {
        hideElement(emptyElement);
    } else {
        showElement(emptyElement);
    }
}


async function ensureLiveAdsLoadedForSelectedStore() {
    const storeNo = Number.parseInt(liveState.selectedStoreNo, 10);
    if (!Number.isInteger(storeNo) || storeNo <= 0) {
        if (liveState.adsLoadedStoreNo !== null) {
            liveState.adsLoadedStoreNo = null;
            liveState.ads = [];
            renderLiveAds([]);
        }
        return;
    }

    if (liveState.adsLoadedStoreNo === storeNo) {
        return;
    }

    await loadLiveAds();
}

async function loadLiveAds() {
    const requestId = ++liveState.adsRequestId;
    const storeNo = Number.parseInt(liveState.selectedStoreNo, 10);

    if (!Number.isInteger(storeNo) || storeNo <= 0) {
        liveState.adsLoadedStoreNo = null;
        liveState.ads = [];
        renderLiveAds([]);
        return;
    }

    try {
        const response = await APIClient.get('/live/ads', { storeNo });
        if (requestId !== liveState.adsRequestId) return;
        liveState.ads = Array.isArray(response?.content) ? response.content : [];
        liveState.adsLoadedStoreNo = storeNo;
        renderLiveAds(liveState.ads);
    } catch (error) {
        if (requestId !== liveState.adsRequestId) return;
        liveState.ads = [];
        renderLiveAds([]);
        console.error('LIVE ads load error:', error);
    }
}

function renderLiveAds(ads = []) {
    const container = document.getElementById('live-ads-container');
    if (!container) return;

    clearLiveAdsAutoPlay();

    if (!Array.isArray(ads) || !ads.length) {
        document.body?.classList.remove('live-has-ads');
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    document.body?.classList.add('live-has-ads');
    container.classList.remove('hidden');
    primeLiveAdsNetworkHints(ads);
    const bannerItems = ads.map((ad, index) => {
        const imageUrl = sanitizeHTML(ad.imageUrl || '');
        const title = sanitizeHTML(ad.title || 'LIVE 광고');
        const linkUrl = sanitizeHTML(normalizeExternalUrl(ad.linkUrl));
        const fetchPriority = index === 0 ? 'high' : 'low';
        return `
            <a class="live-ad-banner" href="${linkUrl}" target="_blank" rel="noopener noreferrer" draggable="false" role="group" aria-roledescription="slide" aria-label="${index + 1} / ${ads.length}: ${title}">
                <img class="live-ad-banner__image" src="${imageUrl}" alt="${title}" loading="${index === 0 ? 'eager' : 'lazy'}" fetchpriority="${fetchPriority}" decoding="async" draggable="false">
            </a>
        `;
    }).join('');

    container.innerHTML = `
        <div class="live-ads__viewport" tabindex="0" role="region" aria-roledescription="carousel" aria-label="LIVE 광고 목록">
            <div class="live-ads__track" role="list">
                ${bannerItems}
            </div>
        </div>
        <p class="live-ads__indicator" aria-live="polite">1/${ads.length}</p>
    `;

    bindLiveAdsCarousel(container, ads.length);
}

function primeLiveAdsNetworkHints(ads = []) {
    if (!Array.isArray(ads) || !ads.length) return;

    const firstImageUrl = `${ads[0]?.imageUrl || ''}`.trim();
    if (!firstImageUrl) return;

    try {
        const firstImageOrigin = new URL(firstImageUrl).origin;
        const preconnectSelector = `link[data-live-ads-preconnect="${firstImageOrigin}"]`;
        if (!document.head.querySelector(preconnectSelector)) {
            const preconnectLink = document.createElement('link');
            preconnectLink.rel = 'preconnect';
            preconnectLink.href = firstImageOrigin;
            preconnectLink.crossOrigin = 'anonymous';
            preconnectLink.dataset.liveAdsPreconnect = firstImageOrigin;
            document.head.appendChild(preconnectLink);
        }
    } catch (error) {
        console.warn('LIVE ads preconnect skipped:', error);
    }

    const preloadSelector = 'link[data-live-ads-preload="hero"]';
    const existingPreload = document.head.querySelector(preloadSelector);
    if (existingPreload?.href === firstImageUrl) return;
    if (existingPreload) {
        existingPreload.remove();
    }

    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'image';
    preloadLink.href = firstImageUrl;
    preloadLink.fetchPriority = 'high';
    preloadLink.dataset.liveAdsPreload = 'hero';
    document.head.appendChild(preloadLink);
}

function clearLiveAdsAutoPlay() {
    if (!liveState.adAutoPlayTimerId) return;
    window.clearInterval(liveState.adAutoPlayTimerId);
    liveState.adAutoPlayTimerId = null;
}

function bindLiveAdsCarousel(container, totalCount) {
    const viewport = container.querySelector('.live-ads__viewport');
    const indicator = container.querySelector('.live-ads__indicator');
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
        indicator.classList.remove('hidden');
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

    if (totalCount <= 1) {
        return;
    }

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
        clearLiveAdsAutoPlay();
        liveState.adAutoPlayTimerId = window.setInterval(() => {
            if (document.hidden) return;
            moveByStep(1);
        }, LIVE_AD_AUTOPLAY_INTERVAL_MS);
    };

    const handleWheelStep = (event) => {
        const isHorizontalIntent = Math.abs(event.deltaX) >= Math.abs(event.deltaY);
        const dominantDelta = isHorizontalIntent ? event.deltaX : event.deltaY;
        const threshold = isHorizontalIntent ? wheelStepThresholdPx.horizontal : wheelStepThresholdPx.vertical;
        if (Math.abs(dominantDelta) < 1) return;

        event.preventDefault();
        clearLiveAdsAutoPlay();
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
        clearLiveAdsAutoPlay();
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
    viewport.addEventListener('mouseenter', clearLiveAdsAutoPlay);
    viewport.addEventListener('mouseleave', restartAutoPlay);
    viewport.addEventListener('focusin', clearLiveAdsAutoPlay);
    viewport.addEventListener('focusout', restartAutoPlay);
    viewport.addEventListener('wheel', handleWheelStep, { passive: false });
    viewport.addEventListener('click', (event) => {
        if (!didPointerMove) return;
        event.preventDefault();
        event.stopPropagation();
        didPointerMove = false;
    }, true);
    updateIndicator();
    restartAutoPlay();
}

function isValidExternalUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function normalizeExternalUrl(url) {
    const target = String(url || '').trim();
    return isValidExternalUrl(target) ? target : '#';
}

const WAITING_STORE_DECORATIONS = {
    '달토': '🐰',
    '엘리트': '🎆',
    '디저트': '🍮',
    '유앤미': '💟',
    '도파민': '🌌',
    '제우스': '🔱'
};

function normalizeStores(stores) {
    return (Array.isArray(stores) ? stores : [])
        .map((store) => ({
            storeNo: Number.parseInt(store?.storeNo, 10),
            storeName: String(store?.storeName || '').trim(),
            storeAddress: String(store?.storeAddress || '').trim()
        }))
        .filter((store) => Number.isInteger(store.storeNo) && store.storeName)
        .sort((a, b) => a.storeNo - b.storeNo);
}

function getSelectedStore() {
    return liveState.stores.find((store) => store.storeNo === liveState.selectedStoreNo) || null;
}

function getSelectedStoreName() {
    return getSelectedStore()?.storeName || '전체';
}

function renderStoreButtons() {
    const storeFilter = document.getElementById('live-store-filter');
    if (!storeFilter) return;

    storeFilter.innerHTML = liveState.stores.map((store) => `
        <button
            type="button"
            class="area-filter__button ${liveState.selectedStoreNo === store.storeNo ? 'is-active' : ''}"
            data-store-option="${store.storeNo}"
        >
            ${sanitizeHTML(store.storeName)}
        </button>
    `).join('');
    syncScrollableFilterState(storeFilter);
    updateLiveScrollMessageStoreName();
}

function syncSelectedStoreNo() {
    if (!Array.isArray(liveState.stores) || !liveState.stores.length) {
        liveState.selectedStoreNo = null;
        return;
    }

    const hasSelectedStore = liveState.stores.some((store) => store.storeNo === liveState.selectedStoreNo);
    if (!hasSelectedStore) {
        liveState.selectedStoreNo = liveState.stores[0].storeNo;
    }
}

function renderStoreNameList() {
    const storeNameList = document.getElementById('live-store-name-list');
    if (!storeNameList) return;

    if (!Array.isArray(liveState.stores) || !liveState.stores.length) {
        storeNameList.innerHTML = '<p class="live-store-name-list__empty">등록된 매장명이 없습니다.</p>';
        return;
    }

    storeNameList.innerHTML = liveState.stores.map((store) => `
        <span class="live-store-name-list__item">${sanitizeHTML(store.storeName)}</span>
    `).join('');
}

function renderCategoryButtons(categories) {
    const categoryFilter = document.getElementById('live-category-filter');
    if (!categoryFilter) return;

    const normalizedCategories = Object.values(LIVE_CATEGORIES).map((baseCategory) => {
        const matched = Array.isArray(categories)
            ? categories.find((item) => item?.key === baseCategory.key)
            : null;
        return {
            ...baseCategory,
            totalCount: Number(matched?.totalCount || 0)
        };
    });
    const selectedHasAccess = Boolean(liveState.accessRules?.access?.[liveState.selectedCategoryKey] ?? true);
    if (!selectedHasAccess) {
        liveState.selectedCategoryKey = 'choice';
    }

    categoryFilter.innerHTML = normalizedCategories.map((category) => {
        const hasAccess = Boolean(liveState.accessRules?.access?.[category.key] ?? true);
        const deniedReason = getLiveCategoryDeniedReason(category.key);
        return `<button type="button" class="area-filter__button area-filter__button--district ${liveState.selectedCategoryKey === category.key ? 'is-active' : ''} ${hasAccess ? '' : 'is-locked'}" data-category-option="${category.key}" data-locked="${hasAccess ? 'false' : 'true'}" aria-disabled="${hasAccess ? 'false' : 'true'}" ${!hasAccess && deniedReason ? `data-denied-reason="${sanitizeHTML(deniedReason)}"` : ''}>${sanitizeHTML(category.label)}</button>`;
    }).join('');
    syncScrollableFilterState(categoryFilter);
}

function getLiveCategoryDeniedReason(categoryKey) {
    const level = Number(liveState.accessRules?.level || 0);

    if (categoryKey === 'chojoong' || categoryKey === 'waiting') {
        if (level >= 3) return '';
        return '초중/룸웨이팅은 <빠꼼이> 미만 등급의 경우 오늘 게시글 1개 또는 댓글 5개 작성 시 열람할 수 있습니다.\n\n<빠꼼이> 등급이 되면 제한이 해제됩니다.';
    }

    if (categoryKey === 'entry') {
        if (level >= 4) {
            return '';
        }
        if (level < 3) {
            return '엔트리는 <빠꼼이> 등급부터 열람할 수 있습니다.';
        }
        return '엔트리는 오늘 게시글 1개 또는 댓글 5개 작성 시 열람할 수 있습니다.\n\n<룸박사> 등급이 되면 제한이 해제됩니다.';
    }

    return '';
}

function showLiveAccessConditionMessage(message) {
    const normalizedMessage = String(message || '').trim();
    if (!normalizedMessage) return;

    const existing = document.querySelector('.live-access-condition-box');
    existing?.remove();

    const box = document.createElement('div');
    box.className = 'live-access-condition-box';
    box.innerHTML = `
        <button type="button" class="live-access-condition-box__close" aria-label="안내창 닫기">×</button>
        <p class="live-access-condition-box__message">${sanitizeHTML(normalizedMessage).replace(/\n/g, '<br>')}</p>
        <div class="live-access-condition-box__actions">
            <a class="live-access-condition-box__link" href="/community">커뮤니티 바로가기</a>
            <a class="live-access-condition-box__link" href="/my-page/points">회원등급 바로가기</a>
        </div>
    `;
    document.body.appendChild(box);

    window.setTimeout(() => {
        box.classList.add('is-visible');
    }, 10);
    box.querySelector('.live-access-condition-box__close')?.addEventListener('click', () => {
        box.remove();
    });
}

function renderLiveSummary(response = null) {
    const selectedStore = document.getElementById('live-selected-store');
    const selectedCategory = document.getElementById('live-selected-category');
    const totalCount = document.getElementById('live-total-count');

    if (selectedStore) {
        selectedStore.textContent = response?.selectedStoreName || getSelectedStoreName();
    }

    if (selectedCategory) {
        selectedCategory.textContent = response?.selectedCategory?.label || LIVE_CATEGORIES[liveState.selectedCategoryKey]?.label || '초이스톡';
    }

    if (totalCount) {
        totalCount.textContent = String(response?.totalCount || 0);
    }
}

function shouldUseHistoryPagination(categoryKey = liveState.selectedCategoryKey) {
    return categoryKey === 'choice' || categoryKey === 'chojoong' || categoryKey === 'waiting';
}

function isChoiceLikeCategory(categoryKey = liveState.selectedCategoryKey) {
    return categoryKey === 'choice' || categoryKey === 'chojoong';
}

function getChoiceLikeMessageCandidates() {
    if (liveState.selectedCategoryKey === 'chojoong') {
        return ['chojoongMsg', 'chojoong_msg', 'message', 'msg', 'content'];
    }

    return ['choiceMsg', 'choice_msg', 'choice msg', 'message', 'msg', 'content'];
}

function syncLiveListLayout(listElement) {
    if (!listElement) return;

    const isHistoryTimeline = shouldUseHistoryPagination();
    listElement.classList.toggle('live-entry-list--timeline', isHistoryTimeline);
    listElement.classList.toggle('live-entry-list--entry', liveState.selectedCategoryKey === 'entry');
}

function buildLiveEntriesQuery({ appendOlder = false } = {}) {
    return {
        category: liveState.selectedCategoryKey,
        storeNo: liveState.selectedStoreNo,
        limit: liveState.selectedCategoryKey === 'entry' ? LIVE_ENTRY_PAGE_SIZE : LIVE_HISTORY_PAGE_SIZE,
        offset: appendOlder && shouldUseHistoryPagination() ? liveState.nextOffset : 0
    };
}

function updateLiveEntriesState(response = {}, { appendOlder = false } = {}) {
    const responseRows = Array.isArray(response?.rows) ? response.rows : [];
    const mergedRows = shouldUseHistoryPagination()
        ? mergeLiveHistoryRows(liveState.rawRows, responseRows)
        : responseRows;

    liveState.rawRows = mergedRows;
    liveState.rows = shouldUseHistoryPagination()
        ? collapseDuplicateLiveHistoryRows(mergedRows)
        : mergedRows;
    liveState.totalCount = Number(response?.totalCount || mergedRows.length || 0);
    liveState.titleColumn = response?.titleColumn || null;
    liveState.nextOffset = shouldUseHistoryPagination()
        ? liveState.rawRows.length
        : Number(response?.nextOffset || 0);
    liveState.hasMoreHistory = Boolean(
        shouldUseHistoryPagination() &&
        (response?.hasMore || liveState.totalCount > liveState.rawRows.length)
    );

    if (!appendOlder && !shouldUseHistoryPagination()) {
        liveState.hasMoreHistory = false;
    }
}

function resetLiveEntriesState() {
    liveState.rawRows = [];
    liveState.rows = [];
    liveState.totalCount = 0;
    liveState.titleColumn = null;
    liveState.hasMoreHistory = false;
    liveState.nextOffset = 0;
    liveState.isLoadingOlder = false;
    liveState.hasAlignedInitialViewport = false;
    liveState.lastSeenLatestSignature = '';
    liveState.pendingLatestSignature = '';
    liveState.pendingLatestStoreName = '';
    liveState.hasUnseenLatestCard = false;
}

function mergeLiveHistoryRows(previousRows = [], nextRows = []) {
    const mergedMap = new Map();

    [...previousRows, ...nextRows].forEach((row, index) => {
        const normalizedRow = row && typeof row === 'object' ? row : {};
        const signature = createLiveHistoryRowIdentitySignature(normalizedRow, index);
        const existingRow = mergedMap.get(signature);

        if (!existingRow || compareLiveRows(existingRow, normalizedRow) <= 0) {
            mergedMap.set(signature, normalizedRow);
        }
    });

    return Array.from(mergedMap.values())
        .sort(compareLiveRows);
}

function collapseDuplicateLiveHistoryRows(rows = []) {
    return rows.reduce((collapsedRows, row) => {
        const normalizedRow = row && typeof row === 'object' ? row : {};
        const nextSignature = createLiveHistoryContentSignature(normalizedRow);
        const previousRow = collapsedRows[collapsedRows.length - 1];
        const previousSignature = previousRow ? createLiveHistoryContentSignature(previousRow) : null;

        if (previousSignature === nextSignature) {
            collapsedRows[collapsedRows.length - 1] = normalizedRow;
            return collapsedRows;
        }

        collapsedRows.push(normalizedRow);
        return collapsedRows;
    }, []);
}

function createLiveHistoryRowIdentitySignature(row, index = 0) {
    const historyId = getRowValueByCandidates(row, ['id']);
    if (historyId !== null && historyId !== undefined && String(historyId).trim() !== '') {
        return `id:${String(historyId).trim()}`;
    }

    const dedupeKey = getRowValueByCandidates(row, ['dedupeKey', 'dedupe_key']);
    if (dedupeKey !== null && dedupeKey !== undefined && String(dedupeKey).trim() !== '') {
        return `dedupeKey:${String(dedupeKey).trim()}`;
    }

    return `${createLiveHistorySignature(row, index)}|${index}`;
}

function createLiveHistorySignature(row, index = 0) {
    const createdAt = getRowValueByCandidates(row, ['createdAt', 'created_at', 'updatedAt', 'updated_at', 'regDate', 'reg_date', 'date']);
    const storeNo = getRowValueByCandidates(row, ['storeNo', 'store_no', 'shopNo', 'shop_no', 'branchNo', 'branch_no']);
    const storeName = resolveChoiceStoreName(row);

    if (isChoiceLikeCategory()) {
        const choiceMessage = getRowValueByCandidates(row, getChoiceLikeMessageCandidates());
        return ['choice', storeNo, storeName, createdAt, choiceMessage].map(normalizeHistorySignaturePart).join('|');
    }

    if (liveState.selectedCategoryKey === 'waiting') {
        const roomInfo = getRoomStatus(row);
        const waitInfo = getWaitingStatus(row);
        const roomDetail = getRowValueByCandidates(row, ['roomDetail', 'room_detail', 'detail', 'details']);
        return ['waiting', storeNo, storeName, createdAt, roomInfo, waitInfo, stableSerializeValue(roomDetail)].map(normalizeHistorySignaturePart).join('|');
    }

    return ['row', storeNo, storeName, createdAt, stableSerializeValue(row), index].map(normalizeHistorySignaturePart).join('|');
}

function createLiveHistoryContentSignature(row) {
    const storeNo = getRowValueByCandidates(row, ['storeNo', 'store_no', 'shopNo', 'shop_no', 'branchNo', 'branch_no']);
    const storeName = resolveChoiceStoreName(row);

    if (isChoiceLikeCategory()) {
        const choiceMessage = getRowValueByCandidates(row, getChoiceLikeMessageCandidates());
        return ['choice', storeNo, storeName, choiceMessage].map(normalizeHistorySignaturePart).join('|');
    }

    if (liveState.selectedCategoryKey === 'waiting') {
        const roomInfo = getRoomStatus(row);
        const waitInfo = getWaitingStatus(row);
        const roomDetail = getRowValueByCandidates(row, ['roomDetail', 'room_detail', 'detail', 'details']);
        return ['waiting', storeNo, storeName, roomInfo, waitInfo, stableSerializeValue(roomDetail)].map(normalizeHistorySignaturePart).join('|');
    }

    return createLiveHistorySignature(row);
}

function normalizeHistorySignaturePart(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function stableSerializeValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value !== 'object') return String(value);

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableSerializeValue(item)).join(',')}]`;
    }

    return `{${Object.keys(value).sort().map((key) => `${key}:${stableSerializeValue(value[key])}`).join(',')}}`;
}

function compareLiveRows(leftRow, rightRow) {
    const leftTime = getLiveRowSortTime(leftRow);
    const rightTime = getLiveRowSortTime(rightRow);

    if (leftTime !== rightTime) {
        return leftTime - rightTime;
    }

    return createLiveHistorySignature(leftRow).localeCompare(createLiveHistorySignature(rightRow), 'ko');
}

function getLiveRowSortTime(row) {
    const rawTimestamp = getLiveRowRawTimestamp(row);
    const timestamp = new Date(rawTimestamp).getTime();

    return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

function renderLiveEntries(rows, titleColumn) {
    const listElement = document.getElementById('live-entry-list');
    const emptyElement = document.getElementById('live-empty');
    if (!listElement) return;

    syncLiveListLayout(listElement);

    if (!Array.isArray(rows) || !rows.length) {
        if (liveState.selectedCategoryKey === 'entry') {
            listElement.innerHTML = createEntrySummaryLiveCard([], titleColumn);
            enhanceLiveAvatarImages(listElement);
            hideElement(emptyElement);
            return;
        }

        listElement.innerHTML = '';
        showElement(emptyElement);
        return;
    }

    hideElement(emptyElement);

    if (liveState.selectedCategoryKey === 'entry') {
        listElement.innerHTML = createEntrySummaryLiveCard(rows, titleColumn);
        enhanceLiveAvatarImages(listElement);
        return;
    }

    listElement.innerHTML = createLiveTimelineMarkup(rows, titleColumn);
    enhanceLiveAvatarImages(listElement);
}

function createLiveTimelineMarkup(rows, titleColumn) {
    const timelineRows = Array.isArray(rows) ? rows : [];
    if (!timelineRows.length) return '';

    let previousDateLabel = '';

    return timelineRows.map((row, index) => {
        const dateLabel = formatLiveDateDividerLabel(getLiveRowRawTimestamp(row));
        const showDateDivider = Boolean(dateLabel && dateLabel !== previousDateLabel);
        previousDateLabel = dateLabel || previousDateLabel;

        return `${showDateDivider ? createLiveDateDivider(dateLabel) : ''}${createLiveEntryCard(row, index, titleColumn)}`;
    }).join('');
}

function getLiveRowRawTimestamp(row) {
    return getRowValueByCandidates(row, ['createdAt', 'created_at', 'updatedAt', 'updated_at', 'regDate', 'reg_date', 'date']);
}

function createLiveDateDivider(dateLabel) {
    return `
        <div class="live-chat-date-divider" role="presentation" aria-hidden="true">
            <p class="live-chat-date-divider__label">${sanitizeHTML(dateLabel)}</p>
        </div>
    `;
}

function formatLiveDateDividerLabel(rawTimestamp) {
    const timestamp = new Date(rawTimestamp).getTime();
    if (!Number.isFinite(timestamp)) return '';

    const date = new Date(timestamp);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()] || '';

    return `${year}년 ${month}월 ${day}일(${weekday})`;
}

async function maybeLoadOlderLiveHistory() {
    if (!shouldUseHistoryPagination()) return;
    if (!liveState.hasMoreHistory || liveState.isLoadingOlder) return;
    if (window.scrollY > LIVE_HISTORY_TOP_THRESHOLD_PX) return;

    liveState.isLoadingOlder = true;
    await loadLiveEntries({ appendOlder: true });
}

function createLiveScrollAnchor() {
    return {
        scrollHeight: getLiveDocumentScrollHeight(),
        scrollY: window.scrollY
    };
}

function restoreLiveScrollAnchor(anchor) {
    if (!anchor) return;

    window.requestAnimationFrame(() => {
        const scrollDelta = getLiveDocumentScrollHeight() - anchor.scrollHeight;
        window.scrollTo({
            top: Math.max(0, anchor.scrollY + scrollDelta),
            behavior: 'auto'
        });
    });
}

function scrollLiveToLatest({ behavior = 'smooth', alignToBottom = false } = {}) {
    window.requestAnimationFrame(() => {
        const latestCard = document.querySelector('#live-entry-list .live-chat-card:last-of-type');
        if (latestCard) {
            const stickyStackHeight = document.querySelector('.live-page__sticky-stack')?.offsetHeight || 0;
            const adsHeight = getLiveAdsOffsetHeight();
            const visibleViewportHeight = Math.max(window.innerHeight - adsHeight, 0);
            const latestCardTop = window.scrollY + latestCard.getBoundingClientRect().top;
            const latestCardBottom = latestCardTop + latestCard.offsetHeight;
            const bottomViewportOffset = alignToBottom
                ? Math.max(stickyStackHeight + 24, visibleViewportHeight - 24)
                : visibleViewportHeight;

            window.scrollTo({
                top: Math.max(0, latestCardBottom - bottomViewportOffset),
                behavior
            });
            return;
        }

        window.scrollTo({
            top: getLiveDocumentScrollHeight(),
            behavior
        });
    });
}

function isLiveViewportNearBottom() {
    const scrollBottom = window.scrollY + Math.max(window.innerHeight - getLiveAdsOffsetHeight(), 0);
    return (getLiveDocumentScrollHeight() - scrollBottom) <= 160;
}

function updateLiveScrollBottomButton() {
    const scrollBottomButton = document.getElementById('live-scroll-bottom-button');
    const scrollMessageButton = document.getElementById('live-scroll-message-button');
    if (!scrollBottomButton && !scrollMessageButton) return;

    const scrollHeight = getLiveDocumentScrollHeight();
    const visibleViewportHeight = Math.max(window.innerHeight - getLiveAdsOffsetHeight(), 0);
    const viewportBottom = window.scrollY + visibleViewportHeight;
    const remainingDistance = scrollHeight - viewportBottom;
    const hasScrollableContent = scrollHeight > (visibleViewportHeight + 120);
    const isLatestCardVisible = isLatestLiveCardVisible();
    const shouldShowFloatingButtons = hasScrollableContent && remainingDistance > LIVE_BOTTOM_BUTTON_THRESHOLD_PX;

    if (isLatestCardVisible) {
        markLatestCardAsSeen();
    }

    if (scrollMessageButton) {
        const shouldShowMessageButton = shouldShowFloatingButtons && liveState.hasUnseenLatestCard;
        scrollMessageButton.classList.toggle('hidden', !shouldShowMessageButton);
    }

    if (scrollBottomButton) {
        const shouldShowBottomButton = shouldShowFloatingButtons && !liveState.hasUnseenLatestCard;
        scrollBottomButton.classList.toggle('hidden', !shouldShowBottomButton);
    }
}

function updateLiveScrollMessageStoreName() {
    const storeNameElement = document.getElementById('live-scroll-message-store-name');
    const storeAvatarElement = document.getElementById('live-scroll-message-store-avatar');
    const notificationStoreName = String(liveState.pendingLatestStoreName || '').trim() || getSelectedStoreName();

    if (storeNameElement) {
        storeNameElement.textContent = notificationStoreName;
    }

    if (storeAvatarElement) {
        if (notificationStoreName) {
            storeAvatarElement.src = getLiveAvatarImagePath(notificationStoreName);
            storeAvatarElement.loading = 'lazy';
            storeAvatarElement.decoding = 'async';
        } else {
            storeAvatarElement.removeAttribute('src');
        }
    }
}

function syncLiveLatestCardNotificationState() {
    const latestRow = getLatestRenderedLiveRow();
    if (!latestRow) {
        liveState.pendingLatestSignature = '';
        liveState.pendingLatestStoreName = '';
        liveState.hasUnseenLatestCard = false;
        updateLiveScrollMessageStoreName();
        return;
    }

    const latestSignature = createLiveHistorySignature(latestRow);
    const latestStoreName = resolveChoiceStoreName(latestRow);

    if (!liveState.lastSeenLatestSignature) {
        liveState.lastSeenLatestSignature = latestSignature;
        liveState.pendingLatestSignature = '';
        liveState.pendingLatestStoreName = '';
        liveState.hasUnseenLatestCard = false;
        updateLiveScrollMessageStoreName();
        return;
    }

    const hasNewLatestCard = latestSignature !== liveState.lastSeenLatestSignature;
    if (hasNewLatestCard) {
        liveState.pendingLatestSignature = latestSignature;
        liveState.pendingLatestStoreName = latestStoreName;
        liveState.hasUnseenLatestCard = true;
        updateLiveScrollMessageStoreName();
        return;
    }

    liveState.pendingLatestSignature = '';
    liveState.pendingLatestStoreName = '';
    liveState.hasUnseenLatestCard = false;
    updateLiveScrollMessageStoreName();
}

function getLatestRenderedLiveRow() {
    if (!Array.isArray(liveState.rows) || !liveState.rows.length) return null;
    return liveState.rows[liveState.rows.length - 1] || null;
}

function isLatestLiveCardVisible() {
    const latestCard = document.querySelector('#live-entry-list .live-chat-card:last-of-type');
    if (!latestCard) return isLiveViewportNearBottom();

    const rect = latestCard.getBoundingClientRect();
    const stickyStackHeight = document.querySelector('.live-page__sticky-stack')?.offsetHeight || 0;
    const adsHeight = getLiveAdsOffsetHeight();
    const visibleTop = Math.max(stickyStackHeight, 0) + 16;
    const visibleBottom = Math.max(window.innerHeight - adsHeight - 16, 0);
    const intersectsViewport = rect.bottom > visibleTop && rect.top < visibleBottom;

    return intersectsViewport;
}

function getLiveAdsOffsetHeight() {
    const adsContainer = document.getElementById('live-ads-container');
    if (!adsContainer || adsContainer.classList.contains('hidden')) return 0;

    const adsWrap = document.querySelector('.live-ads-wrap');
    return Math.max(adsWrap?.offsetHeight || 0, adsContainer.offsetHeight || 0);
}

function markLatestCardAsSeen() {
    if (!liveState.pendingLatestSignature) return;

    liveState.lastSeenLatestSignature = liveState.pendingLatestSignature;
    liveState.pendingLatestSignature = '';
    liveState.pendingLatestStoreName = '';
    liveState.hasUnseenLatestCard = false;
    updateLiveScrollMessageStoreName();
}

function getLiveDocumentScrollHeight() {
    return Math.max(
        document.body?.scrollHeight || 0,
        document.documentElement?.scrollHeight || 0
    );
}

function createLiveEntryCard(row, index, titleColumn) {
    const title = resolveEntryTitle(row, titleColumn, index);
    const choiceMessage = getRowValueByCandidates(row, getChoiceLikeMessageCandidates());

    if (isChoiceLikeCategory() && choiceMessage) {
        return createChoiceLiveEntryCard(row, index, title, choiceMessage);
    }

    if (liveState.selectedCategoryKey === 'waiting') {
        return createWaitingLiveEntryCard(row, index, title);
    }

    return createStructuredLiveEntryCard(row, index, title);
}

function createChoiceLiveEntryCard(row, index, title, choiceMessage = '') {
    const storeName = resolveChoiceStoreName(row);
    const createdAt = getRowValueByCandidates(row, ['createdAt', 'created_at', 'updatedAt', 'updated_at', 'regDate', 'reg_date', 'date']);
    const timestamp = formatLiveEntryTime(createdAt);

    const rowId = Number.parseInt(getRowValueByCandidates(row, ['id']), 10);
    const actionHtml = liveState.canDeleteChojoong
        && liveState.selectedCategoryKey === 'chojoong'
        && Number.isInteger(rowId)
        && rowId > 0
        ? `<button type="button" class="live-chat-card__delete-button" data-live-chojoong-delete="${rowId}">삭제</button>`
        : '';

    return createLiveChatCard({
        index,
        title: resolveChoiceCardTitle(storeName, title),
        message: formatFieldValue(choiceMessage),
        timestamp,
        rawTimestamp: createdAt,
        avatarLabel: getChoiceAvatarLabel(storeName, index),
        actionHtml
    });
}

function createStructuredLiveEntryCard(row, index, title) {
    const details = Object.entries(row || {})
        .filter(([key, value]) => value !== null && value !== undefined && String(value).trim() !== '')
        .slice(0, 6)
        .map(([key, value]) => ({
            key: formatFieldLabel(key),
            value: formatFieldValue(value)
        }));

    const storeName = resolveChoiceStoreName(row);
    const createdAt = getRowValueByCandidates(row, ['createdAt', 'created_at', 'updatedAt', 'updated_at', 'regDate', 'reg_date', 'date']);
    const timestamp = formatLiveEntryTime(createdAt);

    return createLiveChatCard({
        index,
        title: resolveStructuredCardTitle(storeName, title),
        details,
        emptyMessage: '표시할 정보가 없습니다.',
        timestamp,
        rawTimestamp: createdAt,
        avatarLabel: getChoiceAvatarLabel(storeName, index)
    });
}

function createEntrySummaryLiveCard(rows, titleColumn) {
    const sortedRows = sortEntryRowsByCreatedOrder(rows);
    const entryNames = sortedRows
        .map((row, index) => resolveEntryWorkerName(row, titleColumn, index))
        .filter(Boolean);
    const totalWorkers = entryNames.length;
    const rankedEntries = buildEntryRankings(sortedRows, titleColumn);
    const latestTimestamp = findLatestEntryTimestamp(sortedRows);
    const storeName = resolveChoiceStoreName(sortedRows[0] || rows[0] || {}) || getSelectedStoreName();
    const title = storeName ? `${storeName} 엔트리` : '엔트리';
    const entryNameRows = chunkEntryNames(entryNames, 5);
    const contentHtml = `
        <div class="entry-live-card">
            <section class="entry-live-card__section entry-live-card__section--count">
                <div class="entry-live-card__count-row">
                    <span class="entry-live-card__count-label">총 출근인원</span>
                    <strong class="entry-live-card__count-value">${sanitizeHTML(String(totalWorkers))}</strong>
                    <span class="entry-live-card__count-unit">명</span>
                </div>
            </section>

            <section class="entry-live-card__section">
                <div class="entry-live-card__section-header">
                    <h3 class="entry-live-card__section-title">엔트리 목록</h3>
                </div>
                <div class="entry-live-card__chips">
                    ${entryNameRows.length
                        ? entryNameRows.map((row) => `
                            <div class="entry-live-card__chip-row">
                                ${row.map((name) => `<span class="entry-live-card__chip">${sanitizeHTML(name)}</span>`).join('')}
                            </div>
                        `).join('')
                        : '<p class="entry-live-card__empty">표시할 엔트리 멤버가 없습니다.</p>'}
                </div>
            </section>

            <section class="entry-live-card__section entry-live-card__section--ranking">
                <div class="entry-live-card__section-header">
                    <h3 class="entry-live-card__section-title">오늘의 인기 멤버 TOP 5</h3>
                </div>
                ${rankedEntries.length ? `
                    <ol class="entry-live-card__ranking-list">
                        ${rankedEntries.map((entry, index) => `
                            <li class="entry-live-card__ranking-item">
                                <div class="entry-live-card__ranking-main">
                                    <span class="entry-live-card__ranking-rank">${sanitizeHTML(String(index + 1))}.</span>
                                    <span class="entry-live-card__ranking-name">${sanitizeHTML(entry.name)}</span>
                                </div>
                                <span class="entry-live-card__ranking-score">합계 ${sanitizeHTML(String(entry.score))}</span>
                            </li>
                        `).join('')}
                    </ol>
                ` : `
                    <p class="entry-live-card__empty">표시할 인기 멤버가 없습니다.</p>
                `}
            </section>
        </div>`;

    return createLiveChatCard({
        index: 0,
        title,
        body: contentHtml,
        timestamp: latestTimestamp ? formatLiveEntryTime(latestTimestamp) : '',
        rawTimestamp: latestTimestamp,
        badge: LIVE_CATEGORIES.entry.label,
        avatarLabel: getChoiceAvatarLabel(storeName || LIVE_CATEGORIES.entry.label, 0)
    });
}

function chunkEntryNames(entryNames, size = 5) {
    if (!Array.isArray(entryNames) || size <= 0) {
        return [];
    }

    const rows = [];
    for (let index = 0; index < entryNames.length; index += size) {
        rows.push(entryNames.slice(index, index + size));
    }

    return rows;
}

function resolveEntryWorkerName(row, titleColumn, index) {
    const candidates = ['workerName', 'worker_name', 'nickName', 'nickname', 'name', 'entryName'];
    const detectedName = getRowValueByCandidates(row, candidates);
    if (detectedName !== null && detectedName !== undefined && String(detectedName).trim() !== '') {
        return String(detectedName).trim();
    }

    return resolveEntryTitle(row, titleColumn, index).trim();
}

function sortEntryRowsByCreatedOrder(rows) {
    const candidates = ['createdAt', 'created_at', 'updatedAt', 'updated_at', 'regDate', 'reg_date', 'date'];

    return (Array.isArray(rows) ? rows : [])
        .map((row, index) => {
            const rawTimestamp = getRowValueByCandidates(row, candidates);
            const timestamp = new Date(rawTimestamp).getTime();

            return {
                row,
                index,
                timestamp: Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY
            };
        })
        .sort((a, b) => a.timestamp - b.timestamp || a.index - b.index)
        .map((item) => item.row);
}

function buildEntryRankings(rows, titleColumn) {
    return (Array.isArray(rows) ? rows : [])
        .map((row, index) => {
            const mentionCount = Number(getRowValueByCandidates(row, ['mentionCount', 'mention_count'])) || 0;
            const insertCount = Number(getRowValueByCandidates(row, ['insertCount', 'insert_count'])) || 0;
            const rawScore = (mentionCount * 5) + insertCount;

            return {
                name: resolveEntryWorkerName(row, titleColumn, index),
                score: Math.max(0, rawScore - 6),
                rawScore
            };
        })
        .filter((entry) => entry.name)
        .sort((a, b) => b.rawScore - a.rawScore || a.name.localeCompare(b.name, 'ko'))
        .slice(0, 5);
}

function findLatestEntryTimestamp(rows) {
    const candidates = ['updatedAt', 'updated_at', 'createdAt', 'created_at', 'regDate', 'reg_date', 'date'];

    return (Array.isArray(rows) ? rows : [])
        .map((row) => getRowValueByCandidates(row, candidates))
        .filter(Boolean)
        .map((value) => ({
            raw: value,
            time: new Date(value).getTime()
        }))
        .filter((item) => Number.isFinite(item.time))
        .sort((a, b) => b.time - a.time)[0]?.raw || '';
}

function createWaitingLiveEntryCard(row, index, title) {
    const store = resolveWaitingStore(row);
    const storeName = store?.storeName || getSelectedStoreName();
    const waitInfo = getWaitingStatus(row);
    const roomInfo = getRoomStatus(row);
    const roomDetail = getRowValueByCandidates(row, ['roomDetail', 'room_detail', 'detail', 'details']);
    const updatedAt = getRowValueByCandidates(row, ['updatedAt', 'updated_at', 'createdAt', 'created_at', 'regDate', 'reg_date', 'date']);
    const sourceUpdatedAt = getRowValueByCandidates(row, ['sourceUpdatedAt', 'source_updated_at']);
    const displayUpdatedAt = sourceUpdatedAt || updatedAt;
    const timestamp = formatLiveEntryTime(displayUpdatedAt);
    const waitingMessage = buildWaitingMessage({
        storeName,
        storeAddress: store?.storeAddress || '',
        waitInfo,
        roomInfo,
        roomDetail,
        updatedAt: displayUpdatedAt
    });

    return createLiveChatCard({
        index,
        title: resolveWaitingCardTitle(storeName, title),
        body: `<p class="live-chat-card__message">${convertTextToHtml(waitingMessage)}</p>`,
        timestamp,
        rawTimestamp: displayUpdatedAt,
        badge: LIVE_CATEGORIES.waiting.label,
        avatarLabel: getChoiceAvatarLabel(storeName || LIVE_CATEGORIES.waiting.label, index)
    });
}

function createLiveChatCard({
    index,
    title,
    body = '',
    details = [],
    message = '',
    emptyMessage = '',
    timestamp = '',
    rawTimestamp = '',
    badge = '',
    avatarLabel = '',
    cardClassName = '',
    bubbleClassName = '',
    hideHeader = false,
    actionHtml = ''
}) {
    const normalizedAvatarLabel = avatarLabel || getChoiceAvatarLabel(title, index);
    const normalizedDetails = Array.isArray(details) ? details : [];
    const normalizedCardClassName = ['live-chat-card', cardClassName].filter(Boolean).join(' ');
    const normalizedBubbleClassName = ['live-chat-card__bubble', bubbleClassName].filter(Boolean).join(' ');
    const contentHtml = body || (normalizedDetails.length
        ? `<ul class="live-chat-card__details">${normalizedDetails.map((detail) => `
            <li class="live-chat-card__detail-item">
                <span class="live-chat-card__detail-key">${sanitizeHTML(detail.key)}</span>
                <span class="live-chat-card__detail-value">${sanitizeHTML(detail.value)}</span>
            </li>
        `).join('')}</ul>`
        : `<p class="live-chat-card__message">${sanitizeHTML(message || emptyMessage)}</p>`);

    const avatarImageName = resolveLiveAvatarImageName(title);

    return `
        <article class="${normalizedCardClassName}">
            ${hideHeader ? '' : `
                <div class="live-chat-card__header">
                    <div class="live-chat-card__avatar" aria-hidden="true" ${avatarImageName ? `data-avatar-name="${sanitizeHTML(avatarImageName)}"` : ''}>
                        <span class="live-chat-card__avatar-fallback">${sanitizeHTML(normalizedAvatarLabel)}</span>
                    </div>
                    <div class="live-chat-card__header-copy">
                        <h3 class="live-chat-card__title">${sanitizeHTML(title)}</h3>
                    </div>
                    ${actionHtml || ''}
                </div>
            `}
            <div class="live-chat-card__body">
                <div class="live-chat-card__bubble-wrap">
                    <div class="${normalizedBubbleClassName}">
                        ${contentHtml}
                    </div>
                    ${timestamp ? `<time class="live-chat-card__time" datetime="${sanitizeHTML(String(rawTimestamp))}">${sanitizeHTML(timestamp)}</time>` : ''}
                </div>
            </div>
        </article>
    `;
}

function enhanceLiveAvatarImages(root = document) {
    root.querySelectorAll('.live-chat-card__avatar[data-avatar-name]').forEach((avatarElement) => {
        if (avatarElement.dataset.avatarInitialized === 'true') return;

        const avatarName = String(avatarElement.dataset.avatarName || '').trim();
        if (!avatarName) return;

        const imageElement = document.createElement('img');
        imageElement.className = 'live-chat-card__avatar-image';
        imageElement.alt = '';
        imageElement.loading = 'lazy';
        imageElement.decoding = 'async';
        imageElement.src = getLiveAvatarImagePath(avatarName);
        imageElement.addEventListener('load', () => {
            avatarElement.classList.add('has-image');
        }, { once: true });
        imageElement.addEventListener('error', () => {
            imageElement.remove();
        }, { once: true });

        avatarElement.prepend(imageElement);
        avatarElement.dataset.avatarInitialized = 'true';
    });
}

function getLiveAvatarImagePath(avatarName) {
    return `${LIVE_AVATAR_IMAGE_BASE_PATH}/${encodeURIComponent(avatarName)}프로필이미지.png`;
}

function resolveLiveAvatarImageName(title) {
    const normalizedTitle = String(title || '').trim();
    if (!normalizedTitle) return '';

    const matchedStore = liveState.stores.find((store) => normalizedTitle.includes(String(store.storeName || '').trim()));
    if (matchedStore?.storeName) {
        return String(matchedStore.storeName).trim();
    }

    const titleWithoutSuffix = normalizedTitle
        .replace(/\s+(초이스톡|초중|엔트리)$/u, '')
        .replace(/\s+룸\/웨이팅$/u, '')
        .trim();

    return titleWithoutSuffix;
}

function resolveEntryTitle(row, titleColumn, index) {
    if (titleColumn && row?.[titleColumn]) {
        return String(row[titleColumn]);
    }

    const fallbackKeys = ['title', 'subject', 'name', 'nickName', 'nickname', 'roomName', 'choiceName', 'entryName'];
    for (const key of fallbackKeys) {
        if (row?.[key]) return String(row[key]);
    }

    return `${LIVE_CATEGORIES[liveState.selectedCategoryKey]?.label || 'LIVE'} 항목 ${index + 1}`;
}

function normalizeFieldKey(key) {
    return String(key || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function getRowValueByCandidates(row, candidates = []) {
    const entries = Object.entries(row || {});
    const normalizedCandidates = candidates.map((candidate) => normalizeFieldKey(candidate));

    for (const [key, value] of entries) {
        if (value === null || value === undefined || String(value).trim() === '') continue;
        if (normalizedCandidates.includes(normalizeFieldKey(key))) {
            return value;
        }
    }

    return '';
}

function getChoiceAvatarLabel(title, index) {
    const normalizedTitle = String(title || '').replace(/\s+/g, '');
    return normalizedTitle.slice(0, 1) || String(index + 1);
}

function resolveChoiceStoreName(row) {
    const detectedStoreName = getRowValueByCandidates(row, ['storeName', 'store_name', 'shopName', 'shop_name', 'branchName', 'branch_name', 'store', 'storeNm']);
    if (detectedStoreName !== null && detectedStoreName !== undefined && String(detectedStoreName).trim() !== '') {
        return String(detectedStoreName).trim();
    }

    return getSelectedStoreName();
}

function resolveChoiceCardTitle(storeName, fallbackTitle) {
    const normalizedStoreName = String(storeName || '').trim();
    const categoryLabel = LIVE_CATEGORIES[liveState.selectedCategoryKey]?.label || '초이스톡';
    if (normalizedStoreName) {
        return `${normalizedStoreName} ${categoryLabel}`;
    }

    return fallbackTitle;
}

function resolveWaitingStore(row) {
    const detectedStoreName = getRowValueByCandidates(row, ['storeName', 'store_name', 'shopName', 'shop_name', 'branchName', 'branch_name', 'store', 'storeNm']);
    if (detectedStoreName !== null && detectedStoreName !== undefined && String(detectedStoreName).trim() !== '') {
        const normalizedStoreName = String(detectedStoreName).trim();
        const matchedByName = liveState.stores.find((store) => store.storeName === normalizedStoreName);
        if (matchedByName) {
            return matchedByName;
        }

        return {
            storeNo: Number.parseInt(getRowValueByCandidates(row, ['storeNo', 'store_no', 'shopNo', 'shop_no', 'branchNo', 'branch_no']), 10),
            storeName: normalizedStoreName,
            storeAddress: ''
        };
    }

    const storeNo = Number.parseInt(getRowValueByCandidates(row, ['storeNo', 'store_no', 'shopNo', 'shop_no', 'branchNo', 'branch_no']), 10);
    if (Number.isInteger(storeNo)) {
        const matchedStore = liveState.stores.find((store) => store.storeNo === storeNo);
        if (matchedStore) {
            return matchedStore;
        }
    }

    return getSelectedStore() || {
        storeNo: null,
        storeName: '전체',
        storeAddress: ''
    };
}

function resolveWaitingStoreName(row) {
    return resolveWaitingStore(row)?.storeName || getSelectedStoreName();
}

function resolveWaitingCardTitle(storeName, fallbackTitle) {
    const normalizedStoreName = String(storeName || '').trim();
    if (normalizedStoreName) {
        return `${normalizedStoreName} 웨이팅`;
    }

    return fallbackTitle;
}


function resolveStructuredCardTitle(storeName, fallbackTitle) {
    const normalizedStoreName = String(storeName || '').trim();
    if (normalizedStoreName) {
        return `${normalizedStoreName} ${LIVE_CATEGORIES[liveState.selectedCategoryKey]?.label || 'LIVE'}`;
    }

    return fallbackTitle;
}

function getRoomStatus(row) {
    const roomInfo = getRowValueByCandidates(row, ['roomInfo', 'room_info']);
    if (roomInfo === null || roomInfo === undefined || String(roomInfo).trim() === '') {
        return '정보 없음';
    }

    return Number(roomInfo) === 999 ? '여유' : String(roomInfo).trim();
}

function getWaitingStatus(row) {
    const waitInfo = getRowValueByCandidates(row, ['waitInfo', 'wait_info', 'waitingInfo', 'waiting_info']);
    if (waitInfo === null || waitInfo === undefined || String(waitInfo).trim() === '') {
        return '정보 없음';
    }

    return String(waitInfo).trim();
}

function parseWaitingDateTime(value) {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const normalized = String(value).trim();
    if (!normalized) return null;

    const hasExplicitTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
    const isoLikeValue = normalized.includes('T') ? normalized : normalized.replace(' ', 'T');
    const parseTarget = hasExplicitTimeZone ? isoLikeValue : `${isoLikeValue}+09:00`;
    const parsed = new Date(parseTarget);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatWaitingUpdatedAt(value) {
    if (!value) return '시간 정보 없음';

    const date = parseWaitingDateTime(value);
    if (!date) return '시간 정보 없음';

    const formatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23'
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type) => Number.parseInt(parts.find((part) => part.type === type)?.value || '', 10);
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');

    return `${month}월 ${day}일 ${hour}시 ${minute}분 기준`;
}

function formatWaitingStoreHeadline(storeName) {
    const normalizedStoreName = String(storeName || '전체').trim() || '전체';
    const decoration = WAITING_STORE_DECORATIONS[normalizedStoreName];
    if (!decoration) {
        return `✨✨✨ ${normalizedStoreName} ✨✨✨`;
    }

    return `${decoration.repeat(3)} ${normalizedStoreName} ${decoration.repeat(3)}`;
}

function normalizeWaitingBulletValue(value) {
    if (value === null || value === undefined) return '정보 없음';

    const normalized = String(value).trim();
    return normalized || '정보 없음';
}

function tryParseWaitingDetail(rawDetail) {
    if (rawDetail === null || rawDetail === undefined || rawDetail === '') {
        return { object: null, text: '' };
    }

    if (typeof rawDetail === 'object') {
        return { object: rawDetail, text: '' };
    }

    const text = String(rawDetail).trim();
    if (!text) {
        return { object: null, text: '' };
    }

    try {
        return { object: JSON.parse(text), text: '' };
    } catch (error) {
        // ignore JSON parse error
    }

    try {
        const fixedText = text
            .replace(/\r?\n|\r/g, ' ')
            .replace(/([,{\s])(\w+)\s*:/g, '$1"$2":')
            .replace(/'/g, '"');
        return { object: JSON.parse(fixedText), text: '' };
    } catch (error) {
        // ignore JSON parse error
    }

    return { object: null, text };
}

function formatWaitingDetailKey(key) {
    return String(key || '')
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();
}

function collectWaitingDetailLines(detail, depth = 0) {
    if (detail === null || detail === undefined || detail === '') {
        return [];
    }

    if (Array.isArray(detail)) {
        return detail.flatMap((item) => collectWaitingDetailLines(item, depth));
    }

    if (typeof detail !== 'object') {
        return String(detail)
            .split(/\r?\n|\r/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => (depth > 0 ? `• ${line}` : line));
    }

    return Object.entries(detail).reduce((lines, [key, value], index) => {
        const label = formatWaitingDetailKey(key);

        if (value !== null && typeof value === 'object') {
            const childLines = collectWaitingDetailLines(value, depth + 1);
            if (depth === 0 && index > 0 && childLines.length) {
                lines.push('');
            }

            if (!childLines.length) {
                lines.push(`• ${label} : 정보 없음`);
                return lines;
            }

            lines.push(label, ...childLines);
            return lines;
        }

        lines.push(`• ${label} : ${normalizeWaitingBulletValue(value)}`);
        return lines;
    }, []);
}

function buildWaitingDetailLines(roomDetail) {
    const { object, text } = tryParseWaitingDetail(roomDetail);

    if (object) {
        return collectWaitingDetailLines(object);
    }

    if (!text) {
        return [];
    }

    return text
        .split(/\r?\n|\r/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            if (/^[•●\-]/.test(line) || /^[0-9]+층/.test(line)) {
                return line;
            }

            const [key, ...rest] = line.split(':');
            if (!rest.length) {
                return line;
            }

            return `• ${formatWaitingDetailKey(key)} : ${normalizeWaitingBulletValue(rest.join(':'))}`;
        });
}

function buildWaitingMessage({ storeName, storeAddress, waitInfo, roomInfo, roomDetail, updatedAt }) {
    const normalizedStoreName = String(storeName || '전체').trim() || '전체';
    const normalizedStoreAddress = String(storeAddress || '').trim();
    const updatedText = formatWaitingUpdatedAt(updatedAt);
    const detailLines = buildWaitingDetailLines(roomDetail);
    const lines = [
        `    ${updatedText}`,
        ` ${formatWaitingStoreHeadline(normalizedStoreName)}`,
        '        룸/웨이팅 상황'
    ];

    if (normalizedStoreAddress) {
        lines.push(`        ${normalizedStoreAddress}`);
    }

    lines.push(
        '➖➖➖➖➖➖➖➖➖',
        `● 빈방 : ${roomInfo}`
    );

    if (detailLines.length) {
        lines.push('', ...detailLines);
    }

    lines.push('', `● 웨이팅 : ${waitInfo}`, '➖➖➖➖➖➖➖➖➖');

    return lines.join('\n');
}

function setupShareSheet() {
    const shareSheet = document.getElementById('share-sheet');
    if (!shareSheet) {
        return;
    }

    document.getElementById('share-sheet-overlay')?.addEventListener('click', closeShareSheet);
    document.getElementById('share-sheet-close')?.addEventListener('click', closeShareSheet);
    document.getElementById('share-kakao-btn')?.addEventListener('click', handleKakaoShare);
    document.getElementById('share-sms-btn')?.addEventListener('click', handleSmsShare);
    document.getElementById('share-copy-btn')?.addEventListener('click', handleCopyShareLink);
}

function handleShareSheetKeydown(event) {
    if (event.key === 'Escape' && shareSheetOpen) {
        closeShareSheet();
    }
}

function getShareData() {
    return {
        title: '미드나인 맨즈 커뮤니티',
        text: '라이브 페이지를 공유합니다.',
        url: window.location.href
    };
}

function openShareSheet() {
    const shareSheet = document.getElementById('share-sheet');
    if (!shareSheet) {
        return;
    }

    shareSheet.classList.remove('hidden');
    shareSheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('share-sheet-open');
    shareSheetOpen = true;
}

function closeShareSheet() {
    const shareSheet = document.getElementById('share-sheet');
    if (!shareSheet) {
        return;
    }

    shareSheet.classList.add('hidden');
    shareSheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('share-sheet-open');
    shareSheetOpen = false;
}

function handleSharePost() {
    openShareSheet();
}

async function handleKakaoShare() {
    const shareData = getShareData();

    try {
        if (window.Kakao && window.Kakao.Share && typeof window.Kakao.Share.sendDefault === 'function') {
            window.Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                    title: shareData.title,
                    description: shareData.text,
                    link: {
                        mobileWebUrl: shareData.url,
                        webUrl: shareData.url
                    }
                },
                buttons: [
                    {
                        title: '라이브 보기',
                        link: {
                            mobileWebUrl: shareData.url,
                            webUrl: shareData.url
                        }
                    }
                ]
            });
            closeShareSheet();
            return;
        }

        if (navigator.share) {
            await navigator.share(shareData);
            closeShareSheet();
            return;
        }

        await copyTextToClipboard(shareData.url);
        closeShareSheet();
        alert('카카오톡 공유를 직접 열 수 없어 링크를 복사했습니다. 카카오톡에 붙여넣어 공유해주세요.');
    } catch (error) {
        if (error?.name === 'AbortError') {
            return;
        }

        console.error('카카오톡 공유 실패:', error);
        alert('카카오톡 공유에 실패했습니다.');
    }
}

function handleSmsShare() {
    const shareData = getShareData();
    const message = `${shareData.title}
제목 ${document.title}
주소 ${shareData.url}`;
    const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isAppleDevice ? '&' : '?';
    window.location.href = `sms:${separator}body=${encodeURIComponent(message)}`;
    closeShareSheet();
}

async function handleCopyShareLink() {
    try {
        await copyTextToClipboard(getShareData().url);
        closeShareSheet();
        alert('라이브 페이지 링크가 복사되었습니다.');
    } catch (error) {
        console.error('링크 복사 실패:', error);
        closeShareSheet();
        prompt('아래 링크를 복사하세요.', getShareData().url);
    }
}

async function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const success = document.execCommand('copy');
    textarea.remove();

    if (!success) {
        throw new Error('clipboard copy failed');
    }
}

function convertTextToHtml(value) {
    return sanitizeHTML(String(value || '')).replace(/\n/g, '<br>');
}

function formatLiveEntryTime(value) {
    if (!value) return '';

    const date = parseWaitingDateTime(value);
    if (!date) return '';

    return date.toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function formatFieldLabel(key) {
    return String(key || '')
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();
}

function formatFieldValue(value) {
    if (value instanceof Date) {
        return formatDate(value.toISOString());
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

function readLiveCache(key) {
    try {
        const rawValue = window.localStorage.getItem(key);
        return rawValue ? JSON.parse(rawValue) : null;
    } catch (error) {
        console.error('LIVE cache read error:', error);
        return null;
    }
}

function writeLiveCache(key, data) {
    try {
        window.localStorage.setItem(key, JSON.stringify({
            savedAt: Date.now(),
            data
        }));
    } catch (error) {
        console.error('LIVE cache write error:', error);
    }
}

function showLiveError(message) {
    const errorElement = document.getElementById('live-error');
    if (!errorElement) return;

    errorElement.textContent = message;
    showElement(errorElement);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLivePage, { once: true });
} else {
    initLivePage();
}

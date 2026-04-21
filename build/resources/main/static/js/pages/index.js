let currentPage = 0;
let totalPages = 0;
let isLoading = false;

async function initIndexPage() {
    console.log('=== Index Page Init ===');
    Auth.updateHeaderUI();

    if (typeof initHeader === 'function') {
        initHeader();
    }

    await loadPosts(0);
    initPaginationEvents();
}

async function loadPosts(page = 0, size = 10) {
    if (isLoading) {
        console.log('Already loading, skip');
        return;
    }
    
    console.log(`=== loadPosts 호출 ===`);
    console.log(`요청 페이지: ${page}, 현재 페이지: ${currentPage}`);
    
    const loading = document.getElementById('loading');
    const postListContainer = document.getElementById('post-list');
    const errorBanner = document.getElementById('error-banner');
    const emptyState = document.getElementById('empty-state');
    const pagination = document.getElementById('pagination');

    try {
        isLoading = true;
        
        showElement(loading);
        hideElement(errorBanner);
        hideElement(emptyState);
        hideElement(pagination);

        console.log(`API 호출 시작: page=${page}, size=${size}`);
        const response = await PostAPI.getPosts({ page: page, size: size });
        console.log('API 응답:', response);
        
        if (response && response.posts) {
            console.log(`게시글 수: ${response.posts.length}`);
            console.log(`현재페이지: ${response.currentPage}, 전체페이지: ${response.totalPages}`);
            
            if (response.posts.length > 0) {
                renderPostList(response.posts, postListContainer);
                
                const oldPage = currentPage;
                const oldTotalPages = totalPages;
                
                currentPage = parseInt(response.currentPage);
                totalPages = parseInt(response.totalPages);
                
                console.log(`페이지 업데이트: ${oldPage} -> ${currentPage}, 전체: ${oldTotalPages} -> ${totalPages}`);
                
                updatePagination();
                showElement(pagination);
            } else {
                postListContainer.innerHTML = '';
                showElement(emptyState);
            }
        } else {
            console.error('잘못된 응답:', response);
            showErrorBanner('잘못된 응답 형식입니다.');
        }

    } catch (error) {
        console.error('게시글 로드 에러:', error);
        showErrorBanner('게시글을 불러오는데 실패했습니다: ' + error.message);
        postListContainer.innerHTML = '';
    } finally {
        isLoading = false;
        hideElement(loading);
        console.log('=== loadPosts 완료 ===');
    }
}

function updatePagination() {
    console.log(`=== updatePagination 호출 ===`);
    console.log(`currentPage: ${currentPage}, totalPages: ${totalPages}`);
    
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageNumbers = document.getElementById('page-numbers');
    
    if (!prevBtn || !nextBtn || !pageNumbers) {
        console.error('페이지네이션 엘리먼트를 찾을 수 없음');
        return;
    }

    prevBtn.disabled = currentPage <= 0;
    nextBtn.disabled = currentPage >= totalPages - 1;
    
    console.log(`이전 버튼 비활성화: ${prevBtn.disabled}`);
    console.log(`다음 버튼 비활성화: ${nextBtn.disabled}`);

    let pageNumbersHtml = '';
    const maxVisible = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(0, endPage - maxVisible + 1);
    }

    console.log(`페이지 범위: ${startPage} ~ ${endPage}`);

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        const btnClass = isActive ? 'btn btn-primary btn-sm page-btn active' : 'btn btn-outline btn-sm page-btn';
        pageNumbersHtml += `<button class="${btnClass}" data-page="${i}">${i + 1}</button>`;
        
        if (isActive) {
            console.log(`활성 페이지: ${i + 1}`);
        }
    }

    pageNumbers.innerHTML = pageNumbersHtml;
    
    pageNumbers.querySelectorAll('.page-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const targetPage = parseInt(btn.dataset.page);
            console.log(`페이지 번호 클릭: ${targetPage + 1} (인덱스: ${targetPage})`);
            console.log(`현재 페이지: ${currentPage}, 목표 페이지: ${targetPage}, 로딩중: ${isLoading}`);
            
            if (!isLoading) {
                console.log(`페이지 이동: ${currentPage} -> ${targetPage}`);
                loadPosts(targetPage);
            } else {
                console.log(`페이지 이동 취소: 로딩중=${isLoading}`);
            }
        };
    });
}

function initPaginationEvents() {
    console.log('=== initPaginationEvents 호출 ===');
    
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const retryBtn = document.getElementById('retry-btn');
    
    if (prevBtn) {
        prevBtn.onclick = (e) => {
            e.preventDefault();
            console.log(`이전 버튼 클릭: 현재=${currentPage}`);
            console.log(`조건 체크: currentPage > 0 = ${currentPage > 0}, !isLoading = ${!isLoading}`);
            
            if (currentPage > 0 && !isLoading) {
                console.log(`이전 페이지로 이동: ${currentPage} -> ${currentPage - 1}`);
                loadPosts(currentPage - 1);
            } else {
                console.log(`이전 페이지 이동 불가: currentPage=${currentPage}, isLoading=${isLoading}`);
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = (e) => {
            e.preventDefault();
            console.log(`다음 버튼 클릭: 현재=${currentPage}, 전체=${totalPages}`);
            console.log(`조건 체크: currentPage < totalPages - 1 = ${currentPage < totalPages - 1}, !isLoading = ${!isLoading}`);
            
            if (currentPage < totalPages - 1 && !isLoading) {
                console.log(`다음 페이지로 이동: ${currentPage} -> ${currentPage + 1}`);
                loadPosts(currentPage + 1);
            } else {
                console.log(`다음 페이지 이동 불가: currentPage=${currentPage}, totalPages=${totalPages}, isLoading=${isLoading}`);
            }
        };
    }
    
    if (retryBtn) {
        retryBtn.onclick = () => {
            console.log('재시도 버튼 클릭');
            if (!isLoading) {
                loadPosts(currentPage);
            }
        };
    }
}

function renderPostList(posts, container) {
    if (!container || !posts || posts.length === 0) {
        console.log('renderPostList: 컨테이너 또는 게시글 없음');
        return;
    }

    console.log(`게시글 렌더링: ${posts.length}개`);
    
    posts.forEach((post, index) => {
        console.log(`게시글 ${index + 1}: ID=${post.id}, 관리자=${post.isAdminPost}, 제목=${post.title}`);
    });

    let html = '<div class="post-list">';
    posts.forEach(post => {
        html += createPostCard(post);
    });
    html += '</div>';

    container.innerHTML = html;
    console.log('게시글 렌더링 완료');
}

function showErrorBanner(message) {
    console.log('에러 배너 표시:', message);
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    showElement(errorBanner);
}

function showElement(element) {
    if (element) {
        element.classList.remove('hidden');
    }
}

function hideElement(element) {
    if (element) {
        element.classList.add('hidden');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIndexPage);
} else {
    initIndexPage();
}
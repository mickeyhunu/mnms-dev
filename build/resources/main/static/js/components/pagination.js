function createPagination(currentPage, totalPages, onPageChange, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container || totalPages <= 1) {
        hideElement(container);
        return;
    }

    const prevBtn = container.querySelector('#prev-btn') || container.querySelector('.prev-btn');
    const nextBtn = container.querySelector('#next-btn') || container.querySelector('.next-btn');
    const pageNumbers = container.querySelector('#page-numbers') || container.querySelector('.page-numbers');

    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                onPageChange(currentPage - 1);
            }
        };
    }

    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                onPageChange(currentPage + 1);
            }
        };
    }

    if (pageNumbers) {
        pageNumbers.innerHTML = createPageNumbers(currentPage, totalPages, onPageChange);
    }

    showElement(container);
}

function createPageNumbers(currentPage, totalPages, onPageChange) {
    let html = '';
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        html += createPageButton(1, currentPage, onPageChange);
        if (startPage > 2) {
            html += '<span class="page-ellipsis">...</span>';
        }
    }

    for (let page = startPage; page <= endPage; page++) {
        html += createPageButton(page, currentPage, onPageChange);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<span class="page-ellipsis">...</span>';
        }
        html += createPageButton(totalPages, currentPage, onPageChange);
    }

    return html;
}

function createPageButton(page, currentPage, onPageChange) {
    const isActive = page === currentPage;
    const className = isActive ? 'btn btn-sm btn-primary page-btn active' : 'btn btn-sm btn-outline page-btn';
    
    return `
        <button class="${className}" 
                onclick="handlePageClick(${page}, ${currentPage})" 
                data-page="${page}"
                ${isActive ? 'disabled' : ''}>
            ${page}
        </button>
    `;
}

function handlePageClick(page, currentPage) {
    if (page === currentPage) return;
    
    const event = new CustomEvent('pageChange', {
        detail: { page: page }
    });
    
    document.dispatchEvent(event);
}

function setupPaginationEventListeners(onPageChange) {
    document.addEventListener('pageChange', (e) => {
        const page = e.detail.page;
        onPageChange(page);
    });
}

function updatePaginationState(currentPage, totalPages, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const prevBtn = container.querySelector('#prev-btn') || container.querySelector('.prev-btn');
    const nextBtn = container.querySelector('#next-btn') || container.querySelector('.next-btn');
    const pageButtons = container.querySelectorAll('.page-btn');

    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.classList.toggle('disabled', currentPage <= 1);
    }

    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.classList.toggle('disabled', currentPage >= totalPages);
    }

    pageButtons.forEach(btn => {
        const page = parseInt(btn.dataset.page);
        const isActive = page === currentPage;
        
        btn.classList.toggle('active', isActive);
        btn.classList.toggle('btn-primary', isActive);
        btn.classList.toggle('btn-outline', !isActive);
        btn.disabled = isActive;
    });
}

function createSimplePagination(currentPage, totalPages, onPageChange, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container || totalPages <= 1) {
        hideElement(container);
        return;
    }

    let html = '';
    
    if (currentPage > 1) {
        html += `<button class="btn btn-sm btn-outline" onclick="handleSimplePageChange(${currentPage - 1})">이전</button>`;
    }
    
    html += `<span class="pagination-info">${currentPage} / ${totalPages}</span>`;
    
    if (currentPage < totalPages) {
        html += `<button class="btn btn-sm btn-outline" onclick="handleSimplePageChange(${currentPage + 1})">다음</button>`;
    }

    container.innerHTML = html;
    showElement(container);

    window.handleSimplePageChange = onPageChange;
}

function createLoadMorePagination(hasMore, onLoadMore, containerSelector, loading = false) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    if (!hasMore) {
        container.innerHTML = '<p class="text-center text-muted">모든 게시글을 불러왔습니다.</p>';
        showElement(container);
        return;
    }

    const buttonText = loading ? '로딩 중...' : '더 보기';
    const buttonClass = loading ? 'btn btn-primary loading' : 'btn btn-primary';
    
    container.innerHTML = `
        <div class="text-center">
            <button class="${buttonClass}" 
                    onclick="handleLoadMore()" 
                    ${loading ? 'disabled' : ''}>
                ${buttonText}
            </button>
        </div>
    `;
    
    showElement(container);
    window.handleLoadMore = onLoadMore;
}

console.log('Pagination loaded');
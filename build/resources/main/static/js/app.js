document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    try {
        console.log('Initializing app...');
        
        initHeader();
        
        if (Auth.isAuthenticated()) {
            setupHeaderNotifications();
        }
        
        setupGlobalEventListeners();
        setupNotifications();
        
        console.log('App initialized successfully');
        
    } catch (error) {
        console.error('App initialization failed:', error);
    }
}

function setupGlobalEventListeners() {
    document.addEventListener('click', handleGlobalClick);
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    document.addEventListener('keydown', handleGlobalKeydown);
}

function handleGlobalClick(e) {
    if (e.target.matches('.modal-overlay')) {
        closeModal();
    }
    
    if (e.target.matches('.close-modal, [data-dismiss="modal"]')) {
        closeModal();
    }
}

function handleBeforeUnload(e) {
    const forms = document.querySelectorAll('form');
    let hasUnsavedChanges = false;
    
    forms.forEach(form => {
        if (form.dataset.hasChanges === 'true') {
            hasUnsavedChanges = true;
        }
    });
    
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '작성 중인 내용이 있습니다. 페이지를 떠나시겠습니까?';
        return e.returnValue;
    }
}

function handleGlobalKeydown(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
    
    if (e.ctrlKey && e.key === 'Enter') {
        const activeForm = document.querySelector('form:focus-within');
        if (activeForm) {
            const submitBtn = activeForm.querySelector('[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.click();
            }
        }
    }
}

function setupNotifications() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'notification-container';
    document.body.appendChild(container);
}

function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="closeNotification(this)">&times;</button>
        </div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    if (duration > 0) {
        setTimeout(() => {
            closeNotification(notification);
        }, duration);
    }
}

function closeNotification(element) {
    const notification = element.closest ? element.closest('.notification') : element;
    if (notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal(modalId = null) {
    if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    } else {
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
            modal.classList.remove('show');
        });
    }
    
    document.body.style.overflow = '';
}

function setLoading(button, isLoading, originalText = null) {
    if (!button) return;
    
    if (isLoading) {
        if (originalText === null) {
            button.dataset.originalText = button.textContent;
        }
        button.textContent = '처리 중...';
        button.disabled = true;
        button.classList.add('loading');
    } else {
        button.textContent = originalText || button.dataset.originalText || button.textContent;
        button.disabled = false;
        button.classList.remove('loading');
        delete button.dataset.originalText;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function trackFormChanges(form) {
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            form.dataset.hasChanges = 'true';
        });
        
        input.addEventListener('change', () => {
            form.dataset.hasChanges = 'true';
        });
    });
    
    form.addEventListener('submit', () => {
        form.dataset.hasChanges = 'false';
    });
}

window.showNotification = showNotification;
window.closeNotification = closeNotification;
window.openModal = openModal;
window.closeModal = closeModal;
window.setLoading = setLoading;
window.debounce = debounce;
window.throttle = throttle;
window.trackFormChanges = trackFormChanges;

console.log('App loaded');
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

function setLoading(button, loading = true) {
   if (!button) return;
   
   if (loading) {
       button.disabled = true;
       button.dataset.originalText = button.textContent;
       button.textContent = '처리 중...';
   } else {
       button.disabled = false;
       button.textContent = button.dataset.originalText || button.textContent;
   }
}

function showNotification(message, type = 'info') {
   const notification = createNotificationElement(message, type);
   document.body.appendChild(notification);
   
   setTimeout(() => {
       notification.classList.add('show');
   }, 100);
   
   setTimeout(() => {
       notification.classList.remove('show');
       setTimeout(() => {
           if (notification.parentNode) {
               notification.parentNode.removeChild(notification);
           }
       }, 300);
   }, 3000);
}

function createNotificationElement(message, type) {
   const notification = document.createElement('div');
   notification.className = `notification notification-${type}`;
   notification.innerHTML = `
       <div class="notification-content">
           <span class="notification-icon">${getNotificationIcon(type)}</span>
           <span class="notification-message">${message}</span>
       </div>
   `;
   
   notification.style.cssText = `
       position: fixed !important;
       top: 20px !important;
       right: 20px !important;
       z-index: 99999 !important;
       min-width: 300px !important;
       padding: 16px !important;
       border-radius: 8px !important;
       box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
       transform: translateX(100%) !important;
       transition: transform 0.3s ease-in-out !important;
       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
   `;
   
   const styles = {
       success: {
           background: '#10b981 !important',
           color: 'white !important'
       },
       error: {
           background: '#ef4444 !important',
           color: 'white !important'
       },
       warning: {
           background: '#f59e0b !important',
           color: 'white !important'
       },
       info: {
           background: '#3b82f6 !important',
           color: 'white !important'
       }
   };
   
   const style = styles[type] || styles.info;
   Object.assign(notification.style, style);
   
   notification.classList.add('notification-enter');
   
   return notification;
}

function getNotificationIcon(type) {
   const icons = {
       success: '✓',
       error: '✕',
       warning: '⚠',
       info: 'ℹ'
   };
   return icons[type] || icons.info;
}

const notificationStyles = `
   .notification.show {
       transform: translateX(0) !important;
   }
   
   .notification-content {
       display: flex !important;
       align-items: center !important;
       gap: 12px !important;
   }
   
   .notification-icon {
       font-size: 18px !important;
       font-weight: bold !important;
   }
   
   .notification-message {
       font-size: 14px !important;
       line-height: 1.4 !important;
   }
`;

if (!document.querySelector('#notification-styles')) {
   const styleSheet = document.createElement('style');
   styleSheet.id = 'notification-styles';
   styleSheet.textContent = notificationStyles;
   document.head.appendChild(styleSheet);
}

function clearFormErrors(form) {
   const errorElements = form.querySelectorAll('.error-message');
   errorElements.forEach(element => {
       element.classList.add('hidden');
       element.textContent = '';
   });
   
   const inputElements = form.querySelectorAll('.form-control');
   inputElements.forEach(element => element.classList.remove('error'));
}

function addInputError(input, message) {
   input.classList.add('error');
   const errorElement = document.getElementById(`${input.name}-error`);
   if (errorElement) {
       errorElement.textContent = message;
       errorElement.classList.remove('hidden');
   }
}

function toggleElement(element, show) {
   if (!element) return;
   
   if (show) {
       element.classList.remove('hidden');
   } else {
       element.classList.add('hidden');
   }
}

function sanitizeHTML(str) {
   if (!str) return '';
   
   const temp = document.createElement('div');
   temp.textContent = str;
   return temp.innerHTML;
}

function formatDate(dateString) {
   if (!dateString) return '';
   
   const date = new Date(dateString);
   const now = new Date();
   const diffInMs = now - date;
   const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
   const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
   const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
   
   if (diffInMinutes < 1) {
       return '방금 전';
   } else if (diffInMinutes < 60) {
       return `${diffInMinutes}분 전`;
   } else if (diffInHours < 24) {
       return `${diffInHours}시간 전`;
   } else if (diffInDays < 7) {
       return `${diffInDays}일 전`;
   } else {
       return date.toLocaleDateString('ko-KR', {
           year: 'numeric',
           month: 'short',
           day: 'numeric'
       });
   }
}

function formatDateTime(dateString) {
   if (!dateString) return '';
   
   const date = new Date(dateString);
   return date.toLocaleString('ko-KR', {
       year: 'numeric',
       month: 'long',
       day: 'numeric',
       hour: '2-digit',
       minute: '2-digit'
   });
}

function getURLParams() {
   const params = {};
   const urlParams = new URLSearchParams(window.location.search);
   
   for (const [key, value] of urlParams.entries()) {
       params[key] = value;
   }
   
   return params;
}

console.log('Helpers loaded');
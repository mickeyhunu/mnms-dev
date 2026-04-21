/**
 * 파일 역할: helpers에서 사용하는 공통 보조 함수/상수를 제공하는 유틸리티 파일.
 */
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
       right: 16px !important;
       z-index: 99999 !important;
       width: min(360px, calc(100vw - 32px)) !important;
       padding: 16px !important;
       border-radius: 8px !important;
       box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
       transform: translateX(calc(100% + 16px)) !important;
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
   styleSheet.textContent = `
${notificationStyles}
#blocked-expression-modal {
   position: fixed;
   inset: 0;
   display: none;
   align-items: center;
   justify-content: center;
   z-index: 100000;
}

.blocked-expression-modal-backdrop {
   position: absolute;
   inset: 0;
   background: rgba(0, 0, 0, 0.55);
}

.blocked-expression-modal-content {
   position: relative;
   width: min(420px, calc(100vw - 32px));
   background: #fff;
   border-radius: 12px;
   box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
   padding: 24px 20px;
   z-index: 1;
}

.blocked-expression-modal-content h3 {
   margin: 0 0 12px;
   font-size: 18px;
}

.blocked-expression-modal-content p {
   margin: 0 0 16px;
   line-height: 1.5;
   color: #333;
}
`;
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

function findBlockedExpression(text) {
   const profanityFilter = window.KoProfanityFilter;
   if (profanityFilter && typeof profanityFilter.findProfanity === 'function') {
      return profanityFilter.findProfanity(text);
   }

   const fallbackTerms = ['시발', '씨발', '병신', '지랄', '개새끼', '좆'];
   const normalizedText = String(text || '').toLowerCase().trim().replace(/\s+/g, '');
   if (!normalizedText) return null;
   return fallbackTerms.find(expression => normalizedText.includes(expression)) || null;
}

function showBlockedExpressionModal(fieldLabel = '입력값', expression = '') {
   let modal = document.getElementById('blocked-expression-modal');
   const displayExpression = expression === '[obscenity-dataset-match]' ? '금지어 패턴' : expression;
   const safeExpression = sanitizeHTML(displayExpression);
   const modalMessage = `${fieldLabel}에 부적절한 표현${safeExpression ? `(${safeExpression})` : ''}이 포함되어 등록할 수 없습니다.`;

   if (!modal) {
      modal = document.createElement('div');
      modal.id = 'blocked-expression-modal';
      modal.innerHTML = `
         <div class="blocked-expression-modal-backdrop"></div>
         <div class="blocked-expression-modal-content" role="dialog" aria-modal="true" aria-labelledby="blocked-expression-modal-title">
            <h3 id="blocked-expression-modal-title">부적절한 표현이 감지되었습니다</h3>
            <p id="blocked-expression-modal-message"></p>
            <button type="button" id="blocked-expression-modal-close-btn" class="btn btn-primary">확인</button>
         </div>
      `;

      document.body.appendChild(modal);

      const closeModal = () => {
         modal.style.display = 'none';
      };

      modal.querySelector('#blocked-expression-modal-close-btn')?.addEventListener('click', closeModal);
      modal.querySelector('.blocked-expression-modal-backdrop')?.addEventListener('click', closeModal);
   }

   const messageElement = modal.querySelector('#blocked-expression-modal-message');
   if (messageElement) {
      messageElement.innerHTML = modalMessage;
   }

   modal.style.display = 'flex';
}

function validateNoBlockedExpression(value, fieldLabel = '입력값') {
   const blockedExpression = findBlockedExpression(value);
   if (!blockedExpression) return true;

   showBlockedExpressionModal(fieldLabel, blockedExpression);
   return false;
}

function formatDate(dateString) {
   if (!dateString) return '';

   const date = new Date(dateString);
   if (Number.isNaN(date.getTime())) return dateString;

   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, '0');
   const day = String(date.getDate()).padStart(2, '0');
   const hour = String(date.getHours()).padStart(2, '0');
   const minute = String(date.getMinutes()).padStart(2, '0');

   return `${year}.${month}.${day}. ${hour}:${minute}`;
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

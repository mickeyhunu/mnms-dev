/**
 * 파일 역할: login 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
function initLoginPage() {
    if (Auth.redirectIfAuthenticated()) {
        return;
    }
    showRegisteredMessageIfNeeded();
    setupLoginForm();
}

function showRegisteredMessageIfNeeded() {
    const params = new URLSearchParams(window.location.search || '');
    if (params.get('registered') === '1') {
        showNotification('회원가입이 완료되었습니다. 로그인 후 홈으로 이동합니다.', 'success');
    }
}

function setupLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) {
        console.error('Login form not found');
        return;
    }
    form.addEventListener('submit', handleLogin);
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateFormField(input));
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) {
                validateFormField(input);
            }
        });
    });
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.getElementById('submit-btn');
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    const formData = {
        loginId: form.loginId.value.trim(),
        password: form.password.value
    };
    
    const errors = validateLoginForm(formData);
    if (hasValidationErrors(errors)) {
        showValidationErrors(errors, form);
        return;
    }
    
    try {
        setLoading(submitBtn, true);
        hideElement(errorBanner);
        
        const response = await AuthAPI.login(formData);
        
        showNotification(MESSAGES.LOGIN_SUCCESS, 'success');

        const params = new URLSearchParams(window.location.search || '');
        const returnTo = params.get('returnTo') || '/';
        const isValidReturnPath = returnTo.startsWith('/') && !returnTo.startsWith('//');
        setTimeout(() => {
            window.location.href = isValidReturnPath ? returnTo : '/';
        }, 1000);
        
    } catch (error) {
        console.error('로그인 에러:', error);
        if (errorMessage) {
            errorMessage.textContent = error.message || '로그인 중 오류가 발생했습니다.';
        }
        showElement(errorBanner);
    } finally {
        setLoading(submitBtn, false);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
    initLoginPage();
}

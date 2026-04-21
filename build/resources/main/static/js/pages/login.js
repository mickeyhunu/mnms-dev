function initLoginPage() {
    if (Auth.redirectIfAuthenticated()) {
        return;
    }
    setupLoginForm();
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
        email: form.email.value.trim(),
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

        console.log('===== 최종 확인 =====');
        console.log('저장된 토큰:', Auth.getToken());
        console.log('저장된 사용자:', Auth.getUser());
        console.log('인증 상태:', Auth.isAuthenticated());
        console.log('=================');
        
        console.log('2초 후 자동 이동됩니다.');
        setTimeout(() => {
            window.location.href = 'http://localhost:8080/';
        }, 2000);
        
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

console.log('Login JS loaded');
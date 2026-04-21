function initRegisterPage() {
    console.log('Register page 초기화');
    
    if (Auth.redirectIfAuthenticated()) {
        return;
    }
    
    setupRegisterForm();
    setupNicknamePreview();
}

function setupRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) {
        console.error('Register form not found');
        return;
    }
    
    form.addEventListener('submit', handleRegister);
    
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateFormField(input));
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) {
                validateFormField(input);
            }
        });
    });
}

function setupNicknamePreview() {
    const companyInput = document.getElementById('company');
    const nicknamePreview = document.getElementById('nickname-preview');
    
    if (companyInput && nicknamePreview) {
        companyInput.addEventListener('input', () => {
            const company = companyInput.value.trim();
            if (company) {
                nicknamePreview.textContent = `${company}-###`;
            } else {
                nicknamePreview.textContent = '회사명-###';
            }
        });
    }
}

async function handleRegister(e) {
    e.preventDefault();
    console.log('회원가입 시도');
    
    const form = e.target;
    const submitBtn = document.getElementById('submit-btn');
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    
    const formData = {
        email: form.email.value.trim(),
        password: form.password.value,
        confirmPassword: form.confirmPassword.value,
        company: form.company.value.trim(),
        department: form.department.value,
        jobPosition: form.jobRole.value
    };
    
    console.log('회원가입 데이터:', {
        email: formData.email,
        company: formData.company,
        department: formData.department,
        jobPosition: formData.jobPosition
    });
    
    const errors = validateRegisterForm(formData);
    
    if (hasValidationErrors(errors)) {
        showValidationErrors(errors, form);
        return;
    }
    
    try {
        setLoading(submitBtn, true);
        hideElement(errorBanner);
        
        console.log('AuthAPI.register() 호출');
        const response = await AuthAPI.register({
            email: formData.email,
            password: formData.password,
            company: formData.company,
            department: formData.department,
            jobPosition: formData.jobPosition
        });
        console.log('회원가입 응답:', response);
        
        showNotification('회원가입이 완료되었습니다!', 'success');
        
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
        
    } catch (error) {
        console.error('회원가입 에러:', error);
        
        if (errorMessage) {
            errorMessage.textContent = error.message || '회원가입 중 오류가 발생했습니다.';
        }
        showElement(errorBanner);
        
    } finally {
        setLoading(submitBtn, false);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRegisterPage);
} else {
    initRegisterPage();
}

console.log('Register JS loaded');
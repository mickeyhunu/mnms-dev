/**
 * 파일 역할: register 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */

const PORTONE_BROWSER_SDK_URL = 'https://cdn.portone.io/v2/browser-sdk.js';
let portOneIdentityConfig = null;

function showBlockingAlert(message) {
    const resolvedMessage = String(message || '').trim();
    if (!resolvedMessage) {
        return;
    }

    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(resolvedMessage);
    }
}

function initRegisterPage() {
    console.info('[Register] initRegisterPage 시작');

    if (Auth.redirectIfAuthenticated()) {
        console.info('[Register] 이미 로그인 상태라 회원가입 페이지 초기화 중단');
        return;
    }

    setupRegisterForm();
    setupIdentityVerification();
    setupNicknameCheck();
    setupStepFlow();
}

function setupRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) {
        console.warn('[Register] register-form 엘리먼트를 찾지 못했습니다.');
        return;
    }

    console.info('[Register] 회원가입 폼 이벤트 바인딩');
    form.addEventListener('submit', handleRegister);

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', (event) => {
            event.preventDefault();
            console.info('[Register] 회원가입 버튼 클릭 이벤트 감지');
            handleRegister({
                preventDefault: () => { },
                target: form
            });
        });
    }

    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateFormField(input));
        input.addEventListener('input', () => {
            if (input.name === 'nickname') {
                markNicknameAsUnchecked();
            }

            if (input.classList.contains('error')) {
                validateFormField(input);
            }
        });
    });
}

function setupStepFlow() {
    const agreeTermsBtn = document.getElementById('agree-terms-btn');
    const selectAllConsentBtn = document.getElementById('select-all-consent-btn');
    const termsConsent = document.getElementById('termsConsent');
    const privacyConsent = document.getElementById('privacyConsent');
    const marketingConsent = document.getElementById('marketingConsent');
    const termsConsentError = document.getElementById('termsConsent-error');
    const requiredConsentCheckboxes = [termsConsent, privacyConsent].filter(Boolean);

    [termsConsent, privacyConsent, marketingConsent].filter(Boolean).forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
            if (requiredConsentCheckboxes.every(item => item.checked)) {
                termsConsentError?.classList.add('hidden');
            }
        });
    });

    if (selectAllConsentBtn) {
        selectAllConsentBtn.addEventListener('click', () => {
            [termsConsent, privacyConsent, marketingConsent].filter(Boolean).forEach((checkbox) => {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            });
            termsConsentError?.classList.add('hidden');
        });
    }

    if (agreeTermsBtn) {
        agreeTermsBtn.addEventListener('click', () => {
            if (!requiredConsentCheckboxes.every(item => item.checked)) {
                termsConsentError?.classList.remove('hidden');
                return;
            }

            termsConsentError?.classList.add('hidden');
            showNotification('약관 동의가 완료되었습니다. 본인인증을 시작합니다.', 'success');
            handleIdentityVerification();
        });
    }
}

function showStep(stepName) {
    const steps = {
        terms: document.getElementById('register-step-terms'),
        identity: document.getElementById('register-step-identity'),
        detail: document.getElementById('register-step-detail')
    };

    Object.values(steps).forEach(step => {
        if (step) {
            step.classList.add('hidden');
        }
    });

    if (steps[stepName]) {
        steps[stepName].classList.remove('hidden');
    }
}

function setPhoneVerified(isVerified) {
    const phoneVerifiedInput = document.getElementById('phoneVerified');
    if (phoneVerifiedInput) {
        phoneVerifiedInput.value = isVerified ? 'true' : 'false';
    }
}

function setIdentityVerified(isVerified) {
    const identityVerifiedInput = document.getElementById('identityVerified');
    if (identityVerifiedInput) {
        identityVerifiedInput.value = isVerified ? 'true' : 'false';
    }
}

function showIdentityStatus(message = '') {
    const statusElement = document.getElementById('identity-status');
    if (!statusElement) {
        return;
    }
    statusElement.textContent = String(message || '').trim();
}

function setupIdentityVerification() {
    const startIdentityBtn = document.getElementById('start-kcp-btn');

    if (startIdentityBtn) {
        startIdentityBtn.addEventListener('click', handleIdentityVerification);
    }
}

async function requestIdentityVerification({ popupName, popup, authForm }) {
    if (!(authForm instanceof HTMLFormElement)) {
        throw new Error('KCP 인증 폼을 찾을 수 없습니다.');
    }

    const submitUrl = String(authForm.action || '').trim();
    if (!submitUrl || submitUrl === 'about:blank') {
        throw new Error('KCP 인증 요청 URL이 설정되지 않았습니다.');
    }

    authForm.target = popupName;
    authForm.submit();

    popup.document.write(`
        <html lang="ko">
        <head><title>KCP 본인인증</title></head>
        <body style="font-family:sans-serif;padding:24px;">
            <h2>KCP 본인인증</h2>
            <p>본인인증을 진행 중입니다...</p>
        </body>
        </html>
    `);
    popup.document.close();

    if (typeof window.requestIdentityVerification !== 'function') {
        return new Promise((resolve, reject) => {
            const timeoutId = window.setTimeout(() => {
                window.removeEventListener('message', handleMessage);
                reject(new Error('본인인증 응답 대기 시간이 초과되었습니다.'));
            }, 5 * 60 * 1000);

            const handleMessage = (event) => {
                const data = event?.data || {};
                if (data.type !== 'KCP_IDENTITY_VERIFICATION_RESULT') {
                    return;
                }

                window.clearTimeout(timeoutId);
                window.removeEventListener('message', handleMessage);
                resolve(data.payload || null);
            };

            window.addEventListener('message', handleMessage);
        });
    }

    const response = window.requestIdentityVerification({
        popupName,
        popup,
        form: authForm
    });

    if (response && typeof response.then === 'function') {
        return response;
    }

    return response;
}

function setupNicknameCheck() {
    const checkNicknameBtn = document.getElementById('check-nickname-btn');
    const nicknameInput = document.getElementById('nickname');

    if (checkNicknameBtn) {
        checkNicknameBtn.addEventListener('click', checkNicknameAvailability);
    }

    if (nicknameInput) {
        nicknameInput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') {
                return;
            }

            event.preventDefault();
            checkNicknameAvailability();
        });
    }
}

async function loadPortOneSdk() {
    if (window.PortOne && typeof window.PortOne.requestIdentityVerification === 'function') {
        return window.PortOne;
    }

    const existingScript = document.querySelector(`script[src="${PORTONE_BROWSER_SDK_URL}"]`);
    if (existingScript) {
        await new Promise((resolve, reject) => {
            existingScript.addEventListener('load', resolve, { once: true });
            existingScript.addEventListener('error', () => reject(new Error('PortOne SDK 로드에 실패했습니다.')), { once: true });
        });
        return window.PortOne;
    }

    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = PORTONE_BROWSER_SDK_URL;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('PortOne SDK 로드에 실패했습니다.'));
        document.head.appendChild(script);
    });

    return window.PortOne;
}

async function getPortOneIdentityConfig() {
    if (portOneIdentityConfig?.storeId && portOneIdentityConfig?.channelKey) {
        return portOneIdentityConfig;
    }

    const config = await AuthAPI.getIdentityVerificationConfig();
    const storeId = String(config?.storeId || '').trim();
    const channelKey = String(config?.channelKey || '').trim();

    if (!storeId || !channelKey) {
        throw new Error('PortOne 본인인증 설정값을 불러오지 못했습니다.');
    }

    portOneIdentityConfig = {
        storeId,
        channelKey
    };

    return portOneIdentityConfig;
}

async function handleIdentityVerification() {
    try {
        const PortOne = await loadPortOneSdk();
        const identityConfig = await getPortOneIdentityConfig();
        if (!PortOne || typeof PortOne.requestIdentityVerification !== 'function') {
            throw new Error('PortOne 본인인증 모듈을 찾을 수 없습니다.');
        }

        const response = await PortOne.requestIdentityVerification({
            storeId: identityConfig.storeId,
            identityVerificationId: `test${Date.now()}`,
            channelKey: identityConfig.channelKey
        });

        if (response?.code) {
            throw new Error(response.message || '본인인증에 실패했습니다.');
        }

        const identityVerificationId = String(response?.identityVerificationId || '').trim();
        if (!identityVerificationId) {
            throw new Error('본인인증 거래 정보를 찾지 못했습니다. 다시 시도해주세요.');
        }

        const verificationResult = await AuthAPI.getIdentityVerificationResult(identityVerificationId);
        const mergedIdentityResult = {
            ...response,
            ...verificationResult,
            verifiedCustomer: verificationResult?.verifiedCustomer || verificationResult?.customer || response?.verifiedCustomer
        };
        const signupEligibility = verificationResult?.signupEligibility;
        if (signupEligibility && signupEligibility.allowed === false) {
            const rejectionMessage = signupEligibility.message || '해당 본인인증 정보로는 회원가입이 불가합니다.';
            throw new Error(rejectionMessage);
        }

        const normalizedResponse = normalizeIdentityResponse(mergedIdentityResult);

        if (!isIdentityDataComplete(normalizedResponse)) {
            throw new Error('본인인증 정보가 올바르게 전달되지 않았습니다. 다시 시도해주세요.');
        }

        applyIdentityResponse(normalizedResponse);

        showNotification('본인인증이 완료되었습니다.', 'success');
        showIdentityStatus('본인인증 완료');
        showStep('detail');
    } catch (error) {
        const message = error.message || '본인인증 중 오류가 발생했습니다.';
        showIdentityStatus(message);
        showNotification(message, 'error');
        showBlockingAlert(message);
    }
}

function getNestedValue(source, path) {
    return path.split('.').reduce((acc, key) => {
        if (acc && typeof acc === 'object') {
            return acc[key];
        }

        return undefined;
    }, source);
}

function pickFirstExistingValue(source, candidatePaths = []) {
    for (const path of candidatePaths) {
        const value = getNestedValue(source, path);
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
    }

    return '';
}

function normalizeGenderDigitValue(rawValue) {
    const normalizedValue = String(rawValue || '').trim();
    if (!normalizedValue) {
        return '';
    }

    if (/^\d$/.test(normalizedValue)) {
        return normalizedValue;
    }

    const lowerValue = normalizedValue.toLowerCase();
    if (['m', 'male', 'man', '남', '남성'].includes(lowerValue)) {
        return '1';
    }
    if (['f', 'female', 'woman', '여', '여성'].includes(lowerValue)) {
        return '2';
    }

    return normalizedValue;
}

function normalizeIdentityResponse(rawResponse = {}) {
    return {
        identityVerificationId: String(pickFirstExistingValue(rawResponse, [
            'identityVerificationId',
            'id'
        ]) || ''),
        phone: String(pickFirstExistingValue(rawResponse, [
            'normalized.phone',
            'phone',
            'phoneNumber',
            'mobile',
            'mobilePhone',
            'verifiedCustomer.phone',
            'verifiedCustomer.phoneNumber',
            'customer.phone',
            'customer.phoneNumber'
        ]) || ''),
        genderDigit: normalizeGenderDigitValue(pickFirstExistingValue(rawResponse, [
            'normalized.genderDigit',
            'genderDigit',
            'genderCode',
            'gender',
            'verifiedCustomer.genderDigit',
            'verifiedCustomer.genderCode',
            'verifiedCustomer.gender',
            'customer.genderDigit',
            'customer.genderCode',
            'customer.gender'
        ])),
        ci: String(pickFirstExistingValue(rawResponse, [
            'normalized.ci',
            'ci',
            'identityCi',
            'verifiedCustomer.ci',
            'customer.ci'
        ]) || ''),
        di: String(pickFirstExistingValue(rawResponse, [
            'normalized.di',
            'di',
            'identityDi',
            'verifiedCustomer.di',
            'customer.di'
        ]) || ''),
        name: String(pickFirstExistingValue(rawResponse, [
            'normalized.name',
            'name',
            'fullName',
            'verifiedCustomer.name',
            'customer.name'
        ]) || ''),
        birthDate: String(pickFirstExistingValue(rawResponse, [
            'normalized.birthDate',
            'birthDate',
            'birth',
            'birthday',
            'verifiedCustomer.birthDate',
            'verifiedCustomer.birthday',
            'customer.birthDate'
        ]) || '')
    };
}

function formatBirthDate(value) {
    const digitsOnly = String(value || '').replace(/\D/g, '');
    if (digitsOnly.length !== 8) {
        return String(value || '').trim();
    }

    const year = digitsOnly.slice(0, 4);
    const month = digitsOnly.slice(4, 6);
    const day = digitsOnly.slice(6, 8);
    return `${year}년 ${month}월 ${day}일`;
}

function isIdentityDataComplete(response = {}) {
    const requiredFields = [response.name, response.birthDate, response.phone, response.genderDigit];
    return requiredFields.every(field => String(field || '').trim().length > 0);
}

function applyIdentityResponse(response = {}) {
    const phoneInput = document.getElementById('phone');
    const phoneDisplay = document.getElementById('phone-display');
    const genderDigitInput = document.getElementById('genderDigit');
    const identityCiInput = document.getElementById('identityCi');
    const identityDiInput = document.getElementById('identityDi');
    const identityVerificationIdInput = document.getElementById('identityVerificationId');
    const nameInput = document.getElementById('name') || document.getElementById('fullName');
    const nameDisplay = document.getElementById('name-display');
    const birthDateInput = document.getElementById('birthDate');
    const birthDateDisplay = document.getElementById('birthDate-display');
    const statusElement = document.getElementById('identity-status');
    const resolvedName = String(response.name || '').trim();
    const resolvedPhone = String(response.phone || '').trim();
    const formattedBirthDate = formatBirthDate(response.birthDate);

    if (phoneInput) {
        phoneInput.value = response.phone || '';
    }
    if (phoneDisplay) {
        phoneDisplay.textContent = resolvedPhone || '본인인증 후 자동 입력됩니다.';
    }
    if (genderDigitInput) {
        genderDigitInput.value = response.genderDigit || '';
    }
    if (identityCiInput) {
        identityCiInput.value = response.ci || '';
    }
    if (identityDiInput) {
        identityDiInput.value = response.di || '';
    }
    if (identityVerificationIdInput) {
        identityVerificationIdInput.value = response.identityVerificationId || '';
    }
    if (nameInput) {
        nameInput.value = response.name || '';
    }
    if (nameDisplay) {
        nameDisplay.textContent = resolvedName || '본인인증 후 자동 입력됩니다.';
    }
    if (birthDateInput) {
        birthDateInput.value = formattedBirthDate || '';
    }
    if (birthDateDisplay) {
        birthDateDisplay.textContent = formattedBirthDate || '본인인증 후 자동 입력됩니다.';
    }

    setPhoneVerified(Boolean(response.phone));
    setIdentityVerified(true);

    if (statusElement) {
        statusElement.textContent = '본인인증 완료';
    }
}

function setNicknameChecked(isChecked, isAvailable = false) {
    const nicknameCheckedInput = document.getElementById('nicknameChecked');
    const nicknameAvailableInput = document.getElementById('nicknameAvailable');
    const statusElement = document.getElementById('nickname-status');
    const nicknameError = document.getElementById('nickname-error');

    if (nicknameCheckedInput) {
        nicknameCheckedInput.value = isChecked ? 'true' : 'false';
    }
    if (nicknameAvailableInput) {
        nicknameAvailableInput.value = isAvailable ? 'true' : 'false';
    }

    if (statusElement) {
        if (!isChecked) {
            statusElement.textContent = '닉네임 중복 확인이 필요합니다.';
        } else if (isAvailable) {
            statusElement.textContent = '사용 가능한 닉네임입니다.';
        } else {
            statusElement.textContent = '이미 사용 중인 닉네임입니다.';
        }
    }

    if (nicknameError) {
        nicknameError.textContent = '';
        nicknameError.classList.add('hidden');
    }
}


function markNicknameAsUnchecked() {
    setNicknameChecked(false);
}

async function checkNicknameAvailability() {
    const nicknameInput = document.getElementById('nickname');
    const nickname = nicknameInput?.value.trim() || '';

    const nicknameLength = Array.from(nickname).length;
    if (nicknameLength < VALIDATION.NICKNAME_MIN_LENGTH || nicknameLength > VALIDATION.NICKNAME_MAX_LENGTH) {
        showNotification(`닉네임은 ${VALIDATION.NICKNAME_MIN_LENGTH}자 이상 ${VALIDATION.NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`, 'warning');
        setNicknameChecked(false);
        return;
    }

    if (!validateNoBlockedExpression(nickname, '닉네임')) {
        setNicknameChecked(false);
        return;
    }

    try {
        const result = await AuthAPI.checkNickname(nickname);
        if (result.available) {
            setNicknameChecked(true, true);
            showNotification('사용 가능한 닉네임입니다.', 'success');
        } else {
            setNicknameChecked(true, false);
            showNotification('이미 사용 중인 닉네임입니다.', 'error');
        }
    } catch (error) {
        setNicknameChecked(false);
        showNotification(error.message || '닉네임 확인 중 오류가 발생했습니다.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = document.getElementById('submit-btn');

    console.info('[Register] handleRegister 시작');

    const formData = {
        loginId: form.loginId.value.trim(),
        password: form.password.value,
        confirmPassword: form.confirmPassword.value,
        phone: form.phone.value.trim(),
        birthDate: form.birthDate.value.trim(),
        identityVerificationId: form.identityVerificationId.value.trim(),
        identityCi: form.identityCi.value.trim(),
        identityDi: form.identityDi.value.trim(),
        phoneVerified: form.phoneVerified.value,
        identityVerified: form.identityVerified.value,
        genderDigit: normalizeGenderDigitValue(form.genderDigit.value),
        nickname: form.nickname.value.trim(),
        nicknameChecked: form.nicknameChecked.value,
        nicknameAvailable: form.nicknameAvailable.value,
        privacyConsent: form.privacyConsent?.checked || false,
        marketingConsent: form.marketingConsent?.checked || false,
        smsConsent: form.smsConsent?.checked || false,
        termsConsent: form.termsConsent.checked
    };

    const errors = validateRegisterForm(formData);
    console.debug('[Register] 유효성 검사 결과', {
        hasErrors: hasValidationErrors(errors),
        errorKeys: Object.keys(errors || {})
    });

    if (hasValidationErrors(errors)) {
        console.warn('[Register] 유효성 검사 실패', errors);
        showValidationErrors(errors, form);
        const firstErrorMessage = Object.values(errors)[0];
        if (firstErrorMessage) {
            showNotification(firstErrorMessage, 'error');
            showBlockingAlert(firstErrorMessage);
        }
        return;
    }

    if (!validateNoBlockedExpression(formData.nickname, '닉네임')) {
        setNicknameChecked(false);
        return;
    }

    try {
        setLoading(submitBtn, true);
        console.info('[Register] 회원가입 API 요청 시작', {
            loginId: formData.loginId,
            nickname: formData.nickname,
            phone: formData.phone,
            birthDate: formData.birthDate,
            identityVerificationId: formData.identityVerificationId,
            hasIdentityCi: Boolean(formData.identityCi),
            hasIdentityDi: Boolean(formData.identityDi),
            genderDigit: formData.genderDigit,
            termsConsent: formData.termsConsent,
            privacyConsent: formData.privacyConsent,
            marketingConsent: formData.marketingConsent,
            smsConsent: formData.smsConsent
        });

        await AuthAPI.register({
            loginId: formData.loginId,
            password: formData.password,
            name: form.name?.value?.trim() || '',
            phone: formData.phone,
            birthDate: formData.birthDate,
            identityVerificationId: formData.identityVerificationId,
            identityCi: formData.identityCi,
            identityDi: formData.identityDi,
            genderDigit: formData.genderDigit,
            nickname: formData.nickname,
            accountType: 'MEMBER',
            termsConsent: formData.termsConsent,
            privacyConsent: formData.privacyConsent,
            marketingConsent: formData.marketingConsent,
            smsConsent: formData.smsConsent
        });
        console.info('[Register] 회원가입 API 요청 성공');

        showNotification('회원가입이 완료되었습니다!', 'success');

        setTimeout(() => {
            console.info('[Register] 로그인 페이지로 이동');
            window.location.href = '/login?returnTo=%2F&registered=1';
        }, 1500);

    } catch (error) {
        console.error('[Register] 회원가입 API 요청 실패', {
            message: error?.message,
            status: error?.status,
            data: error?.data
        });
        const message = error.message || '회원가입 중 오류가 발생했습니다.';
        showNotification(message, 'error');
        showBlockingAlert(message);

    } finally {
        console.info('[Register] handleRegister 종료');
        setLoading(submitBtn, false);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRegisterPage);
} else {
    initRegisterPage();
}

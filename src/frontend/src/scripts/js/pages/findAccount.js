/**
 * 파일 역할: find-account 페이지의 본인인증 기반 계정 찾기/비밀번호 재설정 흐름을 처리하는 페이지 스크립트 파일.
 */

const FIND_ACCOUNT_PORTONE_SDK_URL = 'https://cdn.portone.io/v2/browser-sdk.js';
let findAccountIdentityConfig = null;
let verifiedIdentityVerificationId = '';

function setFindAccountStatus(message, tone = 'muted') {
    const statusElement = document.getElementById('find-account-status');
    if (!statusElement) return;

    statusElement.textContent = String(message || '').trim();
    statusElement.style.color = tone === 'error' ? '#dc3545' : tone === 'success' ? '#198754' : '#6c757d';
}

function showFindAccountMessage(message, tone = 'muted') {
    setFindAccountStatus(message, tone);
    if (typeof showNotification === 'function' && message) {
        showNotification(message, tone === 'error' ? 'error' : tone === 'success' ? 'success' : 'info');
    }
}

async function loadFindAccountPortOneSdk() {
    if (window.PortOne && typeof window.PortOne.requestIdentityVerification === 'function') {
        return window.PortOne;
    }

    await new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${FIND_ACCOUNT_PORTONE_SDK_URL}"]`);
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('PortOne SDK 로드에 실패했습니다.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = FIND_ACCOUNT_PORTONE_SDK_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('PortOne SDK 로드에 실패했습니다.'));
        document.head.appendChild(script);
    });

    return window.PortOne;
}

async function getFindAccountIdentityConfig() {
    if (findAccountIdentityConfig?.storeId && findAccountIdentityConfig?.channelKey) {
        return findAccountIdentityConfig;
    }

    const config = await AuthAPI.getIdentityVerificationConfig();
    const storeId = String(config?.storeId || '').trim();
    const channelKey = String(config?.channelKey || '').trim();
    if (!storeId || !channelKey) {
        throw new Error('본인인증 설정 정보를 불러오지 못했습니다.');
    }

    findAccountIdentityConfig = { storeId, channelKey };
    return findAccountIdentityConfig;
}

function showFoundAccountSection(loginId) {
    const foundSection = document.getElementById('found-account-section');
    const foundLoginIdDisplay = document.getElementById('found-login-id');
    const resetForm = document.getElementById('reset-password-form');

    if (foundSection) foundSection.classList.remove('hidden');
    if (resetForm) resetForm.classList.remove('hidden');
    if (foundLoginIdDisplay) foundLoginIdDisplay.textContent = String(loginId || '').trim();
}

function hideFoundAccountSection() {
    const foundSection = document.getElementById('found-account-section');
    const resetForm = document.getElementById('reset-password-form');
    const foundLoginIdDisplay = document.getElementById('found-login-id');

    if (foundSection) foundSection.classList.add('hidden');
    if (resetForm) resetForm.classList.add('hidden');
    if (foundLoginIdDisplay) foundLoginIdDisplay.textContent = '본인인증 후 자동 입력됩니다.';
}

async function handleFindAccount() {
    const findButton = document.getElementById('find-account-btn');
    try {
        if (findButton) findButton.disabled = true;
        verifiedIdentityVerificationId = '';
        hideFoundAccountSection();
        setFindAccountStatus('본인인증을 진행합니다.');

        const PortOne = await loadFindAccountPortOneSdk();
        const identityConfig = await getFindAccountIdentityConfig();

        if (!PortOne || typeof PortOne.requestIdentityVerification !== 'function') {
            throw new Error('본인인증 모듈을 찾을 수 없습니다.');
        }

        const response = await PortOne.requestIdentityVerification({
            storeId: identityConfig.storeId,
            identityVerificationId: `find-account-${Date.now()}`,
            channelKey: identityConfig.channelKey
        });

        if (response?.code) {
            throw new Error(response.message || '본인인증에 실패했습니다.');
        }

        const identityVerificationId = String(response?.identityVerificationId || '').trim();
        if (!identityVerificationId) {
            throw new Error('본인인증 거래 정보를 확인하지 못했습니다. 다시 시도해주세요.');
        }

        const result = await AuthAPI.findAccountByIdentity(identityVerificationId);
        if (!result?.found) {
            showFindAccountMessage(result?.message || '가입된 아이디가 없습니다.', 'error');
            return;
        }

        verifiedIdentityVerificationId = identityVerificationId;
        showFoundAccountSection(result.loginId);
        showFindAccountMessage(`가입된 아이디: ${result.loginId}`, 'success');
    } catch (error) {
        showFindAccountMessage(error.message || '계정 찾기 중 오류가 발생했습니다.', 'error');
    } finally {
        if (findButton) findButton.disabled = false;
    }
}

async function handleResetPassword(event) {
    event.preventDefault();

    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-new-password');
    const submitButton = event?.target?.querySelector('button[type="submit"]');
    const newPassword = String(newPasswordInput?.value || '');
    const confirmNewPassword = String(confirmPasswordInput?.value || '');

    if (!verifiedIdentityVerificationId) {
        showFindAccountMessage('먼저 계정찾기 본인인증을 완료해주세요.', 'error');
        return;
    }

    if (!newPassword || !confirmNewPassword) {
        showFindAccountMessage('새 비밀번호와 비밀번호 확인을 모두 입력해주세요.', 'error');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showFindAccountMessage('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.', 'error');
        return;
    }

    try {
        if (submitButton) submitButton.disabled = true;
        const response = await AuthAPI.resetPasswordByIdentity(verifiedIdentityVerificationId, newPassword);
        showFindAccountMessage(response?.message || '비밀번호가 변경되었습니다. 로그인 화면으로 이동합니다.', 'success');
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
        verifiedIdentityVerificationId = '';
        setTimeout(() => {
            window.location.href = '/login';
        }, 800);
    } catch (error) {
        showFindAccountMessage(error.message || '비밀번호 변경에 실패했습니다.', 'error');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

function initFindAccountPage() {
    if (Auth.redirectIfAuthenticated()) {
        return;
    }

    const findButton = document.getElementById('find-account-btn');
    const resetForm = document.getElementById('reset-password-form');

    findButton?.addEventListener('click', handleFindAccount);
    resetForm?.addEventListener('submit', handleResetPassword);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFindAccountPage);
} else {
    initFindAccountPage();
}

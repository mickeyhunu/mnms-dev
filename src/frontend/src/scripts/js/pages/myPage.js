/**
 * 파일 역할: myPage 페이지의 이벤트/데이터 흐름을 초기화하는 페이지 스크립트 파일.
 */
let currentUser = null;
let nicknameCheckState = { checked: false, available: false, value: '' };
const PHONE_PATTERN = /^01\d-\d{3,4}-\d{4}$/;
const MYPAGE_PORTONE_SDK_URL = 'https://cdn.portone.io/v2/browser-sdk.js';
let myPageIdentityConfig = null;

function formatPhoneNumber(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

function formatBirthDate(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.slice(0, 10);
}

function setHelpMessage(element, message, color) {
    if (!element) return;
    element.textContent = message;
    if (color) element.style.color = color;
}

async function loadMyPagePortOneSdk() {
    if (window.PortOne && typeof window.PortOne.requestIdentityVerification === 'function') {
        return window.PortOne;
    }

    await new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${MYPAGE_PORTONE_SDK_URL}"]`);
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('PortOne SDK 로드에 실패했습니다.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = MYPAGE_PORTONE_SDK_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('PortOne SDK 로드에 실패했습니다.'));
        document.head.appendChild(script);
    });

    return window.PortOne;
}

async function getMyPageIdentityConfig() {
    if (myPageIdentityConfig?.storeId && myPageIdentityConfig?.channelKey) {
        return myPageIdentityConfig;
    }

    const config = await APIClient.get('/auth/identity-verification-config');
    const storeId = String(config?.storeId || '').trim();
    const channelKey = String(config?.channelKey || '').trim();

    if (!storeId || !channelKey) {
        throw new Error('본인인증 설정 정보를 불러오지 못했습니다.');
    }

    myPageIdentityConfig = { storeId, channelKey };
    return myPageIdentityConfig;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyPage);
} else {
    initMyPage();
}

async function initMyPage() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    bindLogoutActions();

    try {
        currentUser = await APIClient.get('/auth/me');
        Auth.setUser(currentUser);
        renderHeaderUser(currentUser);
        renderAdCenterSection(currentUser);
        renderProfileForm(currentUser);
        await renderBusinessProfileStatuses();

        if (window.location.pathname === '/my-page/profile') {
            bindProfileForm();
        } else if (window.location.pathname === '/my-page/points') {
            await loadPointHistories();
        } else if (window.location.pathname === '/my-page/activity') {
            await loadActivityHistory();
        } else {
            await loadStats();
        }
    } catch (error) {
        console.error(error);
        alert('로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.');
        Auth.logout();
    }
}

function bindLogoutActions() {
    Auth.bindLogoutButton();
}

function renderHeaderUser(user) {
    const nickname = (typeof Auth.resolveNicknameDisplayElement === 'function')
        ? Auth.resolveNicknameDisplayElement()
        : document.getElementById('user-nickname');
    if (nickname) Auth.applyNicknameDisplay(nickname, user);

    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        if (user.isAdmin) adminLink.classList.remove('hidden');
        else adminLink.classList.add('hidden');
    }
}

function isAdAccount(user) {
    if (!user) return false;

    if (typeof user.isAdAccount === 'boolean') return user.isAdAccount;
    if (typeof user.isAdvertiser === 'boolean') return user.isAdvertiser;

    const role = String(user.role || '').toUpperCase();
    const accountType = String(user.accountType || user.userType || '').toUpperCase();

    return role === 'BUSINESS' || accountType === 'BUSINESS';
}

function resolveRankLabel(user, fallbackLabel = '') {
    return isAdAccount(user) ? '기업회원 등급' : String(fallbackLabel || '');
}

function resolveRankMarkup(user, fallbackLabel = '') {
    if (!isAdAccount(user)) return sanitizeHTML(String(fallbackLabel || ''));

    const badgeImage = Auth.resolveBusinessBadgeImage(user);
    const badgeLabel = Auth.resolveBusinessBadgeLabel(user) || '기업회원 등급';
    if (!badgeImage) return sanitizeHTML(badgeLabel);

    return `
        <div style="gap:10px">
            <img class="mypage-rank-badge" src="${badgeImage}" alt="기업회원 광고 등급 배지">
            <strong> ${sanitizeHTML(badgeLabel)}</strong>
        </div>
    `;
}

function renderAdCenterSection(user) {
    const adCenterWrapper = document.getElementById('ad-center-wrapper');
    const adCenterSection = document.getElementById('ad-center-section');
    if (!adCenterWrapper || !adCenterSection) return;

    const shouldShow = isAdAccount(user);
    adCenterWrapper.classList.toggle('hidden', !shouldShow);
    adCenterSection.classList.toggle('hidden', !shouldShow);
}

function normalizeRegistrationStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'registered') return 'registered';
    if (value === 'draft') return 'draft';
    return 'unregistered';
}

function hasCompleteAdProfile(profile) {
    if (!profile || typeof profile !== 'object') return false;
    const requiredValues = [
        profile.businessName || profile.storeName,
        profile.managerName,
        profile.managerContact,
        profile.title,
        profile.region,
        profile.district,
        profile.category,
        profile.openHour,
        profile.closeHour,
        profile.description
    ];
    return requiredValues.every((value) => String(value || '').trim());
}

function applyStatusBadge(elementId, status) {
    const badge = document.getElementById(elementId);
    if (!badge) return;

    badge.classList.remove('mypage-status-badge--registered', 'mypage-status-badge--draft', 'mypage-status-badge--unregistered');

    const statusMap = {
        registered: { label: '등록', className: 'mypage-status-badge--registered' },
        draft: { label: '임시저장', className: 'mypage-status-badge--draft' },
        unregistered: { label: '미등록', className: 'mypage-status-badge--unregistered' }
    };

    const target = statusMap[status] || statusMap.unregistered;
    badge.textContent = target.label;
    badge.classList.add(target.className);
}

async function renderBusinessProfileStatuses() {
    let adStatus = 'unregistered';
    let businessStatus = 'unregistered';

    try {
        const response = await APIClient.get('/users/me/business-ads');
        const existingAd = Array.isArray(response?.content) ? response.content[0] : null;
        adStatus = normalizeRegistrationStatus(existingAd?.registrationStatus);
        if (adStatus === 'unregistered' && hasCompleteAdProfile(existingAd)) adStatus = 'registered';
    } catch (error) {
        adStatus = 'unregistered';
    }

    try {
        const profile = await APIClient.get('/users/me/business-profile');
        businessStatus = normalizeRegistrationStatus(profile?.registrationStatus);
    } catch (error) {
        businessStatus = 'unregistered';
    }

    applyStatusBadge('mypage-ad-profile-status', adStatus);
    applyStatusBadge('mypage-business-info-status', businessStatus);
}

function renderProfileForm(user) {
    const loginIdField = document.getElementById('profile-login-id');
    const nicknameInput = document.getElementById('profile-nickname');
    const phoneField = document.getElementById('profile-phone');
    const nameField = document.getElementById('profile-name');
    const birthField = document.getElementById('profile-birth');
    const smsConsent = document.getElementById('sms-consent');

    if (loginIdField) loginIdField.value = user.email || '';
    if (nicknameInput) nicknameInput.value = user.nickname || '';

    if (phoneField) {
        if (phoneField.tagName === 'INPUT') phoneField.value = formatPhoneNumber(user.phone || '');
        else phoneField.textContent = user.phone || '없음';
    }

    if (nameField) nameField.value = user.name || user.nickname || '';
    if (birthField) birthField.value = formatBirthDate(user.birthDate || user.birth || '');
    if (smsConsent) smsConsent.checked = Boolean(user.smsConsent);

    nicknameCheckState = { checked: true, available: true, value: user.nickname || '' };
}

function bindProfileForm() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    const nicknameInput = form.querySelector('#profile-nickname');
    const nicknameCheckButton = form.querySelector('#nickname-check-btn');
    const nicknameCheckResult = form.querySelector('#nickname-check-result');
    const passwordInput = form.querySelector('#profile-password');
    const passwordConfirmInput = form.querySelector('#profile-password-confirm');
    const passwordMatchResult = form.querySelector('#profile-password-match-result');
    const phoneInput = form.querySelector('#profile-phone');
    const phoneVerifyButton = form.querySelector('#phone-verify-btn');
    const phoneVerifyResult = form.querySelector('#phone-verify-result');

    if (phoneInput) phoneInput.readOnly = true;

    const updatePasswordMatchMessage = () => {
        if (!passwordMatchResult || !passwordConfirmInput) return;

        const password = passwordInput?.value.trim() || '';
        const passwordConfirm = passwordConfirmInput.value.trim();

        if (!passwordConfirm) {
            passwordMatchResult.textContent = '';
            return;
        }

        if (password !== passwordConfirm) {
            passwordMatchResult.textContent = '비밀번호와 비밀번호 확인이 다릅니다.';
            passwordMatchResult.style.color = '#dc3545';
            return;
        }

        passwordMatchResult.textContent = '비밀번호와 비밀번호 확인이 일치합니다.';
        passwordMatchResult.style.color = '#198754';
    };

    if (passwordInput && passwordConfirmInput) {
        passwordInput.addEventListener('input', updatePasswordMatchMessage);
        passwordConfirmInput.addEventListener('input', updatePasswordMatchMessage);
    }

    if (nicknameInput && nicknameCheckButton) {
        nicknameInput.addEventListener('input', () => {
            const isChanged = nicknameInput.value.trim() !== (currentUser?.nickname || '');
            nicknameCheckButton.classList.toggle('hidden', !isChanged);
            nicknameCheckState = { checked: !isChanged, available: !isChanged, value: currentUser?.nickname || '' };
            if (nicknameCheckResult) nicknameCheckResult.textContent = '';
        });

        nicknameCheckButton.addEventListener('click', async () => {
            const nickname = nicknameInput.value.trim();
            const nicknameLength = Array.from(nickname).length;
            if (nicknameLength < VALIDATION.NICKNAME_MIN_LENGTH || nicknameLength > VALIDATION.NICKNAME_MAX_LENGTH) {
                nicknameCheckState = { checked: true, available: false, value: nickname };
                if (nicknameCheckResult) {
                    nicknameCheckResult.textContent = `닉네임은 ${VALIDATION.NICKNAME_MIN_LENGTH}자 이상 ${VALIDATION.NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`;
                    nicknameCheckResult.style.color = '#dc3545';
                }
                return;
            }
            if (!validateNoBlockedExpression(nickname, '닉네임')) {
                nicknameCheckState = { checked: true, available: false, value: nickname };
                if (nicknameCheckResult) {
                    nicknameCheckResult.textContent = '닉네임에 사용할 수 없는 표현이 포함되어 있습니다.';
                    nicknameCheckResult.style.color = '#dc3545';
                }
                return;
            }

            try {
                const duplicateCheck = await APIClient.get('/auth/check-nickname', { nickname });
                nicknameCheckState = { checked: true, available: Boolean(duplicateCheck.available), value: nickname };

                if (nicknameCheckResult) {
                    nicknameCheckResult.textContent = duplicateCheck.available
                        ? '사용 가능한 닉네임입니다.'
                        : '이미 사용 중인 닉네임입니다.';
                    nicknameCheckResult.style.color = duplicateCheck.available ? '#198754' : '#dc3545';
                }
            } catch (error) {
                nicknameCheckState = { checked: true, available: false, value: nickname };
                if (nicknameCheckResult) {
                    nicknameCheckResult.textContent = error?.message || '중복 확인에 실패했습니다.';
                    nicknameCheckResult.style.color = '#dc3545';
                }
            }
        });
    }

    if (phoneVerifyButton && phoneInput) {
        phoneVerifyButton.addEventListener('click', async () => {
            const currentName = String(currentUser?.name || '').trim();
            try {
                phoneVerifyButton.disabled = true;
                setHelpMessage(phoneVerifyResult, '본인인증을 진행합니다...', '#6c757d');

                const PortOne = await loadMyPagePortOneSdk();
                const identityConfig = await getMyPageIdentityConfig();
                if (!PortOne || typeof PortOne.requestIdentityVerification !== 'function') {
                    throw new Error('본인인증 모듈을 찾을 수 없습니다.');
                }

                const response = await PortOne.requestIdentityVerification({
                    storeId: identityConfig.storeId,
                    identityVerificationId: `my-page-phone-${Date.now()}`,
                    channelKey: identityConfig.channelKey
                });

                if (response?.code) {
                    throw new Error(response.message || '본인인증에 실패했습니다.');
                }

                const identityVerificationId = String(response?.identityVerificationId || '').trim();
                if (!identityVerificationId) {
                    throw new Error('본인인증 거래 정보를 확인하지 못했습니다. 다시 시도해주세요.');
                }

                const verificationResult = await APIClient.get(`/auth/identity-verification/${encodeURIComponent(identityVerificationId)}`);
                const verifiedName = String(verificationResult?.normalized?.name || verificationResult?.verifiedCustomer?.name || '').trim();
                const verifiedPhone = formatPhoneNumber(
                    verificationResult?.normalized?.phone
                        || verificationResult?.verifiedCustomer?.phoneNumber
                        || verificationResult?.verifiedCustomer?.phone
                        || ''
                );

                if (!verifiedName || !verifiedPhone) {
                    throw new Error('본인인증 정보에서 이름 또는 연락처를 확인하지 못했습니다.');
                }

                if (!currentName || verifiedName !== currentName) {
                    throw new Error('동일 명의 본인인증만 연락처 변경이 가능합니다.');
                }

                phoneInput.value = verifiedPhone;
                setHelpMessage(phoneVerifyResult, '본인인증 완료: 인증된 연락처가 자동 입력되었습니다.', '#198754');
            } catch (error) {
                setHelpMessage(phoneVerifyResult, error?.message || '연락처 본인인증 중 오류가 발생했습니다.', '#dc3545');
            } finally {
                phoneVerifyButton.disabled = false;
            }
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const result = document.getElementById('profile-save-result');
        const submitButton = form.querySelector('button[type="submit"]');

        const nickname = form.nickname.value.trim();
        const password = form.password.value.trim();
        const passwordConfirm = form.passwordConfirm.value.trim();
        const phone = formatPhoneNumber(form.phone.value.trim());

        if (form.phone) form.phone.value = phone;

        if (password && !VALIDATION.PASSWORD_REGEX.test(password)) {
            setHelpMessage(result, `비밀번호는 ${VALIDATION.MIN_PASSWORD_LENGTH}자 이상 영문/숫자를 포함해야 하며 특수문자를 사용할 수 있습니다.`, '#dc3545');
            return;
        }

        if (password && password !== passwordConfirm) {
            setHelpMessage(passwordMatchResult, '비밀번호와 비밀번호 확인이 일치하지 않습니다.', '#dc3545');
            return;
        }

        const isNicknameChanged = nickname !== (currentUser?.nickname || '');
        if (isNicknameChanged) {
            const nicknameLength = Array.from(nickname).length;
            if (nicknameLength < VALIDATION.NICKNAME_MIN_LENGTH || nicknameLength > VALIDATION.NICKNAME_MAX_LENGTH) {
                setHelpMessage(result, `닉네임은 ${VALIDATION.NICKNAME_MIN_LENGTH}자 이상 ${VALIDATION.NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`, '#dc3545');
                return;
            }
            if (!validateNoBlockedExpression(nickname, '닉네임')) {
                setHelpMessage(result, '닉네임에 사용할 수 없는 표현이 포함되어 있습니다.', '#dc3545');
                return;
            }
            const checkedSameValue = nicknameCheckState.checked && nicknameCheckState.value === nickname;
            if (!checkedSameValue) {
                if (result) {
                    result.textContent = '닉네임 중복 확인을 진행해 주세요.';
                    result.style.color = '#dc3545';
                }
                return;
            }
            if (!nicknameCheckState.available) {
                if (result) {
                    result.textContent = '이미 사용 중인 닉네임입니다.';
                    result.style.color = '#dc3545';
                }
                return;
            }
        }

        if (phone && !PHONE_PATTERN.test(phone)) {
            setHelpMessage(result, '연락처 형식은 010-0000-0000으로 입력해 주세요.', '#dc3545');
            return;
        }

        const payload = {
            nickname,
            phone,
            smsConsent: form.smsConsent.checked
        };

        if (password) {
            payload.password = password;
        }

        try {
            submitButton.disabled = true;
            setHelpMessage(result, '저장 중입니다...', '#6c757d');

            const response = await APIClient.put('/users/me', payload);
            if (response?.user) {
                currentUser = { ...currentUser, ...response.user };
                Auth.setUser(currentUser);
                renderHeaderUser(currentUser);
                renderProfileForm(currentUser);
                if (nicknameCheckButton) nicknameCheckButton.classList.add('hidden');
                if (nicknameCheckResult) nicknameCheckResult.textContent = '';
            }

            if (password) {
                alert('비밀번호가 변경되었습니다. 보안을 위해 다시 로그인해 주세요.');
                Auth.logout();
                return;
            }

            alert('회원정보가 수정되었습니다.');
            window.location.href = '/';
        } catch (error) {
            setHelpMessage(result, error?.message || '저장에 실패했습니다. 입력값을 확인해 주세요.', '#dc3545');
        } finally {
            submitButton.disabled = false;
            form.password.value = '';
            form.passwordConfirm.value = '';
            if (passwordMatchResult) passwordMatchResult.textContent = '';
        }
    });
}



function getBoardLabel(boardType) {
    const boardMap = {
        FREE: '자유',
        ANON: '익명',
        REVIEW: '후기',
        STORY: '썰',
        QUESTION: '질문',
        PROMOTION: '홍보'
    };

    return boardMap[String(boardType || '').toUpperCase()] || '자유';
}

function formatActivityTitle(title, boardType) {
    const boardLabel = sanitizeHTML(getBoardLabel(boardType));
    const safeTitle = sanitizeHTML(title || '제목 없음');
    return `[${boardLabel}] ${safeTitle}`;
}

async function loadActivityHistory() {
    const container = document.getElementById('my-stats');
    if (!container || !currentUser) return;

    try {
        const response = await APIClient.get('/users/me/activity');
        const myPosts = response.posts || [];
        const myComments = response.comments || [];
        const likedPosts = response.likedPosts || [];
        const commentedPosts = Array.from(
            myComments.reduce((map, comment) => {
                if (!comment.postId || map.has(comment.postId)) return map;

                map.set(comment.postId, {
                    postId: comment.postId,
                    postTitle: comment.postTitle || '원문 보기',
                    postBoardType: comment.postBoardType,
                    commentedAt: comment.createdAt
                });

                return map;
            }, new Map()).values()
        );

        container.innerHTML = `
            <section class="mypage-summary-section mypage-activity-tab-wrap">
                <div class="mypage-activity-tab-header" role="tablist" aria-label="활동 내역 탭">
                    <button type="button" class="mypage-activity-tab is-active" role="tab" aria-selected="true" data-activity-tab="posts">작성글</button>
                    <button type="button" class="mypage-activity-tab" role="tab" aria-selected="false" data-activity-tab="comments">작성댓글</button>
                    <button type="button" class="mypage-activity-tab" role="tab" aria-selected="false" data-activity-tab="commented-posts">댓글단 글</button>
                    <button type="button" class="mypage-activity-tab" role="tab" aria-selected="false" data-activity-tab="liked-posts">좋아요한 글</button>
                </div>

                <div class="mypage-activity-tab-panel is-active" role="tabpanel" data-activity-panel="posts">
                    ${myPosts.length ? `
                    <div class="mypage-point-history-list">
                        ${myPosts.map((post) => `
                            <a class="mypage-point-history-row" href="/post-detail?id=${post.id}">
                                <div>
                                    <strong>${formatActivityTitle(post.title, post.boardType)}</strong>
                                    <p>${sanitizeHTML(formatDate(post.createdAt))} · 좋아요 ${Number(post.likeCount || 0)} · 댓글 ${Number(post.commentCount || 0)}</p>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                    ` : '<div class="no-data">작성한 게시글이 없습니다.</div>'}
                </div>

                <div class="mypage-activity-tab-panel" role="tabpanel" data-activity-panel="comments" hidden>
                    ${myComments.length ? `
                    <div class="mypage-point-history-list">
                        ${myComments.map((comment) => `
                            <a class="mypage-point-history-row" href="/post-detail?id=${comment.postId}">
                                <div>
                                    <strong>${formatActivityTitle(comment.postTitle || '원문 보기', comment.postBoardType)}</strong>
                                    <p>${sanitizeHTML(formatDate(comment.createdAt))}</p>
                                    <p>${sanitizeHTML(comment.content || '')}</p>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                    ` : '<div class="no-data">작성한 댓글이 없습니다.</div>'}
                </div>

                <div class="mypage-activity-tab-panel" role="tabpanel" data-activity-panel="commented-posts" hidden>
                    ${commentedPosts.length ? `
                    <div class="mypage-point-history-list">
                        ${commentedPosts.map((post) => `
                            <a class="mypage-point-history-row" href="/post-detail?id=${post.postId}">
                                <div>
                                    <strong>${formatActivityTitle(post.postTitle, post.postBoardType)}</strong>
                                    <p>최근 댓글 ${sanitizeHTML(formatDate(post.commentedAt))}</p>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                    ` : '<div class="no-data">댓글을 작성한 게시글이 없습니다.</div>'}
                </div>

                <div class="mypage-activity-tab-panel" role="tabpanel" data-activity-panel="liked-posts" hidden>
                    ${likedPosts.length ? `
                    <div class="mypage-point-history-list">
                        ${likedPosts.map((post) => `
                            <a class="mypage-point-history-row" href="/post-detail?id=${post.id}">
                                <div>
                                    <strong>${formatActivityTitle(post.title, post.boardType)}</strong>
                                    <p>추천일 ${sanitizeHTML(formatDate(post.likedAt || post.createdAt))} · 좋아요 ${Number(post.likeCount || 0)} · 댓글 ${Number(post.commentCount || 0)}</p>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                    ` : '<div class="no-data">좋아요한 게시글이 없습니다.</div>'}
                </div>
            </section>
        `;

        bindActivityTabs(container);
    } catch (error) {
        container.innerHTML = '<div class="error-message">활동 내역을 불러오지 못했습니다.</div>';
    }
}

function bindActivityTabs(container) {
    const tabs = container.querySelectorAll('[data-activity-tab]');
    const panels = container.querySelectorAll('[data-activity-panel]');
    if (!tabs.length || !panels.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.activityTab;

            tabs.forEach((item) => {
                const isActive = item === tab;
                item.classList.toggle('is-active', isActive);
                item.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            panels.forEach((panel) => {
                const isActive = panel.dataset.activityPanel === target;
                panel.classList.toggle('is-active', isActive);
                panel.hidden = !isActive;
            });
        });
    });
}



function formatPointActionLabel(actionType) {
    const labels = {
        REGISTER: '회원가입',
        LOGIN_DAILY: '출석 체크',
        CREATE_POST: '게시글 작성',
        CREATE_REVIEW_BONUS: '후기 게시글 보너스 (+20P)',
        CREATE_COMMENT: '댓글 작성',
        LIKE_POST: '좋아요 누름',
        RECEIVE_POST_LIKE: '내 게시글 좋아요 받음',
        REVOKE_CREATE_POST: '게시글 삭제로 포인트 차감',
        REVOKE_CREATE_REVIEW_BONUS: '후기 보너스 포인트 차감',
        REVOKE_CREATE_COMMENT: '댓글 삭제로 포인트 차감',
        REVOKE_LIKE_POST: '좋아요 취소로 포인트 차감',
        REVOKE_RECEIVE_POST_LIKE: '받은 좋아요 취소로 포인트 차감'
    };

    return labels[actionType] || actionType;
}

function renderPointRuleGuide(pointRuleGuide = []) {
    if (!pointRuleGuide.length) {
        return '<div class="no-data">포인트 지급 기준 정보가 없습니다.</div>';
    }

    return `
        <div class="mypage-guide-list">
            ${pointRuleGuide.map((rule) => `
                <div class="mypage-guide-row">
                    <span>${sanitizeHTML(rule.actionLabel || formatPointActionLabel(rule.actionType || ''))}</span>
                    <strong>${Number(rule.points || 0).toLocaleString()}P</strong>
                    <em>${sanitizeHTML(rule.dailyLimitLabel || '제한 없음')}</em>
                </div>
            `).join('')}
        </div>
    `;
}

function renderLevelGuide(levelGuide = []) {
    if (!levelGuide.length) {
        return '<div class="no-data">등급 정보가 없습니다.</div>';
    }

    return `
        <div class="mypage-guide-list">
            ${levelGuide.map((level) => {
                const maxLabel = level.maxPoints == null ? '이상' : `${Number(level.maxPoints).toLocaleString()}P`;
                return `
                    <div class="mypage-guide-row">
                        <span>${sanitizeHTML(level.label || '')}</span>
                        <strong>${Number(level.minPoints || 0).toLocaleString()}P ~ ${maxLabel}</strong>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

async function loadPointHistories(page = 1) {
    const container = document.getElementById('my-stats');
    if (!container || !currentUser) return;

    const currentPage = Math.max(1, Number(page) || 1);

    try {
        const response = await APIClient.get('/users/me/points', { page: currentPage, limit: 20 });
        const histories = response.pointHistories || [];
        const pagination = response.pagination || {};
        const pageNumber = Math.max(1, Number(pagination.page) || currentPage);
        const totalPages = Math.max(1, Number(pagination.totalPages) || 1);

        container.innerHTML = `
            <div class="mypage-point-layout">
                <div class="mypage-point-primary-column">
                    <section class="mypage-summary-section">
                        <div class="mypage-summary-head">
                            <h3 class="mypage-summary-title">보유 포인트</h3>
                        </div>
                        <div class="mypage-summary-row"><span>현재 등급</span><strong>${sanitizeHTML(response.levelLabel || '-')}</strong></div>
                        <div class="mypage-summary-row"><span>누적 포인트</span><strong class="point-value">${Number(response.totalPoints || 0).toLocaleString()} P</strong></div>
                    </section>

                    <section class="mypage-summary-section">
                        <div class="mypage-summary-head">
                            <h3 class="mypage-summary-title">포인트 적립/차감 내역</h3>
                        </div>
                        ${histories.length ? `
                            <div class="mypage-point-history-list">
                                ${histories.map((item) => {
                                    const pointValue = Number(item.points || 0);
                                    const pointClass = pointValue >= 0 ? 'plus' : 'minus';
                                    const pointText = `${pointValue >= 0 ? '+' : ''}${pointValue.toLocaleString()}P`;
                                    return `
                                        <div class="mypage-point-history-row">
                                            <div>
                                                <strong>${sanitizeHTML(item.actionLabel || formatPointActionLabel(item.actionType || ''))}</strong>
                                                <p>${sanitizeHTML(formatDate(item.createdAt))}</p>
                                            </div>
                                            <span class="point-change ${pointClass}">${pointText}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            <div class="mypage-point-pagination" aria-label="포인트 내역 페이지">
                                <button type="button" class="mypage-point-page-btn" data-page="${Math.max(1, pageNumber - 1)}" ${pageNumber <= 1 ? 'disabled' : ''}>이전</button>
                                <span class="mypage-point-page-indicator">${pageNumber} / ${totalPages}</span>
                                <button type="button" class="mypage-point-page-btn" data-page="${Math.min(totalPages, pageNumber + 1)}" ${pageNumber >= totalPages ? 'disabled' : ''}>다음</button>
                            </div>
                        ` : '<div class="no-data">포인트 내역이 없습니다.</div>'}
                    </section>
                </div>

                <div class="mypage-point-reference-grid">
                    <section class="mypage-summary-section mypage-summary-section--compact">
                        <div class="mypage-summary-head">
                            <h3 class="mypage-summary-title">포인트 지급 기준</h3>
                        </div>
                        ${renderPointRuleGuide(response.pointRuleGuide || [])}
                    </section>

                    <section class="mypage-summary-section mypage-summary-section--compact">
                        <div class="mypage-summary-head">
                            <h3 class="mypage-summary-title">회원 등급 기준</h3>
                        </div>
                        ${renderLevelGuide(response.levelGuide || [])}
                    </section>
                </div>
            </div>
        `;

        const pageButtons = container.querySelectorAll('.mypage-point-page-btn[data-page]');
        pageButtons.forEach((button) => {
            if (button.disabled) return;
            button.addEventListener('click', async () => {
                const nextPage = Number(button.dataset.page || pageNumber);
                await loadPointHistories(nextPage);
            });
        });
    } catch (error) {
        container.innerHTML = '<div class="error-message">포인트 내역을 불러오지 못했습니다.</div>';
    }
}

async function loadStats() {
    const container = document.getElementById('my-stats');
    if (!container || !currentUser) return;

    try {
        const response = await APIClient.get('/users/me/stats');
        const joinedAt = response.joinedAt
            ? formatDate(response.joinedAt).split(' ')[0].replace(/\.$/, '')
            : '-';
        const rankLabel = resolveRankLabel(currentUser, response.levelLabel || '');
        const rankMarkup = resolveRankMarkup(currentUser, rankLabel);
        const pointsSection = isAdAccount(currentUser) ? '' : `
            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">포인트</h3>
                    <a class="mypage-summary-action" href="/my-page/points">포인트 내역 보기</a>
                </div>
                <div class="mypage-summary-row"><span>보유 포인트</span><strong class="point-value">${Number(response.totalPoints || 0).toLocaleString()} P</strong></div>
                <div class="mypage-level-progress">
                    <div class="mypage-level-progress-meta">
                        <span>${sanitizeHTML(response.levelLabel || '')} → ${sanitizeHTML(response.nextLevelLabel || 'MAX')}</span>
                        <span>${Number(response.neededPointsToNextLevel || 0).toLocaleString()}P 필요</span>
                    </div>
                    <progress class="mypage-progress-bar" max="100" value="${Number(response.progressRate || 0)}"></progress>
                    <div class="mypage-level-progress-meta"><span>${Number(response.totalPoints || 0).toLocaleString()}P</span><span>${Number(response.nextLevelMinPoints || response.totalPoints || 0).toLocaleString()}P</span></div>
                </div>
            </section>
        `;

        container.innerHTML = `
            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">기본 정보</h3>
                    <a class="mypage-summary-action" href="/my-page/profile">정보 수정</a>
                </div>
                <div class="mypage-summary-list">
                    <div class="mypage-summary-row"><span>아이디</span><strong>${sanitizeHTML(response.loginId || '')}</strong></div>
                    <div class="mypage-summary-row"><span>닉네임</span><strong>${sanitizeHTML(response.nickname || '')}</strong></div>
                    <div class="mypage-summary-row"><span>랭크</span><strong>${rankMarkup}</strong></div>
                    <div class="mypage-summary-row"><span>가입일</span><strong>${sanitizeHTML(joinedAt)}</strong></div>
                </div>
            </section>

            ${pointsSection}

            <section class="mypage-summary-section">
                <div class="mypage-summary-head">
                    <h3 class="mypage-summary-title">활동 내역</h3>
                    <a class="mypage-summary-action" href="/my-page/activity">활동 내역 보기</a>
                </div>
                <div class="mypage-activity-grid">
                    <div class="mypage-activity-item"><span>출석</span><strong>${Number(response.attendanceCount || 0)}</strong></div>
                    <div class="mypage-activity-item"><span>후기</span><strong>${Number(response.reviewCount || 0)}</strong></div>
                    <div class="mypage-activity-item"><span>게시글</span><strong>${Number(response.postCount || 0)}</strong></div>
                    <div class="mypage-activity-item"><span>댓글</span><strong>${Number(response.commentCount || 0)}</strong></div>
                    <div class="mypage-activity-item"><span>추천</span><strong>${Number(response.recommendCount || 0)}</strong></div>
                </div>
            </section>
        `;
    } catch (error) {
        container.innerHTML = '<div class="error-message">통계를 불러오지 못했습니다.</div>';
    }
}

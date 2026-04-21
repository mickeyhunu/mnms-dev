/**
 * 파일 역할: authController 관련 HTTP 요청을 처리하고 모델/응답 로직을 조합하는 컨트롤러 파일.
 */
const {
  createUser,
  findByEmail,
  findByNickname,
  recordUserLoginHistory,
  updateUserProfile
} = require('../models/userModel');
const {
  hashIdentityValue,
  findUserByIdentityHashes,
  isIdentityVerificationIdUsed,
  markIdentityVerificationUsed,
  findActiveSignupRestriction
} = require('../models/identityPolicyModel');
const { formatRestrictionMessage, getLoginRestrictionState } = require('../utils/loginRestriction');
const { recordAuthEvent } = require('../models/authEventModel');
const { recordLoginAttemptResult } = require('../middlewares/loginRateLimitMiddleware');
const { signAuthToken, DEFAULT_EXPIRES_IN } = require('../utils/jwt');
const { validateNickname } = require('../utils/nicknamePolicy');
const { validateLoginId, validatePassword } = require('../utils/authPolicy');
const { hashPassword, verifyPassword, isHashedPassword } = require('../utils/passwordHasher');

function normalizeAccountType(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized === 'BUSINESS' ? 'BUSINESS' : 'MEMBER';
}

function resolveRoleByAccountType(accountType) {
  return accountType === 'BUSINESS' ? 'BUSINESS' : 'MEMBER';
}

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

const IDENTITY_REUSE_WINDOW_MS = 3 * 60 * 1000;
const REGISTER_IP_WINDOW_MS = 5 * 60 * 1000;
const REGISTER_IP_MAX_ATTEMPTS = 5;
const identityReuseStore = new Map();
const registerIpStore = new Map();

function cleanupMapByWindow(store, windowMs, now = Date.now()) {
  for (const [key, value] of store.entries()) {
    if (!value) {
      store.delete(key);
      continue;
    }
    const lastAt = Number(value.lastAt || value.firstAt || 0);
    if (!lastAt || now - lastAt > windowMs) {
      store.delete(key);
    }
  }
}

function normalizeBirthDateToIso(value) {
  const digitsOnly = String(value || '').replace(/\D/g, '');
  if (digitsOnly.length !== 8) return '';
  return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 6)}-${digitsOnly.slice(6, 8)}`;
}

function calculateInternationalAge(birthDateIso, referenceDate = new Date()) {
  if (!birthDateIso) return -1;
  const birthDate = new Date(`${birthDateIso}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime())) return -1;

  const current = new Date(referenceDate);
  let age = current.getUTCFullYear() - birthDate.getUTCFullYear();
  const hasBirthdayPassed = (
    current.getUTCMonth() > birthDate.getUTCMonth()
    || (current.getUTCMonth() === birthDate.getUTCMonth() && current.getUTCDate() >= birthDate.getUTCDate())
  );
  if (!hasBirthdayPassed) age -= 1;
  return age;
}

function registerIdentityUsageAttempt({ identityVerificationId, ipAddress }) {
  const now = Date.now();
  cleanupMapByWindow(identityReuseStore, IDENTITY_REUSE_WINDOW_MS, now);
  cleanupMapByWindow(registerIpStore, REGISTER_IP_WINDOW_MS, now);

  const normalizedIdentityId = String(identityVerificationId || '').trim();
  if (normalizedIdentityId) {
    const prev = identityReuseStore.get(normalizedIdentityId);
    if (prev && now - prev.lastAt < IDENTITY_REUSE_WINDOW_MS) {
      return { blocked: true, message: '같은 인증 요청은 잠시 후 다시 시도해주세요. (3분 제한)' };
    }
    identityReuseStore.set(normalizedIdentityId, { lastAt: now });
  }

  const ipKey = String(ipAddress || 'unknown').trim() || 'unknown';
  const ipEntry = registerIpStore.get(ipKey);
  if (!ipEntry || now - ipEntry.firstAt > REGISTER_IP_WINDOW_MS) {
    registerIpStore.set(ipKey, { count: 1, firstAt: now, lastAt: now });
    return { blocked: false };
  }

  ipEntry.count += 1;
  ipEntry.lastAt = now;
  registerIpStore.set(ipKey, ipEntry);
  if (ipEntry.count > REGISTER_IP_MAX_ATTEMPTS) {
    return { blocked: true, message: '동일 IP에서 인증/가입 요청이 많아 5분 뒤 다시 시도해주세요.' };
  }

  return { blocked: false };
}
const { createSession, deleteSession } = require('../models/sessionModel');
const { awardPointByAction } = require('../models/pointModel');
const { pickUserRow } = require('../utils/response');

function resolveRegisterConflictError(error) {
  if (!error || error.code !== 'ER_DUP_ENTRY') return null;

  const messageSource = `${error?.sqlMessage || ''} ${error?.message || ''}`.toLowerCase();
  if (messageSource.includes('identity_verification_usages')) {
    return {
      status: 409,
      message: '이미 사용된 본인인증 건입니다. 다시 본인인증을 진행해주세요.'
    };
  }

  if (messageSource.includes('users.email')) {
    return {
      status: 409,
      message: '이미 사용 중인 아이디입니다.'
    };
  }

  if (messageSource.includes('users.nickname')) {
    return {
      status: 409,
      message: '이미 사용 중인 닉네임입니다.'
    };
  }

  return {
    status: 409,
    message: '이미 사용 중인 정보가 있어 회원가입을 완료할 수 없습니다.'
  };
}

async function register(req, res, next) {
  try {
    console.info('[AuthController.register] 요청 시작', {
      ipAddress: getClientIp(req),
      loginId: req.body?.loginId || req.body?.email || '',
      nickname: req.body?.nickname || '',
      identityVerificationId: req.body?.identityVerificationId || '',
      hasIdentityCi: Boolean(req.body?.identityCi || req.body?.ci),
      hasIdentityDi: Boolean(req.body?.identityDi || req.body?.di)
    });
    const { loginId, email, password, nickname, genderDigit } = req.body;
    const ipAddress = getClientIp(req);
    const accountType = normalizeAccountType(req.body.accountType || req.body.memberType);
    const resolvedLoginId = (loginId || email || '').trim();
    const name = String(req.body.name || '').trim() || null;
    const identityVerificationId = String(req.body.identityVerificationId || '').trim();
    const identityCi = String(req.body.identityCi || req.body.ci || '').trim();
    const identityDi = String(req.body.identityDi || req.body.di || '').trim();
    const phone = String(req.body.phone || '').trim();
    const birthDateIso = normalizeBirthDateToIso(req.body.birthDate || '');
    const termsConsent = Boolean(req.body.termsConsent);
    const privacyConsent = Boolean(req.body.privacyConsent);
    const marketingConsent = Boolean(req.body.marketingConsent);
    const smsConsent = Boolean(req.body.smsConsent);

    const registerAttemptState = registerIdentityUsageAttempt({ identityVerificationId, ipAddress });
    if (registerAttemptState.blocked) {
      console.warn('[AuthController.register] 요청 제한 차단', {
        ipAddress,
        identityVerificationId,
        message: registerAttemptState.message
      });
      return res.status(429).json({ message: registerAttemptState.message });
    }

    if (!resolvedLoginId || !password || !nickname) {
      console.warn('[AuthController.register] 필수값 누락', {
        hasLoginId: Boolean(resolvedLoginId),
        hasPassword: Boolean(password),
        hasNickname: Boolean(nickname)
      });
      return res.status(400).json({ message: '아이디, 비밀번호, 닉네임은 필수입니다.' });
    }

    const loginIdValidation = validateLoginId(resolvedLoginId);
    if (!loginIdValidation.valid) {
      console.warn('[AuthController.register] 아이디 정책 검증 실패', loginIdValidation);
      return res.status(400).json({ message: loginIdValidation.message });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.warn('[AuthController.register] 비밀번호 정책 검증 실패', passwordValidation);
      return res.status(400).json({ message: passwordValidation.message });
    }
    if (!identityVerificationId) {
      console.warn('[AuthController.register] 본인인증 ID 누락');
      return res.status(400).json({ message: '본인인증 확인 정보가 누락되었습니다. 인증 후 다시 시도해주세요.' });
    }
    if (!identityDi && !identityCi) {
      console.warn('[AuthController.register] 본인인증 고유값(DI/CI) 누락');
      return res.status(400).json({ message: '본인인증 고유값(DI/CI)이 없어 가입을 진행할 수 없습니다.' });
    }
    if (!termsConsent || !privacyConsent) {
      console.warn('[AuthController.register] 필수 약관 동의 누락', { termsConsent, privacyConsent });
      return res.status(400).json({ message: '약관 및 개인정보처리방침 동의가 필요합니다.' });
    }

    const age = calculateInternationalAge(birthDateIso);
    if (age < 19) {
      console.warn('[AuthController.register] 나이 제한으로 가입 거절', { birthDateIso, age });
      return res.status(403).json({ message: '19세 이상만 가입 가능합니다.' });
    }

    const normalizedNickname = String(nickname || '').trim();
    const nicknameValidation = validateNickname(normalizedNickname);
    if (!nicknameValidation.valid) {
      console.warn('[AuthController.register] 닉네임 정책 검증 실패', nicknameValidation);
      return res.status(400).json({ message: nicknameValidation.message });
    }

    const normalizedGenderDigit = String(genderDigit || '').trim();
    if (!/^\d$/.test(normalizedGenderDigit)) {
      console.warn('[AuthController.register] 성별 식별 번호 형식 오류', { genderDigit: normalizedGenderDigit });
      return res.status(400).json({ message: '성별 식별 번호를 확인할 수 없습니다. 본인인증을 다시 진행해주세요.' });
    }
    const signupEligibility = await evaluateIdentitySignupEligibility({
      identityVerificationId,
      ci: identityCi,
      di: identityDi,
      phone
    });
    if (!signupEligibility.allowed) {
      console.warn('[AuthController.register] 본인인증 기반 가입 불가', {
        reasonCode: signupEligibility.reasonCode,
        message: signupEligibility.message
      });
      const blockedStatusByReason = {
        MISSING_IDENTITY_VERIFICATION_ID: 400,
        MISSING_IDENTITY_HASH: 400,
        IDENTITY_VERIFICATION_ALREADY_USED: 409,
        REJOIN_WAIT: 403,
        RESTRICTED_IDENTITY: 403,
        DUPLICATE_IDENTITY: 409
      };
      return res.status(blockedStatusByReason[signupEligibility.reasonCode] || 400).json({ message: signupEligibility.message });
    }
    const { ciHash, diHash, phoneHash } = signupEligibility.identityHashes;

    if (await findByEmail(resolvedLoginId)) {
      console.warn('[AuthController.register] 중복 아이디', { loginId: resolvedLoginId });
      return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
    }
    if (await findByNickname(normalizedNickname)) {
      console.warn('[AuthController.register] 중복 닉네임', { nickname: normalizedNickname });
      return res.status(400).json({ message: '이미 사용 중인 닉네임입니다.' });
    }

    const hashedPassword = await hashPassword(password);
    const role = resolveRoleByAccountType(accountType);
    const userId = await createUser({
      email: resolvedLoginId,
      password: hashedPassword,
      nickname: normalizedNickname,
      name,
      birthDate: birthDateIso || null,
      role,
      memberType: accountType,
      phone,
      termsConsent,
      privacyConsent,
      marketingConsent,
      smsConsent,
      identityCiHash: ciHash,
      identityDiHash: diHash,
      phoneHash,
      isAdultVerified: true,
      adultVerifiedAt: new Date(),
      lastIdentityVerifiedAt: new Date()
    });
    await markIdentityVerificationUsed({
      identityVerificationId,
      ciHash,
      diHash,
      phoneHash,
      usedByUserId: userId,
      usedIpAddress: ipAddress
    });
    await awardPointByAction(userId, 'REGISTER');

    const user = await findByEmail(resolvedLoginId);
    console.info('[AuthController.register] 가입 완료', {
      userId,
      loginId: resolvedLoginId,
      nickname: normalizedNickname
    });
    res.json({ success: true, message: '회원가입이 완료되었습니다.', user: pickUserRow({ ...user, id: userId }) });
  } catch (error) {
    const conflictError = resolveRegisterConflictError(error);
    if (conflictError) {
      console.warn('[AuthController.register] DB 중복 예외 처리', {
        status: conflictError.status,
        message: conflictError.message,
        dbErrorCode: error?.code,
        dbMessage: error?.sqlMessage || error?.message
      });
      return res.status(conflictError.status).json({ message: conflictError.message });
    }
    console.error('[AuthController.register] 예외 발생', {
      message: error?.message,
      stack: error?.stack
    });
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { loginId, email, password } = req.body;
    const resolvedLoginId = (loginId || email || '').trim();
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || null;
    const user = await findByEmail(resolvedLoginId);
    const isPasswordValid = user ? await verifyPassword(password, user.password) : false;
    if (!user || !isPasswordValid) {
      recordLoginAttemptResult(req, { success: false });
      await recordAuthEvent({
        eventType: 'LOGIN_FAIL',
        reason: 'INVALID_CREDENTIAL',
        userId: user?.id || null,
        loginId: resolvedLoginId,
        ipAddress,
        userAgent
      });
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const restrictionState = getLoginRestrictionState(user);
    if (restrictionState.isRestricted) {
      recordLoginAttemptResult(req, { success: false });
      await recordAuthEvent({
        eventType: 'LOGIN_BLOCKED',
        reason: 'ACCOUNT_RESTRICTED',
        userId: user.id,
        loginId: resolvedLoginId,
        ipAddress,
        userAgent
      });
      return res.status(403).json({ message: formatRestrictionMessage(user) });
    }

    const token = signAuthToken(user);
    await createSession(token, user.id);
    await recordUserLoginHistory(user.id, {
      ipAddress,
      userAgent
    });
    recordLoginAttemptResult(req, { success: true });
    await recordAuthEvent({
      eventType: 'LOGIN_SUCCESS',
      reason: 'OK',
      userId: user.id,
      loginId: resolvedLoginId,
      ipAddress,
      userAgent
    });
    await awardPointByAction(user.id, 'LOGIN_DAILY');
    if (!isHashedPassword(user.password)) {
      const rehashedPassword = await hashPassword(password);
      await updateUserProfile(user.id, { password: rehashedPassword });
    }

    const refreshedUser = await findByEmail(resolvedLoginId);
    res.json({ success: true, token, tokenExpiresIn: DEFAULT_EXPIRES_IN, ...pickUserRow(refreshedUser || user) });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  res.json(pickUserRow(req.user));
}

async function logout(req, res, next) {
  try {
    await deleteSession(req.token);
    res.json({ success: true, message: '로그아웃되었습니다.' });
  } catch (error) {
    next(error);
  }
}

async function checkNickname(req, res, next) {
  try {
    const nickname = (req.query.nickname || '').trim();
    const nicknameValidation = validateNickname(nickname);
    if (!nicknameValidation.valid) {
      return res.status(400).json({ message: nicknameValidation.message });
    }

    const exists = await findByNickname(nickname);
    res.json({ available: !exists });
  } catch (error) {
    next(error);
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHiddenInput(name, value) {
  return `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`;
}

function generateOrderNumber() {
  return `MNMS_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function resolveReturnUrl(req) {
  const configuredReturnUrl = String(process.env.KCP_RETURN_URL || '').trim();
  if (configuredReturnUrl) {
    return configuredReturnUrl;
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = req.get('host');
  return `${protocol}://${host}/kcp/callback`;
}

async function requestIdentityVerification(req, res) {
  const kcpRequestUrl = String(process.env.KCP_REQUEST_URL || '').trim();
  const siteCode = String(process.env.KCP_SITE_CODE || '').trim();

  if (!kcpRequestUrl || !siteCode) {
    return res.status(500).json({
      message: 'KCP 연동 환경변수(KCP_REQUEST_URL, KCP_SITE_CODE)가 설정되지 않았습니다.'
    });
  }

  const requestPayload = {
    req_tx: String(req.body.req_tx || 'cert').trim() || 'cert',
    site_cd: siteCode,
    ordr_idxx: String(req.body.ordr_idxx || generateOrderNumber()).trim(),
    Ret_URL: String(req.body.Ret_URL || resolveReturnUrl(req)).trim(),
    cert_method: String(req.body.cert_method || '01').trim(),
    cert_otp_use: String(req.body.cert_otp_use || 'Y').trim(),
    user_name: String(req.body.user_name || '').trim(),
    phone_no: String(req.body.phone_no || '').trim(),
    user_birth: String(req.body.user_birth || '').trim(),
    user_sex: String(req.body.user_sex || '').trim(),
    user_ci: String(req.body.user_ci || '').trim()
  };

  const hiddenInputs = Object.entries(requestPayload)
    .map(([name, value]) => buildHiddenInput(name, value))
    .join('\n');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>KCP 본인인증 요청</title>
</head>
<body>
  <form id="kcp-request-form" method="post" action="${escapeHtml(kcpRequestUrl)}">
    ${hiddenInputs}
  </form>
  <script>
    document.getElementById('kcp-request-form').submit();
  </script>
</body>
</html>`);
}

async function getIdentityVerificationConfig(req, res) {
  const storeId = String(process.env.PORTONE_STORE_ID || '').trim();
  const channelKey = String(process.env.PORTONE_CHANNEL_KEY || '').trim();
  const apiSecret = String(process.env.PORTONE_API_SECRET || '').trim();

  if (!storeId || !channelKey || !apiSecret) {
    const missingEnvs = [];
    if (!storeId) missingEnvs.push('PORTONE_STORE_ID');
    if (!channelKey) missingEnvs.push('PORTONE_CHANNEL_KEY');
    if (!apiSecret) missingEnvs.push('PORTONE_API_SECRET');

    return res.status(500).json({
      message: `PortOne 연동 환경변수(${missingEnvs.join(', ')})가 설정되지 않았습니다.`
    });
  }

  return res.json({
    storeId,
    channelKey
  });
}

function pickIdentityValue(source, candidateKeys = []) {
  if (!source || typeof source !== 'object') {
    return '';
  }

  for (const key of candidateKeys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }

  return '';
}

function normalizeIdentityVerificationPayload(payload = {}) {
  const verifiedCustomer = payload.verifiedCustomer || payload.customer || {};

  return {
    name: pickIdentityValue(verifiedCustomer, ['name', 'fullName']) || pickIdentityValue(payload, ['name', 'fullName']),
    birthDate: pickIdentityValue(verifiedCustomer, ['birthDate', 'birthday', 'birth']) || pickIdentityValue(payload, ['birthDate', 'birthday', 'birth']),
    phone: pickIdentityValue(verifiedCustomer, ['phoneNumber', 'phone', 'mobilePhone']) || pickIdentityValue(payload, ['phoneNumber', 'phone', 'mobilePhone']),
    genderDigit: pickIdentityValue(verifiedCustomer, ['genderDigit', 'genderCode', 'gender']) || pickIdentityValue(payload, ['genderDigit', 'genderCode', 'gender']),
    ci: pickIdentityValue(verifiedCustomer, ['ci']) || pickIdentityValue(payload, ['ci']),
    di: pickIdentityValue(verifiedCustomer, ['di']) || pickIdentityValue(payload, ['di'])
  };
}

async function evaluateIdentitySignupEligibility({ identityVerificationId, ci = '', di = '', phone = '' }) {
  const ciHash = hashIdentityValue(ci);
  const diHash = hashIdentityValue(di);
  const phoneHash = hashIdentityValue(phone);

  if (!identityVerificationId) {
    return {
      allowed: false,
      reasonCode: 'MISSING_IDENTITY_VERIFICATION_ID',
      message: '본인인증 확인 정보가 누락되었습니다. 인증 후 다시 시도해주세요.'
    };
  }

  if (!diHash && !ciHash) {
    return {
      allowed: false,
      reasonCode: 'MISSING_IDENTITY_HASH',
      message: '본인인증 고유값(DI/CI)이 없어 가입을 진행할 수 없습니다.'
    };
  }

  if (await isIdentityVerificationIdUsed(identityVerificationId)) {
    return {
      allowed: false,
      reasonCode: 'IDENTITY_VERIFICATION_ALREADY_USED',
      message: '이미 사용된 본인인증 건입니다. 다시 본인인증을 진행해주세요.'
    };
  }

  const activeRestriction = await findActiveSignupRestriction({ ciHash, diHash, phoneHash });
  if (activeRestriction) {
    if (activeRestriction.restrictionType === 'REJOIN_WAIT') {
      return {
        allowed: false,
        reasonCode: 'REJOIN_WAIT',
        message: '탈퇴 후 7일 이내에는 재가입할 수 없습니다.'
      };
    }

    return {
      allowed: false,
      reasonCode: 'RESTRICTED_IDENTITY',
      message: '가입이 제한된 본인인증 정보입니다. 고객센터로 문의해주세요.'
    };
  }

  const existingIdentityUser = await findUserByIdentityHashes({ ciHash, diHash, phoneHash });
  if (existingIdentityUser) {
    return {
      allowed: false,
      reasonCode: 'DUPLICATE_IDENTITY',
      message: '동일 명의(또는 휴대폰 번호)로 가입된 아이디가 이미 존재합니다.'
    };
  }

  return {
    allowed: true,
    reasonCode: 'OK',
    message: '가입 가능한 본인인증 정보입니다.',
    identityHashes: {
      ciHash,
      diHash,
      phoneHash
    }
  };
}

async function getIdentityVerificationResult(req, res) {
  const identityVerificationId = String(req.params.identityVerificationId || '').trim();
  const fetchedResult = await fetchIdentityVerificationPayload(identityVerificationId);
  if (fetchedResult.error) {
    return res.status(fetchedResult.error.status).json(fetchedResult.error.body);
  }
  const payload = fetchedResult.payload;

  const normalizedPayload = normalizeIdentityVerificationPayload(payload);
  const signupEligibility = await evaluateIdentitySignupEligibility({
    identityVerificationId,
    ci: normalizedPayload.ci,
    di: normalizedPayload.di,
    phone: normalizedPayload.phone
  });

  return res.json({
    ...payload,
    normalized: normalizedPayload,
    signupEligibility
  });
}

async function fetchIdentityVerificationPayload(identityVerificationId) {
  const normalizedIdentityVerificationId = String(identityVerificationId || '').trim();
  const apiSecret = String(process.env.PORTONE_API_SECRET || '').trim();

  if (!normalizedIdentityVerificationId) {
    return {
      error: {
        status: 400,
        body: { message: '본인인증 ID가 필요합니다.' }
      }
    };
  }

  if (!apiSecret) {
    return {
      error: {
        status: 500,
        body: { message: 'PortOne 연동 환경변수(PORTONE_API_SECRET)가 설정되지 않았습니다.' }
      }
    };
  }

  const endpointUrl = `https://api.portone.io/identity-verifications/${encodeURIComponent(normalizedIdentityVerificationId)}`;

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(endpointUrl, {
      method: 'GET',
      headers: {
        Authorization: `PortOne ${apiSecret}`,
        Accept: 'application/json'
      }
    });
  } catch (error) {
    return {
      error: {
        status: 502,
        body: {
          message: 'PortOne 본인인증 결과 조회에 실패했습니다.',
          detail: error.message
        }
      }
    };
  }

  let payload = null;
  try {
    payload = await upstreamResponse.json();
  } catch (error) {
    return {
      error: {
        status: 502,
        body: { message: 'PortOne 본인인증 결과 응답을 해석할 수 없습니다.' }
      }
    };
  }

  if (!upstreamResponse.ok) {
    return {
      error: {
        status: upstreamResponse.status,
        body: { message: payload?.message || 'PortOne 본인인증 결과 조회에 실패했습니다.' }
      }
    };
  }

  return { payload };
}

async function findAccountByIdentity(req, res) {
  const identityVerificationId = String(req.body?.identityVerificationId || '').trim();
  const fetchedResult = await fetchIdentityVerificationPayload(identityVerificationId);
  if (fetchedResult.error) {
    return res.status(fetchedResult.error.status).json(fetchedResult.error.body);
  }

  const normalizedPayload = normalizeIdentityVerificationPayload(fetchedResult.payload);
  const ciHash = hashIdentityValue(normalizedPayload.ci);
  const diHash = hashIdentityValue(normalizedPayload.di);
  const phoneHash = hashIdentityValue(normalizedPayload.phone);

  if (!ciHash && !diHash && !phoneHash) {
    return res.status(400).json({ message: '본인인증 정보가 올바르지 않습니다. 다시 시도해주세요.' });
  }

  const user = await findUserByIdentityHashes({ ciHash, diHash, phoneHash });
  if (!user) {
    return res.json({
      found: false,
      message: '본인인증 정보로 가입된 아이디가 없습니다.'
    });
  }

  return res.json({
    found: true,
    loginId: user.email,
    message: '가입된 아이디를 확인했습니다.'
  });
}

async function resetPasswordByIdentity(req, res) {
  const identityVerificationId = String(req.body?.identityVerificationId || '').trim();
  const nextPassword = String(req.body?.newPassword || '').trim();
  const passwordValidation = validatePassword(nextPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({ message: passwordValidation.message });
  }

  const fetchedResult = await fetchIdentityVerificationPayload(identityVerificationId);
  if (fetchedResult.error) {
    return res.status(fetchedResult.error.status).json(fetchedResult.error.body);
  }

  const normalizedPayload = normalizeIdentityVerificationPayload(fetchedResult.payload);
  const ciHash = hashIdentityValue(normalizedPayload.ci);
  const diHash = hashIdentityValue(normalizedPayload.di);
  const phoneHash = hashIdentityValue(normalizedPayload.phone);
  const user = await findUserByIdentityHashes({ ciHash, diHash, phoneHash });
  if (!user) {
    return res.status(404).json({ message: '본인인증 정보로 가입된 아이디가 없습니다.' });
  }

  const hashedPassword = await hashPassword(nextPassword);
  await updateUserProfile(user.id, { password: hashedPassword });
  return res.json({ success: true, message: '비밀번호가 변경되었습니다.' });
}

module.exports = {
  register,
  login,
  me,
  logout,
  checkNickname,
  requestIdentityVerification,
  getIdentityVerificationConfig,
  getIdentityVerificationResult,
  findAccountByIdentity,
  resetPasswordByIdentity
};

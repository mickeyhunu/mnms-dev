/**
 * 파일 역할: authRoutes API 엔드포인트와 컨트롤러를 매핑하는 라우트 파일.
 */
const express = require('express');
const controller = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { loginRateLimitMiddleware } = require('../middlewares/loginRateLimitMiddleware');

const router = express.Router();

router.post('/register', controller.register);
router.post('/login', loginRateLimitMiddleware, controller.login);
router.get('/check-nickname', controller.checkNickname);
router.get('/identity-verification-config', controller.getIdentityVerificationConfig);
router.get('/identity-verification/:identityVerificationId', controller.getIdentityVerificationResult);
router.post('/find-account-by-identity', controller.findAccountByIdentity);
router.post('/reset-password-by-identity', controller.resetPasswordByIdentity);
router.post('/request-identity-verification', controller.requestIdentityVerification);
router.post('/logout', authMiddleware, controller.logout);
router.get('/me', authMiddleware, controller.me);

module.exports = router;

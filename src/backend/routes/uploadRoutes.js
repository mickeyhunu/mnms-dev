/**
 * 파일 역할: S3 업로드 API 엔드포인트를 매핑하는 라우트 파일.
 */
const express = require('express');
const uploadController = require('../controllers/uploadController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/posts/images', authMiddleware, uploadController.uploadPostImages);
router.post('/support/attachments', authMiddleware, uploadController.uploadSupportAttachments);
router.post('/ads/images', authMiddleware, uploadController.uploadAdImages);

module.exports = router;

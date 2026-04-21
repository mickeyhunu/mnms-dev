/**
 * 파일 역할: 공지사항/FAQ 공개 조회 API 엔드포인트를 매핑하는 라우트 파일.
 */
const express = require('express');
const supportController = require('../controllers/supportController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/article/:id', supportController.getPublicArticleDetail);

router.get('/:category(notice|faq)', (req, res, next) => {
  req.params.category = String(req.params.category || '').toUpperCase();
  return supportController.listPublicArticles(req, res, next);
});


router.post('/inquiries', authMiddleware, supportController.createInquiry);
router.get('/inquiries/me', authMiddleware, supportController.listMyInquiries);
router.get('/inquiries/me/:id', authMiddleware, supportController.getMyInquiryDetail);

module.exports = router;

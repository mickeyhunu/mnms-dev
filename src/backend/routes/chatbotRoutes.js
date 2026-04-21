/**
 * 파일 역할: chatbotdb 조회 API 엔드포인트를 매핑하는 라우트 파일.
 */
const express = require('express');
const chatbotController = require('../controllers/chatbotController');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);
router.get('/table', chatbotController.listTableRows);

module.exports = router;

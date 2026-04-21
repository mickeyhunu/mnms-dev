/**
 * 파일 역할: user 관련 API 라우트를 정의하는 라우터 파일.
 */
const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const {
  myStats,
  myPointHistories,
  myActivity,
  myLiveAccessStatus,
  myNotifications,
  markMyNotificationsRead,
  markMyNotificationsReadAll,
  myReadPosts,
  markMyPostsRead,
  updateMyProfile,
  listMyBusinessAds,
  createMyBusinessAd,
  updateMyBusinessAd,
  deleteMyBusinessAd,
  getMyBusinessProfile,
  saveMyBusinessProfile
} = require('../controllers/userController');

const router = express.Router();

router.get('/me/stats', authMiddleware, myStats);
router.get('/me/points', authMiddleware, myPointHistories);
router.get('/me/activity', authMiddleware, myActivity);
router.get('/me/live-access', authMiddleware, myLiveAccessStatus);
router.get('/me/notifications', authMiddleware, myNotifications);
router.post('/me/notifications/read', authMiddleware, markMyNotificationsRead);
router.post('/me/notifications/read-all', authMiddleware, markMyNotificationsReadAll);
router.get('/me/posts/read', authMiddleware, myReadPosts);
router.post('/me/posts/read', authMiddleware, markMyPostsRead);
router.put('/me', authMiddleware, updateMyProfile);
router.get('/me/business-ads', authMiddleware, listMyBusinessAds);
router.post('/me/business-ads', authMiddleware, createMyBusinessAd);
router.put('/me/business-ads/:id', authMiddleware, updateMyBusinessAd);
router.delete('/me/business-ads/:id', authMiddleware, deleteMyBusinessAd);
router.get('/me/business-profile', authMiddleware, getMyBusinessProfile);
router.put('/me/business-profile', authMiddleware, saveMyBusinessProfile);

module.exports = router;

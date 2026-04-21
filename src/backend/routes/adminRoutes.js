/**
 * 파일 역할: 관리자 전용 API 엔드포인트와 컨트롤러를 매핑하는 라우트 파일.
 */
const express = require('express');
const postModel = require('../models/postModel');
const adminModel = require('../models/adminModel');
const liveModel = require('../models/liveModel');
const supportController = require('../controllers/supportController');
const { findByNicknameExceptUser } = require('../models/userModel');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { LOGIN_STATUS } = require('../utils/loginRestriction');
const { deleteSessionsByUserId } = require('../models/sessionModel');
const { deleteS3ObjectByUrl } = require('../utils/fileUpload');
const { validateNickname } = require('../utils/nicknamePolicy');
const { validatePassword } = require('../utils/authPolicy');
const { hashPassword } = require('../utils/passwordHasher');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/stats/dashboard', async (req, res, next) => {
  try {
    const rangeDays = Number.parseInt(req.query.rangeDays || '14', 10);
    const period = String(req.query.period || 'daily').toLowerCase();
    const dashboard = await adminModel.getDashboardStats(rangeDays, { period });
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

router.get('/posts', async (req, res, next) => {
  try {
    const { rows, total } = await postModel.listPosts(0, 10000, { boardType: 'ALL' });
    res.json({ content: rows, totalElements: total });
  } catch (error) {
    next(error);
  }
});

router.get('/comments', async (req, res, next) => {
  try {
    const rows = await postModel.listAllCommentsForAdmin();
    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
});


router.put('/posts/:id/hide', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });

    const post = await postModel.findPostByIdIncludingDeleted(id);
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (post.is_deleted) return res.status(400).json({ message: '이미 삭제된 게시글입니다.' });

    const isHidden = Boolean(req.body?.isHidden);
    await postModel.setPostHidden(id, isHidden);
    res.json({ success: true, isHidden });
  } catch (error) {
    next(error);
  }
});

router.delete('/posts/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 게시글 ID입니다.' });

    const post = await postModel.findPostByIdIncludingDeleted(id);
    if (!post) return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    if (post.is_deleted) return res.status(400).json({ message: '이미 삭제된 게시글입니다.' });

    await postModel.deletePost(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});


router.put('/comments/:id/hide', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 댓글 ID입니다.' });

    const comment = await postModel.findCommentById(id);
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (comment.is_deleted) return res.status(400).json({ message: '이미 삭제된 댓글입니다.' });

    const isHidden = Boolean(req.body?.isHidden);
    await postModel.setCommentHidden(id, isHidden);
    res.json({ success: true, isHidden });
  } catch (error) {
    next(error);
  }
});

router.delete('/comments/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 댓글 ID입니다.' });

    const comment = await postModel.findCommentById(id);
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (comment.is_deleted) return res.status(400).json({ message: '이미 삭제된 댓글입니다.' });

    await postModel.deleteComment(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const rows = await adminModel.listUsers();
    const content = rows.map((user) => ({
      ...user,
      isCurrentUser: Number(user.id) === Number(req.user.id)
    }));
    res.json({ content, totalElements: content.length });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 회원 ID입니다.' });

    const user = await adminModel.getUserDetail(id);
    if (!user || user.role !== 'MEMBER') return res.status(404).json({ message: '일반 회원을 찾을 수 없습니다.' });

    const activity = await adminModel.getUserActivityOverview(id, { limit: 10 });

    res.json({
      user: {
        ...user,
        isCurrentUser: Number(user.id) === Number(req.user.id)
      },
      activity
    });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 회원 ID입니다.' });

    const target = await adminModel.findUserById(id);
    if (!target || target.role !== 'MEMBER') return res.status(404).json({ message: '일반 회원을 찾을 수 없습니다.' });

    const nickname = String(req.body?.nickname || '').trim();
    const password = String(req.body?.password || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const role = String(req.body?.role || '').toUpperCase();
    const memberType = String(req.body?.memberType || '').toUpperCase();
    const totalPoints = Number(req.body?.totalPoints);
    const smsConsent = Boolean(req.body?.smsConsent);
    const accountStatus = String(req.body?.accountStatus || LOGIN_STATUS.ACTIVE).toUpperCase();
    const isLoginRestrictionPermanent = Boolean(req.body?.isLoginRestrictionPermanent);
    const loginRestrictionDaysRaw = req.body?.loginRestrictionDays;
    const hasLoginRestrictionDays = loginRestrictionDaysRaw !== undefined && loginRestrictionDaysRaw !== null && String(loginRestrictionDaysRaw).trim() !== '';
    const loginRestrictionDays = hasLoginRestrictionDays ? Number(loginRestrictionDaysRaw) : null;

    const nicknameValidation = validateNickname(nickname);
    if (!nicknameValidation.valid) {
      return res.status(400).json({ message: nicknameValidation.message });
    }

    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
      }
    }

    if (phone && !/^01\d-\d{3,4}-\d{4}$/.test(phone)) {
      return res.status(400).json({ message: '연락처 형식은 010-0000-0000으로 입력해 주세요.' });
    }

    if (!['MEMBER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: '유효하지 않은 권한입니다.' });
    }

    if (!['MEMBER', 'BUSINESS'].includes(memberType)) {
      return res.status(400).json({ message: '유효하지 않은 회원 구분입니다.' });
    }

    if (!Number.isFinite(totalPoints) || totalPoints < 0 || !Number.isInteger(totalPoints)) {
      return res.status(400).json({ message: '포인트는 0 이상의 정수만 입력할 수 있습니다.' });
    }

    if (![LOGIN_STATUS.ACTIVE, LOGIN_STATUS.SUSPENDED].includes(accountStatus)) {
      return res.status(400).json({ message: '유효하지 않은 계정 상태입니다.' });
    }

    if (accountStatus === LOGIN_STATUS.SUSPENDED && !isLoginRestrictionPermanent) {
      if (!Number.isFinite(loginRestrictionDays) || loginRestrictionDays < 1 || !Number.isInteger(loginRestrictionDays)) {
        return res.status(400).json({ message: '로그인 제한 일수는 1일 이상의 정수만 입력할 수 있습니다.' });
      }
    }

    const duplicateNickname = await findByNicknameExceptUser(nickname, id);
    if (duplicateNickname) {
      return res.status(400).json({ message: '이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.' });
    }

    const updates = {
      nickname,
      phone,
      sms_consent: smsConsent,
      role,
      member_type: memberType,
      account_status: accountStatus,
      login_restricted_until: accountStatus === LOGIN_STATUS.SUSPENDED && !isLoginRestrictionPermanent
        ? new Date(Date.now() + loginRestrictionDays * 24 * 60 * 60 * 1000)
        : null,
      is_login_restriction_permanent: accountStatus === LOGIN_STATUS.SUSPENDED && isLoginRestrictionPermanent,
      total_points: totalPoints
    };

    if (password) {
      updates.password = await hashPassword(password);
    }

    await adminModel.updateUserByAdmin(id, updates);
    if (accountStatus === LOGIN_STATUS.SUSPENDED) {
      await deleteSessionsByUserId(id);
    }
    const updatedUser = await adminModel.getUserDetail(id);

    res.json({
      success: true,
      message: '회원 정보가 저장되었습니다.',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const role = String(req.body?.role || '').toUpperCase();
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 회원 ID입니다.' });
    if (!['MEMBER', 'ADMIN'].includes(role)) return res.status(400).json({ message: '유효하지 않은 권한입니다.' });

    const target = await adminModel.findUserById(id);
    if (!target) return res.status(404).json({ message: '회원을 찾을 수 없습니다.' });

    await adminModel.updateUserRole(id, role);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});


router.patch('/users/:id/member-type', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const memberType = String(req.body?.memberType || '').toUpperCase();
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 회원 ID입니다.' });
    if (!['MEMBER', 'BUSINESS'].includes(memberType)) return res.status(400).json({ message: '유효하지 않은 회원 구분입니다.' });

    const target = await adminModel.findUserById(id);
    if (!target || target.role !== 'MEMBER') return res.status(404).json({ message: '일반 회원을 찾을 수 없습니다.' });

    await adminModel.updateUserMemberType(id, memberType);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 회원 ID입니다.' });
    if (id === Number(req.user.id)) return res.status(400).json({ message: '현재 로그인한 계정은 삭제할 수 없습니다.' });

    const target = await adminModel.findUserById(id);
    if (!target || target.role !== 'MEMBER') return res.status(404).json({ message: '일반 회원을 찾을 수 없습니다.' });

    await adminModel.deleteUser(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/ads', async (req, res, next) => {
  try {
    const rows = await adminModel.listAds();
    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
});

router.post('/ads', async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim();
    const imageUrl = String(req.body?.imageUrl || '').trim();
    const linkUrl = String(req.body?.linkUrl || '').trim();
    const adType = String(req.body?.adType || 'LIVE').trim().toUpperCase();
    const storeNoRaw = req.body?.storeNo;
    const storeNo = storeNoRaw == null || storeNoRaw === '' ? null : Number.parseInt(storeNoRaw, 10);
    const displayOrder = Number(req.body?.displayOrder) || 0;
    const isActive = Boolean(req.body?.isActive);

    if (!['LIVE', 'TOP'].includes(adType)) {
      return res.status(400).json({ message: '유효하지 않은 광고 유형입니다.' });
    }

    if (adType === 'LIVE' && (!Number.isInteger(storeNo) || storeNo <= 0)) {
      return res.status(400).json({ message: 'LIVE 광고는 매장 번호(storeNo)가 필요합니다.' });
    }

    if (Number.isInteger(storeNo) && storeNo > 0) {
      const store = await adminModel.getStoreByNo(storeNo);
      if (!store) return res.status(404).json({ message: '매장을 찾을 수 없습니다.' });
    }

    if (!title || !imageUrl || !linkUrl) {
      return res.status(400).json({ message: '제목, 이미지 URL, 링크 URL은 필수입니다.' });
    }

    const insertId = await adminModel.createAd({ title, imageUrl, linkUrl, adType, storeNo, displayOrder, isActive });
    res.status(201).json({ id: insertId });
  } catch (error) {
    next(error);
  }
});

router.put('/ads/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 광고 ID입니다.' });

    const target = await adminModel.findAdById(id);
    if (!target) return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });

    const title = String(req.body?.title || '').trim();
    const imageUrl = String(req.body?.imageUrl || '').trim();
    const linkUrl = String(req.body?.linkUrl || '').trim();
    const adType = String(req.body?.adType || 'LIVE').trim().toUpperCase();
    const storeNoRaw = req.body?.storeNo;
    const storeNo = storeNoRaw == null || storeNoRaw === '' ? null : Number.parseInt(storeNoRaw, 10);
    const displayOrder = Number(req.body?.displayOrder) || 0;
    const isActive = Boolean(req.body?.isActive);

    if (!['LIVE', 'TOP'].includes(adType)) {
      return res.status(400).json({ message: '유효하지 않은 광고 유형입니다.' });
    }

    if (adType === 'LIVE' && (!Number.isInteger(storeNo) || storeNo <= 0)) {
      return res.status(400).json({ message: 'LIVE 광고는 매장 번호(storeNo)가 필요합니다.' });
    }

    if (Number.isInteger(storeNo) && storeNo > 0) {
      const store = await adminModel.getStoreByNo(storeNo);
      if (!store) return res.status(404).json({ message: '매장을 찾을 수 없습니다.' });
    }

    if (!title || !imageUrl || !linkUrl) {
      return res.status(400).json({ message: '제목, 이미지 URL, 링크 URL은 필수입니다.' });
    }

    await adminModel.updateAd(id, { title, imageUrl, linkUrl, adType, storeNo, displayOrder, isActive });
    if (target.imageUrl && target.imageUrl !== imageUrl) {
      await deleteS3ObjectByUrl(target.imageUrl);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/ads/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '유효하지 않은 광고 ID입니다.' });

    const target = await adminModel.findAdById(id);
    if (!target) return res.status(404).json({ message: '광고를 찾을 수 없습니다.' });

    await adminModel.deleteAd(id);
    if (target.imageUrl) {
      await deleteS3ObjectByUrl(target.imageUrl);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/entries/stores', async (req, res, next) => {
  try {
    const stores = await adminModel.listEntryStores();
    res.json({ content: stores, totalElements: stores.length });
  } catch (error) {
    next(error);
  }
});

router.get('/entries', async (req, res, next) => {
  try {
    const storeNo = Number.parseInt(req.query.storeNo, 10);
    if (!Number.isInteger(storeNo) || storeNo <= 0) {
      return res.status(400).json({ message: '유효한 매장을 선택해주세요.' });
    }

    const store = await adminModel.getStoreByNo(storeNo);
    if (!store) return res.status(404).json({ message: '매장을 찾을 수 없습니다.' });

    const rows = await adminModel.listEntries(storeNo);
    res.json({
      selectedStore: store,
      content: rows,
      totalElements: rows.length
    });
  } catch (error) {
    next(error);
  }
});

router.post('/entries', async (req, res, next) => {
  try {
    const storeNo = Number.parseInt(req.body?.storeNo, 10);
    const workerName = String(req.body?.workerName || '').trim();

    if (!Number.isInteger(storeNo) || storeNo <= 0) {
      return res.status(400).json({ message: '유효한 매장을 선택해주세요.' });
    }

    if (!workerName || workerName.length < 1) {
      return res.status(400).json({ message: '엔트리 이름을 입력해주세요.' });
    }

    const store = await adminModel.getStoreByNo(storeNo);
    if (!store) return res.status(404).json({ message: '매장을 찾을 수 없습니다.' });

    const duplicate = await adminModel.findEntryByStoreAndName(storeNo, workerName);
    if (duplicate) {
      return res.status(409).json({ message: '같은 매장에 동일한 엔트리 이름이 이미 등록되어 있습니다.' });
    }

    const entry = await adminModel.createEntry({ storeNo, workerName });
    res.status(201).json({ success: true, entry });
  } catch (error) {
    next(error);
  }
});

router.put('/entries/:entryId', async (req, res, next) => {
  try {
    const entryId = String(req.params.entryId || '').trim();
    const workerName = String(req.body?.workerName || '').trim();
    if (!entryId) return res.status(400).json({ message: '유효하지 않은 엔트리 ID입니다.' });
    if (!workerName) return res.status(400).json({ message: '엔트리 이름을 입력해주세요.' });

    const target = await adminModel.findEntryById(entryId);
    if (!target) return res.status(404).json({ message: '엔트리 항목을 찾을 수 없습니다.' });

    if (target.workerName !== workerName) {
      const duplicate = await adminModel.findEntryByStoreAndName(target.storeNo, workerName);
      if (duplicate) {
        return res.status(409).json({ message: '같은 매장에 동일한 엔트리 이름이 이미 등록되어 있습니다.' });
      }
    }

    res.json({
      success: true,
      entry: await adminModel.updateEntry(entryId, { workerName })
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/entries/:entryId', async (req, res, next) => {
  try {
    const entryId = String(req.params.entryId || '').trim();
    if (!entryId) return res.status(400).json({ message: '유효하지 않은 엔트리 ID입니다.' });

    const target = await adminModel.findEntryById(entryId);
    if (!target) return res.status(404).json({ message: '엔트리 항목을 찾을 수 없습니다.' });

    await adminModel.deleteEntry(entryId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/live/chojoong/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: '유효하지 않은 초중 메시지 ID입니다.' });
    }

    const deletedRows = await liveModel.deleteLiveHistoryRow('chojoong', id);
    if (!deletedRows) {
      return res.status(404).json({ message: '삭제할 초중 메시지를 찾을 수 없습니다.' });
    }

    return res.json({ success: true, id });
  } catch (error) {
    return next(error);
  }
});

router.get('/support', supportController.listAdminArticles);
router.get('/support/article/:id', supportController.getAdminArticleDetail);
router.get('/support/inquiries', supportController.listAdminInquiries);
router.put('/support/inquiries/:id/answer', supportController.answerInquiry);
router.post('/support', supportController.createArticle);
router.put('/support/:id', supportController.updateArticle);
router.delete('/support/:id', supportController.deleteArticle);

module.exports = router;

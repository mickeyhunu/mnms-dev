/**
 * 파일 역할: 공지사항/FAQ 요청을 처리하는 컨트롤러 파일.
 */
const supportModel = require('../models/supportModel');
const { normalizeExistingFileUrls, parseDataUrl, uploadDataUrlToS3 } = require('../utils/fileUpload');

const BOARD_TYPES = {
  FREE: 'FREE',
  ANON: 'ANON',
  REVIEW: 'REVIEW',
  STORY: 'STORY',
  QUESTION: 'QUESTION',
  PROMOTION: 'PROMOTION'
};

const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf'
};

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}


async function resolveAttachmentUrls(payload) {
  const candidate = Array.isArray(payload?.attachmentUrls) ? payload.attachmentUrls : [];
  const existingUrls = normalizeExistingFileUrls(candidate, { maxCount: 3 });
  const newDataUrls = candidate
    .map((url) => String(url || '').trim())
    .filter((url) => {
      const mimeType = parseDataUrl(url)?.mimeType;
      return typeof mimeType === 'string' && (mimeType.startsWith('image/') || mimeType === 'application/pdf');
    })
    .slice(0, 3);

  const uploadedUrls = [];
  for (const [index, dataUrl] of newDataUrls.entries()) {
    const mimeType = parseDataUrl(dataUrl)?.mimeType || '';
    const extension = EXTENSION_BY_MIME[mimeType] || 'bin';
    const uploadResult = await uploadDataUrlToS3({
      dataUrl,
      fileName: `support-attachment-${index + 1}.${extension}`,
      folder: 'support',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
      maxBytes: 12 * 1024 * 1024
    });
    uploadedUrls.push(uploadResult.url);
  }

  return [...existingUrls, ...uploadedUrls].slice(0, 3);
}

function parseBoardType(value) {
  const normalized = String(value || '').toUpperCase();
  return Object.values(BOARD_TYPES).includes(normalized) ? normalized : BOARD_TYPES.FREE;
}

async function listPublicArticles(req, res, next) {
  try {
    const category = req.params.category;
    let rows = [];

    if (category === supportModel.SUPPORT_CATEGORIES.NOTICE) {
      const [postNotices, legacyNotices] = await Promise.all([
        supportModel.listArticles(category, false, { sourceType: supportModel.SOURCE_TYPES.POST }),
        supportModel.listArticles(category, false, { sourceType: supportModel.SOURCE_TYPES.SUPPORT })
      ]);

      rows = [...postNotices, ...legacyNotices].sort((a, b) => {
        const pinnedGap = Number(b.isPinned || 0) - Number(a.isPinned || 0);
        if (pinnedGap !== 0) return pinnedGap;

        const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
        if (timeA !== timeB) return timeB - timeA;

        return Number(b.id || 0) - Number(a.id || 0);
      });
    } else {
      rows = await supportModel.listArticles(category, false);
    }

    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
}


async function getPublicArticleDetail(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: '유효하지 않은 글 ID입니다.' });

    const sourceType = supportModel.normalizeSourceType(req.query.sourceType);

    if (sourceType === supportModel.SOURCE_TYPES.POST) {
      const article = await supportModel.findPublicNoticePostDetailById(id);
      if (!article) return res.status(404).json({ message: '글을 찾을 수 없습니다.' });

      res.json({
        ...article,
        sourceType: 'POST'
      });
      return;
    }

    const article = await supportModel.findPublicArticleDetailById(id);
    if (!article) return res.status(404).json({ message: '글을 찾을 수 없습니다.' });

    res.json({
      ...article,
      sourceType: 'SUPPORT'
    });
  } catch (error) {
    next(error);
  }
}

async function listAdminArticles(req, res, next) {
  try {
    const category = supportModel.normalizeCategory(req.query.category);
    if (!category) return res.status(400).json({ message: '유효하지 않은 카테고리입니다.' });

    const sourceType = supportModel.normalizeSourceType(req.query.sourceType);
    const rows = await supportModel.listArticles(category, true, { sourceType });
    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
}

async function getAdminArticleDetail(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: '유효하지 않은 글 ID입니다.' });

    const sourceType = supportModel.normalizeSourceType(req.query.sourceType);

    if (sourceType === supportModel.SOURCE_TYPES.POST) {
      const post = await supportModel.findNoticePostById(id);
      if (!post || post.is_deleted) return res.status(404).json({ message: '글을 찾을 수 없습니다.' });
      return res.json(post);
    }

    const article = await supportModel.findArticleById(id);
    if (!article || article.is_deleted) return res.status(404).json({ message: '글을 찾을 수 없습니다.' });

    res.json({
      ...article,
      sourceType: supportModel.SOURCE_TYPES.SUPPORT,
      sourceId: article.id
    });
  } catch (error) {
    next(error);
  }
}

async function createArticle(req, res, next) {
  try {
    const category = supportModel.normalizeCategory(req.body.category) || supportModel.SUPPORT_CATEGORIES.NOTICE;
    const sourceType = supportModel.normalizeSourceType(req.body.sourceType)
      || (category === supportModel.SUPPORT_CATEGORIES.NOTICE ? supportModel.SOURCE_TYPES.POST : supportModel.SOURCE_TYPES.SUPPORT);
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const noticeType = String(req.body.noticeType || '').toUpperCase() === 'IMPORTANT' ? 'IMPORTANT' : 'NOTICE';
    const isPinned = Boolean(req.body.isPinned);
    const boardType = parseBoardType(req.body.boardType);

    if (!category) return res.status(400).json({ message: '유효하지 않은 카테고리입니다.' });
    if (!title || !content) return res.status(400).json({ message: '제목과 내용을 입력해주세요.' });

    if (sourceType === supportModel.SOURCE_TYPES.POST && category === supportModel.SUPPORT_CATEGORIES.NOTICE) {
      const id = await supportModel.createNoticePost({
        title,
        content,
        userId: req.user.id,
        noticeType,
        isPinned,
        boardType
      });

      const created = await supportModel.findNoticePostById(id);
      res.status(201).json({ success: true, article: created });
      return;
    }

    const id = await supportModel.createArticle({ category, title, content, userId: req.user.id });
    const created = await supportModel.findArticleById(id);
    res.status(201).json({ success: true, article: created });
  } catch (error) {
    next(error);
  }
}

async function updateArticle(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: '유효하지 않은 글 ID입니다.' });

    const sourceType = supportModel.normalizeSourceType(req.query.sourceType || req.body.sourceType);

    if (sourceType === supportModel.SOURCE_TYPES.POST) {
      const post = await supportModel.findNoticePostById(id);
      if (!post || post.is_deleted) return res.status(404).json({ message: '글을 찾을 수 없습니다.' });

      const title = String(req.body.title ?? post.title).trim();
      const content = String(req.body.content ?? post.content).trim();
      const noticeType = String(req.body.noticeType || post.noticeType || 'NOTICE').toUpperCase() === 'IMPORTANT' ? 'IMPORTANT' : 'NOTICE';
      const isPinned = Boolean(req.body.isPinned ?? post.isPinned);
      const boardType = parseBoardType(req.body.boardType ?? post.boardType);
      if (!title || !content) return res.status(400).json({ message: '제목과 내용을 입력해주세요.' });

      await supportModel.updateNoticePost(id, { title, content, noticeType, isPinned, boardType });
      res.json({ success: true });
      return;
    }

    const article = await supportModel.findArticleById(id);
    if (!article || article.is_deleted) return res.status(404).json({ message: '글을 찾을 수 없습니다.' });

    const category = supportModel.normalizeCategory(req.body.category) || article.category;
    const title = String(req.body.title ?? article.title).trim();
    const content = String(req.body.content ?? article.content).trim();
    if (!title || !content) return res.status(400).json({ message: '제목과 내용을 입력해주세요.' });

    await supportModel.updateArticle(id, { category, title, content, userId: req.user.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function deleteArticle(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: '유효하지 않은 글 ID입니다.' });

    const sourceType = supportModel.normalizeSourceType(req.query.sourceType);
    if (sourceType === supportModel.SOURCE_TYPES.POST) {
      const post = await supportModel.findNoticePostById(id);
      if (!post || post.is_deleted) return res.status(404).json({ message: '글을 찾을 수 없습니다.' });

      await supportModel.deleteNoticePost(id);
      res.json({ success: true });
      return;
    }

    const article = await supportModel.findArticleById(id);
    if (!article || article.is_deleted) return res.status(404).json({ message: '글을 찾을 수 없습니다.' });

    await supportModel.deleteArticle(id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function createInquiry(req, res, next) {
  try {
    const type = supportModel.normalizeInquiryType(req.body.type);
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const targetType = String(req.body.targetType || '').trim().toLowerCase() || null;
    const targetId = parseId(req.body.targetId);

    if (!title || !content) return res.status(400).json({ message: '제목과 내용을 입력해주세요.' });

    const id = await supportModel.createInquiry({
      userId: req.user.id,
      type,
      title,
      content,
      targetType,
      targetId,
      attachmentUrls: await resolveAttachmentUrls(req.body)
    });

    res.status(201).json({ success: true, id });
  } catch (error) {
    next(error);
  }
}

async function listMyInquiries(req, res, next) {
  try {
    const rows = await supportModel.listInquiriesByUser(req.user.id);
    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
}

async function getMyInquiryDetail(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: '유효하지 않은 문의 ID입니다.' });

    const inquiry = await supportModel.findInquiryById(id);
    if (!inquiry || Number(inquiry.user_id) !== Number(req.user.id)) {
      return res.status(404).json({ message: '문의를 찾을 수 없습니다.' });
    }

    res.json({
      id: inquiry.id,
      userId: inquiry.user_id,
      type: inquiry.inquiry_type,
      targetType: inquiry.target_type,
      targetId: inquiry.target_id,
      title: inquiry.title,
      content: inquiry.content,
      attachmentUrls: inquiry.attachmentUrls || [],
      status: inquiry.status,
      answerContent: inquiry.answer_content,
      answeredAt: inquiry.answered_at,
      createdAt: inquiry.created_at,
      updatedAt: inquiry.updated_at
    });
  } catch (error) {
    next(error);
  }
}

async function listAdminInquiries(req, res, next) {
  try {
    const status = supportModel.normalizeInquiryStatus(req.query.status);
    if (req.query.status && !status) return res.status(400).json({ message: '유효하지 않은 처리 상태입니다.' });

    const rows = await supportModel.listInquiriesForAdmin({ status });
    res.json({ content: rows, totalElements: rows.length });
  } catch (error) {
    next(error);
  }
}

async function answerInquiry(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: '유효하지 않은 문의 ID입니다.' });

    const inquiry = await supportModel.findInquiryById(id);
    if (!inquiry) return res.status(404).json({ message: '문의를 찾을 수 없습니다.' });

    const answerContent = String(req.body.answerContent || '').trim();
    if (!answerContent) return res.status(400).json({ message: '답변 내용을 입력해주세요.' });

    await supportModel.answerInquiry(id, { answerContent, answeredBy: req.user.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPublicArticles,
  getPublicArticleDetail,
  listAdminArticles,
  getAdminArticleDetail,
  createArticle,
  updateArticle,
  deleteArticle,
  createInquiry,
  listMyInquiries,
  getMyInquiryDetail,
  listAdminInquiries,
  answerInquiry
};

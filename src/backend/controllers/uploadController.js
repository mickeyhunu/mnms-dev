/**
 * 파일 역할: 파일 업로드 API 요청을 받아 S3 저장 후 URL/메타데이터를 반환하는 컨트롤러 파일.
 */
const { uploadDataUrlToS3 } = require('../utils/fileUpload');

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ATTACHMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, 'application/pdf'];

async function uploadPostImages(req, res, next) {
  try {
    const files = Array.isArray(req.body.files) ? req.body.files : [];
    if (!files.length) return res.status(400).json({ message: '업로드할 파일이 없습니다.' });

    const uploaded = [];
    for (const file of files.slice(0, 5)) {
      const uploadedItem = await uploadDataUrlToS3({
        dataUrl: file.dataUrl,
        fileName: file.fileName,
        folder: 'posts',
        allowedMimeTypes: IMAGE_MIME_TYPES,
        maxBytes: 8 * 1024 * 1024
      });
      uploaded.push(uploadedItem);
    }

    res.status(201).json({ success: true, files: uploaded });
  } catch (error) {
    next(error);
  }
}

async function uploadSupportAttachments(req, res, next) {
  try {
    const files = Array.isArray(req.body.files) ? req.body.files : [];
    if (!files.length) return res.status(400).json({ message: '업로드할 파일이 없습니다.' });

    const uploaded = [];
    for (const file of files.slice(0, 3)) {
      const uploadedItem = await uploadDataUrlToS3({
        dataUrl: file.dataUrl,
        fileName: file.fileName,
        folder: 'support',
        allowedMimeTypes: ATTACHMENT_MIME_TYPES,
        maxBytes: 12 * 1024 * 1024
      });
      uploaded.push(uploadedItem);
    }

    res.status(201).json({ success: true, files: uploaded });
  } catch (error) {
    next(error);
  }
}

async function uploadAdImages(req, res, next) {
  try {
    const files = Array.isArray(req.body.files) ? req.body.files : [];
    if (!files.length) return res.status(400).json({ message: '업로드할 파일이 없습니다.' });

    const uploadedItem = await uploadDataUrlToS3({
      dataUrl: files[0]?.dataUrl,
      fileName: files[0]?.fileName,
      folder: 'ads',
      allowedMimeTypes: IMAGE_MIME_TYPES,
      maxBytes: 8 * 1024 * 1024
    });

    res.status(201).json({ success: true, files: [uploadedItem] });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadPostImages,
  uploadSupportAttachments,
  uploadAdImages
};

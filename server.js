/**
 * 파일 역할: Node/Express 서버를 초기화하고 백엔드 라우트를 연결하는 진입점 파일.
 */
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const path = require('path');
const ONE_HOUR_IN_SECONDS = 60 * 60;

require('./src/backend/config/loadEnv');

const { initDatabase, dbConfig, useLocalDb } = require('./src/backend/config/database');
const authRoutes = require('./src/backend/routes/authRoutes');
const postRoutes = require('./src/backend/routes/postRoutes');
const userRoutes = require('./src/backend/routes/userRoutes');
const adminRoutes = require('./src/backend/routes/adminRoutes');
const supportRoutes = require('./src/backend/routes/supportRoutes');
const chatbotRoutes = require('./src/backend/routes/chatbotRoutes');
const liveRoutes = require('./src/backend/routes/liveRoutes');
const uploadRoutes = require('./src/backend/routes/uploadRoutes');
const adminModel = require('./src/backend/models/adminModel');
const { startLiveHistoryScheduler } = require('./src/backend/utils/liveHistoryScheduler');
const { ensureS3BucketExists, isS3UploadEnabled, s3BucketName } = require('./src/backend/config/s3');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const FRONTEND_DIR = path.join(__dirname, 'src/frontend');
let isDatabaseReady = false;
const trustProxyValue = String(process.env.TRUST_PROXY || '1').trim();

app.set('trust proxy', trustProxyValue);

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

app.all('/kcp/callback', (req, res) => {
  const body = req.body || {};
  const success = String(body.res_cd || body.result_cd || '').trim() === '0000';
  const payload = {
    success,
    message: String(body.res_msg || body.result_msg || '').trim() || (success ? '본인인증이 완료되었습니다.' : '본인인증에 실패했습니다.'),
    phone: String(body.phone_no || body.cellno || '').trim(),
    ci: String(body.ci || body.CI || '').trim(),
    genderDigit: String(body.sex_code || body.sex || '').trim()
  };

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>KCP 본인인증 결과</title>
</head>
<body>
  <script>
    (function () {
      var payload = ${JSON.stringify(payload)};
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: 'KCP_IDENTITY_VERIFICATION_RESULT',
          payload: payload
        }, window.location.origin);
      }
      window.close();
    })();
  </script>
</body>
</html>`);
});

function parseCookies(cookieHeader = '') {
  return String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex <= 0) return acc;
      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    next();
    return;
  }

  const acceptsHtml = String(req.headers.accept || '').includes('text/html');
  const isStaticAssetRequest = path.extname(req.path || '') !== '';

  if (!acceptsHtml || isStaticAssetRequest) {
    next();
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  let visitorKey = String(cookies.mnms_visitor || '').trim();

  if (!visitorKey) {
    visitorKey = crypto.randomUUID();
    const cookieAttrs = [
      `mnms_visitor=${encodeURIComponent(visitorKey)}`,
      'Path=/',
      `Max-Age=${60 * 60 * 24 * 365}`,
      'SameSite=Lax',
      'HttpOnly'
    ];
    if (req.secure) cookieAttrs.push('Secure');
    res.append('Set-Cookie', cookieAttrs.join('; '));
  }

  if (isDatabaseReady) {
    adminModel.recordSiteVisit({ visitorKey, path: req.path || '/' }).catch((error) => {
      console.error('site visit log failed:', error.message);
    });
  }

  next();
});

app.use(express.static(FRONTEND_DIR, {
  etag: true,
  lastModified: true,
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    const extension = path.extname(filePath || '').toLowerCase();
    if (extension === '.html') {
      res.setHeader('Cache-Control', 'no-cache');
      return;
    }

    if (['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'].includes(extension)) {
      res.setHeader('Cache-Control', `public, max-age=${ONE_HOUR_IN_SECONDS}, must-revalidate`);
    }
  }
}));

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/live')) {
    return next();
  }

  if (!isDatabaseReady) {
    return res.status(503).json({ message: '데이터베이스 연결이 준비되지 않았습니다.' });
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/uploads', uploadRoutes);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Not Found' });
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: '서버 오류가 발생했습니다.', detail: err.message });
});

Promise.resolve()
  .then(() => ensureS3BucketExists())
  .then((result) => {
    if (result?.enabled) {
      console.log(`S3 bucket ready: ${result.bucketName}${result.created ? ' (created)' : ''}`);
    } else {
      console.log('S3 upload disabled: S3_BUCKET_NAME 미설정');
    }
  })
  .catch((error) => {
    console.error('S3 초기화 실패:', error.message);
    console.log('S3가 비활성화된 상태로 계속 진행합니다.');
  })
  .then(() => initDatabase())
  .then(() => {
    isDatabaseReady = true;
    return startLiveHistoryScheduler()
      .catch((error) => {
        console.error('LIVE history scheduler start failed:', error.message);
      })
      .then(() => {
        app.listen(PORT, () => {
          console.log(`Express MVC server running on http://localhost:${PORT}`);
          console.log(`DB mode: ${useLocalDb ? 'local' : 'deployed'}`);
          console.log(`MySQL: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
          if (isS3UploadEnabled()) {
            console.log(`S3 uploads: enabled (${s3BucketName})`);
          }
        });
      });
  })
  .catch((error) => {
    console.error('DB 초기화 실패:', error.message);
    startLiveHistoryScheduler()
      .catch((schedulerError) => {
        console.error('LIVE history scheduler start failed:', schedulerError.message);
      })
      .finally(() => {
        app.listen(PORT, () => {
          console.log(`Express MVC server running on http://localhost:${PORT}`);
          console.log(`DB mode: ${useLocalDb ? 'local' : 'deployed'}`);
          console.log('DB 연결 실패 상태로 실행 중입니다. API 요청은 503을 반환합니다.');
          if (isS3UploadEnabled()) {
            console.log(`S3 uploads: enabled (${s3BucketName})`);
          }
        });
      });
  });

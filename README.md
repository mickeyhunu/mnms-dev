# 🌐 익명 커뮤니티 게시판 (Node.js + MySQL + Vue 3)

Node.js(Express) + MySQL 백엔드와 Vue 3 기반 프론트엔드 구조로 정리된 프로젝트입니다.

## 기술 스택
- Backend: Node.js, Express
- Frontend: Vue 3 (ESM), Vue Router
- Database: MySQL 8+

## 프로젝트 구조
```text
src
├── backend
│   ├── config
│   ├── controllers
│   ├── middlewares
│   ├── models
│   ├── routes
│   └── utils
└── frontend
    ├── index.html
    └── src
        ├── assets
        ├── components
        ├── router
        ├── scripts
        └── views
```

## 실행 방법
```bash
npm install
npm run start
```

실행 후 접속
- http://localhost:8080

## MySQL 기본 환경변수
- `MYSQL_HOST=127.0.0.1`
- `MYSQL_PORT=3306`
- `MYSQL_USER=root`
- `MYSQL_PASSWORD=root`
- `MYSQL_DATABASE=mnms_DB`

## 배포 DB / 로컬 DB 분리
- 기본값은 **배포 DB 설정 사용**입니다.
- 로컬에서만 `src/backend/.env.local` 파일을 만들어 `MNMS_USE_LOCAL_DB=true`를 넣으면 로컬 DB 설정이 우선 적용됩니다.
- `.env.local`은 `.gitignore`에 추가되어 있어, 배포 서버 설정과 분리된 상태로 로컬 테스트를 진행할 수 있습니다.
- 예시 파일은 `src/backend/.env.local.example`입니다.

```bash
cp src/backend/.env.local.example src/backend/.env.local
```

로컬 모드 전용 환경변수:
- `MNMS_USE_LOCAL_DB=true`
- `MNMS_LOCAL_MYSQL_HOST`
- `MNMS_LOCAL_MYSQL_PORT`
- `MNMS_LOCAL_MYSQL_USER`
- `MNMS_LOCAL_MYSQL_PASSWORD`
- `MNMS_LOCAL_MYSQL_DATABASE`
- `CHATBOT_LOCAL_MYSQL_HOST`
- `CHATBOT_LOCAL_MYSQL_PORT`
- `CHATBOT_LOCAL_MYSQL_USER`
- `CHATBOT_LOCAL_MYSQL_PASSWORD`
- `CHATBOT_LOCAL_MYSQL_DATABASE`

## mnms_DB / chatBot_DB 분리
- 사이트에서 생성/수정되는 회원, 게시글, 댓글, 문의 등의 데이터는 `mnms_DB`에 저장됩니다.
- `chatBot_DB`는 룸, 웨이팅, 초이스톡, 엔트리 정보를 조회하는 읽기 전용 소스로만 사용합니다.

메인 사이트 DB 환경변수(우선 사용):
- `MNMS_MYSQL_HOST`
- `MNMS_MYSQL_PORT`
- `MNMS_MYSQL_USER`
- `MNMS_MYSQL_PASSWORD`
- `MNMS_MYSQL_DATABASE` (기본값: `mnms_DB`)

## chatBot_DB 동시 사용 (별도 DB 풀)
메인 사이트 DB와 별개로 `chatBot_DB`를 동시에 연결할 수 있습니다.

- 관리자 전용 API: `GET /api/chatbot/table?table=<테이블명>&limit=100`
- 응답: 지정한 `chatBot_DB` 테이블의 최신 행 목록

추가 환경변수(미지정 시 메인 DB 설정값 상속):
- `CHATBOT_MYSQL_HOST`
- `CHATBOT_MYSQL_PORT`
- `CHATBOT_MYSQL_USER`
- `CHATBOT_MYSQL_PASSWORD`
- `CHATBOT_MYSQL_DATABASE` (기본값: `chatBot_DB`)

## 기본 관리자 계정
- email: `admin@company.com`
- password: `admin1234`

## S3 파일 업로드 전환 (게시글 이미지 / 문의 첨부)

이 프로젝트는 업로드 파일의 바이너리를 DB에 직접 넣지 않고, S3에 저장한 뒤 DB에는 URL만 저장하도록 구성되어 있습니다.

### 1) 필수 환경변수
- `AWS_REGION` (예: `ap-northeast-2`)
- `S3_BUCKET_NAME`

자격증명 설정 방식(둘 중 하나):
- 환경변수 직접 설정: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (필요 시 `AWS_SESSION_TOKEN`)
- 또는 IAM Role/인스턴스 프로파일 등 AWS SDK 기본 자격증명 체인 사용

선택 환경변수:
- `S3_PUBLIC_BASE_URL` (CloudFront 도메인 등을 사용하는 경우)
- `S3_AUTO_CREATE_BUCKET=true` (서버 시작 시 버킷이 없으면 자동 생성)

### 2) 버킷 생성
자동 생성을 쓰지 않을 경우, AWS CLI로 먼저 생성하세요.

```bash
aws s3api create-bucket \
  --bucket <버킷명> \
  --region <리전> \
  --create-bucket-configuration LocationConstraint=<리전>
```

`us-east-1` 리전은 `--create-bucket-configuration` 없이 생성해야 합니다.

### 3) 업로드 API
- 게시글 이미지 업로드: `POST /api/uploads/posts/images`
- 문의 첨부 업로드: `POST /api/uploads/support/attachments`

두 API 모두 인증 필요(Bearer 토큰), body 예시는 다음과 같습니다.

```json
{
  "files": [
    { "fileName": "photo.png", "dataUrl": "data:image/png;base64,..." }
  ]
}
```

기존처럼 `POST /api/posts`, `POST /api/support/inquiries`로 data URL을 보내도 서버가 내부적으로 S3 업로드 후 URL로 변환해 저장합니다.


### 4) 업로드 실패 점검 포인트
- `AccessDenied` 에러: IAM 정책에 `s3:PutObject` 권한이 있는지 확인
- `NoSuchBucket` 에러: `S3_BUCKET_NAME`와 `AWS_REGION` 조합 확인
- 이미지 URL 접근 불가: 버킷/CloudFront 공개 정책 또는 서명 URL 전략 확인
- 게시글 작성 디버그가 필요하면 `/create-post?debugUpload=1`로 접속하면 성공 후 자동 이동 대신 콘솔에 업로드 결과를 남깁니다.

## KCP 본인인증 연동 설정
- 회원가입의 본인인증 버튼은 `POST /api/auth/request-identity-verification`로 요청을 보내고, 서버가 KCP 인증 화면으로 자동 전송합니다.
- 아래 환경변수 2개를 반드시 설정해야 실제 KCP 화면이 열립니다.
  - `KCP_REQUEST_URL` (KCP 인증 요청 URL)
  - `KCP_SITE_CODE` (KCP 사이트 코드)
- 선택 환경변수:
  - `KCP_RETURN_URL` (인증 완료 후 KCP가 리다이렉트할 URL. 미설정 시 `https?://<host>/kcp/callback` 자동 구성)

### PEM 키 보관 위치
- `.pem` 키는 프론트엔드/레포에 직접 넣지 말고, 서버의 외부 안전 경로(예: `/etc/mnms/kcp/`)에 저장하세요.
- 경로가 필요하면 `.env.local` 같은 로컬 전용 환경 파일을 통해 주입하세요.

/**
 * 파일 역할: constants에서 사용하는 공통 보조 함수/상수를 제공하는 유틸리티 파일.
 */
const API_BASE_URL = 'http://localhost:8080/api';

const ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        ME: '/auth/me',
        CHECK_NICKNAME: '/auth/check-nickname'
    },
    POSTS: {
        LIST: '/posts',
        DETAIL: '/posts',
        CREATE: '/posts',
        UPDATE: '/posts',
        DELETE: '/posts',
        LIKE: '/posts'
    },
    COMMENTS: {
        LIST: '/comments',
        CREATE: '/comments',
        UPDATE: '/comments',
        DELETE: '/comments'
    },
    BOOKMARKS: {
        LIST: '/bookmarks',
        TOGGLE: '/bookmarks/toggle',
        CHECK: '/bookmarks/check'
    },
    MESSAGES: {
        RECEIVED: '/messages/received',
        SENT: '/messages/sent',
        SEND: '/messages',
        READ: '/messages',
        DELETE: '/messages'
    }
};

const STORAGE_KEYS = {
    TOKEN: 'auth_token',
    USER: 'user_data'
};

const MESSAGES = {
    NETWORK_ERROR: '네트워크 오류가 발생했습니다. 다시 시도해주세요.',
    UNAUTHORIZED: '로그인이 필요합니다.',
    SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    REGISTER_SUCCESS: '회원가입이 완료되었습니다!',
    LOGIN_SUCCESS: '로그인되었습니다.',
    POST_CREATE_SUCCESS: '게시글이 작성되었습니다.',
    POST_UPDATE_SUCCESS: '게시글이 수정되었습니다.',
    POST_DELETE_SUCCESS: '게시글이 삭제되었습니다.',
    COMMENT_CREATE_SUCCESS: '댓글이 작성되었습니다.',
    BOOKMARK_ADDED: '북마크에 추가되었습니다.',
    BOOKMARK_REMOVED: '북마크가 해제되었습니다.',
    MESSAGE_SENT: '쪽지가 전송되었습니다.',
    MESSAGE_DELETED: '쪽지가 삭제되었습니다.'
};

const VALIDATION = {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    LOGIN_ID_REGEX: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,}$/,
    PASSWORD_REGEX: /^(?=.*[A-Za-z])(?=.*\d)[^\s]{8,}$/,
    MIN_PASSWORD_LENGTH: 8,
    NICKNAME_MIN_LENGTH: 2,
    NICKNAME_MAX_LENGTH: 8
};

const DEPARTMENTS = [
    '개발팀', '기획팀', '디자인팀', '마케팅팀',
    '영업팀', '인사팀', '재무팀', '운영팀'
];

const JOB_ROLES = [
    '신입', '주니어', '시니어', '리드',
    '매니저', '디렉터', '임원', '기타'
];

const PAGINATION = {
    DEFAULT_SIZE: 10,
    MAX_SIZE: 50
};

/**
 * 운영자가 추가로 차단하고 싶은 키워드 목록.
 * - 기본 사전형 필터와 함께 병합되어 적용됩니다.
 * - 필요 시 배포 없이 동적 주입(window.MNMS_BLOCKED_KEYWORDS)도 가능합니다.
 */
const CUSTOM_BLOCKED_KEYWORDS = [
    '도박사이트',
    '불법토토',
    '성매매'
];

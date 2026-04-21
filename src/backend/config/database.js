/**
 * 파일 역할: 애플리케이션의 데이터베이스 연결 설정을 담당하는 구성 파일.
 */
const mysql = require('mysql2/promise');
const { hashPassword, isHashedPassword } = require('../utils/passwordHasher');

function isEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

const useLocalDb = isEnabled(process.env.MNMS_USE_LOCAL_DB || process.env.USE_LOCAL_DB);

function readDbValue(options) {
  const { localKeys = [], remoteKeys = [], fallback } = options;
  const keys = useLocalDb ? [...localKeys, ...remoteKeys] : remoteKeys;

  for (const key of keys) {
    const value = process.env[key];

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }

  return fallback;
}

function readDbPort(options) {
  return Number(readDbValue(options));
}

const dbConfig = {
  host: readDbValue({
    localKeys: ['MNMS_LOCAL_MYSQL_HOST', 'LOCAL_MYSQL_HOST'],
    remoteKeys: ['MNMS_MYSQL_HOST', 'MYSQL_HOST', 'DB_HOST'],
    fallback: '127.0.0.1'
  }),
  port: readDbPort({
    localKeys: ['MNMS_LOCAL_MYSQL_PORT', 'LOCAL_MYSQL_PORT'],
    remoteKeys: ['MNMS_MYSQL_PORT', 'MYSQL_PORT', 'DB_PORT'],
    fallback: 3306
  }),
  user: readDbValue({
    localKeys: ['MNMS_LOCAL_MYSQL_USER', 'LOCAL_MYSQL_USER'],
    remoteKeys: ['MNMS_MYSQL_USER', 'MYSQL_USER', 'DB_USER'],
    fallback: 'root'
  }),
  password: readDbValue({
    localKeys: ['MNMS_LOCAL_MYSQL_PASSWORD', 'LOCAL_MYSQL_PASSWORD'],
    remoteKeys: ['MNMS_MYSQL_PASSWORD', 'MYSQL_PASSWORD', 'DB_PASSWORD'],
    fallback: 'root'
  }),
  database: readDbValue({
    localKeys: ['MNMS_LOCAL_MYSQL_DATABASE', 'LOCAL_MYSQL_DATABASE'],
    remoteKeys: ['MNMS_MYSQL_DATABASE', 'MYSQL_DATABASE', 'DB_NAME'],
    fallback: useLocalDb ? 'mnms_DB_local' : 'mnms_DB'
  }),
  connectionLimit: 10,
  charset: 'utf8mb4'
};

const chatbotDbConfig = {
  host: readDbValue({
    localKeys: ['CHATBOT_LOCAL_MYSQL_HOST'],
    remoteKeys: ['CHATBOT_MYSQL_HOST'],
    fallback: dbConfig.host
  }),
  port: readDbPort({
    localKeys: ['CHATBOT_LOCAL_MYSQL_PORT'],
    remoteKeys: ['CHATBOT_MYSQL_PORT'],
    fallback: dbConfig.port
  }),
  user: readDbValue({
    localKeys: ['CHATBOT_LOCAL_MYSQL_USER'],
    remoteKeys: ['CHATBOT_MYSQL_USER'],
    fallback: dbConfig.user
  }),
  password: readDbValue({
    localKeys: ['CHATBOT_LOCAL_MYSQL_PASSWORD'],
    remoteKeys: ['CHATBOT_MYSQL_PASSWORD'],
    fallback: dbConfig.password
  }),
  database: readDbValue({
    localKeys: ['CHATBOT_LOCAL_MYSQL_DATABASE'],
    remoteKeys: ['CHATBOT_MYSQL_DATABASE'],
    fallback: useLocalDb ? 'chatBot_DB_local' : 'chatBot_DB'
  }),
  connectionLimit: 10,
  charset: 'utf8mb4'
};

const CHATBOT_DATABASE_FALLBACKS = ['chatBot_DB', 'chatbot_db', 'chatbotdb'];

let pool;
let chatbotPool;
let chatbotPoolPromise;
let resolvedChatbotDbConfig;

async function ensureIndex(poolInstance, tableName, indexName, createQuery) {
  const [rows] = await poolInstance.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [dbConfig.database, tableName, indexName]
  );

  if (!rows.length) {
    await poolInstance.query(createQuery);
  }
}

function getChatbotDatabaseCandidates() {
  return [...new Set([
    chatbotDbConfig.database,
    process.env.CHATBOT_MYSQL_DATABASE,
    ...CHATBOT_DATABASE_FALLBACKS
  ].map((value) => String(value || '').trim()).filter(Boolean))];
}

async function resolveChatbotDbConfig() {
  if (resolvedChatbotDbConfig) return resolvedChatbotDbConfig;

  const bootstrap = await mysql.createConnection({
    host: chatbotDbConfig.host,
    port: chatbotDbConfig.port,
    user: chatbotDbConfig.user,
    password: chatbotDbConfig.password,
    charset: chatbotDbConfig.charset
  });

  try {
    const [rows] = await bootstrap.query('SHOW DATABASES');
    const databaseNames = rows.map((row) => String(Object.values(row)[0] || '').trim()).filter(Boolean);
    const normalizedMap = new Map(databaseNames.map((databaseName) => [databaseName.toLowerCase(), databaseName]));
    const candidates = getChatbotDatabaseCandidates();

    const matchedDatabase = candidates.find((candidate) => databaseNames.includes(candidate))
      || candidates.map((candidate) => normalizedMap.get(candidate.toLowerCase())).find(Boolean)
      || chatbotDbConfig.database;

    resolvedChatbotDbConfig = {
      ...chatbotDbConfig,
      database: matchedDatabase
    };

    return resolvedChatbotDbConfig;
  } finally {
    await bootstrap.end();
  }
}

async function initDatabase() {
  const bootstrap = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    charset: 'utf8mb4'
  });

  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await bootstrap.end();

  pool = mysql.createPool(dbConfig);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      nickname VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(100) NULL,
      birth_date DATE NULL,
      phone VARCHAR(30) NULL,
      terms_consent TINYINT(1) NOT NULL DEFAULT 0,
      privacy_consent TINYINT(1) NOT NULL DEFAULT 0,
      marketing_consent TINYINT(1) NOT NULL DEFAULT 0,
      sms_consent TINYINT(1) NOT NULL DEFAULT 0,
      last_nickname_changed_at DATETIME NULL,
      identity_ci_hash CHAR(64) NULL,
      identity_di_hash CHAR(64) NULL,
      phone_hash CHAR(64) NULL,
      is_adult_verified TINYINT(1) NOT NULL DEFAULT 0,
      adult_verified_at DATETIME NULL,
      last_identity_verified_at DATETIME NULL,
      role ENUM('MEMBER','BUSINESS','ADMIN') NOT NULL DEFAULT 'MEMBER',
      member_type ENUM('MEMBER','BUSINESS') NOT NULL DEFAULT 'MEMBER',
      account_status ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
      login_restricted_until DATETIME NULL,
      is_login_restriction_permanent TINYINT(1) NOT NULL DEFAULT 0,
      total_points BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [totalPointsColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'total_points'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!totalPointsColumn.length) {
    await pool.query('ALTER TABLE users ADD COLUMN total_points BIGINT NOT NULL DEFAULT 0 AFTER role');
  }


  const [memberTypeColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'member_type'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!memberTypeColumn.length) {
    await pool.query("ALTER TABLE users ADD COLUMN member_type ENUM('MEMBER','BUSINESS') NOT NULL DEFAULT 'MEMBER' AFTER role");
  }

  await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('USER','MEMBER','BUSINESS','ADMIN') NOT NULL DEFAULT 'MEMBER'");
  await pool.query("ALTER TABLE users MODIFY COLUMN member_type ENUM('GENERAL','ADVERTISER','MEMBER','BUSINESS') NOT NULL DEFAULT 'MEMBER'");
  await pool.query("UPDATE users SET role = 'MEMBER' WHERE role = 'USER'");
  await pool.query("UPDATE users SET member_type = 'MEMBER' WHERE member_type = 'GENERAL'");
  await pool.query("UPDATE users SET member_type = 'BUSINESS' WHERE member_type = 'ADVERTISER'");
  await pool.query("UPDATE users SET role = 'BUSINESS' WHERE role = 'MEMBER' AND member_type = 'BUSINESS'");
  await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('MEMBER','BUSINESS','ADMIN') NOT NULL DEFAULT 'MEMBER'");
  await pool.query("ALTER TABLE users MODIFY COLUMN member_type ENUM('MEMBER','BUSINESS') NOT NULL DEFAULT 'MEMBER'");

  const userColumnDefinitions = [
    { name: 'name', query: "ALTER TABLE users ADD COLUMN name VARCHAR(100) NULL AFTER nickname" },
    { name: 'birth_date', query: "ALTER TABLE users ADD COLUMN birth_date DATE NULL AFTER name" },
    { name: 'phone', query: "ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL AFTER birth_date" },
    { name: 'terms_consent', query: "ALTER TABLE users ADD COLUMN terms_consent TINYINT(1) NOT NULL DEFAULT 0 AFTER phone" },
    { name: 'privacy_consent', query: "ALTER TABLE users ADD COLUMN privacy_consent TINYINT(1) NOT NULL DEFAULT 0 AFTER terms_consent" },
    { name: 'marketing_consent', query: "ALTER TABLE users ADD COLUMN marketing_consent TINYINT(1) NOT NULL DEFAULT 0 AFTER privacy_consent" },
    { name: 'sms_consent', query: "ALTER TABLE users ADD COLUMN sms_consent TINYINT(1) NOT NULL DEFAULT 0 AFTER marketing_consent" },
    { name: 'last_nickname_changed_at', query: "ALTER TABLE users ADD COLUMN last_nickname_changed_at DATETIME NULL AFTER sms_consent" },
    { name: 'account_status', query: "ALTER TABLE users ADD COLUMN account_status ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE' AFTER member_type" },
    { name: 'login_restricted_until', query: "ALTER TABLE users ADD COLUMN login_restricted_until DATETIME NULL AFTER account_status" },
    { name: 'is_login_restriction_permanent', query: "ALTER TABLE users ADD COLUMN is_login_restriction_permanent TINYINT(1) NOT NULL DEFAULT 0 AFTER login_restricted_until" },
    { name: 'identity_ci_hash', query: "ALTER TABLE users ADD COLUMN identity_ci_hash CHAR(64) NULL AFTER phone" },
    { name: 'identity_di_hash', query: "ALTER TABLE users ADD COLUMN identity_di_hash CHAR(64) NULL AFTER identity_ci_hash" },
    { name: 'phone_hash', query: "ALTER TABLE users ADD COLUMN phone_hash CHAR(64) NULL AFTER identity_di_hash" },
    { name: 'is_adult_verified', query: "ALTER TABLE users ADD COLUMN is_adult_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER phone_hash" },
    { name: 'adult_verified_at', query: "ALTER TABLE users ADD COLUMN adult_verified_at DATETIME NULL AFTER is_adult_verified" },
    { name: 'last_identity_verified_at', query: "ALTER TABLE users ADD COLUMN last_identity_verified_at DATETIME NULL AFTER adult_verified_at" }
  ];

  for (const column of userColumnDefinitions) {
    const [rows] = await pool.query(
      `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = ?
       LIMIT 1`,
      [dbConfig.database, column.name]
    );

    if (!rows.length) {
      await pool.query(column.query);
    }
  }

  const [emailConsentColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'email_consent'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (emailConsentColumn.length) {
    await pool.query('ALTER TABLE users DROP COLUMN email_consent');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS identity_verification_usages (
      identity_verification_id VARCHAR(120) PRIMARY KEY,
      ci_hash CHAR(64) NULL,
      di_hash CHAR(64) NULL,
      phone_hash CHAR(64) NULL,
      used_by_user_id BIGINT NULL,
      used_ip_address VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_identity_verification_usages_ci (ci_hash),
      INDEX idx_identity_verification_usages_di (di_hash),
      INDEX idx_identity_verification_usages_phone (phone_hash),
      FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS signup_restrictions (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      ci_hash CHAR(64) NULL,
      di_hash CHAR(64) NULL,
      phone_hash CHAR(64) NULL,
      restriction_type ENUM('REJOIN_WAIT','BLACKLIST','SUSPENDED_HISTORY') NOT NULL DEFAULT 'REJOIN_WAIT',
      reason VARCHAR(255) NULL,
      restricted_until DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_signup_restrictions_ci (ci_hash),
      INDEX idx_signup_restrictions_di (di_hash),
      INDEX idx_signup_restrictions_phone (phone_hash),
      INDEX idx_signup_restrictions_until (restricted_until)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token VARCHAR(512) PRIMARY KEY,
      user_id BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_profiles (
      user_id BIGINT PRIMARY KEY,
      company_name VARCHAR(255) NULL,
      business_registration_number VARCHAR(100) NULL,
      manager_name VARCHAR(100) NULL,
      contact_phone VARCHAR(30) NULL,
      has_ad_permission TINYINT(1) NOT NULL DEFAULT 0,
      approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
      registration_status ENUM('UNREGISTERED','DRAFT','REGISTERED') NOT NULL DEFAULT 'UNREGISTERED',
      business_info JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_business_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [sessionTokenColumn] = await pool.query(
    `SELECT CHARACTER_MAXIMUM_LENGTH AS maxLength
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'sessions'
       AND COLUMN_NAME = 'token'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (sessionTokenColumn.length && Number(sessionTokenColumn[0].maxLength || 0) < 512) {
    await pool.query('ALTER TABLE sessions MODIFY COLUMN token VARCHAR(512) PRIMARY KEY');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_login_histories (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      ip_address VARCHAR(255) NOT NULL,
      user_agent VARCHAR(500) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_login_histories_user_created_at (user_id, created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_events (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      event_type VARCHAR(50) NOT NULL,
      reason VARCHAR(120) NULL,
      user_id BIGINT NULL,
      login_id_hash CHAR(64) NULL,
      ip_address_masked VARCHAR(64) NOT NULL,
      user_agent VARCHAR(500) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_auth_events_created_at (created_at),
      INDEX idx_auth_events_type_created_at (event_type, created_at),
      INDEX idx_auth_events_user_created_at (user_id, created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NULL,
      board_type ENUM('FREE','ANON','REVIEW','STORY','QUESTION','PROMOTION') NOT NULL DEFAULT 'FREE',
      is_notice TINYINT(1) NOT NULL DEFAULT 0,
      notice_type ENUM('NOTICE','IMPORTANT') NULL,
      is_pinned TINYINT(1) NOT NULL DEFAULT 0,
      notice_target_boards VARCHAR(50) NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      image_urls LONGTEXT NULL,
      is_hidden TINYINT(1) NOT NULL DEFAULT 0,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      view_count BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await ensureIndex(
    pool,
    'posts',
    'idx_posts_listing_all',
    'CREATE INDEX idx_posts_listing_all ON posts (is_deleted, is_notice, notice_type, is_pinned, created_at, id)'
  );

  await ensureIndex(
    pool,
    'posts',
    'idx_posts_listing_board',
    'CREATE INDEX idx_posts_listing_board ON posts (is_deleted, board_type, is_notice, created_at, id)'
  );

  const [viewCountColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'view_count'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!viewCountColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN view_count BIGINT NOT NULL DEFAULT 0');
  }

  const [postIsDeletedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'is_deleted'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!postIsDeletedColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER content');
  }

  const [postImageUrlsColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'image_urls'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!postImageUrlsColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN image_urls LONGTEXT NULL AFTER content');
  }

  const [postIsHiddenColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'is_hidden'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!postIsHiddenColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER image_urls');
  }

  const [postCreatePointAwardedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'create_point_awarded'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!postCreatePointAwardedColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN create_point_awarded TINYINT(1) NOT NULL DEFAULT 0 AFTER is_deleted');
  }

  const [postReviewBonusAwardedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'review_bonus_point_awarded'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!postReviewBonusAwardedColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN review_bonus_point_awarded TINYINT(1) NOT NULL DEFAULT 0 AFTER create_point_awarded');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS banner_ads (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      image_url VARCHAR(1000) NOT NULL,
      link_url VARCHAR(1000) NOT NULL,
      ad_type VARCHAR(30) NOT NULL DEFAULT 'LIVE',
      store_no INT NULL,
      display_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_ads (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      owner_user_id BIGINT NOT NULL,
      business_name VARCHAR(255) NOT NULL DEFAULT '',
      manager_name VARCHAR(100) NOT NULL DEFAULT '',
      manager_contact VARCHAR(30) NOT NULL DEFAULT '',
      title VARCHAR(255) NOT NULL,
      image_url VARCHAR(1000) NOT NULL,
      link_url VARCHAR(1000) NOT NULL,
      region VARCHAR(50) NOT NULL DEFAULT '',
      district VARCHAR(50) NOT NULL DEFAULT '',
      category VARCHAR(50) NOT NULL DEFAULT '',
      open_hour VARCHAR(20) NOT NULL DEFAULT '',
      close_hour VARCHAR(20) NOT NULL DEFAULT '',
      description TEXT NULL,
      plan_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
      view_count BIGINT NOT NULL DEFAULT 0,
      registration_status ENUM('UNREGISTERED','DRAFT','REGISTERED') NOT NULL DEFAULT 'UNREGISTERED',
      display_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_business_ads_owner (owner_user_id),
      CONSTRAINT fk_business_ads_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const businessAdsColumnMigrations = [
    { name: 'business_name', sql: "ALTER TABLE business_ads ADD COLUMN business_name VARCHAR(255) NOT NULL DEFAULT '' AFTER owner_user_id" },
    { name: 'manager_name', sql: "ALTER TABLE business_ads ADD COLUMN manager_name VARCHAR(100) NOT NULL DEFAULT '' AFTER business_name" },
    { name: 'manager_contact', sql: "ALTER TABLE business_ads ADD COLUMN manager_contact VARCHAR(30) NOT NULL DEFAULT '' AFTER manager_name" },
    { name: 'region', sql: "ALTER TABLE business_ads ADD COLUMN region VARCHAR(50) NOT NULL DEFAULT '' AFTER link_url" },
    { name: 'district', sql: "ALTER TABLE business_ads ADD COLUMN district VARCHAR(50) NOT NULL DEFAULT '' AFTER region" },
    { name: 'category', sql: "ALTER TABLE business_ads ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT '' AFTER district" },
    { name: 'open_hour', sql: "ALTER TABLE business_ads ADD COLUMN open_hour VARCHAR(20) NOT NULL DEFAULT '' AFTER category" },
    { name: 'close_hour', sql: "ALTER TABLE business_ads ADD COLUMN close_hour VARCHAR(20) NOT NULL DEFAULT '' AFTER open_hour" },
    { name: 'description', sql: 'ALTER TABLE business_ads ADD COLUMN description TEXT NULL AFTER close_hour' },
    { name: 'plan_type', sql: "ALTER TABLE business_ads ADD COLUMN plan_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL' AFTER description" },
    { name: 'view_count', sql: "ALTER TABLE business_ads ADD COLUMN view_count BIGINT NOT NULL DEFAULT 0 AFTER plan_type" },
    { name: 'registration_status', sql: "ALTER TABLE business_ads ADD COLUMN registration_status ENUM('UNREGISTERED','DRAFT','REGISTERED') NOT NULL DEFAULT 'UNREGISTERED' AFTER view_count" }
  ];

  for (const migration of businessAdsColumnMigrations) {
    const [columnRows] = await pool.query(
      `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'business_ads'
         AND COLUMN_NAME = ?
       LIMIT 1`,
      [dbConfig.database, migration.name]
    );

    if (!columnRows.length) {
      await pool.query(migration.sql);
    }
  }

  const [businessProfileRegistrationStatusColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'business_profiles'
       AND COLUMN_NAME = 'registration_status'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!businessProfileRegistrationStatusColumn.length) {
    await pool.query("ALTER TABLE business_profiles ADD COLUMN registration_status ENUM('UNREGISTERED','DRAFT','REGISTERED') NOT NULL DEFAULT 'UNREGISTERED' AFTER approval_status");
  }

  const [adsAdTypeColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'banner_ads'
       AND COLUMN_NAME = 'ad_type'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!adsAdTypeColumn.length) {
    await pool.query("ALTER TABLE banner_ads ADD COLUMN ad_type VARCHAR(30) NOT NULL DEFAULT 'LIVE' AFTER link_url");
  }

  const [adsStoreNoColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'banner_ads'
       AND COLUMN_NAME = 'store_no'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!adsStoreNoColumn.length) {
    await pool.query('ALTER TABLE banner_ads ADD COLUMN store_no INT NULL AFTER ad_type');
  }

  const [boardTypeColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'board_type'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!boardTypeColumn.length) {
    await pool.query("ALTER TABLE posts ADD COLUMN board_type ENUM('FREE','ANON','REVIEW','STORY','QUESTION','PROMOTION') NOT NULL DEFAULT 'FREE' AFTER user_id");
  }


  await pool.query("ALTER TABLE posts MODIFY COLUMN board_type ENUM('FREE','ANON','REVIEW','STORY','QUESTION','PROMOTION') NOT NULL DEFAULT 'FREE'");

  const [isNoticeColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'is_notice'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!isNoticeColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN is_notice TINYINT(1) NOT NULL DEFAULT 0 AFTER board_type');
  }

  const [noticeTargetColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'notice_target_boards'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!noticeTargetColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN notice_target_boards VARCHAR(50) NULL AFTER is_notice');
  }


  const [noticeTypeColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'notice_type'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!noticeTypeColumn.length) {
    await pool.query("ALTER TABLE posts ADD COLUMN notice_type ENUM('NOTICE','IMPORTANT') NULL AFTER is_notice");
  }

  const [isPinnedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'is_pinned'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!isPinnedColumn.length) {
    await pool.query('ALTER TABLE posts ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER notice_type');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      post_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      parent_id BIGINT NULL,
      is_secret TINYINT(1) NOT NULL DEFAULT 0,
      is_hidden TINYINT(1) NOT NULL DEFAULT 0,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await ensureIndex(
    pool,
    'comments',
    'idx_comments_post_deleted_created',
    'CREATE INDEX idx_comments_post_deleted_created ON comments (post_id, is_deleted, created_at)'
  );

  const [parentIdColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'comments'
       AND COLUMN_NAME = 'parent_id'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!parentIdColumn.length) {
    await pool.query('ALTER TABLE comments ADD COLUMN parent_id BIGINT NULL AFTER user_id');
    await pool.query('ALTER TABLE comments ADD CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE');
  }

  const [isSecretColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'comments'
       AND COLUMN_NAME = 'is_secret'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!isSecretColumn.length) {
    await pool.query('ALTER TABLE comments ADD COLUMN is_secret TINYINT(1) NOT NULL DEFAULT 0 AFTER parent_id');
  }

  const [isHiddenColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'comments'
       AND COLUMN_NAME = 'is_hidden'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!isHiddenColumn.length) {
    await pool.query('ALTER TABLE comments ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER is_secret');
  }

  const [isDeletedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'comments'
       AND COLUMN_NAME = 'is_deleted'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!isDeletedColumn.length) {
    await pool.query('ALTER TABLE comments ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_secret');
  }

  const [commentPointAwardedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'comments'
       AND COLUMN_NAME = 'point_awarded'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!commentPointAwardedColumn.length) {
    await pool.query('ALTER TABLE comments ADD COLUMN point_awarded TINYINT(1) NOT NULL DEFAULT 0 AFTER is_deleted');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_likes (
      post_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      liker_point_awarded TINYINT(1) NOT NULL DEFAULT 0,
      author_point_awarded TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [likerPointAwardedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'post_likes'
       AND COLUMN_NAME = 'liker_point_awarded'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!likerPointAwardedColumn.length) {
    await pool.query('ALTER TABLE post_likes ADD COLUMN liker_point_awarded TINYINT(1) NOT NULL DEFAULT 0 AFTER user_id');
  }

  const [authorPointAwardedColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'post_likes'
       AND COLUMN_NAME = 'author_point_awarded'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!authorPointAwardedColumn.length) {
    await pool.query('ALTER TABLE post_likes ADD COLUMN author_point_awarded TINYINT(1) NOT NULL DEFAULT 0 AFTER liker_point_awarded');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS point_histories (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      action_type ENUM('REGISTER','LOGIN_DAILY','CREATE_POST','CREATE_REVIEW_BONUS','CREATE_COMMENT','LIKE_POST','RECEIVE_POST_LIKE','REVOKE_CREATE_POST','REVOKE_CREATE_REVIEW_BONUS','REVOKE_CREATE_COMMENT','REVOKE_LIKE_POST','REVOKE_RECEIVE_POST_LIKE') NOT NULL,
      points INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_point_histories_user_action_created_at (user_id, action_type, created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);


  await pool.query(`
    ALTER TABLE point_histories
    MODIFY COLUMN action_type ENUM('REGISTER','LOGIN_DAILY','CREATE_POST','CREATE_REVIEW_BONUS','CREATE_COMMENT','LIKE_POST','RECEIVE_POST_LIKE','REVOKE_CREATE_POST','REVOKE_CREATE_REVIEW_BONUS','REVOKE_CREATE_COMMENT','REVOKE_LIKE_POST','REVOKE_RECEIVE_POST_LIKE') NOT NULL
  `);


  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_articles (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      category ENUM('NOTICE','FAQ') NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      created_by BIGINT NULL,
      updated_by BIGINT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);



  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_inquiries (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      inquiry_type VARCHAR(50) NOT NULL,
      target_type VARCHAR(20) NULL,
      target_id BIGINT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      attachment_urls LONGTEXT NULL,
      status ENUM('PENDING','ANSWERED') NOT NULL DEFAULT 'PENDING',
      answer_content TEXT NULL,
      answered_by BIGINT NULL,
      answered_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_support_inquiries_user_created (user_id, created_at),
      INDEX idx_support_inquiries_status_created (status, created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (answered_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notification_reads (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      notification_key VARCHAR(191) NOT NULL,
      read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_notification_reads_user_key (user_id, notification_key),
      INDEX idx_user_notification_reads_user_read_at (user_id, read_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_post_reads (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      post_id BIGINT NOT NULL,
      read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_post_reads_user_post (user_id, post_id),
      INDEX idx_user_post_reads_user_read_at (user_id, read_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_visit_logs (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      visitor_key VARCHAR(100) NOT NULL,
      path VARCHAR(255) NOT NULL,
      visit_date DATE NOT NULL,
      page_views BIGINT NOT NULL DEFAULT 1,
      first_visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_site_visit_logs_visitor_date_path (visitor_key, visit_date, path),
      INDEX idx_site_visit_logs_visit_date (visit_date),
      INDEX idx_site_visit_logs_visitor (visitor_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [supportAttachmentUrlsColumn] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'support_inquiries'
       AND COLUMN_NAME = 'attachment_urls'
     LIMIT 1`,
    [dbConfig.database]
  );

  if (!supportAttachmentUrlsColumn.length) {
    await pool.query('ALTER TABLE support_inquiries ADD COLUMN attachment_urls LONGTEXT NULL AFTER content');
  }

  const [adminRows] = await pool.query('SELECT id, password FROM users WHERE email = ?', ['admin@company.com']);
  if (!adminRows.length) {
    const adminPasswordHash = await hashPassword('admin1234');
    await pool.query(
      'INSERT INTO users (email, password, nickname, role, member_type) VALUES (?, ?, ?, ?, ?)',
      ['admin@company.com', adminPasswordHash, '관리자', 'ADMIN', 'MEMBER']
    );
  } else if (!isHashedPassword(adminRows[0].password)) {
    const adminPasswordHash = await hashPassword(adminRows[0].password);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [adminPasswordHash, adminRows[0].id]);
  }
}

function getPool() {
  if (!pool) throw new Error('Database is not initialized');
  return pool;
}

async function getChatbotPool() {
  if (chatbotPool) return chatbotPool;

  if (!chatbotPoolPromise) {
    chatbotPoolPromise = resolveChatbotDbConfig()
      .then((config) => {
        chatbotPool = mysql.createPool(config);
        return chatbotPool;
      })
      .catch((error) => {
        chatbotPoolPromise = null;
        throw error;
      });
  }

  return chatbotPoolPromise;
}

module.exports = {
  dbConfig,
  chatbotDbConfig,
  useLocalDb,
  initDatabase,
  getPool,
  getChatbotPool
};

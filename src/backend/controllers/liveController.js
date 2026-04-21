/**
 * 파일 역할: LIVE 페이지용 필터/목록 조회 요청을 처리하는 컨트롤러 파일.
 */
const liveModel = require('../models/liveModel');
const adminModel = require('../models/adminModel');

const LIVE_DB_CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH'
]);
const TOP_AD_PLACEMENTS = new Set(['HOME', 'COMMUNITY']);

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function handleLiveError(error, next, res) {
  if (error.code === 'ER_NO_SUCH_TABLE') {
    return res.status(404).json({ message: 'LIVE 페이지 조회 대상 테이블을 찾을 수 없습니다.' });
  }

  if (error.code === 'ER_BAD_DB_ERROR') {
    return res.status(503).json({ message: 'LIVE 전용 데이터베이스를 찾을 수 없습니다.', detail: error.message });
  }

  if (LIVE_DB_CONNECTION_ERROR_CODES.has(error.code)) {
    return res.status(503).json({ message: 'LIVE 전용 데이터베이스에 연결할 수 없습니다.', detail: error.message });
  }

  return next(error);
}

async function getLiveFilters(req, res, next) {
  try {
    const data = await liveModel.getLiveFilters();
    return res.json(data);
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

async function getLiveEntries(req, res, next) {
  try {
    const categoryKey = req.query.category;
    const storeNo = parsePositiveInt(req.query.storeNo);
    const { limit, offset } = req.query;
    const data = await liveModel.listLiveEntries(categoryKey, { storeNo, limit, offset });
    const totalCount = await liveModel.countRows(data.category.tableName, {
      storeNo,
      storeName: data.selectedStore?.storeName || ''
    });

    return res.json({
      selectedCategory: data.category,
      selectedStoreNo: data.selectedStore?.storeNo || null,
      selectedStoreName: data.selectedStore?.storeName || '전체',
      totalCount,
      columns: data.columns,
      titleColumn: data.titleColumn,
      storeFilterColumn: data.storeFilterColumn,
      rows: data.rows,
      limit: data.rowLimit,
      offset: data.rowOffset,
      hasMore: data.category.key !== 'entry' && totalCount > (data.rowOffset + data.rows.length),
      nextOffset: data.category.key !== 'entry' ? data.rowOffset + data.rows.length : data.rowOffset
    });
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

async function getLiveAds(req, res, next) {
  try {
    const storeNo = parsePositiveInt(req.query.storeNo);
    if (!storeNo) {
      return res.status(400).json({ message: '유효한 매장 번호가 필요합니다.' });
    }

    const ads = await adminModel.listLiveAdsByStore(storeNo);
    return res.json({
      storeNo,
      content: ads,
      totalElements: ads.length
    });
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

async function getTopAds(req, res, next) {
  try {
    const placement = String(req.query.placement || 'HOME').trim().toUpperCase();
    if (!TOP_AD_PLACEMENTS.has(placement)) {
      return res.status(400).json({ message: '유효한 상단 광고 위치값이 필요합니다.' });
    }

    const ads = await adminModel.listTopAdsByPlacement(placement);
    return res.json({
      placement,
      content: ads,
      totalElements: ads.length
    });
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

async function getBusinessAds(req, res, next) {
  try {
    const region = String(req.query.region || '').trim();
    const district = String(req.query.district || '').trim();
    const category = String(req.query.category || '').trim();
    const keyword = String(req.query.keyword || '').trim();
    const ads = await adminModel.listPublicBusinessAds({ region, district, category, keyword });
    const adIds = ads.map((ad) => Number.parseInt(ad.id, 10)).filter((id) => Number.isInteger(id) && id > 0);
    await adminModel.increaseBusinessAdViewCounts(adIds);
    const content = ads.map((ad) => ({
      ...ad,
      viewCount: Number(ad.viewCount || 0) + 1
    }));
    return res.json({
      region: region || null,
      district: district || null,
      category: category || null,
      keyword: keyword || null,
      content,
      totalElements: content.length
    });
  } catch (error) {
    return handleLiveError(error, next, res);
  }
}

module.exports = {
  getLiveFilters,
  getLiveEntries,
  getLiveAds,
  getTopAds,
  getBusinessAds
};

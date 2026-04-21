/**
 * 파일 역할: chatBot_DB 조회 요청을 처리하는 컨트롤러 파일.
 */
const chatbotModel = require('../models/chatbotModel');

async function listTableRows(req, res, next) {
  try {
    const tableName = req.query.table;
    if (!tableName) {
      return res.status(400).json({ message: '조회할 테이블 이름(table)이 필요합니다.' });
    }

    const limit = req.query.limit;
    const rows = await chatbotModel.listTableRows(tableName, limit);
    return res.json({
      table: String(tableName).trim(),
      content: rows,
      totalElements: rows.length
    });
  } catch (error) {
    if (error.message.includes('유효하지 않은 테이블 이름')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(404).json({ message: '요청한 테이블을 찾을 수 없습니다.' });
    }
    return next(error);
  }
}

module.exports = {
  listTableRows
};

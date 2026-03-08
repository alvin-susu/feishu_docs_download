/**
 * 搜索内容命令
 */

const ContentSearcher = require('../features/ContentSearcher');

module.exports = async function(assistant, query) {
  try {
    const searcher = new ContentSearcher(assistant);
    const result = await searcher.search(query);

    return {
      success: true,
      result,
      message: `搜索完成，找到相关内容`
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: '搜索内容失败'
    };
  }
};

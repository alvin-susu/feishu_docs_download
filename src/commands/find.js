/**
 * 查找文档命令
 */

const DocumentLocator = require('../features/DocumentLocator');

module.exports = async function(assistant, query) {
  try {
    const locator = new DocumentLocator(assistant);
    const result = await locator.find(query);

    return {
      success: true,
      result,
      message: `找到 ${result.length || 1} 个相关文档`
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: '查找文档失败'
    };
  }
};

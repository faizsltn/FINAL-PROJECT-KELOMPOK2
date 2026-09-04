const sendResponse = require('../utils/response');

function getHealth(req, res) {
  return sendResponse(res, {
    message: 'Backend jalan normal',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
}

module.exports = { getHealth };

/**
 * Format response seragam buat semua endpoint: { code, success, message, data }.
 * Dipake di semua controller biar frontend selalu tau bentuk responsnya
 * kayak apa, gak beda-beda tiap endpoint.
 */
function sendResponse(res, { code = 200, success = true, message = '', data = null }) {
  return res.status(code).json({ code, success, message, data });
}

module.exports = sendResponse;

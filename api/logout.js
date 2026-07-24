// POST /api/logout → cierra la sesión
const { clearSessionCookie } = require('../lib/auth');
const { sendJson } = require('../lib/http');

module.exports = async (req, res) => {
  clearSessionCookie(res);
  return sendJson(res, 200, { ok: true });
};

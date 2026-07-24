// GET /api/me → quién soy, lista de usuarios para el login, y última edición
const { currentUser, userList, authEnabled } = require('../lib/auth');
const { getState } = require('../lib/store');
const { sendJson } = require('../lib/http');

module.exports = async (req, res) => {
  const user = currentUser(req);
  let lastEdit = {};
  if (user) {
    try { const { meta } = await getState(); lastEdit = meta || {}; } catch (e) {}
  }
  return sendJson(res, 200, {
    user: user || null,
    authEnabled: authEnabled(),
    users: userList(),
    lastEdit
  });
};

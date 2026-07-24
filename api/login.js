// POST /api/login  {user, password} → valida y crea la sesión (cookie firmada)
const { verify, setSessionCookie } = require('../lib/auth');
const { sendJson, readJson } = require('../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'método no permitido' });
  const { user, password } = await readJson(req);
  if (!verify(user, password)) return sendJson(res, 401, { error: 'Usuario o contraseña incorrectos' });
  setSessionCookie(res, user);
  return sendJson(res, 200, { ok: true, user });
};

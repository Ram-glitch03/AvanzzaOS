// GET  /api/store  → estado completo (protegido)
// PUT  /api/store  → guarda el estado (protegido); registra quién editó
const { getState, setState } = require('../lib/store');
const { requireUser } = require('../lib/auth');
const { sendJson, readJson } = require('../lib/http');

module.exports = async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    if (req.method === 'GET') {
      const { data, meta } = await getState();
      res.setHeader('X-Updated-By', encodeURIComponent(meta.updatedBy || ''));
      res.setHeader('X-Updated-At', meta.updatedAt || '');
      return sendJson(res, 200, data);
    }
    if (req.method === 'PUT') {
      const body = await readJson(req);
      if (!body || !body.settings) return sendJson(res, 400, { error: 'estado inválido' });
      const meta = await setState(body, user);
      return sendJson(res, 200, { ok: true, ...meta });
    }
    return sendJson(res, 405, { error: 'método no permitido' });
  } catch (e) {
    return sendJson(res, 500, { error: e.message });
  }
};

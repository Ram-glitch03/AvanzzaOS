// GET /api/obsidian/note?path=... → contenido de una nota (solo donde el vault exista en disco)
const fs = require('fs');
const path = require('path');
const { getState } = require('../../lib/store');
const { requireUser } = require('../../lib/auth');
const { sendJson } = require('../../lib/http');

module.exports = async (req, res) => {
  if (!requireUser(req, res)) return;
  try {
    const { data } = await getState();
    const vault = data.settings && data.settings.vaultPath;
    if (!vault) return sendJson(res, 400, { error: 'sin vault' });
    const url = new URL(req.url, 'http://localhost');
    const file = url.searchParams.get('path') || '';
    const full = path.resolve(vault, file);
    if (!full.startsWith(path.resolve(vault))) return sendJson(res, 403, { error: 'fuera del vault' });
    return sendJson(res, 200, { path: file, content: fs.readFileSync(full, 'utf8') });
  } catch (e) { return sendJson(res, 500, { error: e.message }); }
};

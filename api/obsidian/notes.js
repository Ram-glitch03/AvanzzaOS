// GET /api/obsidian/notes → lista notas del vault (solo funciona donde el vault exista en disco, p.ej. local)
const fs = require('fs');
const path = require('path');
const { getState } = require('../../lib/store');
const { requireUser } = require('../../lib/auth');
const { sendJson } = require('../../lib/http');

function listVault(vaultPath) {
  const notes = [];
  (function walk(dir, rel) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      const relPath = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(full, relPath);
      else if (e.name.endsWith('.md')) {
        const st = fs.statSync(full);
        notes.push({ path: relPath, name: e.name.replace(/\.md$/, ''), modified: st.mtimeMs, size: st.size });
      }
    }
  })(vaultPath, '');
  notes.sort((a, b) => b.modified - a.modified);
  return notes;
}

module.exports = async (req, res) => {
  if (!requireUser(req, res)) return;
  try {
    const { data } = await getState();
    const vault = data.settings && data.settings.vaultPath;
    if (!vault || !fs.existsSync(vault)) return sendJson(res, 200, { connected: false, notes: [] });
    return sendJson(res, 200, { connected: true, vault, notes: listVault(vault) });
  } catch (e) { return sendJson(res, 200, { connected: false, notes: [], error: e.message }); }
};

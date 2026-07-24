// Capa de datos agnóstica: usa Supabase si hay credenciales, si no, archivo local.
// El resto de la app no sabe cuál backend está activo.
const fs = require('fs');
const path = require('path');

const SUPA_URL = process.env.SUPABASE_URL || '';
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const TABLE = process.env.AVZ_TABLE || 'avanzzaos_state';
const useSupabase = !!(SUPA_URL && SUPA_KEY);

const FILE = path.join(__dirname, '..', 'data', 'store.json');

function backendName() { return useSupabase ? 'supabase' : 'file'; }

const DEFAULT_STATE = {
  settings: { businessName: 'Avanzza OS', currency: 'MXN', hourlyRate: 30, vaultPath: '', taxRate: 16 },
  team: [], clients: [], agents: [], subscriptions: [], usageLog: [], skills: [],
  connections: [], tasks: [], invoices: [], expenses: [], projects: [],
  services: [], packages: [], quotes: []
};

// ---------- Supabase (REST / PostgREST) ----------
async function supaGet() {
  const r = await fetch(`${SUPA_URL}/rest/v1/${TABLE}?id=eq.1&select=data,updated_by,updated_at`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  });
  if (!r.ok) throw new Error(`Supabase GET ${r.status}: ${await r.text()}`);
  const rows = await r.json();
  if (!rows.length) return { data: DEFAULT_STATE, meta: {} };
  return { data: rows[0].data || DEFAULT_STATE, meta: { updatedBy: rows[0].updated_by, updatedAt: rows[0].updated_at } };
}
async function supaSet(data, updatedBy) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify([{ id: 1, data, updated_by: updatedBy || 'desconocido', updated_at: new Date().toISOString() }])
  });
  if (!r.ok) throw new Error(`Supabase POST ${r.status}: ${await r.text()}`);
}

// ---------- Archivo local ----------
function fileGet() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { data: raw, meta: {} };
  } catch (e) { return { data: DEFAULT_STATE, meta: {} }; }
}
function fileSet(data) {
  try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); } catch (e) {}
  try { fs.copyFileSync(FILE, FILE + '.bak'); } catch (e) {}
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// ---------- API pública ----------
async function getState() { return (useSupabase ? await supaGet() : fileGet()); }
async function setState(data, updatedBy) {
  if (useSupabase) await supaSet(data, updatedBy); else fileSet(data);
  return { ok: true, updatedBy: updatedBy || null, updatedAt: new Date().toISOString() };
}

module.exports = { getState, setState, backendName };

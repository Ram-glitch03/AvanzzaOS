// Autenticación simple por usuario con cookie firmada (sin dependencias).
// Usuarios y contraseñas viven en la variable de entorno APP_USERS (nunca en el repo).
// Formato: "Sebastián:contraseña1,Ramón:contraseña2,Mariana:contraseña3"
const crypto = require('crypto');

const SECRET = process.env.APP_SECRET || 'dev-secret-cambia-esto';
const COOKIE = 'avz_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function parseUsers() {
  const raw = process.env.APP_USERS || '';
  const map = {};
  raw.split(',').forEach(pair => {
    const i = pair.indexOf(':');
    if (i > 0) map[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  });
  return map;
}
function authEnabled() { return Object.keys(parseUsers()).length > 0; }
function userList() { return Object.keys(parseUsers()); }

function verify(name, password) {
  const users = parseUsers();
  return users[name] != null && password != null && String(users[name]) === String(password);
}

const b64 = s => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = s => Buffer.from(s, 'base64url').toString('utf8');
function hmac(s) { return crypto.createHmac('sha256', SECRET).update(s).digest('base64url'); }

function sign(name) {
  const payload = b64(JSON.stringify({ u: name, t: Date.now() }));
  return `${payload}.${hmac(payload)}`;
}
function readToken(token) {
  if (!token || token.indexOf('.') < 0) return null;
  const [payload, sig] = token.split('.');
  if (hmac(payload) !== sig) return null;
  try {
    const obj = JSON.parse(unb64(payload));
    if (!parseUsers()[obj.u]) return null; // usuario ya no existe
    return obj.u;
  } catch (e) { return null; }
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}
function setSessionCookie(res, name) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(sign(name))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// Devuelve el nombre del usuario actual, o null (y responde 401) si no hay sesión válida.
// Si la auth está desactivada (sin APP_USERS, p.ej. local), devuelve 'Local'.
function currentUser(req) {
  if (!authEnabled()) return 'Local';
  return readToken(getCookie(req, COOKIE));
}
function requireUser(req, res) {
  const u = currentUser(req);
  if (!u) { res.statusCode = 401; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'no autenticado' })); return null; }
  return u;
}

module.exports = { authEnabled, userList, verify, sign, readToken, currentUser, requireUser, setSessionCookie, clearSessionCookie, COOKIE };

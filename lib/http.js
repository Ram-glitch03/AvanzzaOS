// Helpers HTTP portables: sirven tanto para funciones serverless de Vercel
// como para el servidor http nativo de server.js (local).
function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function readJson(req) {
  return new Promise(resolve => {
    // Vercel ya parsea el body cuando el content-type es JSON
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') { try { return resolve(JSON.parse(req.body)); } catch { return resolve({}); } }
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

module.exports = { sendJson, readJson };

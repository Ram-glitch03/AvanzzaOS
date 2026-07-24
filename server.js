// Avanzza OS — servidor local de desarrollo (sin dependencias).
// Reusa las MISMAS funciones API que Vercel (carpeta /api), así local y nube se comportan igual.
// Ejecutar: node server.js  →  http://localhost:4173
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4173;
const PUBLIC = path.join(__dirname, 'public');
const { backendName } = require('./lib/store');

const routes = {
  'GET /api/me': require('./api/me'),
  'POST /api/login': require('./api/login'),
  'POST /api/logout': require('./api/logout'),
  'GET /api/store': require('./api/store'),
  'PUT /api/store': require('./api/store'),
  'GET /api/obsidian/notes': require('./api/obsidian/notes'),
  'GET /api/obsidian/note': require('./api/obsidian/note'),
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const key = `${req.method} ${url.pathname}`;
  if (routes[key]) return routes[key](req, res);

  // Estáticos desde /public
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const full = path.join(PUBLIC, path.normalize(filePath));
  if (!full.startsWith(PUBLIC)) { res.statusCode = 403; return res.end(); }
  fs.readFile(full, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('No encontrado'); }
    res.setHeader('Content-Type', MIME[path.extname(full)] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Avanzza OS corriendo en http://localhost:${PORT}  (datos: ${backendName()})`);
});

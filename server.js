/**
 * Jednoduchý vestavěný HTTP server pro Hru Lodě
 * Nevyžaduje žádné externí npm balíčky (využívá čistý Node.js http, fs, path).
 * 
 * Spuštění:
 * node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Ošetření URL (odstranění query parametrů např. ?room=LODE-1234)
  const urlPath = req.url.split('?')[0];
  let safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  
  if (safePath === '/' || safePath === '') {
    safePath = '/index.html';
  }

  const filePath = path.join(BASE_DIR, safePath);

  // Bezpečnostní kontrola, zda soubor neleží mimo kořenovou složku
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Přístup odepřen');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Soubor nenalezen');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚢 Hra Lodě (Námořní bitva) úspěšně spuštěna!`);
  console.log(`📡 Lokální adresa: http://localhost:${PORT}`);
  console.log(`🌐 Pro online hru s kamarádem zvol v menu "Online hra",`);
  console.log(`   zkopíruj kód místnosti nebo vygenerovaný odkaz.`);
  console.log(`=================================================\n`);
});


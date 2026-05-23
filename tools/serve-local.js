const http = require('http');
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const hostIndex = args.indexOf('--host');
const port = Number(portIndex >= 0 ? args[portIndex + 1] : process.env.PORT) || 4177;
const host = (hostIndex >= 0 ? args[hostIndex + 1] : process.env.HOST) || '127.0.0.1';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(body);
}

function resolveRequestPath(url) {
  const parsed = new URL(url, 'http://local.preview');
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';
  const requested = path.resolve(projectDir, '.' + pathname);
  if (!requested.startsWith(projectDir)) return null;
  return requested;
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    send(response, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
    return;
  }

  const filePath = resolveRequestPath(request.url);
  if (!filePath) {
    send(response, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(response, error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Not Found' : 'Server Error');
      return;
    }
    const type = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    if (request.method === 'HEAD') {
      send(response, 200, '', { 'Content-Type': type, 'Content-Length': data.length });
      return;
    }
    send(response, 200, data, { 'Content-Type': type, 'Content-Length': data.length });
  });
});

server.listen(port, host, () => {
  console.log('BuildPlan Pro local preview');
  console.log('URL: http://' + host + ':' + port + '/');
  console.log('Root: ' + projectDir);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));

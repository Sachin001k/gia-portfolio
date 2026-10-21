const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const PUBLIC_DIR = path.join(__dirname);

const server = http.createServer((req, res) => {
  // Decode %20 etc. (image folders have spaces) and drop any query string
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(PUBLIC_DIR, urlPath);

  // Don't serve anything outside the project folder
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }

  // Handle clean URLs - try to serve HTML files without extension
  if (!path.extname(urlPath)) {
    const htmlPath = filePath + '.html';
    if (fs.existsSync(htmlPath)) {
      filePath = htmlPath;
    }
  }

  // Default to index.html for root
  if (filePath === PUBLIC_DIR || filePath === PUBLIC_DIR + '/') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  // Read and serve the file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Page not found</h1>', 'utf-8');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.pdf': 'application/pdf',
    }[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log('Clean URLs enabled - no .html extensions needed!');
});

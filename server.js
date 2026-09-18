const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const PUBLIC_DIR = path.join(__dirname);

const server = http.createServer((req, res) => {
  let filePath = path.join(PUBLIC_DIR, req.url);

  // Handle clean URLs - try to serve HTML files without extension
  if (!filePath.endsWith('.html') && !filePath.endsWith('.css') && !filePath.endsWith('.js') && !filePath.endsWith('.json') && !req.url.includes('.')) {
    // Try .html file first
    const htmlPath = filePath + '.html';
    if (fs.existsSync(htmlPath)) {
      filePath = htmlPath;
    } else if (req.url === '/' && fs.existsSync(path.join(PUBLIC_DIR, 'index.html'))) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
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

    const ext = path.extname(filePath);
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
    }[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content, 'utf-8');
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log('Clean URLs enabled - no .html extensions needed!');
});

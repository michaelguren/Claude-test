/**
 * Simple local development server with no external dependencies
 *
 * Usage:
 * node scripts/local-server.js [port] [directory]
 *
 * Default port: 8080
 * Default directory: ./frontend
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

// Config
const PORT = process.argv[2] || 8080;
const STATIC_DIR = process.argv[3] || path.join(__dirname, "../frontend");

// MIME types
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
};

// Create server
const server = http.createServer((req, res) => {
  // Log request
  console.log(`${req.method} ${req.url}`);

  // Parse URL
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // Normalize pathname and map root to index.html
  pathname = pathname.replace(/^\/+/, "/");

  if (pathname === "/") {
    pathname = "/index.html";
  }

  // Get file path
  const filePath = path.join(STATIC_DIR, pathname);

  // Get file extension
  const ext = path.extname(filePath).toLowerCase();

  // Default content type
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  // Read file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // If file not found
      if (err.code === "ENOENT") {
        // For SPA, serve index.html for all HTML requests
        if (contentType === "text/html") {
          fs.readFile(path.join(STATIC_DIR, "/index.html"), (err, data) => {
            if (err) {
              send404(res);
            } else {
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(data);
            }
          });
        } else {
          send404(res);
        }
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
        console.error(err);
      }
    } else {
      // Success - send file
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    }
  });
});

// Send 404
function send404(res) {
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.write("404 Not Found");
  res.end();
}

// Start server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Serving files from: ${STATIC_DIR}`);
  console.log("Press Ctrl+C to stop the server");
});

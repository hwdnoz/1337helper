import express from 'express';
import expressStaticGzip from 'express-static-gzip';

const app = express();
const PORT = 3101;

// Security headers middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:* http://127.0.0.1:*;"
  );

  next();
});

// Serve static files with brotli and gzip support
app.use(expressStaticGzip('dist', {
  enableBrotli: true,
  orderPreference: ['br', 'gz'],
  serveStatic: {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      // HTML files - no caching for index.html to ensure users get latest version
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, no-cache, must-revalidate');
        res.setHeader('Expires', '0');
      }
      // Hashed assets (JS, CSS with hash in filename like: name-abc123.js) - aggressive caching
      else if (/-[a-zA-Z0-9_-]{8,}\.(js|css)$/i.test(path)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Other JS and CSS files (if any without hash)
      else if (path.endsWith('.js') || path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
      }
      // Images, fonts, and other assets
      else if (/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(path)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      }
      // Manifest and other config files
      else if (/\.(json|webmanifest)$/i.test(path)) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }

      // Compression indication
      if (path.endsWith('.br')) {
        res.setHeader('Content-Encoding', 'br');
      } else if (path.endsWith('.gz')) {
        res.setHeader('Content-Encoding', 'gzip');
      }
    }
  }
}));

// SPA fallback - serve index.html for any route
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'public, no-cache, must-revalidate');
  res.setHeader('Expires', '0');
  res.sendFile('dist/index.html', { root: '.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Serving with:');
  console.log('  - Brotli and gzip compression');
  console.log('  - Optimized cache headers');
  console.log('  - Security headers');
  console.log('  - ETag support');
});

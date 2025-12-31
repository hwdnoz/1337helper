import express from 'express';
import expressStaticGzip from 'express-static-gzip';

const app = express();
const PORT = 3101;

// Serve static files with brotli and gzip support
app.use(expressStaticGzip('dist', {
  enableBrotli: true,
  orderPreference: ['br', 'gz'],
  serveStatic: {
    maxAge: '1y',
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0');
      }
    }
  }
}));

// SPA fallback - serve index.html for any route
app.get('*', (req, res) => {
  res.sendFile('dist/index.html', { root: '.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Serving brotli (.br) and gzip (.gz) compressed files when available');
});

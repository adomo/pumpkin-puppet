import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  server: {
    port: 5173,
    host: true
  },
  plugins: [
    {
      name: 'route-rewrite-and-api',
      configureServer(server) {
        const videosDir = resolve(__dirname, 'public/videos');
        if (!fs.existsSync(videosDir)) {
          fs.mkdirSync(videosDir, { recursive: true });
        }

        server.middlewares.use((req, res, next) => {
          if (req.url === '/stage' || req.url === '/stage/') {
            req.url = '/stage.html';
          } else if (req.url === '/desk' || req.url === '/desk/') {
            req.url = '/desk.html';
          } else if (req.url === '/api/videos' && req.method === 'GET') {
            try {
              const files = fs.readdirSync(videosDir).filter(f => /\.(mp4|mov|webm|m4v|ogg)$/i.test(f));
              const list = files.map(name => {
                const stat = fs.statSync(resolve(videosDir, name));
                return {
                  name,
                  url: `/videos/${encodeURIComponent(name)}`,
                  size: stat.size
                };
              });
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(list));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
            return;
          } else if (req.url?.startsWith('/api/upload-video') && req.method === 'POST') {
            const urlObj = new URL(req.url, 'http://localhost:5173');
            const filename = urlObj.searchParams.get('name') || `video_${Date.now()}.mp4`;
            // Sanitize filename
            const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const targetPath = resolve(videosDir, cleanName);

            const writeStream = fs.createWriteStream(targetPath);
            req.pipe(writeStream);

            writeStream.on('finish', () => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                name: cleanName,
                url: `/videos/${encodeURIComponent(cleanName)}`
              }));
            });

            writeStream.on('error', (err) => {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            });
            return;
          }
          next();
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        stage: resolve(__dirname, 'stage.html'),
        desk: resolve(__dirname, 'desk.html')
      }
    }
  }
});

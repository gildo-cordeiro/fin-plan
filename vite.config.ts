import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.MONGODB_URI) {
    process.env.MONGODB_URI = env.MONGODB_URI;
  }
  if (env.MONGODB_DB_NAME) {
    process.env.MONGODB_DB_NAME = env.MONGODB_DB_NAME;
  }

  return {
    plugins: [
      react(),
      {
        name: 'mongodb-api-dev-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/budget')) {
              try {
                let body: unknown = undefined;
                if (req.method === 'POST') {
                  const buffers: Buffer[] = [];
                  for await (const chunk of req) {
                    buffers.push(chunk as Buffer);
                  }
                  const raw = Buffer.concat(buffers).toString('utf-8');
                  if (raw) {
                    try {
                      body = JSON.parse(raw);
                    } catch {
                      body = raw;
                    }
                  }
                }

                const extendedReq = Object.assign(req, { body });
                const extendedRes = Object.assign(res, {
                  status(code: number) {
                    res.statusCode = code;
                    return extendedRes;
                  },
                  json(data: unknown) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return extendedRes;
                  },
                });

                const { default: handler } = await server.ssrLoadModule('/api/budget.ts');
                await handler(extendedReq as any, extendedRes as any);
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Erro no servidor';
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: msg }));
              }
              return;
            }
            next();
          });
        },
      },
    ],
    server: {
      port: 5173,
      open: false,
    },
    test: {
      include: ['src/__tests__/**/*.test.ts'],
      exclude: ['e2e/**', 'node_modules/**'],
    },
  };
});

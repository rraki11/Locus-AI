import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createMarketBaselineMiddleware } from './server/marketBaselineApi';
import { createStreetScanMiddleware } from './server/streetScanApi';
import { createLocationIntelligenceMiddleware } from './server/locationIntelligenceApi';

export default defineConfig(({ mode }) => {
  const rootCwd = (globalThis as any).process?.cwd?.() || '.';
  const env = {
    ...loadEnv(mode, '..', ''),
    ...loadEnv(mode, rootCwd, ''),
  };

  return {
    plugins: [
      react(),
      {
        name: 'locus-market-baseline-api',
        configureServer(server) {
          server.middlewares.use(createMarketBaselineMiddleware(env) as any);
          server.middlewares.use(createStreetScanMiddleware() as any);
          server.middlewares.use(createLocationIntelligenceMiddleware() as any);
        },
        configurePreviewServer(server) {
          server.middlewares.use(createMarketBaselineMiddleware(env) as any);
          server.middlewares.use(createStreetScanMiddleware() as any);
          server.middlewares.use(createLocationIntelligenceMiddleware() as any);
        },
      },
    ],
    server: {
      port: 5173,
      host: true,
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 2500,
    },
  };
});

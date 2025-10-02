import express from 'express';
import cors from 'cors';
import path from 'path';
import env from './config';
import importRouter from './routes/importRoutes';
import settingsRouter from './routes/settingsRoutes';
import dealsRouter from './routes/dealsRoutes';
import payoutsRouter from './routes/payoutRoutes';

export async function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/import', importRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/deals', dealsRouter);
  app.use('/api/payouts', payoutsRouter);

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Internal Server Error';
      res.status(500).json({ message });
    }
  );

  if (env.NODE_ENV === 'production') {
    const clientPath = path.resolve(__dirname, '../../dist/client');
    app.use(express.static(clientPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientPath, 'index.html'));
    });
  }

  return app;
}

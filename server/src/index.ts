import env from './config';
import { createServer } from './server';

async function bootstrap() {
  const app = await createServer();
  app.listen(env.PORT, () => {
    console.log(`Server started on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

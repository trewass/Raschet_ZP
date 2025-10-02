import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type Env = {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
};

const env: Env = {
  PORT: Number(process.env.PORT ?? 3000),
  NODE_ENV: (process.env.NODE_ENV as Env['NODE_ENV']) ?? 'development',
};

export default env;

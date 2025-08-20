import { DataSourceOptions } from 'typeorm';
import * as path from 'path';

// This is the single source of truth for all TypeORM configuration.
export const ormConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'db_payment',
  synchronize: false, // Recommended to be false in production
  logging: true,
  entities: [path.join(__dirname, '..', '**', '*.model.ts')],
  migrations: [path.join(__dirname, 'migrations', '**', '*.ts')],
};

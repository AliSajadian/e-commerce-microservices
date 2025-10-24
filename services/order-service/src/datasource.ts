import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
config();

// Create a new DataSource instance
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'db_order',
  synchronize: false,
  logging: true,
  entities: [path.join(__dirname, '**', '*.model.ts')],
  migrations: [path.join(__dirname, 'migrations', '**', '*.ts')],
});
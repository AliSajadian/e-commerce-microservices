import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { ormConfig } from './ormconfig';

// Although ConfigModule loads .env, it's good practice for TypeORM CLI to have it here
// for running migrations outside of the NestJS application context.
config();

// Use the centralized ormConfig for all database settings
export const AppDataSource = new DataSource(ormConfig);

        // "start": "nest start",
        // "start:dev": "nest start --watch",
        // "start:debug": "nest start --debug --watch",

        // "start:dev": "ts-node -r tsconfig-paths/register --project tsconfig.json src/main.ts",




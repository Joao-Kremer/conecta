import 'dotenv/config';
import * as path from 'node:path';

import { DataSource, type DataSourceOptions } from 'typeorm';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.join(__dirname, '../../modules/**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations/*.{ts,js}')],
  migrationsTableName: '_migrations',
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
};

// Single DataSource export (TypeORM CLI requires exactly one).
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;

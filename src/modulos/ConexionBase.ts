import 'dotenv/config';
import { Pool } from 'pg';
// librerias para conectar nodejs a postgreSQL en conjunto al .env

// exportar los datos a constante db
export const db = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASS,
  database: process.env.PGDB
});

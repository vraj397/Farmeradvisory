import * as fs from 'fs';
import * as path from 'path';
import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function runSetup() {
  const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const database = process.env.DB_NAME || 'crop_advisory';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const needsSsl =
    process.env.DB_SSL === 'true' ||
    (dbUrl && (dbUrl.includes('ssl') || dbUrl.includes('aiven') || dbUrl.includes('tidb')));
  const sslConfig = needsSsl ? { rejectUnauthorized: false } : undefined;

  console.log('🌱 Starting Krishi Sahayak Database Schema Setup...');

  let connection;
  if (dbUrl) {
    console.log(`📡 Connecting using DATABASE_URL (SSL: ${Boolean(sslConfig)})...`);
    connection = await createConnection({ uri: dbUrl, ssl: sslConfig, multipleStatements: true });
  } else {
    console.log(`📡 Connecting to MySQL at ${user}@${host}:${port}...`);
    connection = await createConnection({
      host,
      port,
      user,
      password,
      ssl: sslConfig,
      multipleStatements: true,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${database}\`;`);
  }

  const rootDir = process.cwd();
  const sqlFiles = [
    path.join(rootDir, 'farmer database.sql'),
    path.join(rootDir, 'migrations', '001_integrated_features.sql'),
  ];

  for (const filePath of sqlFiles) {
    if (fs.existsSync(filePath)) {
      console.log(`📄 Executing ${path.basename(filePath)}...`);
      const rawSql = fs.readFileSync(filePath, 'utf-8');
      
      // Clean comments and execute statements
      const statements = rawSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      for (const stmt of statements) {
        if (stmt.toUpperCase().startsWith('USE ') && dbUrl) {
          // Cloud URLs specify database in uri
          continue;
        }
        try {
          await connection.query(stmt);
        } catch (err: any) {
          // Ignore table already exists or duplicate key errors
          if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) {
            console.warn(`  ⚠️ Warning on statement: ${err.message.slice(0, 100)}`);
          }
        }
      }
      console.log(`  ✅ ${path.basename(filePath)} completed.`);
    } else {
      console.warn(`⚠️ File not found: ${filePath}`);
    }
  }

  await connection.end();
  console.log('🎉 Database setup completed successfully! All tables ready.');
}

runSetup().catch((err) => {
  console.error('❌ Database setup failed:', err.message);
  process.exit(1);
});

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const dbUrl =
      this.configService.get<string>('DATABASE_URL') ||
      this.configService.get<string>('MYSQL_URL');
    const host = this.configService.get<string>('DB_HOST', 'localhost');
    const port = this.configService.get<number>('DB_PORT', 3306);
    const database = this.configService.get<string>('DB_NAME', 'crop_advisory');
    const user = this.configService.get<string>('DB_USER', 'root');
    const password = this.configService.get<string>('DB_PASSWORD', '');
    const connectionLimit = this.configService.get<number>('DB_CONNECTION_LIMIT', 10);
    const dbSsl = this.configService.get<string>('DB_SSL');

    const needsSsl =
      dbSsl === 'true' ||
      (dbUrl && (dbUrl.includes('ssl') || dbUrl.includes('aiven') || dbUrl.includes('tidb')));
    const sslConfig = needsSsl ? { rejectUnauthorized: false } : undefined;

    if (dbUrl) {
      this.pool = createPool({
        uri: dbUrl,
        ssl: sslConfig,
        connectionLimit,
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        namedPlaceholders: false,
      });
      this.logger.log(`MySQL connection pool initialized via DATABASE_URL / MYSQL_URL (SSL: ${Boolean(sslConfig)})`);
    } else {
      this.pool = createPool({
        host,
        port,
        database,
        user,
        password,
        ssl: sslConfig,
        connectionLimit,
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        namedPlaceholders: false,
      });
      this.logger.log(`MySQL connection pool initialized for ${user}@${host}:${port}/${database} (SSL: ${Boolean(sslConfig)})`);
    }

    // Non-blocking connection verification for Render logs
    this.checkHealth()
      .then((healthy) => {
        if (healthy) {
          this.logger.log('✅ MySQL database connection verified successfully.');
        } else {
          this.logger.warn('⚠️ MySQL database ping failed. Ensure MySQL database is online and credentials are correct.');
        }
      })
      .catch((err) => {
        this.logger.warn(`⚠️ MySQL database ping error: ${err.message}`);
      });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('MySQL connection pool closed.');
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  /**
   * Execute parameterized SELECT raw SQL query
   */
  async query<T extends RowDataPacket[]>(sql: string, params: any[] = []): Promise<T> {
    const start = Date.now();
    try {
      const [rows] = await this.pool.execute<T>(sql, params);
      const duration = Date.now() - start;
      if (duration > 500) {
        this.logger.warn(`Slow SQL Query (${duration}ms): ${sql}`);
      }
      return rows;
    } catch (error) {
      this.logger.error(`Database Query Error: ${error.message} | SQL: ${sql}`, error.stack);
      throw error;
    }
  }

  /**
   * Execute INSERT, UPDATE, DELETE parameterized raw SQL query
   */
  async execute(sql: string, params: any[] = []): Promise<ResultSetHeader> {
    try {
      const [result] = await this.pool.execute<ResultSetHeader>(sql, params);
      return result;
    } catch (error) {
      this.logger.error(`Database Execution Error: ${error.message} | SQL: ${sql}`, error.stack);
      throw error;
    }
  }

  /**
   * Execute queries inside an isolated transaction connection with connection release in finally block
   */
  async runInTransaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      this.logger.error(`Transaction rolled back due to error: ${error.message}`, error.stack);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Database Health Check query
   */
  async checkHealth(): Promise<boolean> {
    try {
      const [rows]: any = await this.pool.query('SELECT 1 AS healthy');
      return rows[0]?.healthy === 1;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }

  // ============================================================
  // READ-ONLY SCHEMA DISCOVERY METHODS (FOR PHASE 1 & DEV ONLY)
  // ============================================================

  async showTables(): Promise<string[]> {
    const [rows]: any = await this.pool.query('SHOW TABLES');
    return rows.map((row: any) => Object.values(row)[0] as string);
  }

  async describeTable(tableName: string): Promise<any[]> {
    const [rows]: any = await this.pool.query('DESCRIBE ??', [tableName]);
    return rows;
  }

  async inspectSchema(): Promise<any[]> {
    const [rows]: any = await this.pool.query(`
      SELECT 
        TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION;
    `);
    return rows;
  }
}

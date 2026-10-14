import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool as createMysqlPool, Pool as MysqlPool, PoolConnection as MysqlPoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';

export type DatabaseEngine = 'postgres' | 'mysql';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private mysqlPool: MysqlPool | null = null;
  private pgPool: PgPool | null = null;
  private engine: DatabaseEngine = 'mysql';

  constructor(private readonly configService: ConfigService) {}

  get isPostgres(): boolean {
    return this.engine === 'postgres';
  }

  async onModuleInit(): Promise<void> {
    const dbUrl =
      this.configService.get<string>('DATABASE_URL') ||
      this.configService.get<string>('POSTGRES_URL') ||
      this.configService.get<string>('SUPABASE_DB_URL') ||
      this.configService.get<string>('MYSQL_URL');

    const host = this.configService.get<string>('DB_HOST', 'localhost');
    const port = Number(this.configService.get<number | string>('DB_PORT', 3306));
    const database = this.configService.get<string>('DB_NAME', 'crop_advisory');
    const user = this.configService.get<string>('DB_USER', 'root');
    const password = this.configService.get<string>('DB_PASSWORD', '');
    const connectionLimit = Number(this.configService.get<number | string>('DB_CONNECTION_LIMIT', 10));
    const dbSsl = this.configService.get<string>('DB_SSL');
    const dbType = this.configService.get<string>('DB_TYPE', '').toLowerCase();

    // Detect PostgreSQL / Supabase
    const isPg = Boolean(
      (dbUrl &&
        (dbUrl.startsWith('postgres://') ||
          dbUrl.startsWith('postgresql://') ||
          dbUrl.includes('supabase.co') ||
          dbUrl.includes('supabase.com') ||
          dbUrl.includes('pooler.supabase.com'))) ||
      port === 5432 ||
      dbType === 'postgres' ||
      dbType === 'postgresql' ||
      dbType === 'supabase' ||
      this.configService.get<string>('SUPABASE_URL'),
    );

    if (isPg) {
      this.engine = 'postgres';
      const pgConnectionString =
        dbUrl || `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

      this.pgPool = new PgPool({
        connectionString: pgConnectionString,
        ssl: { rejectUnauthorized: false }, // Required for Supabase & cloud PostgreSQL
        max: connectionLimit,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      this.logger.log('🚀 Supabase / PostgreSQL connection pool initialized.');
    } else {
      this.engine = 'mysql';
      const needsSsl =
        dbSsl === 'true' ||
        (dbUrl && (dbUrl.includes('ssl') || dbUrl.includes('aiven') || dbUrl.includes('tidb')));
      const sslConfig = needsSsl ? { rejectUnauthorized: false } : undefined;

      if (dbUrl) {
        this.mysqlPool = createMysqlPool({
          uri: dbUrl,
          ssl: sslConfig,
          connectionLimit,
          waitForConnections: true,
          queueLimit: 0,
          enableKeepAlive: true,
          keepAliveInitialDelay: 0,
          namedPlaceholders: false,
        });
        this.logger.log(`MySQL connection pool initialized via DATABASE_URL (SSL: ${Boolean(sslConfig)})`);
      } else {
        this.mysqlPool = createMysqlPool({
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
        this.logger.log(
          `MySQL connection pool initialized for ${user}@${host}:${port}/${database} (SSL: ${Boolean(sslConfig)})`,
        );
      }
    }

    // Health check verification
    this.checkHealth()
      .then((healthy) => {
        if (healthy) {
          this.logger.log(
            `✅ ${this.engine === 'postgres' ? 'Supabase (PostgreSQL)' : 'MySQL'} database connection verified successfully.`,
          );
        } else {
          this.logger.warn(`⚠️ Database ping failed. Verify database credentials and network connectivity.`);
        }
      })
      .catch((err) => {
        this.logger.warn(`⚠️ Database ping error: ${err.message}`);
      });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
      this.logger.log('PostgreSQL connection pool closed.');
    }
    if (this.mysqlPool) {
      await this.mysqlPool.end();
      this.logger.log('MySQL connection pool closed.');
    }
  }

  /**
   * Compatibility adapter for legacy code calling getPool()
   */
  getPool(): any {
    if (this.engine === 'postgres' && this.pgPool) {
      return {
        execute: async (sql: string, params: any[] = []) => {
          const isSelect = /^\s*select/i.test(sql);
          if (isSelect) {
            const rows = await this.query(sql, params);
            return [rows];
          } else {
            const result = await this.execute(sql, params);
            return [result];
          }
        },
        query: async (sql: string, params: any[] = []) => {
          const rows = await this.query(sql, params);
          return [rows];
        },
      };
    }
    return this.mysqlPool;
  }

  /**
   * Execute parameterized SELECT raw SQL query
   */
  async query<T extends RowDataPacket[]>(sql: string, params: any[] = []): Promise<T> {
    const start = Date.now();
    try {
      if (this.engine === 'postgres' && this.pgPool) {
        const pgSql = this.normalizeSqlForPostgres(sql);
        const res = await this.pgPool.query(pgSql, params);
        const duration = Date.now() - start;
        if (duration > 500) {
          this.logger.warn(`Slow PostgreSQL Query (${duration}ms): ${pgSql}`);
        }
        return res.rows as unknown as T;
      }

      if (!this.mysqlPool) {
        throw new Error('Database pool is not initialized');
      }

      const [rows] = await this.mysqlPool.execute<T>(sql, params);
      const duration = Date.now() - start;
      if (duration > 500) {
        this.logger.warn(`Slow MySQL Query (${duration}ms): ${sql}`);
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
      if (this.engine === 'postgres' && this.pgPool) {
        let pgSql = this.normalizeSqlForPostgres(sql);
        const isInsert = /^\s*insert\s+into/i.test(pgSql);

        // If INSERT and doesn't already have RETURNING clause, append RETURNING * to get generated id
        if (isInsert && !/\breturning\b/i.test(pgSql)) {
          pgSql = pgSql.trim().replace(/;$/, '') + ' RETURNING *;';
        }

        const res = await this.pgPool.query(pgSql, params);
        let insertId = 0;

        if (res.rows && res.rows.length > 0) {
          const firstRow = res.rows[0];
          // Locate the primary key column (e.g. *_id or id or first key)
          const pkKey =
            Object.keys(firstRow).find((k) => k.endsWith('_id') || k === 'id') ||
            Object.keys(firstRow)[0];
          if (pkKey && firstRow[pkKey] !== undefined) {
            insertId = Number(firstRow[pkKey]) || 0;
          }
        }

        return {
          affectedRows: res.rowCount ?? 0,
          insertId,
          fieldCount: 0,
          info: '',
          serverStatus: 2,
          warningStatus: 0,
          changedRows: 0,
        } as unknown as ResultSetHeader;
      }

      if (!this.mysqlPool) {
        throw new Error('Database pool is not initialized');
      }

      const [result] = await this.mysqlPool.execute<ResultSetHeader>(sql, params);
      return result;
    } catch (error) {
      this.logger.error(`Database Execution Error: ${error.message} | SQL: ${sql}`, error.stack);
      throw error;
    }
  }

  /**
   * Execute queries inside an isolated transaction connection
   */
  async runInTransaction<T>(callback: (connection: any) => Promise<T>): Promise<T> {
    if (this.engine === 'postgres' && this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        this.logger.error(`PostgreSQL Transaction rolled back: ${error.message}`, error.stack);
        throw error;
      } finally {
        client.release();
      }
    }

    if (!this.mysqlPool) {
      throw new Error('Database pool is not initialized');
    }

    const connection: MysqlPoolConnection = await this.mysqlPool.getConnection();
    await connection.beginTransaction();
    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      this.logger.error(`MySQL Transaction rolled back: ${error.message}`, error.stack);
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
      if (this.engine === 'postgres' && this.pgPool) {
        const res = await this.pgPool.query('SELECT 1 AS healthy');
        return res.rows[0]?.healthy === 1 || res.rows[0]?.healthy === '1';
      }
      if (this.mysqlPool) {
        const [rows]: any = await this.mysqlPool.query('SELECT 1 AS healthy');
        return rows[0]?.healthy === 1;
      }
      return false;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Translates MySQL dialect constructs and ? parameter placeholders to PostgreSQL syntax
   */
  private normalizeSqlForPostgres(sql: string): string {
    let s = sql;

    // 1. Convert weather_cache ON DUPLICATE KEY UPDATE
    if (/weather_cache/i.test(s) && /ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(s)) {
      s = s.replace(
        /ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i,
        `ON CONFLICT (district_id, weather_date) DO UPDATE SET
          temperature_c = EXCLUDED.temperature_c,
          humidity_pct = EXCLUDED.humidity_pct,
          rainfall_mm = EXCLUDED.rainfall_mm,
          wind_speed_kmh = EXCLUDED.wind_speed_kmh,
          raw_data = EXCLUDED.raw_data,
          fetched_at = CURRENT_TIMESTAMP`,
      );
    }

    // 2. Convert ai_conversations ON DUPLICATE KEY UPDATE
    if (/ai_conversations/i.test(s) && /ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(s)) {
      s = s.replace(
        /ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/i,
        'ON CONFLICT (conversation_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP',
      );
    }

    // 3. Convert ? placeholders to $1, $2, $3, ...
    let paramIndex = 1;
    s = s.replace(/\?/g, () => `$${paramIndex++}`);

    return s;
  }

  // ============================================================
  // READ-ONLY SCHEMA DISCOVERY METHODS
  // ============================================================

  async showTables(): Promise<string[]> {
    if (this.engine === 'postgres' && this.pgPool) {
      const res = await this.pgPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      return res.rows.map((r: any) => r.table_name);
    }
    if (this.mysqlPool) {
      const [rows]: any = await this.mysqlPool.query('SHOW TABLES');
      return rows.map((row: any) => Object.values(row)[0] as string);
    }
    return [];
  }
}

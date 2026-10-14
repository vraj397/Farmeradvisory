import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memoryStore = new Map<string, { value: string; expiresAt: number }>();
  private isRedisConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 2) {
            this.logger.warn(`Redis connection failed after ${times} retries. Switching to fallback memory store.`);
            return null; // Stop retrying
          }
          return 500;
        },
      });

      this.client.connect()
        .then(() => {
          this.isRedisConnected = true;
          this.logger.log(`Connected to Redis at ${host}:${port}`);
        })
        .catch((err) => {
          this.logger.warn(`Could not connect to Redis (${err.message}). Using fallback memory cache.`);
          this.isRedisConnected = false;
        });

      this.client.on('error', (err) => {
        this.logger.warn(`Redis error: ${err.message}`);
        this.isRedisConnected = false;
      });
    } catch (err: any) {
      this.logger.warn(`Redis initialization error: ${err.message}. Using memory store fallback.`);
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isRedisConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch (err: any) {
        this.logger.warn(`Redis get error: ${err.message}`);
      }
    }
    // Fallback to memory store
    const cached = this.memoryStore.get(key);
    if (!cached) return null;
    if (cached.expiresAt && Date.now() > cached.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return cached.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isRedisConnected && this.client) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch (err: any) {
        this.logger.warn(`Redis set error: ${err.message}`);
      }
    }
    // Fallback to memory store
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0;
    this.memoryStore.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.isRedisConnected && this.client) {
      try {
        await this.client.del(key);
      } catch (err: any) {
        this.logger.warn(`Redis del error: ${err.message}`);
      }
    }
    this.memoryStore.delete(key);
  }

  async ttl(key: string): Promise<number> {
    if (this.isRedisConnected && this.client) {
      try {
        return await this.client.ttl(key);
      } catch (err: any) {
        this.logger.warn(`Redis ttl error: ${err.message}`);
      }
    }
    const cached = this.memoryStore.get(key);
    if (!cached) return -2;
    if (!cached.expiresAt) return -1;
    const remainingMs = cached.expiresAt - Date.now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : -2;
  }
}

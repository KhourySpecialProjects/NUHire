// src/config/database.ts

import mysql, { Pool, PoolOptions } from 'mysql2';

export class DatabaseService {
  private pool: Pool | null = null;
  private readonly maxRetries = 30;

  async connect(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    let retryCount = 0;

    while (retryCount < this.maxRetries) {
      try {
        this.pool = await this.createPool();
        await this.initializeDatabase();
        console.log('✅ Database connection pool established successfully');
        return this.pool;
      } catch (error) {
        retryCount++;
        console.error(`❌ Database pool creation attempt ${retryCount} failed:`, error);

        if (retryCount < this.maxRetries) {
          const delay = Math.min(10000, retryCount * 1000);
          console.log(`🔄 Retrying in ${delay / 1000} seconds...`);
          await this.sleep(delay);
        } else {
          console.error('❌ All database connection attempts failed. Exiting application.');
          process.exit(1);
        }
      }
    }

    throw new Error('Failed to establish database connection pool');
  }

  private createPool(): Promise<Pool> {
    return new Promise((resolve, reject) => {
      console.log('🔌 Creating MySQL connection pool using DATABASE_URL...');

      const url = new URL(process.env.DATABASE_URL!);
      const poolConfig: PoolOptions = {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        connectionLimit: 15,  // Max 10 concurrent connections
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        ssl: {
          rejectUnauthorized: false
        }
      };

      console.log(`Creating pool: host=${poolConfig.host}, port=${poolConfig.port}, database=${poolConfig.database}, connectionLimit=${poolConfig.connectionLimit}`);

      const pool = mysql.createPool(poolConfig);

      // Test the pool with a connection
      pool.getConnection((err, connection) => {
        if (err) {
          console.error('❌ Database pool connection test failed:', err.message);
          reject(err);
        } else {
          console.log('✅ Database pool connection test successful!');
          connection.release(); // Release test connection back to pool
          this.setupErrorHandling(pool);
          resolve(pool);
        }
      });
    });
  }

  private setupErrorHandling(pool: Pool): void {
    pool.on('connection', (connection) => {
      console.log('📌 New connection established in pool');
    });

    pool.on('error', (err) => {
      console.error('❌ Database pool error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 Database connection lost. Pool will reconnect automatically.');
      } else {
        console.error('Unexpected pool error:', err);
      }
    });
  }

  private async initializeDatabase(): Promise<void> {
    const queries = [
      "INSERT IGNORE INTO `Moderator` (`admin_email`, `crn`) VALUES ('labit.z@northeastern.edu', 1)",
    ];

    for (const query of queries) {
      try {
        await this.executeQuery(query);
      } catch (error) {
        console.error(`Error executing query: ${query.substring(0, 60)}...`, error);
      }
    }

    console.log('✅ Database initialization completed!');
  }

  private executeQuery(query: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.pool) {
        reject(new Error('Database pool not established'));
        return;
      }

      this.pool.query(query, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getConnection(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not established');
    }
    return this.pool;
  }
}

export const databaseService = new DatabaseService();
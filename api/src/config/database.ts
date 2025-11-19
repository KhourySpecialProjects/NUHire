// src/config/database.ts

import mysql, { Connection, ConnectionOptions } from 'mysql2';

export class DatabaseService {
  private connection: Connection | null = null;
  private readonly maxRetries = 30;

  async connect(): Promise<Connection> {
    if (this.connection) {
      return this.connection;
    }

    let retryCount = 0;

    while (retryCount < this.maxRetries) {
      try {
        this.connection = await this.createConnection();
        await this.initializeDatabase();
        console.log('✅ Database connection established successfully');
        return this.connection;
      } catch (error) {
        retryCount++;
        console.error(`❌ Database connection attempt ${retryCount} failed:`, error);

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

    throw new Error('Failed to establish database connection');
  }

  private createConnection(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      console.log('🔌 Attempting to connect to MySQL using DATABASE_URL...');

      const url = new URL(process.env.DATABASE_URL!);
      const connectionConfig: ConnectionOptions = {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        ssl: {
          rejectUnauthorized: false
        }
      };

      console.log(`Connecting to: host=${connectionConfig.host}, port=${connectionConfig.port}, database=${connectionConfig.database}`);

      const connection = mysql.createConnection(connectionConfig);

      connection.connect((err) => {
        if (err) {
          console.error('❌ Database connection failed:', err.message);
          reject(err);
        } else {
          console.log('✅ Connected to MySQL database successfully!');
          this.setupErrorHandling(connection);
          resolve(connection);
        }
      });
    });
  }

  private setupErrorHandling(connection: Connection): void {
    connection.on('error', (err) => {
      console.error('❌ Database error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 Database connection lost. Reconnecting...');
        this.connection = null;
        this.connect().catch(console.error);
      } else {
        throw err;
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
      if (!this.connection) {
        reject(new Error('Database connection not established'));
        return;
      }

      this.connection.query(query, params, (err, result) => {
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

  getConnection(): Connection {
    if (!this.connection) {
      throw new Error('Database connection not established');
    }
    return this.connection;
  }
}

export const databaseService = new DatabaseService();
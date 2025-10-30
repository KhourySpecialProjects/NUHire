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
      "INSERT IGNORE INTO `job_descriptions` (`title`, `file_path`) VALUES ('Carbonite', 'uploads/jobdescription/carbonite-jobdes.pdf')",
      "INSERT IGNORE INTO `job_descriptions` (`title`, `file_path`) VALUES ('Cygilant', 'uploads/jobdescription/Cygilant Security Research Job Description.pdf')",
      "INSERT IGNORE INTO `job_descriptions` (`title`, `file_path`) VALUES ('Motionlogic', 'uploads/jobdescription/QA Coop Motionlogic (Berlin, Germany).pdf')",
      "INSERT IGNORE INTO `job_descriptions` (`title`, `file_path`) VALUES ('Sample', 'uploads/jobdescription/sample-job-description.pdf')",
      "INSERT IGNORE INTO `job_descriptions` (`title`, `file_path`) VALUES ('Source One', 'uploads/jobdescription/SourceOneJobDescription.pdf')",
      "INSERT IGNORE INTO `job_descriptions` (`title`, `file_path`) VALUES ('Two Six Labs', 'uploads/jobdescription/Two Six Labs Data Visualization Co-op Job Description.pdf')",
      "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample1', 'uploads/resumes/sample1.pdf')",
      "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample2', 'uploads/resumes/sample2.pdf')",
      "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample3', 'uploads/resumes/sample3.pdf')",
      "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample4', 'uploads/resumes/sample4.pdf')",
      "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample5', 'uploads/resumes/sample5.pdf')",
      "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample6', 'uploads/resumes/sample6.pdf')",
      "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample7', 'uploads/resumes/sample7.pdf')",
      "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample8', 'uploads/resumes/sample8.pdf')",
      "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample9', 'uploads/resumes/sample9.pdf')",
      "INSERT IGNORE INTO `Resume_pdfs` (`title`, `file_path`) VALUES ('sample10', 'uploads/resumes/sample10.pdf')",
      "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (1, 'https://www.youtube.com/embed/aA7k6WM4_7A?si=ahwZZpSKUow0-dG2', 'Aisha', 'Patel')",
      "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (2, 'https://www.youtube.com/embed/4d6v7p0N9Sg?si=nax_IkG0gk3zNae-', 'Casey', 'Fisch')",
      "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (3, 'https://www.youtube.com/embed/typ4aN11feI?si=7jFsNwhB9ZkKyuo9', 'Ethan', 'Martinez')",
      "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (4, 'https://www.youtube.com/embed/ySKRfElNPCY?si=2B1cl7djMtE1GLJL', 'Jason', 'Jones')",
      "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (5, 'https://www.youtube.com/embed/_KGOo1WGKZU?si=aTLlkNgS7di69Sga', 'Lucas', 'Nyugen')",
      "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (6, 'https://www.youtube.com/embed/AhJrqbDTn1Y?si=_XjOXZJBzSvpN_aM', 'Maya', 'Collins')",
      "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (7, 'https://www.youtube.com/embed/1dIhJmX4uLo?si=aAna0LIIsxRu8E0K', 'Paula', 'McCartney')",
      "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (8, 'https://www.youtube.com/embed/cnIv3Zf5nJo?si=aa3ObgHLN5BBP-tp', 'Alex', 'Johnson')",
      "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (9, 'https://www.youtube.com/embed/0aVcquEhOtQ?si=gzDkWve3Izy9uTFx', 'Jordan', 'Lee')",
      "INSERT IGNORE INTO `Candidates` (`resume_id`, `interview`, `f_name`, `l_name`) VALUES (10, 'https://www.youtube.com/embed/HS3ShcKt288?si=uWmWIVKtNJRvqSu_', 'Zhiyuan', 'Yang')",
      "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (1, 'Interview1', 'https://www.youtube.com/embed/aA7k6WM4_7A?si=ahwZZpSKUow0-dG2')",
      "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (2, 'Interview2', 'https://www.youtube.com/embed/4d6v7p0N9Sg?si=nax_IkG0gk3zNae-')",
      "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (3, 'Interview3', 'https://www.youtube.com/embed/typ4aN11feI?si=7jFsNwhB9ZkKyuo9')",
      "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (4, 'Interview5', 'https://www.youtube.com/embed/ySKRfElNPCY?si=2B1cl7djMtE1GLJL')",
      "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (5, 'Interview5', 'https://www.youtube.com/embed/_KGOo1WGKZU?si=aTLlkNgS7di69Sga')",
      "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (6, 'Interview6', 'https://www.youtube.com/embed/AhJrqbDTn1Y?si=_XjOXZJBzSvpN_aM')",
      "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (7, 'Interview7', 'https://www.youtube.com/embed/1dIhJmX4uLo?si=aAna0LIIsxRu8E0K')",
      "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (8, 'Interview8', 'https://www.youtube.com/embed/cnIv3Zf5nJo?si=aa3ObgHLN5BBP-tp')",
      "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (9, 'Interview9', 'https://www.youtube.com/embed/0aVcquEhOtQ?si=gzDkWve3Izy9uTFx')",
      "INSERT IGNORE INTO `Interview_vids` (`resume_id`, `title`, `video_path`) VALUES (10, 'Interview10', 'https://www.youtube.com/embed/HS3ShcKt288?si=uWmWIVKtNJRvqSu_')"
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
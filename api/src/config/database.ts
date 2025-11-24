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
  const crn = 1; // Default CRN for initialization
  
  const queries = [
    "INSERT IGNORE INTO `Moderator` (`admin_email`, `crn`) VALUES ('labit.z@northeastern.edu', 1)",
  ];

  // Execute initial queries
  for (const query of queries) {
    try {
      await this.executeQuery(query);
    } catch (error) {
      console.error(`Error executing query: ${query.substring(0, 60)}...`, error);
    }
  }

  // Seed job descriptions
  const jobDescriptions = [
    { title: 'Carbonite', file_path: 'uploads/jobdescription/carbonite-jobdes.pdf' },
    { title: 'Cygilant', file_path: 'uploads/jobdescription/Cygilant Security Research Job Description.pdf' },
    { title: 'Motionlogic', file_path: 'uploads/jobdescription/QA Coop Motionlogic (Berlin, Germany).pdf' },
    { title: 'Source One', file_path: 'uploads/jobdescription/SourceOneJobDescription.pdf' },
    { title: 'Two Six Labs', file_path: 'uploads/jobdescription/Two Six Labs Data Visualization Co-op Job Description.pdf' }
  ];

  for (const job of jobDescriptions) {
    try {
      await this.executeQuery(
        'INSERT IGNORE INTO job_descriptions (title, file_path, class_id) VALUES (?, ?, ?)',
        [job.title, job.file_path, crn]
      );
      console.log(`✅ Seeded job description: ${job.title}`);
    } catch (error) {
      console.error(`Error seeding job description ${job.title}:`, error);
    }
  }

  // Seed resume PDFs
  const resumePdfs = [
    { title: 'sample1', file_path: 'uploads/resumes/sample1.pdf' },
    { title: 'sample2', file_path: 'uploads/resumes/sample2.pdf' },
    { title: 'sample3', file_path: 'uploads/resumes/sample3.pdf' },
    { title: 'sample4', file_path: 'uploads/resumes/sample4.pdf' },
    { title: 'sample5', file_path: 'uploads/resumes/sample5.pdf' },
    { title: 'sample6', file_path: 'uploads/resumes/sample6.pdf' },
    { title: 'sample7', file_path: 'uploads/resumes/sample7.pdf' },
    { title: 'sample8', file_path: 'uploads/resumes/sample8.pdf' },
    { title: 'sample9', file_path: 'uploads/resumes/sample9.pdf' },
    { title: 'sample10', file_path: 'uploads/resumes/sample10.pdf' }
  ];

  for (const resume of resumePdfs) {
    try {
      await this.executeQuery(
        'INSERT IGNORE INTO Resume_pdfs (title, file_path, class_id) VALUES (?, ?, ?)',
        [resume.title, resume.file_path, crn]
      );
      console.log(`✅ Seeded resume PDF: ${resume.title}`);
    } catch (error) {
      console.error(`Error seeding resume PDF ${resume.title}:`, error);
    }
  }

  const candidates = [
    { resume_id: 0, interview: 'https://www.youtube.com/embed/aA7k6WM4_7A?si=ahwZZpSKUow0-dG2', f_name: 'Aisha', l_name: 'Patel' },
    { resume_id: 1, interview: 'https://www.youtube.com/embed/4d6v7p0N9Sg?si=nax_IkG0gk3zNae-', f_name: 'Casey', l_name: 'Fisch' },
    { resume_id: 2, interview: 'https://www.youtube.com/embed/typ4aN11feI?si=7jFsNwhB9ZkKyuo9', f_name: 'Ethan', l_name: 'Martinez' },
    { resume_id: 3, interview: 'https://www.youtube.com/embed/ySKRfElNPCY?si=2B1cl7djMtE1GLJL', f_name: 'Jason', l_name: 'Jones' },
    { resume_id: 4, interview: 'https://www.youtube.com/embed/_KGOo1WGKZU?si=aTLlkNgS7di69Sga', f_name: 'Lucas', l_name: 'Nyugen' },
    { resume_id: 5, interview: 'https://www.youtube.com/embed/AhJrqbDTn1Y?si=_XjOXZJBzSvpN_aM', f_name: 'Maya', l_name: 'Collins' },
    { resume_id: 6, interview: 'https://www.youtube.com/embed/1dIhJmX4uLo?si=aAna0LIIsxRu8E0K', f_name: 'Paula', l_name: 'McCartney' },
    { resume_id: 7, interview: 'https://www.youtube.com/embed/cnIv3Zf5nJo?si=aa3ObgHLN5BBP-tp', f_name: 'Alex', l_name: 'Johnson' },
    { resume_id: 8, interview: 'https://www.youtube.com/embed/0aVcquEhOtQ?si=gzDkWve3Izy9uTFx', f_name: 'Jordan', l_name: 'Lee' },
    { resume_id: 9, interview: 'https://www.youtube.com/embed/HS3ShcKt288?si=uWmWIVKtNJRvqSu_', f_name: 'Zhiyuan', l_name: 'Yang' }
  ];

  for (const candidate of candidates) {
    try {
      await this.executeQuery(
        'INSERT IGNORE INTO Candidates (resume_id, f_name, l_name, interview) VALUES (?, ?, ?, ?)',
        [candidate.resume_id, candidate.f_name, candidate.l_name, candidate.interview]
      );
      console.log(`✅ Seeded candidate: ${candidate.f_name} ${candidate.l_name}`);
    } catch (error) {
      console.error(`Error seeding candidate ${candidate.f_name}:`, error);
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
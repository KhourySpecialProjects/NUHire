// src/app.ts

import express, { Application } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import MySQLStore from 'express-mysql-session';
import { Connection } from 'mysql2';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import resumeRoutes from './routes/resume.routes';
import resumePdfRoutes from './routes/resume-pdf.routes';
import interviewRoutes from './routes/interview.routes';
import jobRoutes from './routes/job.routes';
import groupRoutes from './routes/group.routes';
import moderatorRoutes from './routes/moderator.routes';
import noteRoutes from './routes/note.routes';
import offerRoutes from './routes/offer.routes';
import progressRoutes from './routes/progress.routes';
import candidateRoutes from './routes/candidate.routes';
import uploadRoutes from './routes/upload.routes';
import csvRoutes from './routes/csv.routes';
import deleteRoutes from './routes/delete.routes';

export class App {
  public app: Application;
  public server: HTTPServer;
  public io: SocketIOServer;
  private sessionStore: any;
  public onlineStudents: Record<string, string> = {};

  constructor(private db: Connection) {
    this.app = express();
    this.server = require('http').createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.REACT_APP_FRONT_URL!,
        credentials: true
      }
    });

    this.initializeMiddleware();
    this.initializeRoutes();
  }

  private initializeMiddleware(): void {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.REACT_APP_FRONT_URL!,
      credentials: true
    }));

    // Body parser
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // View engine setup
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, '../views'));
    this.app.set('trust proxy', 1);

    // Session configuration
    const url = new URL(process.env.DATABASE_URL!);
    const SessionStore = MySQLStore(session);
    this.sessionStore = new SessionStore({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1)
    });

    this.app.use(session({
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      store: this.sessionStore,
      cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000
      }
    }));

    // Passport initialization
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Logging middleware
    this.app.use((req, res, next) => {
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/', (req, res) => {
      res.send('NUHire API is running');
    });

    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', port: process.env.PORT });
    });

    // API routes
    this.app.use('/auth', authRoutes(this.db));
    this.app.use('/users', userRoutes(this.db));
    this.app.use('/resume', resumeRoutes(this.db));
    this.app.use('/resume_pdf', resumePdfRoutes(this.db));
    this.app.use('/interview', interviewRoutes(this.db, this.io));
    this.app.use('/interview-vids', interviewRoutes(this.db, this.io));
    this.app.use('/jobs', jobRoutes(this.db, this.io, this.onlineStudents));
    this.app.use('/jobdes', jobRoutes(this.db, this.io, this.onlineStudents));
    this.app.use('/groups', groupRoutes(this.db, this.io));
    this.app.use('/moderator', moderatorRoutes(this.db));
    this.app.use('/moderator-crns', moderatorRoutes(this.db));
    this.app.use('/moderator-classes', moderatorRoutes(this.db));
    this.app.use('/teacher', moderatorRoutes(this.db));
    this.app.use('/notes', noteRoutes(this.db));
    this.app.use('/offers', offerRoutes(this.db));
    this.app.use('/progress', progressRoutes(this.db, this.io));
    this.app.use('/candidates', candidateRoutes(this.db));
    this.app.use('/canidates', candidateRoutes(this.db)); 
    this.app.use('/upload', uploadRoutes());
    this.app.use('/csv', csvRoutes(this.db, this.io));
    this.app.use('/importCSV', csvRoutes(this.db, this.io));
    this.app.use('/delete', deleteRoutes(this.db, this.io, this.onlineStudents));
    
    this.app.use('/student', groupRoutes(this.db, this.io));
    this.app.use('/students-by-class', groupRoutes(this.db, this.io));
    this.app.use('/group-size', interviewRoutes(this.db, this.io));
    this.app.use('/group', groupRoutes(this.db, this.io));
    this.app.use('/class-info', groupRoutes(this.db, this.io));
    this.app.use('/job-assignment', jobRoutes(this.db, this.io, this.onlineStudents));
    this.app.use('/candidates-by-groups', candidateRoutes(this.db));
    this.app.use('/candidates-by-class', candidateRoutes(this.db));
  }

  public listen(port: number): void {
    this.server.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });
  }
}
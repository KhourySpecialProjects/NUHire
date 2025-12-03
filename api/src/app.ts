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
import { Pool } from 'mysql2';

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
import factsRoutes from './routes/facts.routes';

const routeCallCount: Record<string, number> = {};
const routeCallTimestamps: Record<string, number[]> = {};

export class App {
  public app: Application;
  public server: HTTPServer;
  public io: SocketIOServer;
  private sessionStore: any;
  public onlineStudents: Record<string, string> = {};

  constructor(private db: Pool) {
    this.app = express();
    this.server = require('http').createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: 'https://nuhire-wgez.onrender.com', 
        credentials: true
      }
    });

    this.initializeMiddleware();
    this.initializeRoutes();
  }

  private initializeMiddleware(): void {
    this.app.set("trust proxy", 1);

    this.app.use(cors({
      origin: "https://nuhire-wgez.onrender.com",
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // CREATE SESSION STORE FIRST
    const url = new URL(process.env.DATABASE_URL!);
    const SessionStore = MySQLStore(session);
    this.sessionStore = new SessionStore({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1)
    });

    // THEN CONFIGURE SESSION WITH THE STORE
    this.app.use(session({
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: true,  // Change to true
      store: this.sessionStore,  // Now this.sessionStore exists!
      cookie: {
        secure: true,
        httpOnly: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
      }
    }));

    // Body parser
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // View engine setup
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, '../views'));

    // Passport initialization
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Logging middleware
    this.app.use((req, res, next) => {
      const route = `${req.method} ${req.path}`;
      
      // Increment call count
      if (!routeCallCount[route]) {
        routeCallCount[route] = 0;
        routeCallTimestamps[route] = [];
      }
      routeCallCount[route]++;
      routeCallTimestamps[route].push(Date.now());
      
      // Log every request with count
      console.log(`📊 [${new Date().toISOString()}] ${route} - Call #${routeCallCount[route]}`);
      
      // Warn if same route called many times in short period
      const recentCalls = routeCallTimestamps[route].filter(
        timestamp => Date.now() - timestamp < 60000 // Last minute
      );
      
      if (recentCalls.length > 50) {
        console.warn(`⚠️  WARNING: ${route} called ${recentCalls.length} times in the last minute!`);
      }
      
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

    // Stats endpoint
    this.app.get('/api/stats', (req, res) => {
      const stats = Object.entries(routeCallCount)
        .map(([route, count]) => {
          const timestamps = routeCallTimestamps[route];
          const lastMinute = timestamps.filter(t => Date.now() - t < 60000).length;
          const lastHour = timestamps.filter(t => Date.now() - t < 3600000).length;
          
          return {
            route,
            totalCalls: count,
            callsLastMinute: lastMinute,
            callsLastHour: lastHour,
            lastCall: new Date(timestamps[timestamps.length - 1]).toISOString()
          };
        })
        .sort((a, b) => b.totalCalls - a.totalCalls);
      
      res.json({
        stats,
        topRoutes: stats.slice(0, 10),
        warnings: stats.filter(s => s.callsLastMinute > 50)
      });
    });

    // API routes
    this.app.use('/auth', authRoutes(this.db));

    // API routes
    this.app.use('/auth', authRoutes(this.db));
    this.app.use('/users', userRoutes(this.db, this.io));
    this.app.use('/resume', resumeRoutes(this.db, this.io));
    this.app.use('/resume_pdf', resumePdfRoutes(this.db, this.io));
    this.app.use('/interview', interviewRoutes(this.db, this.io));
    this.app.use('/jobs', jobRoutes(this.db, this.io, this.onlineStudents));
    this.app.use('/groups', groupRoutes(this.db, this.io));
    this.app.use('/moderator', moderatorRoutes(this.db));
    this.app.use('/notes', noteRoutes(this.db));
    this.app.use('/offers', offerRoutes(this.db));
    this.app.use('/progress', progressRoutes(this.db, this.io));
    this.app.use('/candidates', candidateRoutes(this.db));
    this.app.use('/upload', uploadRoutes());
    this.app.use('/csv', csvRoutes(this.db, this.io));
    this.app.use('/facts', factsRoutes(this.db, this.io));
    this.app.use('/delete', deleteRoutes(this.db, this.io, this.onlineStudents));
  }

  public listen(port: number): void {
    this.server.listen(port, () => {
      console.log(`🚀 Server running`);
    });
  }
}
// src/routes/delete.routes.ts
import { Router } from 'express';
import { Connection } from 'mysql2';
import { ResumeController } from '../controllers/resume.controller';
import { JobController } from '../controllers/job.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { Server as SocketIOServer } from 'socket.io';

export default (db: Connection, io: SocketIOServer, onlineStudents: Record<string, string>): Router => {
  const router = Router();
  const resumeController = new ResumeController(db);
  const jobController = new JobController(db, io, onlineStudents);

  router.delete('/resume/:fileName', requireAuth, resumeController.deleteResumeFile);
  router.delete('/job/:fileName', requireAuth, jobController.deleteJobFile);

  return router;
};
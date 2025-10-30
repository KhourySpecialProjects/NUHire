// src/routes/job.routes.ts
import { Router } from 'express';
import { Connection } from 'mysql2';
import { Server as SocketIOServer } from 'socket.io';
import { JobController } from '../controller/job.controller';
import { requireAuth } from '../middleware/auth.middleware';

export default (db: Connection, io: SocketIOServer, onlineStudents: Record<string, string>): Router => {
  const router = Router();
  const jobController = new JobController(db, io, onlineStudents);

  router.get('/', requireAuth, jobController.getAllJobs);
  router.post('/', requireAuth, jobController.createJob);
  router.get('/title', requireAuth, jobController.getJobByTitle);
  router.post('/update-job', requireAuth, jobController.updateJob);
  router.get('/assignment/:groupId/:classId', requireAuth, jobController.getJobAssignment);

  return router;
};
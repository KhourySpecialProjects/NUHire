// src/routes/resume.routes.ts
import { Router } from 'express';
import { Pool } from 'mysql2';
import { ResumeController } from '../controller/resume.controller';
import { Server as SocketIOServer } from 'socket.io';
import { requireAuth } from '../middleware/auth.middleware';

export default (db: Pool, io: SocketIOServer): Router => {
  const router = Router();
  const resumeController = new ResumeController(db, io);

  router.get('/', requireAuth, resumeController.getAllResumes);
  router.post('/vote', requireAuth, resumeController.submitVote);
  router.get('/student/:student_id', requireAuth, resumeController.getResumesByStudent);
  router.delete('/:student_id', requireAuth, resumeController.deleteResumeByStudent);
  router.get('/group/:group_id', requireAuth, resumeController.getResumesByGroup);
  router.post('/check', requireAuth, resumeController.checkResume);
  router.get('/checked/:group_id', requireAuth, resumeController.getCheckedResumes);
  router.post('/batch-vote', requireAuth, resumeController.batchVote);
  router.get('/finished-count/:group_id/:class_id', requireAuth, resumeController.getFinishedCount);

  return router;
};

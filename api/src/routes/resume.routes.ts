// src/routes/resume.routes.ts
import { Router } from 'express';
import { Connection } from 'mysql2';
import { ResumeController } from '../controllers/resume.controller';
import { requireAuth } from '../middleware/auth.middleware';

export default (db: Connection): Router => {
  const router = Router();
  const resumeController = new ResumeController(db);

  router.get('/', requireAuth, resumeController.getAllResumes);
  router.post('/vote', requireAuth, resumeController.submitVote);
  router.get('/student/:student_id', requireAuth, resumeController.getResumesByStudent);
  router.delete('/:student_id', requireAuth, resumeController.deleteResumeByStudent);
  router.get('/group/:group_id', requireAuth, resumeController.getResumesByGroup);
  router.post('/check', requireAuth, resumeController.checkResume);
  router.get('/checked/:group_id', requireAuth, resumeController.getCheckedResumes);

  return router;
};

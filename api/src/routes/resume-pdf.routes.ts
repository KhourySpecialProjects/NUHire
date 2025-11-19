// src/routes/resume-pdf.routes.ts
import { Router } from 'express';
import { Connection } from 'mysql2';
import { ResumeController } from '../controller/resume.controller';
import { requireAuth } from '../middleware/auth.middleware';

export default (db: Connection): Router => {
  const router = Router();
  const resumeController = new ResumeController(db);

  router.get('/', requireAuth, resumeController.getAllResumePdfs);
  router.post('/', requireAuth, resumeController.createResumePdf);
  router.delete('/:file_path', requireAuth, resumeController.deleteResumeFile);
  router.get('/resumes/:fileName',requireAuth, resumeController.getResumeFile);
  router.get('/id/:id', requireAuth, resumeController.getResumePdfById);

  return router;
};
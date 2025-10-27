// src/routes/upload.routes.ts
import { Router } from 'express';
import { UploadController } from '../controller/upload.controller';
import { upload } from '../middleware/upload.middleware';

export default (): Router => {
  const router = Router();
  const uploadController = new UploadController();

  router.post('/', upload.single('file'), uploadController.uploadFile);
  router.post('/resume', upload.single('resume'), uploadController.uploadResume);
  router.post('/job', upload.single('jobDescription'), uploadController.uploadJob);

  return router;
};
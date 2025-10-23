// src/routes/progress.routes.ts
import { Router } from 'express';
import { Connection } from 'mysql2';
import { Server as SocketIOServer } from 'socket.io';
import { ProgressController } from '../controllers/progress.controller';
import { requireAuth } from '../middleware/auth.middleware';

export default (db: Connection, io: SocketIOServer): Router => {
  const router = Router();
  const progressController = new ProgressController(db, io);

  router.get('/group/:crn/:group_id', requireAuth, progressController.getProgressByGroup);
  router.get('/user/:email', requireAuth, progressController.getProgressByUser);
  router.post('/', requireAuth, progressController.updateProgress);

  return router;
};
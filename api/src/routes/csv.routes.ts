// src/routes/csv.routes.ts
import { Router } from 'express';
import { Connection } from 'mysql2';
import { Server as SocketIOServer } from 'socket.io';
import { CSVController } from '../controllers/csv.controller';
import { requireAuth } from '../middleware/auth.middleware';

export default (db: Connection, io: SocketIOServer): Router => {
  const router = Router();
  const csvController = new CSVController(db, io);

  router.post('/import', requireAuth, csvController.importCSV);

  return router;
};
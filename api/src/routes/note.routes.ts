// src/routes/note.routes.ts
import { Router } from 'express';
import { Connection } from 'mysql2';
import { NoteController } from '../controllers/note.controller';
import { requireAuth } from '../middleware/auth.middleware';

export default (db: Connection): Router => {
  const router = Router();
  const noteController = new NoteController(db);

  router.get('/', requireAuth, noteController.getNotes);
  router.post('/', requireAuth, noteController.createNote);

  return router;
};
// src/routes/moderator.routes.ts
import { Router } from 'express';
import { Connection } from 'mysql2';
import { ModeratorController } from '../controllers/moderator.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

export default (db: Connection): Router => {
  const router = Router();
  const moderatorController = new ModeratorController(db);

  router.post('/crns', requireAuth, moderatorController.addModeratorCRN);
  router.get('/crns', requireAuth, moderatorController.getAllModeratorCRNs);
  router.delete('/crns/:crn', requireAuth, moderatorController.deleteModeratorCRN);
  router.get('/crns/:crn', requireAuth, moderatorController.getModeratorCRN);
  router.get('/classes/:email', requireAuth, moderatorController.getModeratorClasses);
  router.get('/classes-full/:email', requireAuth, moderatorController.getModeratorClassesFull);
  router.post('/update-groups', requireAuth, moderatorController.updateGroups);
  router.post('/add-student', requireAuth, moderatorController.addStudent);
  router.delete('/del-student', requireAuth, moderatorController.deleteStudent);

  return router;
};
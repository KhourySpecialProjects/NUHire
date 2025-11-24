// src/routes/user.routes.ts

import { Router } from 'express';
import { Connection } from 'mysql2';
import { UserController } from '../controller/user.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { Server as SocketIOServer } from 'socket.io';

export default (db: Pool, io: SocketIOServer): Router => {
  const router = Router();
  const userController = new UserController(db, io);

  router.post('/', userController.createUser);
  router.get('/', requireAuth, userController.getAllUsers);
  router.get('/students', requireAuth, userController.getStudents);
  router.get('/:id', requireAuth, userController.getUserById);
  router.post('/update-currentpage', requireAuth, userController.updateCurrentPage);
  router.post('/update-user-class', requireAuth, userController.updateUserClass);
  router.post('/update-seen', requireAuth, userController.updateUserSeen);
  router.get('/check/:email', userController.check);

  return router;
}; 
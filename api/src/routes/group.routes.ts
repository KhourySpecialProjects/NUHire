// src/routes/group.routes.ts
import { Router } from 'express';
import { Connection } from 'mysql2';
import { Server as SocketIOServer } from 'socket.io';
import { GroupController } from '../controller/group.controller';
import { requireAuth } from '../middleware/auth.middleware';

export default (db: Connection, io: SocketIOServer): Router => {
  const router = Router();
  const groupController = new GroupController(db, io);

  router.get('/', requireAuth, groupController.getGroups);
  router.post('/update-group', requireAuth, groupController.updateGroup);
  router.post('/create-groups', requireAuth, groupController.createGroups);
  router.get('/class-info/:classId', requireAuth, groupController.getClassInfo);
  router.post('/join-group', requireAuth, groupController.joinGroup);
  router.get('/students-by-class/:classId', requireAuth, groupController.getStudentsByClass);
  router.patch('/reassign-student', requireAuth, groupController.reassignStudent);
  router.patch('/remove-from-group', requireAuth, groupController.removeFromGroup);
  router.patch('/start-all-groups', requireAuth, groupController.startAllGroups);
  router.patch('/start-group', requireAuth, groupController.startGroup);
  router.post('/add-student', requireAuth, groupController.addStudent);
  router.get('/started/:classId/:groupId', requireAuth, groupController.getGroupStarted);
  router.get('/status/:classId/:groupId', requireAuth, groupController.getGroupStatus);
  router.get('/seen', requireAuth, groupController.getGroupsSeen);
  router.post('/create-single-group', requireAuth, groupController.createSingleGroup);
  router.delete('/delete-student', requireAuth, groupController.deleteStudent);
  router.get('/getProgress/:classId/:groupId', requireAuth, groupController.getProgress);
  router.post('/assign-job-to-all', requireAuth, groupController.assignJobToAllGroups);

  return router;
};

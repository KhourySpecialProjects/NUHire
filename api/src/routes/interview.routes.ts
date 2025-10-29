// src/routes/interview.routes.ts
import { Router } from 'express';
import { Connection } from 'mysql2';
import { Server as SocketIOServer } from 'socket.io';
import { InterviewController } from '../controller/interview.controller';
import { requireAuth } from '../middleware/auth.middleware';

export default (db: Connection, io: SocketIOServer): Router => {
  const router = Router();
  const interviewController = new InterviewController(db, io);

  router.post('/vote', requireAuth, interviewController.submitVote);
  router.get('/', requireAuth, interviewController.getAllInterviews);
  router.get('/status/finished-count', requireAuth, interviewController.getFinishedCount);
  router.post('/status/finished', requireAuth, interviewController.updateFinishedStatus);
  router.get('/group/:group_id', requireAuth, interviewController.getInterviewsByGroup);
  router.delete('/:student_id', requireAuth, interviewController.deleteInterview);
  router.get('/popup/:resId/:groupId/:classId', requireAuth, interviewController.getInterviewPopup);
  router.get('/vids', requireAuth, interviewController.getAllInterviewVids);
  router.get('/group-size/:group_id/:class', requireAuth, interviewController.getGroupSize);

  return router;
};
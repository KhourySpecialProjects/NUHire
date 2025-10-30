// src/routes/auth.routes.ts
import { Router } from 'express';
import { Connection } from 'mysql2';
import { AuthController } from '../controller/auth.controller';

export default (db: Connection): Router => {
  const router = Router();
  const authController = new AuthController(db);

  router.get('/keycloak', authController.initiateKeycloakAuth);
  router.get('/keycloak/callback', ...authController.handleKeycloakCallback);
  router.get('/user', authController.getAuthenticatedUser);
  router.post('/logout', authController.logout);
  router.post('/moderator-login', authController.moderatorLogin);

  return router;
};
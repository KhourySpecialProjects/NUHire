// ============================================
// src/controllers/auth.controller.ts
// ============================================

import { Response, NextFunction } from 'express';
import passport from 'passport';
import { AuthRequest } from '../models/types';
import { Connection } from 'mysql2';

export class AuthController {
  constructor(private db: Connection) {}

  initiateKeycloakAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
    passport.authenticate('keycloak')(req, res, next);
  };

  handleKeycloakCallback = [
    (req: AuthRequest, res: Response, next: NextFunction) => {
      console.log('🔄 Starting Keycloak callback processing...');
      next();
    },
    passport.authenticate('keycloak', {
      failureRedirect: `${process.env.REACT_APP_FRONT_URL}/?error=auth_failed`,
      failureFlash: false
    }),
    (req: AuthRequest, res: Response) => {

      const user = req.user;
      const FRONT_URL = process.env.REACT_APP_FRONT_URL;

      if (!user || !user.email) {
        console.error('No user or email found after authentication');
        res.redirect(`${FRONT_URL}/?error=no_user`);
        return;
      }

      const email = user.email;
      const prof = user.keycloakProfile;
      const parts = prof.name.split(" ");
      const firstName = parts[0];
      const lastName = parts[1];

      console.log(`This is the profile info from Keycloak: ${email}, ${firstName}, ${lastName}`);

      this.db.query('SELECT * FROM Users WHERE email = ?', [email], (err, results: any[]) => {
        if (err) {
          console.error('Database error:', err);
          res.redirect(`${FRONT_URL}/?error=db_error`);
          return;
        }

        if (results.length > 0) {
          const dbUser = results[0];

          const fullName = encodeURIComponent(`${dbUser.f_name || ''} ${dbUser.l_name || ''}`.trim());
          // Admin check
          if (dbUser.affiliation === 'admin') {
            res.redirect(`${FRONT_URL}/advisor-dashboard?name=${fullName}`);
            return;
          }

          // Check if user needs to complete signup (missing names only)
          if (!dbUser.f_name || !dbUser.l_name || dbUser.l_name === '' || dbUser.f_name === '' || dbUser.l_name === null || dbUser.f_name === null || dbUser.affiliation === 'none') {
            res.redirect(`${FRONT_URL}/signupform?email=${encodeURIComponent(email)}&firstName=${firstName}&lastName=${lastName}`);
            return;
          }

          // User has group - check if group is started
          const checkGroupStartedQuery = 'SELECT started FROM `GroupsInfo` WHERE class_id = ? AND group_id = ?';
          
          this.db.query(checkGroupStartedQuery, [dbUser.class, dbUser.group_id], (startErr, startResults: any[]) => {
            if (startErr) {
              console.error('Error checking group start status:', startErr);
              res.redirect(`${FRONT_URL}/waitingGroup`);
              return;
            }

            console.log('seen group results:', dbUser);

            if (startResults.length > 0 && startResults[0].started === 1) {
              if (dbUser.seen === 1) {
                res.redirect(`${FRONT_URL}/dashboard?name=${fullName}`);
              } else {
                res.redirect(`${FRONT_URL}/about`);
              }
            } else {
              res.redirect(`${FRONT_URL}/waitingGroup`);
            }
          });
        } else {
          res.redirect(`${FRONT_URL}/signupform?email=${encodeURIComponent(email)}&firstName=${firstName}&lastName=${lastName}`);
        }
      });
    }
  ];

  getAuthenticatedUser = (req: AuthRequest, res: Response): void => {
    if (req.sessionID && !req.session.passport) {
      console.log('❌ Session exists but no passport data - authentication expired');
      res.redirect('/auth/keycloak');
      return;
    }

    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.log('❌ User not authenticated - redirecting to sign in');
      res.redirect('/auth/keycloak');
      return;
    }

    res.json(req.user);
  };

  logout = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const FRONT_URL = process.env.REACT_APP_FRONT_URL;

    req.logout((err) => {
      if (err) {
        next(err);
        return;
      }

      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out successfully' });
      });
    });
  };

  moderatorLogin = (req: AuthRequest, res: Response): void => {
    const { username, password } = req.body;
        
    if (username === process.env.MODERATOR_USERNAME && 
      password === process.env.MODERATOR_PASSWORD) {

      req.session.isModerator = true;
      req.session.moderatorEmail = username;
      console.log('req.session:', req.session);

      res.status(200).json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  };

  verifyModerator = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.session.isModerator) {
      console.log('Moderator verified:', req.session.moderatorEmail);
      res.status(200).json({ 
        authenticated: true,
        email: req.session.moderatorEmail 
      });
    } else {
      res.status(401).json({ authenticated: false });
    }
  };
}
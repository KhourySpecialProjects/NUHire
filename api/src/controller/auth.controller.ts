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
      console.log('=== Authentication successful ===');
      console.log('req.user after auth:', req.user);

      const user = req.user;
      const FRONT_URL = process.env.REACT_APP_FRONT_URL;

      if (!user || !user.email) {
        console.error('No user or email found after authentication');
        res.redirect(`${FRONT_URL}/?error=no_user`);
        return;
      }

      const email = user.email;
      const firstName = user.f_name;
      const lastName = user.l_name;

      console.log(`🔍 Looking up user in database: ${email}`);

      this.db.query('SELECT * FROM Users WHERE email = ?', [email], (err, results: any[]) => {
        if (err) {
          console.error('Database error:', err);
          res.redirect(`${FRONT_URL}/?error=db_error`);
          return;
        }

        if (results.length > 0) {
          const dbUser = results[0];
          console.log('👤 Found user:', { 
            email: dbUser.email, 
            affiliation: dbUser.affiliation, 
            hasGroup: !!dbUser.group_id,
            hasNames: !!(dbUser.f_name && dbUser.l_name)
          });

          const fullName = encodeURIComponent(`${dbUser.f_name || ''} ${dbUser.l_name || ''}`.trim());
          console.log("This sis the gotten user", dbUser)
          // Admin check
          if (dbUser.affiliation === 'admin') {
            console.log('🔀 Redirecting admin to advisor dashboard');
            res.redirect(`${FRONT_URL}/advisor-dashboard?name=${fullName}`);
            return;
          }

          // Check if user needs to complete signup (missing names only)
          if (!dbUser.f_name || !dbUser.l_name || dbUser.l_name === '' || dbUser.f_name === '' || dbUser.l_name === null || dbUser.f_name === null) {
            console.log('🔀 User needs to complete signup form - missing names');
            res.redirect(`${FRONT_URL}/signupform?email=${encodeURIComponent(email)}&firstName=${firstName}&lastName=${lastName}`);
            return;
          }

          // User has names but no group - send to group assignment or waiting
          if (!dbUser.group_id) {
            if (dbUser.affiliation === 'student') {
              console.log('🔀 Student has no group, redirecting to group assignment');
              res.redirect(`${FRONT_URL}/waitingGroup`);
              return;
            } else {
              console.log('🔀 Non-student with no group, redirecting to dashboard');
              res.redirect(`${FRONT_URL}/?name=${fullName}`);
              return;
            }
          }

          // User has group - check if group is started
          console.log(`🔍 Checking group status for group ${dbUser.group_id}, class ${dbUser.class}`);
          const checkGroupStartedQuery = 'SELECT started FROM `GroupsInfo` WHERE class_id = ? AND group_id = ?';
          
          this.db.query(checkGroupStartedQuery, [dbUser.class, dbUser.group_id], (startErr, startResults: any[]) => {
            if (startErr) {
              console.error('Error checking group start status:', startErr);
              res.redirect(`${FRONT_URL}/waitingGroup`);
              return;
            }

            if (startResults.length > 0 && startResults[0].started === 1) {
              console.log('✅ Group is started');
              if (dbUser.seen === 1) {
                console.log('🔀 User has seen intro, going to dashboard');
                res.redirect(`${FRONT_URL}/dashboard?name=${fullName}`);
              } else {
                console.log('🔀 User needs to see intro, going to about');
                res.redirect(`${FRONT_URL}/about`);
              }
            } else {
              console.log('⏳ Group not started, going to waiting room');
              res.redirect(`${FRONT_URL}/waitingGroup`);
            }
          });
        } else {
          console.log('🆕 User not found in database, redirecting to signup form');
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

    if (
      username === process.env.MODERATOR_USERNAME &&
      password === process.env.MODERATOR_PASSWORD
    ) {
      res.json({ success: true });
      return;
    }

    res.status(401).json({ success: false, message: 'Invalid credentials' });
  };
}
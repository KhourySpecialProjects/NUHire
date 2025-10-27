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
    console.log('🔄 [STEP 1] Starting Keycloak callback processing...');
    console.log('🔗 Callback URL params:', req.query);
    
    // Set a response timeout
    const timeout = setTimeout(() => {
      console.error('⏰ Callback processing timeout!');
      if (!res.headersSent) {
        res.redirect(`${process.env.REACT_APP_FRONT_URL}/?error=callback_timeout`);
      }
    }, 25000);

    // Clear timeout when response is sent
    res.on('finish', () => clearTimeout(timeout));
    
    next();
  },
  (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log('🔄 [STEP 2] About to authenticate with Keycloak...');
    
    passport.authenticate('keycloak', {
      failureRedirect: `${process.env.REACT_APP_FRONT_URL}/?error=auth_failed`,
      failureFlash: false
    })(req, res, (err: any) => {
      if (err) {
        console.error('❌ [STEP 2] Passport authentication error:', err);
        return res.redirect(`${process.env.REACT_APP_FRONT_URL}/?error=passport_error`);
      }
      console.log('✅ [STEP 2] Passport authentication successful');
      next();
    });
  },
  (req: AuthRequest, res: Response) => {
    console.log('🔄 [STEP 3] Processing authenticated user...');
    
    const user = req.user;
    const FRONT_URL = process.env.REACT_APP_FRONT_URL;

    console.log('👤 User object:', user);

    if (!user || !user.email) {
      console.error('❌ [STEP 3] No user or email found after authentication');
      return res.redirect(`${FRONT_URL}/?error=no_user`);
    }

    const email = user.email;
    const firstName = user.f_name;
    const lastName = user.l_name;

    console.log(`🔍 [STEP 4] Looking up user in database: ${email}`);

    // Add database query timeout
    const dbTimeout = setTimeout(() => {
      console.error('⏰ Database query timeout!');
      if (!res.headersSent) {
        res.redirect(`${FRONT_URL}/?error=db_timeout`);
      }
    }, 10000);

    this.db.query('SELECT * FROM Users WHERE email = ?', [email], (err, results: any[]) => {
      clearTimeout(dbTimeout);
      
      if (err) {
        console.error('❌ [STEP 4] Database error:', err);
        return res.redirect(`${FRONT_URL}/?error=db_error`);
      }

      console.log(`📊 [STEP 4] Database query returned ${results.length} results`);

      try {
        if (results.length > 0) {
          const dbUser = results[0];
          console.log('👤 [STEP 5] Found user in database:', { 
            email: dbUser.email, 
            affiliation: dbUser.affiliation, 
            hasGroup: !!dbUser.group_id,
            hasNames: !!(dbUser.f_name && dbUser.l_name),
            class: dbUser.class
          });

          const fullName = encodeURIComponent(`${dbUser.f_name || ''} ${dbUser.l_name || ''}`.trim());

          // Admin check
          if (dbUser.affiliation === 'admin') {
            console.log('🔀 [REDIRECT] Admin to advisor dashboard');
            return res.redirect(`${FRONT_URL}/advisor-dashboard?name=${fullName}`);
          }

          // Check if user needs to complete signup
          if (!dbUser.f_name || !dbUser.l_name || dbUser.l_name === '' || dbUser.f_name === '' || dbUser.l_name === null || dbUser.f_name === null) {
            console.log('🔀 [REDIRECT] User needs to complete signup form');
            return res.redirect(`${FRONT_URL}/signupform?email=${encodeURIComponent(email)}&firstName=${firstName}&lastName=${lastName}`);
          }

          // Check group status
          if (dbUser.group_id) {
            console.log(`🔍 [STEP 6] Checking group status for group ${dbUser.group_id}, class ${dbUser.class}`);
            
            const groupTimeout = setTimeout(() => {
              console.error('⏰ Group query timeout!');
              if (!res.headersSent) {
                res.redirect(`${FRONT_URL}/waitingGroup`);
              }
            }, 5000);

            const checkGroupStartedQuery = 'SELECT started FROM `GroupsInfo` WHERE class_id = ? AND group_id = ?';
            
            this.db.query(checkGroupStartedQuery, [dbUser.class, dbUser.group_id], (startErr, startResults: any[]) => {
              clearTimeout(groupTimeout);
              
              if (startErr) {
                console.error('❌ [STEP 6] Error checking group start status:', startErr);
                return res.redirect(`${FRONT_URL}/waitingGroup`);
              }

              console.log(`📊 [STEP 6] Group query returned ${startResults.length} results`);

              if (startResults.length > 0 && startResults[0].started === 1) {
                console.log('✅ [STEP 7] Group is started');
                if (dbUser.seen === 1) {
                  console.log('🔀 [REDIRECT] User has seen intro, going to dashboard');
                  return res.redirect(`${FRONT_URL}/dashboard?name=${fullName}`);
                } else {
                  console.log('🔀 [REDIRECT] User needs to see intro, going to about');
                  return res.redirect(`${FRONT_URL}/about`);
                }
              } else {
                console.log('⏳ [REDIRECT] Group not started, going to waiting room');
                return res.redirect(`${FRONT_URL}/waitingGroup`);
              }
            });
          } else {
            // User exists but has no group - send to assign group page
            console.log('🔀 [REDIRECT] User has no group, redirecting to group assignment');
            return res.redirect(`${FRONT_URL}/assignGroup`);
          }
        } else {
          // User not found in database
          console.log('🆕 [REDIRECT] User not found in database, redirecting to signup form');
          return res.redirect(`${FRONT_URL}/signupform?email=${encodeURIComponent(email)}&firstName=${firstName}&lastName=${lastName}`);
        }
      } catch (processingError) {
        console.error('❌ [STEP 5] Error processing user data:', processingError);
        return res.redirect(`${FRONT_URL}/?error=processing_error`);
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
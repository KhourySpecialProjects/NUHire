// ============================================
// src/controllers/auth.controller.ts
// ============================================

import { Response, NextFunction } from 'express';
import passport from 'passport';
import { AuthRequest } from '../models/types';
import { Connection } from 'mysql2';

export class AuthController {
  constructor(private db: Pool) {}

  initiateKeycloakAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
    passport.authenticate('keycloak')(req, res, next);
  };

  handleKeycloakCallback = [
    (req: AuthRequest, res: Response, next: NextFunction) => {
      console.log('🔄 Starting Keycloak callback processing...');
      console.log('🔍 Query params:', req.query);
      
      // If no OAuth code parameter, this is not a legitimate callback
      if (!req.query.code) {
        console.log('⚠️ No OAuth code - this is a duplicate/invalid callback');
        const FRONT_URL = process.env.REACT_APP_FRONT_URL;
        
        // If authenticated, check their role and redirect appropriately
        if (req.isAuthenticated && req.isAuthenticated() && req.user) {
          const user = req.user;
          
          this.db.query('SELECT * FROM Users WHERE email = ?', [user.email], (err, results: any[]) => {
            if (err || results.length === 0) {
              res.redirect(`${FRONT_URL}/dashboard`);
              return;
            }
            
            const dbUser = results[0];
            const fullName = encodeURIComponent(`${dbUser.f_name || ''} ${dbUser.l_name || ''}`.trim());
            
            if (dbUser.affiliation === 'admin') {
              res.redirect(`${FRONT_URL}/advisor-dashboard?name=${fullName}`);
            } else {
              res.redirect(`${FRONT_URL}/dashboard?name=${fullName}`);
            }
          });
        } else {
          res.redirect(`${FRONT_URL}/?error=invalid_callback`);
        }
        return;
      }
      
      next();
    },
    passport.authenticate('keycloak', {
      failureRedirect: `${process.env.REACT_APP_FRONT_URL}/?error=auth_failed`,
      failureFlash: false
    }),
    (req: AuthRequest, res: Response) => {
      console.log('✅ Auth succeeded!');
      console.log('📦 Session ID after auth:', req.sessionID);

      const user = req.user;
      const FRONT_URL = process.env.REACT_APP_FRONT_URL;

      if (!user || !user.email) {
        console.error('❌ No user or email found after authentication');
        res.redirect(`${FRONT_URL}/?error=no_user`);
        return;
      }

      // Helper function to explicitly set cookie and redirect (for Safari)
      const setCookieAndRedirect = (redirectUrl: string) => {
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
          }
          
          // Explicitly set cookie in response header for Safari
          res.cookie('connect.sid', req.sessionID, {
            maxAge: 86400000,
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/'
          });
          
          console.log('🍪 Explicitly setting cookie:', req.sessionID);
          res.redirect(redirectUrl);
        });
      };

      // Regenerate session to ensure clean state and proper cookie setting
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          res.redirect(`${FRONT_URL}/?error=session_error`);
          return;
        }

        // Re-login the user after regeneration
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error('Login error:', loginErr);
            res.redirect(`${FRONT_URL}/?error=login_error`);
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
              setCookieAndRedirect(`${FRONT_URL}/?error=db_error`);
              return;
            }

            if (results.length > 0) {
              const dbUser = results[0];
              const fullName = encodeURIComponent(`${dbUser.f_name || ''} ${dbUser.l_name || ''}`.trim());

              if (dbUser.affiliation === 'admin') {
                setCookieAndRedirect(`${FRONT_URL}/advisor-dashboard?name=${fullName}`);
                return;
              }

              if (!dbUser.f_name || !dbUser.l_name || dbUser.affiliation === 'none') {
                setCookieAndRedirect(`${FRONT_URL}/signupform?email=${encodeURIComponent(email)}&firstName=${firstName}&lastName=${lastName}`);
                return;
              }

              const checkGroupStartedQuery = 'SELECT started FROM `GroupsInfo` WHERE class_id = ? AND group_id = ?';
              
              this.db.query(checkGroupStartedQuery, [dbUser.class, dbUser.group_id], (startErr, startResults: any[]) => {
                if (startErr) {
                  console.error('Error checking group start status:', startErr);
                  setCookieAndRedirect(`${FRONT_URL}/waitingGroup`);
                  return;
                }

                console.log('seen group results:', dbUser);

                if (startResults.length > 0 && startResults[0].started === 1) {
                  if (dbUser.seen === 1) {
                    setCookieAndRedirect(`${FRONT_URL}/dashboard?name=${fullName}`);
                  } else {
                    setCookieAndRedirect(`${FRONT_URL}/about`);
                  }
                } else {
                  setCookieAndRedirect(`${FRONT_URL}/waitingGroup`);
                }
              });
            } else {
              setCookieAndRedirect(`${FRONT_URL}/signupform?email=${encodeURIComponent(email)}&firstName=${firstName}&lastName=${lastName}`);
            }
          });
        });
      });
    }
  ];

  getAuthenticatedUser = (req: AuthRequest, res: Response): void => {
    console.log('=== GET AUTH USER DEBUG ===');
    console.log('Session ID:', req.sessionID);
    console.log('Session:', req.session);
    console.log('Is Authenticated:', req.isAuthenticated ? req.isAuthenticated() : 'N/A');
    console.log('User:', req.user);
    console.log('===========================');

    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.log('❌ User not authenticated');
      res.status(401).json({ error: 'Not authenticated' });
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
      console.log('req.session:', req.session);

      res.status(200).json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  };

  verifyModerator = (req: AuthRequest, res: Response, next: NextFunction): void => {

    if (req.session.isModerator) {
      res.status(200).json({ 
        authenticated: true,
      });
    } else {
      console.log('❌ Moderator not authenticated');
      res.status(401).json({ authenticated: false });
    }
  };

  handlePostSignupRedirect = (req: AuthRequest, res: Response): void => {
    const FRONT_URL = process.env.REACT_APP_FRONT_URL;
    
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.redirect(`${FRONT_URL}/?error=not_authenticated`);
      return;
    }

    const user = req.user;
    const email = user.email;

    this.db.query('SELECT * FROM Users WHERE email = ?', [email], (err, results: any[]) => {
      if (err || results.length === 0) {
        res.redirect(`${FRONT_URL}/?error=user_not_found`);
        return;
      }

      const dbUser = results[0];
      const fullName = encodeURIComponent(`${dbUser.f_name || ''} ${dbUser.l_name || ''}`.trim());

      if (dbUser.affiliation === 'admin') {
        res.redirect(`${FRONT_URL}/advisor-dashboard?name=${fullName}`);
        return;
      }

      // Check if group is started for students
      const checkGroupStartedQuery = 'SELECT started FROM `GroupsInfo` WHERE class_id = ? AND group_id = ?';
      
      this.db.query(checkGroupStartedQuery, [dbUser.class, dbUser.group_id], (startErr, startResults: any[]) => {
        if (startErr || startResults.length === 0) {
          res.redirect(`${FRONT_URL}/waitingGroup`);
          return;
        }

        if (startResults[0].started === 1) {
          if (dbUser.seen === 1) {
            res.redirect(`${FRONT_URL}/dashboard?name=${fullName}`);
          } else {
            res.redirect(`${FRONT_URL}/about`);
          }
        } else {
          res.redirect(`${FRONT_URL}/waitingGroup`);
        }
      });
    });
  };
}
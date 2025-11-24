// src/config/passport.ts

import passport from 'passport';
import { Pool } from 'mysql2';
const KeycloakStrategy = require('passport-keycloak-oauth2-oidc').Strategy;

interface KeycloakProfile {
  id?: string;
  username?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  firstName?: string;
  lastName?: string;
  keycloakId?: string;
  [key: string]: any;
}

export function configurePassport(db: Pool): void {
  const KEYCLOAK_URL = process.env.KEYCLOAK_URL!;
  const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM!;

  passport.use(
    'keycloak',
    new KeycloakStrategy(
      {
        authServerURL: KEYCLOAK_URL,
        realm: KEYCLOAK_REALM,
        clientID: process.env.KEYCLOAK_CLIENT_ID!,
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
        callbackURL: 'https://nuhire-api-cz6c.onrender.com/auth/keycloak/callback',
        scope: 'openid profile email',
        authorizationURL: `${KEYCLOAK_URL}/realms/NUHire-Realm/protocol/openid-connect/auth`,
        tokenURL: `${KEYCLOAK_URL}/realms/NUHire-Realm/protocol/openid-connect/token`,
        userInfoURL: `${KEYCLOAK_URL}/realms/NUHire-Realm/protocol/openid-connect/userinfo`
      },
      async (accessToken: string, refreshToken: string, profile: KeycloakProfile, done: (error: any, user?: any) => void) => {
        try {
          const userEmail = profile.email;
          const parts = profile.name.split(" ");
          const fname = parts[0];
          const lname = parts[1];
          
          if (!userEmail) {
            throw new Error('No email found in Keycloak profile');
          }

          const [rows] = await db.promise().execute(
            'SELECT * FROM Users WHERE email = ?',
            [userEmail]
          );

          const users = rows as any[];
          let dbUser;


          if (users.length === 0) {
            await db.promise().execute(
              'INSERT INTO Users (email, f_name, l_name, affiliation) VALUES (?, ?, ?, ?)',
              [
                userEmail,
                fname, lname,
                'none'
              ]
            );

            const [newUserRows] = await db.promise().execute(
              'SELECT * FROM Users WHERE email = ?',
              [userEmail]
            );
            dbUser = (newUserRows as any[])[0];
          } else {
            dbUser = users[0];
          }

          dbUser.keycloakProfile = profile;

          return done(null, dbUser);
        } catch (error) {
          console.error('Error in passport callback:', error);
          return done(error, null);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    console.log('✅ SERIALIZING USER:', user);
    done(null, user.id); // or whatever identifier you use
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [rows] = await db.promise().execute(
        'SELECT * FROM Users WHERE id = ?',
        [id]
      );
      
      const users = rows as any[];
      if (users.length > 0) {
        done(null, users[0]);
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error, null);
    }
  });
}
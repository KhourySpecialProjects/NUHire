// src/config/passport.ts

import passport from 'passport';
import { Connection } from 'mysql2';
import KeycloakStrategy from 'passport-keycloak-oauth2-oidc';

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

export function configurePassport(db: Connection): void {
  const browserIssuer = 'https://nuhire-keycloak-rhow.onrender.com/realms/NUHire-Realm';
  const KEYCLOAK_URL = process.env.KEYCLOAK_URL!;
  const containerIssuer = `${KEYCLOAK_URL}/realms/NUHire-Realm`;

  passport.use(
    'keycloak',
    new KeycloakStrategy(
      {
        host: KEYCLOAK_URL,
        issuer: containerIssuer,
        userInfoURL: `${containerIssuer}/protocol/openid-connect/userinfo`,
        authorizationURL: `${browserIssuer}/protocol/openid-connect/auth`,
        tokenURL: `${containerIssuer}/protocol/openid-connect/token`,
        realm: process.env.KEYCLOAK_REALM!,
        clientID: process.env.KEYCLOAK_CLIENT_ID!,
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
        callbackURL: 'https://nuhire-api-cz6c.onrender.com/auth/keycloak/callback',
        scope: ['openid', 'profile', 'email']
      },
      async (profile: KeycloakProfile, done: (error: any, user?: any) => void) => {
        console.log('=== Passport Callback SUCCESS ===');
        console.log('Profile:', JSON.stringify(profile, null, 2));

        try {
          // Extract user data from the profile
          const user = {
            id: profile.id || profile.username,
            username: profile.username,
            email: profile.email,
            first_name: profile.given_name || profile.firstName,
            last_name: profile.family_name || profile.lastName,
            keycloak_id: profile.keycloakId || profile.id
          };

          console.log('Processed user:', user);

          // Check if user exists in database
          const [rows] = await db.promise().execute(
            'SELECT * FROM Users WHERE keycloak_id = ?',
            [user.keycloak_id]
          );

          if ((rows as any[]).length === 0) {
            // Create new user
            await db.promise().execute(
              'INSERT INTO Users (keycloak_id, username, email, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
              [user.keycloak_id, user.username, user.email, user.first_name, user.last_name]
            );
            console.log('New user created');
          }

          return done(null, user);
        } catch (error) {
          console.error('Error in passport callback:', error);
          return done(error, null);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [rows] = await db.promise().execute(
        'SELECT * FROM Users WHERE keycloak_id = ?',
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
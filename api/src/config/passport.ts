// src/config/passport.ts

import passport from 'passport';
import { Strategy as KeycloakStrategy } from '@exlinc/keycloak-passport';
import { Connection } from 'mysql2';

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
      async (profile, done) => {
        console.log('=== Passport Callback SUCCESS ===');
        console.log('Profile:', JSON.stringify(profile, null, 2));

        const email = profile.email.toLowerCase().trim();
        const firstName = profile.firstName;
        const lastName = profile.lastName;

        console.log('Email:', email);
        console.log('First Name:', firstName);
        console.log('Last Name:', lastName);

        return done(null, { email, f_name: firstName, l_name: lastName });
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id || user.email);
  });

  passport.deserializeUser((identifier: string | number, done) => {
    const query = isNaN(Number(identifier))
      ? 'SELECT * FROM Users WHERE email = ?'
      : 'SELECT * FROM Users WHERE id = ?';

    db.query(query, [identifier], (err: any, results: any[]) => {
      if (err) return done(err);
      if (results.length === 0) return done(null, false);
      return done(null, results[0]);
    });
  });
}
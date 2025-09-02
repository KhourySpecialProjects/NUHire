'use client';
import { useState } from 'react';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function SignupPage() {
  const handleKeycloakLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/keycloak`; // Redirect to OAuth
  };

  return (
    <div>
      <h1 className="signup">Sign Up</h1>
      <div className="body">
        <button onClick={handleKeycloakLogin} className="Oauth">
          Sign in with Keycloak
        </button>
      </div>

      <p>Already have an account? <Link href="/login"> Click here!</Link></p>
    </div>
  );
}


// Create or update next.config.js in your project root
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable runtime configuration for environment variables
  publicRuntimeConfig: {
    // These will be available on both server and client
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    KEYCLOAK_URL: process.env.NEXT_PUBLIC_KEYCLOAK_URL,
  },
  
  // Server-only runtime config (if needed)
  serverRuntimeConfig: {
    // Server-only secrets go here
  },
  
  // Output standalone for Docker
  output: 'standalone',
}
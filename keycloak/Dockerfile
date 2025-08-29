# Use the official Keycloak image as the base
FROM quay.io/keycloak/keycloak:latest

# Set environment variables for Keycloak configuration
# These can be customized based on your specific needs and Render environment variables
ENV KC_HOSTNAME=https://nuhire-keycloak.onrender.com
ENV KC_HOSTNAME_STRICT=false
ENV KC_PROXY=passthrough
ENV KC_PROXY_HEADERS=xforwarded

# Admin user credentials (important for initial setup)
ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

# Expose the default Keycloak port (8080 for HTTP, 8443 for HTTPS if enabled)
EXPOSE 8080

# Start Keycloak in production mode (or start-dev for development)
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start"]
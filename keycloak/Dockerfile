FROM quay.io/keycloak/keycloak:latest

# Admin credentials
ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

# Use Render's PORT environment variable or default to 8080
ENV KC_HTTP_HOST=0.0.0.0
ENV KC_HTTP_PORT=${PORT:-8080}

# Copy your realm import file
COPY realm-export.json /opt/keycloak/data/import/

# Expose the port
EXPOSE 8080

# Start in dev mode with import - use PORT env variable
CMD ["/opt/keycloak/bin/kc.sh", "start-dev", "--http-host=0.0.0.0", "--http-port=${PORT:-8080}", "--import-realm"]
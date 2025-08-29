FROM quay.io/keycloak/keycloak:latest

# Admin credentials
ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

# Copy your realm import file
COPY your-realm-export.json /opt/keycloak/data/import/

# Expose the port
EXPOSE 8080

# Start in dev mode with import
CMD ["/opt/keycloak/bin/kc.sh", "start-dev", "--http-host=0.0.0.0", "--http-port=8080", "--import-realm"]
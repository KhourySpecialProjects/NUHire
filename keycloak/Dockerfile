
FROM quay.io/keycloak/keycloak:latest

# Set environment variables
ENV KC_HOSTNAME=https://nuhire-keycloak.onrender.com
ENV KC_HOSTNAME_STRICT=false
ENV KC_PROXY=edge
ENV KC_PROXY_HEADERS=xforwarded
ENV KC_HTTP_ENABLED=true
ENV KC_HTTP_HOST=0.0.0.0
ENV KC_HTTP_PORT=8080

# Admin credentials (these should be set as environment variables in Render)
ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

# Copy any realm files if you have them
# COPY realm-export.json /opt/keycloak/data/import/

# Build Keycloak for production
RUN /opt/keycloak/bin/kc.sh build

# Expose the port
EXPOSE 8080

# Start Keycloak
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--import-realm"]
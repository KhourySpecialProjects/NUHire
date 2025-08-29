
FROM quay.io/keycloak/keycloak:latest

# Use new environment variable names (no deprecation warnings)
ENV KC_BOOTSTRAP_ADMIN_USERNAME=${KEYCLOAK_ADMIN}
ENV KC_BOOTSTRAP_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

# Memory optimization
ENV JAVA_OPTS="-Xms128m -Xmx400m"

# Keycloak configuration - use environment variables instead of command line
ENV KC_HTTP_HOST=0.0.0.0
ENV KC_HTTP_PORT=${PORT:-8080}
ENV KC_DB=dev-file
ENV KC_CACHE=local

EXPOSE 10000

COPY realm-export.json /opt/keycloak/data/import/

# Minimal command - let environment variables do the work
CMD ["/opt/keycloak/bin/kc.sh", "start-dev", "--import-realm"]
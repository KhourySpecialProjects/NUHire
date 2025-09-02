
FROM quay.io/keycloak/keycloak:latest

# Use new environment variable names (no deprecation warnings)
ENV KC_ADMIN=${KEYCLOAK_ADMIN}
ENV KC_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}


# Keycloak configuration - use environment variables instead of command line
ENV KC_HTTP_HOST=0.0.0.0
ENV KC_HTTP_PORT=${PORT:-8080}
ENV KC_DB=dev-file
ENV KC_CACHE=local

EXPOSE 10000

COPY realm-export.json /opt/keycloak/data/import/

ENTRYPOINT [ "/opt/keycloak/bin/kc.sh" ]

CMD ["start-dev", "--import-realm"]
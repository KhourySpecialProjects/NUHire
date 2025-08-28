# Keycloak Dockerfile
FROM quay.io/keycloak/keycloak:latest

ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

EXPOSE $PORT

CMD ["start", "--optimized", "--hostname=0.0.0.0", "--port=${PORT:-8080}", "--http-enabled=true"]

# Keycloak Dockerfile
FROM quay.io/keycloak/keycloak:latest

ENV KEYCLOAK_ADMIN=admin
ENV KEYCLOAK_ADMIN_PASSWORD=your-admin-password

EXPOSE $PORT

CMD ["start", "--optimized", "--hostname=0.0.0.0", "--port=${PORT:-8080}"]
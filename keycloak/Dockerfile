FROM quay.io/keycloak/keycloak:latest

ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

EXPOSE 8080

CMD ["start", "--optimized", "--hostname=0.0.0.0", "--http-port=8080", "--http-enabled=true"]
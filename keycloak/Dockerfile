FROM quay.io/keycloak/keycloak:latest

ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

COPY realm-export.json /opt/keycloak/data/import/

EXPOSE 8080

CMD ["start-dev", "--http-host=0.0.0.0", "--http-port=8080", "--import-realm"]
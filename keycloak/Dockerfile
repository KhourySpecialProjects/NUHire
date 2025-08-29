FROM quay.io/keycloak/keycloak:latest

ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

# Copy your realm import file
COPY realm-export.json /opt/keycloak/data/import/

# Build with file database
RUN /opt/keycloak/bin/kc.sh build --db=dev-file

EXPOSE 8080

CMD ["start", "--optimized", "--http-enabled=true", "--http-port=8080", "--hostname-strict=false", "--cache=local", "--import-realm"]
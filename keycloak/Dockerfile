FROM quay.io/keycloak/keycloak:latest

ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

# Pre-build to speed up startup
RUN /opt/keycloak/bin/kc.sh build --db=dev-mem

COPY realm-export.json /opt/keycloak/data/import/

EXPOSE 8080

CMD ["start", "--optimized", "--http-enabled=true", "--http-host=0.0.0.0", "--http-port=8080", "--hostname-strict=false", "--import-realm"]
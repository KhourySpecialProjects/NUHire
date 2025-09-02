FROM quay.io/keycloak/keycloak:latest

ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

COPY realm-export.json /opt/keycloak/data/import/

# Use the default entry point and just override the command
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start-dev", "--http-enabled=true", "--http-host=0.0.0.0", "--http-port=10000", "--import-realm", "--db=dev-file", "--cache=local"]
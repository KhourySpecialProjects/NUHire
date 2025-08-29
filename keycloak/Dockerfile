FROM quay.io/keycloak/keycloak:latest

# Admin credentials
ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

# Memory optimization for low-memory environments
ENV JAVA_OPTS="-Xms128m -Xmx400m -XX:MetaspaceSize=96M -XX:MaxMetaspaceSize=256m"
ENV KC_HTTP_HOST=0.0.0.0

# Copy your realm import file
COPY realm-export.json /opt/keycloak/data/import/

# Start with minimal memory settings
CMD /opt/keycloak/bin/kc.sh start-dev \
    --http-host=0.0.0.0 \
    --http-port=${PORT:-8080} \
    --import-realm \
    --db=dev-file \
    --cache=local
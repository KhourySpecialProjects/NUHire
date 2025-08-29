FROM quay.io/keycloak/keycloak:latest

# Admin credentials
ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

# Memory optimization + disable all clustering
ENV JAVA_OPTS="-Xms128m -Xmx400m -XX:MetaspaceSize=96M -XX:MaxMetaspaceSize=256m -Djboss.jgroups.stack=none"

# Copy realm import
COPY realm-export.json /opt/keycloak/data/import/

WORKDIR /opt/keycloak

# Use production mode with minimal configuration
RUN ./bin/kc.sh build --db=dev-file

# Start with production command and runtime cache options
CMD sh -c './bin/kc.sh start --http-host=0.0.0.0 --http-port=${PORT:-8080} --import-realm --cache=local'
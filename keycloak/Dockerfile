FROM quay.io/keycloak/keycloak:latest

ENV KC_HOSTNAME=https://nuhire-keycloak.onrender.com
ENV KC_HOSTNAME_STRICT=false
ENV KC_PROXY=passthrough
ENV KC_PROXY_HEADERS=xforwarded

ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--http-enabled=true", "--http-host=0.0.0.0", "--http-port=8080", "--hostname-strict=false", "--import-realm"]
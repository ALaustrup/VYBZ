#!/bin/sh
set -e
CERT_DIR="${CERT_DIR:-/certs}"
if [ ! -f "$CERT_DIR/es256.pem" ] || [ ! -f "$CERT_DIR/es256.key" ]; then
  echo "No signing cert in $CERT_DIR — generating a self-signed alpha cert…"
  ./gen-cert.sh "$CERT_DIR"
fi
C2PA_SIGN_CERT="$(cat "$CERT_DIR/es256.pem")"; export C2PA_SIGN_CERT
C2PA_PRIVATE_KEY="$(cat "$CERT_DIR/es256.key")"; export C2PA_PRIVATE_KEY
exec node server.mjs

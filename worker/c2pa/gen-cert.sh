#!/bin/sh
# Generate a self-signed ES256 signing identity for VYBZ C2PA (staging only).
# Production must use a certificate issued by a CA trusted by C2PA validators.
set -e
OUT="${1:-./certs}"
mkdir -p "$OUT"
if [ -f "$OUT/es256.pem" ] && [ -f "$OUT/es256.key" ]; then
  echo "Cert already present in $OUT — leaving it."
  exit 0
fi
openssl ecparam -name prime256v1 -genkey -noout -out "$OUT/es256.key"
openssl req -new -x509 -key "$OUT/es256.key" -out "$OUT/es256.pem" -days 3650 \
  -subj "/CN=VYBZ Staging Signer/O=VYBZ/C=US" \
  -addext "keyUsage=critical,digitalSignature" \
  -addext "extendedKeyUsage=emailProtection" \
  -addext "basicConstraints=critical,CA:FALSE"
chmod 600 "$OUT/es256.key"
echo "Wrote $OUT/es256.key and $OUT/es256.pem"

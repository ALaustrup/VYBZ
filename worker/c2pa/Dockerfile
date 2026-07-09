# VYBZ C2PA signing worker — Node + Adobe/CAI c2patool.
FROM node:22-slim

ARG C2PATOOL_VERSION=v0.26.69
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates openssl tar \
 && curl -sL "https://github.com/contentauth/c2pa-rs/releases/download/c2patool-${C2PATOOL_VERSION}/c2patool-${C2PATOOL_VERSION}-x86_64-unknown-linux-gnu.tar.gz" -o /tmp/c2patool.tgz \
 && tar xzf /tmp/c2patool.tgz -C /tmp \
 && install -m0755 /tmp/c2patool/c2patool /usr/local/bin/c2patool \
 && rm -rf /tmp/c2patool* \
 && apt-get purge -y curl tar && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
COPY sign.mjs server.mjs gen-cert.sh entrypoint.sh ./
RUN chmod +x gen-cert.sh entrypoint.sh

ENV C2PATOOL_BIN=/usr/local/bin/c2patool PORT=8787 CERT_DIR=/certs
EXPOSE 8787
VOLUME ["/certs"]
ENTRYPOINT ["./entrypoint.sh"]

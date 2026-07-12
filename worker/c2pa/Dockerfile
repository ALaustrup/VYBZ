# VYBZ C2PA signing worker — Node + Adobe/CAI c2patool.
#
# Base MUST provide glibc >= 2.39: the c2patool linux-gnu binary links GLIBC_2.39,
# so glibc-2.36 images (node:*-slim / Debian 12, and Vercel's AL2023 serverless
# runtime) fail at runtime with "GLIBC_2.39 not found". Ubuntu 24.04 ships glibc 2.39.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive

ARG C2PATOOL_VERSION=v0.26.69
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates openssl tar \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && curl -sL "https://github.com/contentauth/c2pa-rs/releases/download/c2patool-${C2PATOOL_VERSION}/c2patool-${C2PATOOL_VERSION}-x86_64-unknown-linux-gnu.tar.gz" -o /tmp/c2patool.tgz \
 && tar xzf /tmp/c2patool.tgz -C /tmp \
 && install -m0755 /tmp/c2patool/c2patool /usr/local/bin/c2patool \
 && rm -rf /tmp/c2patool* /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
COPY sign.mjs server.mjs gen-cert.sh entrypoint.sh ./
RUN chmod +x gen-cert.sh entrypoint.sh

ENV C2PATOOL_BIN=/usr/local/bin/c2patool PORT=8787 CERT_DIR=/certs
EXPOSE 8787
VOLUME ["/certs"]
ENTRYPOINT ["./entrypoint.sh"]

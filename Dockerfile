# syntax=docker/dockerfile:1
# check=error=true
FROM dhi.io/static:20250419-debian13@sha256:4749130e822c145dbdf9ca11ec0cc2f694b5fe687fd74268a2b62160e6726f39

ARG TARGETARCH
COPY --chmod=0755 dist/linux/${TARGETARCH}/cliphand /usr/local/bin/cliphand
COPY dist/linux/${TARGETARCH}/LICENSE dist/linux/${TARGETARCH}/THIRD-PARTY-LICENSES.md /usr/share/doc/cliphand/

ENTRYPOINT ["/usr/local/bin/cliphand"]

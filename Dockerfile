# syntax=docker/dockerfile:1
# check=error=true
FROM dhi.io/static:20250419-debian13@sha256:f3a87dc858c61b3f731ab2f86349ef10953b15918f167dbf9581543255364e32

ARG TARGETARCH
COPY --chmod=0755 dist/linux/${TARGETARCH}/cliphand /usr/local/bin/cliphand
COPY dist/linux/${TARGETARCH}/LICENSE dist/linux/${TARGETARCH}/THIRD-PARTY-LICENSES.md /usr/share/doc/cliphand/

ENTRYPOINT ["/usr/local/bin/cliphand"]

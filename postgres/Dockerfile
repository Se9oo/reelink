# 운영 Postgres에 wal-g를 넣은 이미지. WAL을 R2로 올리는 archive_command가 Postgres 컨테이너 안에서 돌기 때문에 필요하다
FROM postgres:16.15-bookworm

ARG WALG_VERSION=v3.0.9
ARG WALG_SHA256=4f03ee4679db7f660bfd1b2b8291ac5df247cd2ec48074b60c112f4897299f24

ADD --checksum=sha256:${WALG_SHA256} \
  https://github.com/wal-g/wal-g/releases/download/${WALG_VERSION}/wal-g-pg-22.04-amd64.tar.gz /tmp/wal-g.tar.gz

# 루트 인증서 설정
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && tar -xzf /tmp/wal-g.tar.gz -C /tmp \
  && install -m 755 /tmp/wal-g-pg-22.04-amd64 /usr/local/bin/wal-g \
  && rm /tmp/wal-g*

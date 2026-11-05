COMPOSE_DEV = docker compose -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: db-up db-down

# 로컬 개발용 Postgres·Redis 컨테이너 띄우기(127.0.0.1에만 포트를 연다)
db-up:
	$(COMPOSE_DEV) up -d postgres redis

db-down:
	$(COMPOSE_DEV) down

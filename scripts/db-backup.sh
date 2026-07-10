#!/usr/bin/env bash
# 한빛교회 DB 백업 — 실행 중인 MySQL 컨테이너에서 mysqldump 를 떠 gzip 으로 저장한다.
# 사용: scripts/db-backup.sh [출력디렉터리]   (기본 backups/)
# 환경: DB_CONTAINER(기본 hanbit-mysql), DB_NAME/DB_USER/DB_PASSWORD(기본 hanbit/hanbit/hanbit)
set -euo pipefail

CONTAINER="${DB_CONTAINER:-hanbit-mysql}"
DB_NAME="${DB_NAME:-hanbit}"
DB_USER="${DB_USER:-hanbit}"
DB_PASSWORD="${DB_PASSWORD:-hanbit}"
OUT_DIR="${1:-backups}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "오류: MySQL 컨테이너($CONTAINER)가 실행 중이 아닙니다. docker compose up -d 후 다시 시도하세요." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/hanbit-$STAMP.sql.gz"

# --single-transaction: InnoDB 일관 스냅샷(서비스 무중단). --routines/--triggers: 전체 보존.
docker exec "$CONTAINER" mysqldump \
  -u"$DB_USER" -p"$DB_PASSWORD" \
  --single-transaction --routines --triggers --set-gtid-purged=OFF --no-tablespaces \
  "$DB_NAME" | gzip > "$OUT_FILE"

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "백업 완료: $OUT_FILE ($SIZE)"

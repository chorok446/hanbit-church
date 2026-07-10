#!/usr/bin/env bash
# 한빛교회 DB 복구 — db-backup.sh 가 만든 .sql.gz 를 실행 중인 MySQL 컨테이너에 적재한다.
# 사용: scripts/db-restore.sh <백업파일.sql.gz> [대상DB]   (기본 대상 DB_NAME 또는 hanbit)
# 주의: 대상 DB 의 기존 데이터를 덮어쓴다. 프롬프트에서 대상 DB 이름을 정확히 입력해야 진행된다.
set -euo pipefail

CONTAINER="${DB_CONTAINER:-hanbit-mysql}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-root}"
BACKUP_FILE="${1:?사용법: scripts/db-restore.sh <백업파일.sql.gz> [대상DB]}"
TARGET_DB="${2:-${DB_NAME:-hanbit}}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "오류: 백업 파일이 없습니다: $BACKUP_FILE" >&2
  exit 1
fi
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "오류: MySQL 컨테이너($CONTAINER)가 실행 중이 아닙니다." >&2
  exit 1
fi

echo "'$BACKUP_FILE' 을(를) 컨테이너 $CONTAINER 의 데이터베이스 '$TARGET_DB' 에 복구합니다."
echo "기존 데이터가 덮어써집니다. 진행하려면 대상 DB 이름($TARGET_DB)을 입력하세요:"
read -r CONFIRM
if [ "$CONFIRM" != "$TARGET_DB" ]; then
  echo "입력이 일치하지 않아 중단합니다." >&2
  exit 1
fi

docker exec -i "$CONTAINER" mysql -u"$DB_USER" -p"$DB_PASSWORD" \
  -e "CREATE DATABASE IF NOT EXISTS \`$TARGET_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" mysql -u"$DB_USER" -p"$DB_PASSWORD" "$TARGET_DB"
echo "복구 완료: $TARGET_DB"

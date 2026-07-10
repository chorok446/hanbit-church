#!/usr/bin/env bash
# 업로드 파일(이미지·주보 PDF·찬양팀 자료) 백업 — DB 백업(db-backup.sh)과 짝.
# 컨테이너(/app/uploads)가 실행 중이면 거기서, 아니면 로컬 개발 경로(apps/api/uploads)에서 뜬다.
# 사용: scripts/uploads-backup.sh [출력디렉터리]   (기본 backups/)
set -euo pipefail

CONTAINER="${API_CONTAINER:-hanbit-api}"
OUT_DIR="${1:-backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/uploads-$STAMP.tar.gz"

if docker ps --format '{{.Names}}' | grep -q "$CONTAINER"; then
  NAME="$(docker ps --format '{{.Names}}' | grep "$CONTAINER" | head -1)"
  docker exec "$NAME" tar -czf - -C /app uploads > "$OUT_FILE"
  SRC="container:$NAME:/app/uploads"
elif [ -d "apps/api/uploads" ]; then
  tar -czf "$OUT_FILE" -C apps/api uploads
  SRC="local:apps/api/uploads"
else
  echo "오류: 실행 중인 API 컨테이너($CONTAINER*)도 로컬 uploads 디렉터리도 없습니다." >&2
  exit 1
fi

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "업로드 백업 완료: $OUT_FILE ($SIZE, 원본 $SRC)"

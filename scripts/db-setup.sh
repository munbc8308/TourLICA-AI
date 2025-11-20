#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${SQLITE_PATH:-data/tourlica.db}"
SCHEMA_FILE="data/sql/schema.sql"
SEED_FILE="data/sql/seed.sql"

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 CLI가 필요합니다. 먼저 설치해주세요." >&2
  exit 1
fi

mkdir -p "$(dirname "$DB_PATH")"

sqlite3 "$DB_PATH" < "$SCHEMA_FILE"
sqlite3 "$DB_PATH" < "$SEED_FILE"

echo "SQLite 데이터베이스가 준비되었습니다: $DB_PATH"

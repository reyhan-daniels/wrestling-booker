#!/usr/bin/env bash
# Off-provider snapshot of the whole world.
#
# Managed Postgres gives you point-in-time restore, but on a free plan that
# window is measured in hours — it will not save you from a mistake you notice
# next week. This writes a plain-SQL dump you keep yourself.
#
#   npm run backup                 -> ./backups/world-YYYY-MM-DD-HHMM.sql.gz
#   npm run backup -- /some/dir    -> writes there instead
#
# Restore with:
#   gunzip -c backups/world-....sql.gz | psql "$DATABASE_URL"

set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set (looked in .env)." >&2
  exit 1
fi

OUT_DIR="${1:-backups}"
mkdir -p "$OUT_DIR"
STAMP=$(date +%Y-%m-%d-%H%M)
OUT="$OUT_DIR/world-$STAMP.sql.gz"

# A pg_dump older than the server refuses to run, and managed Postgres is
# usually ahead of what a distro ships. Prefer the newest local one.
PG_DUMP=$(ls -d /usr/lib/postgresql/*/bin/pg_dump 2>/dev/null | sort -V | tail -1 || true)
PG_DUMP="${PG_DUMP:-$(command -v pg_dump || true)}"

if [ -z "$PG_DUMP" ]; then
  echo "pg_dump not found. Install the postgresql-client package." >&2
  exit 1
fi

# `?schema=public` is a Prisma-only parameter and pg_dump rejects it.
DUMP_URL=$(printf '%s' "$DATABASE_URL" | sed -E 's/([?&])schema=[^&]*(&|$)/\1/; s/[?&]$//')

echo "Dumping with $("$PG_DUMP" --version)"
"$PG_DUMP" --no-owner --no-privileges "$DUMP_URL" | gzip > "$OUT"

echo "Wrote $OUT ($(du -h "$OUT" | cut -f1))"
echo "Keep a copy somewhere that is not the database host."

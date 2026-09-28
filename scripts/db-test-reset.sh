#!/usr/bin/env bash
# Recria o banco de testes local (Postgres puro + stub do Supabase) e aplica
# todas as migrações em ordem. Uso: TEST_DATABASE_URL=postgres://... ./scripts/db-test-reset.sh
set -euo pipefail
URL="${TEST_DATABASE_URL:-postgres://postgres@localhost:54329/postgres}"
DB="adere_test"
BASE="${URL%/*}"
psql "$URL" -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB with (force)" -c "create database $DB"
psql "$BASE/$DB" -v ON_ERROR_STOP=1 -q -f tests/db/supabase-stub.sql
for f in supabase/migrations/*.sql; do
  psql "$BASE/$DB" -v ON_ERROR_STOP=1 -q -f "$f" > /dev/null
done
echo "Banco $DB pronto em $BASE/$DB"

#!/usr/bin/env sh
set -e

# Attendre la DB si variables Postgres présentes
if [ -n "${POSTGRES_HOST}" ]; then
  echo "Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT:-5432}..."
  # Petit script Python pour tester la connexion
  until python - <<'PY'
import os, psycopg2, time, sys
host=os.getenv("POSTGRES_HOST","db")
port=int(os.getenv("POSTGRES_PORT","5432"))
user=os.getenv("POSTGRES_USER","hws")
password=os.getenv("POSTGRES_PASSWORD","hws")
dbname=os.getenv("POSTGRES_DB","hws")
for _ in range(60):
    try:
        psycopg2.connect(host=host, port=port, user=user, password=password, dbname=dbname).close()
        sys.exit(0)
    except Exception:
        time.sleep(1)
sys.exit(1)
PY
  do
    echo "Postgres not ready yet..."
    sleep 1
  done
fi

python manage.py migrate --noinput

exec python manage.py runserver 0.0.0.0:8000
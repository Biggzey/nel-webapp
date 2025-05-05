@echo off
echo Checking database health...

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nel_webapp -c "SELECT version();"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nel_webapp -c "SELECT count(*) from pg_stat_activity;"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nel_webapp -c "SELECT pg_size_pretty(pg_database_size('nel_webapp'));"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nel_webapp -c "SELECT schemaname, relname, n_live_tup, n_dead_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"

echo Health check completed 
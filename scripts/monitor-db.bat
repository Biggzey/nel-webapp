@echo off
SETLOCAL EnableDelayedExpansion

SET LOG_DIR=D:\nel-webapp - 0.4\logs
IF NOT EXIST "%LOG_DIR%" mkdir "%LOG_DIR%"

SET TIMESTAMP=%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
SET TIMESTAMP=%TIMESTAMP: =0%
SET LOG_FILE=%LOG_DIR%\db_health_%TIMESTAMP%.log

echo =========================================== >> "%LOG_FILE%"
echo Database Health Check - %DATE% %TIME% >> "%LOG_FILE%"
echo =========================================== >> "%LOG_FILE%"

echo Checking PostgreSQL version...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nel_webapp -c "SELECT version();" >> "%LOG_FILE%"

echo.>> "%LOG_FILE%"
echo Database Size and Growth >> "%LOG_FILE%"
echo -------------------- >> "%LOG_FILE%"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nel_webapp -c "SELECT pg_size_pretty(pg_database_size('nel_webapp')) as db_size;" >> "%LOG_FILE%"

echo.>> "%LOG_FILE%"
echo Connection Statistics >> "%LOG_FILE%"
echo -------------------- >> "%LOG_FILE%"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nel_webapp -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;" >> "%LOG_FILE%"

echo.>> "%LOG_FILE%"
echo Table Statistics >> "%LOG_FILE%"
echo -------------------- >> "%LOG_FILE%"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nel_webapp -c "SELECT schemaname, relname, n_live_tup, n_dead_tup, last_vacuum, last_autovacuum FROM pg_stat_user_tables ORDER BY n_live_tup DESC;" >> "%LOG_FILE%"

echo.>> "%LOG_FILE%"
echo Index Usage >> "%LOG_FILE%"
echo -------------------- >> "%LOG_FILE%"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nel_webapp -c "SELECT schemaname, relname, idx_scan, seq_scan, idx_tup_read, seq_tup_read FROM pg_stat_user_tables ORDER BY seq_scan DESC;" >> "%LOG_FILE%"

echo.>> "%LOG_FILE%"
echo Lock Information >> "%LOG_FILE%"
echo -------------------- >> "%LOG_FILE%"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nel_webapp -c "SELECT locktype, relation::regclass, mode, granted FROM pg_locks WHERE database = (SELECT oid FROM pg_database WHERE datname = 'nel_webapp');" >> "%LOG_FILE%"

echo.>> "%LOG_FILE%"
echo Cache Hit Ratios >> "%LOG_FILE%"
echo -------------------- >> "%LOG_FILE%"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nel_webapp -c "SELECT 'index hit rate' as name, (sum(idx_blks_hit)) / sum(idx_blks_hit + idx_blks_read) as ratio FROM pg_statio_user_indexes UNION ALL SELECT 'table hit rate' as name, sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio FROM pg_statio_user_tables;" >> "%LOG_FILE%"

echo.>> "%LOG_FILE%"
echo Slow Queries >> "%LOG_FILE%"
echo -------------------- >> "%LOG_FILE%"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nel_webapp -c "SELECT pid, age(clock_timestamp(), query_start), usename, query FROM pg_stat_activity WHERE query != '<IDLE>' AND query NOT ILIKE '%%pg_stat_activity%%' ORDER BY query_start desc;" >> "%LOG_FILE%"

echo Health check completed. Results saved to: %LOG_FILE%

:: Keep only last 14 log files
SET /A count=0
FOR /F "delims=" %%i IN ('dir /B /O:D "%LOG_DIR%\db_health_*.log"') DO (
    SET /A count+=1
)

IF !count! GTR 14 (
    echo Removing old log files...
    SET /A to_delete=!count!-14
    SET /A deleted=0
    FOR /F "delims=" %%i IN ('dir /B /O:D "%LOG_DIR%\db_health_*.log"') DO (
        IF !deleted! LSS !to_delete! (
            del "%LOG_DIR%\%%i"
            SET /A deleted+=1
        )
    )
)

:: Display summary
type "%LOG_FILE%"

ENDLOCAL 
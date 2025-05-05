@echo off
IF "%1"=="" (
    echo Please provide the backup file path
    echo Usage: restore-db.bat path\to\backup\file
    exit /b 1
)

"C:\Program Files\PostgreSQL\16\bin\pg_restore.exe" -U postgres -d nel_webapp -c "%1"

echo Database restore completed 
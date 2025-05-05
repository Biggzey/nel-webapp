@echo off
SETLOCAL EnableDelayedExpansion

SET BACKUP_DIR=D:\nel-webapp - 0.4\backups
SET MAX_BACKUPS=14
SET TIMESTAMP=%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
SET TIMESTAMP=%TIMESTAMP: =0%

echo Starting database backup process...

IF NOT EXIST "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
    IF !ERRORLEVEL! NEQ 0 (
        echo Error: Failed to create backup directory
        exit /b 1
    )
)

echo Creating new backup...
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d nel_webapp -F c -f "%BACKUP_DIR%\backup_%TIMESTAMP%.backup"
IF !ERRORLEVEL! NEQ 0 (
    echo Error: Backup failed
    exit /b 1
)

echo Backup completed: %BACKUP_DIR%\backup_%TIMESTAMP%.backup

echo Checking for old backups...
SET /A count=0
FOR /F "delims=" %%i IN ('dir /B /O:D "%BACKUP_DIR%\backup_*.backup"') DO (
    SET /A count+=1
)

IF !count! GTR %MAX_BACKUPS% (
    echo Removing old backups...
    SET /A to_delete=!count!-%MAX_BACKUPS%
    SET /A deleted=0
    FOR /F "delims=" %%i IN ('dir /B /O:D "%BACKUP_DIR%\backup_*.backup"') DO (
        IF !deleted! LSS !to_delete! (
            del "%BACKUP_DIR%\%%i"
            SET /A deleted+=1
            echo Deleted old backup: %%i
        )
    )
)

echo Backup process completed. Total backups: !count!
echo Oldest backup: 
dir /B /O:D "%BACKUP_DIR%\backup_*.backup" | findstr /i /r "^" 2>nul

ENDLOCAL 
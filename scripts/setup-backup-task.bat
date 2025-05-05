@echo off
SCHTASKS /CREATE /SC DAILY /TN "NelWebApp\DatabaseBackup" /TR "D:\nel-webapp - 0.4\scripts\backup-db.bat" /ST 02:00 /RU SYSTEM
 
echo Backup task scheduled for daily at 2 AM 
@echo off
:: Schedule monitoring to run every 6 hours
SCHTASKS /CREATE /SC HOURLY /MO 6 /TN "NelWebApp\DatabaseMonitoring" /TR "D:\nel-webapp - 0.4\scripts\monitor-db.bat" /ST 00:00 /RU SYSTEM
 
echo Monitoring task scheduled to run every 6 hours 